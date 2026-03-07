import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Alert, Switch } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Activity, TrendingUp, TrendingDown, Maximize2, XCircle, Settings2, BarChart2, Clock, ChevronRight, Zap } from 'lucide-react-native';
import { Swipeable } from 'react-native-gesture-handler';
import * as Haptics from 'expo-haptics';
import { useTicker } from '../../src/hooks/useTicker';
import { useMarketStore } from '../../src/store/marketStore';
import { Colors } from '../../src/theme/colors';

// Simplified Interface (LTP and PnL are now calculated live via the store)
interface PositionCard {
  id: string;
  symbol: string;
  quantity: number;
  avgPrice: number;
}

// --- LIVE COMPONENT: Index Row ---
const LiveIndexRow = ({ symbol }: { symbol: string }) => {
  const router = useRouter();
  const ticker = useTicker(symbol);
  
  const price = ticker.current || 0;
  const isPositive = ticker.change >= 0;

  return (
    <TouchableOpacity 
      onPress={() => router.push({ pathname: '/modals/option-chain', params: { symbol } })}
      className="p-4 flex-row items-center justify-between border-t border-zinc-800/50"
    >
      <View className="flex-row items-center gap-3">
        <View className="w-10 h-10 bg-emerald-500/10 rounded-xl items-center justify-center border border-emerald-500/20">
          <Zap size={18} color={Colors.trend.positive} />
        </View>
        <View>
          <Text className="text-sm font-black text-white tracking-tight">{symbol}</Text>
          <Text className="text-[10px] font-bold text-zinc-500 uppercase mt-0.5">Option Chain</Text>
        </View>
      </View>
      <View className="items-end">
        <Text className="text-sm font-bold text-white">
          {price > 0 ? price.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '---'}
        </Text>
        <Text className={`text-[10px] font-bold mt-0.5 ${isPositive ? 'text-emerald-500' : 'text-red-500'}`}>
          {isPositive ? '+' : ''}{(ticker.changePercent || 0).toFixed(2)}% {isPositive ? '↗' : '↘'}
        </Text>
      </View>
    </TouchableOpacity>
  );
};

// --- LIVE COMPONENT: Position Card ---
const LivePositionCard = ({ pos, onLongPress, onExit, onChart }: { 
  pos: PositionCard, 
  onLongPress: (p: PositionCard) => void, 
  onExit: (s: string) => void, 
  onChart: (s: string) => void 
}) => {
  const ticker = useTicker(pos.symbol);
  const currentLtp = ticker.current || pos.avgPrice;
  
  // Dynamic Live PnL Calculation!
  const livePnL = (currentLtp - pos.avgPrice) * pos.quantity;
  const isProfit = livePnL >= 0;

  const renderRightActions = () => (
    <View className="flex-row gap-2 items-center pl-3 pr-6">
      <TouchableOpacity 
        onPress={() => onChart(pos.symbol)} 
        className="bg-blue-500/10 border border-blue-500/30 w-16 h-full py-4 items-center justify-center rounded-2xl"
      >
        <BarChart2 size={24} color="#3b82f6" />
        <Text className="text-blue-500 text-[10px] font-bold mt-1">Chart</Text>
      </TouchableOpacity>

      <TouchableOpacity 
        onPress={() => onExit(pos.symbol)} 
        className="bg-red-500/10 border border-red-500/30 w-16 h-full py-4 items-center justify-center rounded-2xl"
      >
        <XCircle size={24} color="#ef4444" />
        <Text className="text-red-500 text-[10px] font-bold mt-1">Exit</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <View className="mb-3 px-6">
      <Swipeable renderRightActions={renderRightActions} overshootRight={false}>
        <TouchableOpacity 
          activeOpacity={0.9} 
          onLongPress={() => onLongPress(pos)} 
          className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5"
        >
          <View className="flex-row justify-between items-start mb-4">
            <View>
              <Text className="text-white font-black text-base">{pos.symbol}</Text>
              <View className="flex-row items-center gap-2 mt-1.5">
                <Text className="text-zinc-400 text-xs font-bold bg-zinc-800 px-2 py-0.5 rounded">Qty: {pos.quantity}</Text>
                <Text className="text-zinc-500 text-xs">Avg: ₹{pos.avgPrice.toFixed(2)}</Text>
              </View>
            </View>
            <View className="items-end">
              <Text className={`font-black text-lg ${isProfit ? 'text-emerald-400' : 'text-red-400'}`}>
                {isProfit ? '+' : ''}₹{livePnL.toFixed(2)}
              </Text>
              <Text className="text-zinc-500 text-xs mt-1">LTP: ₹{currentLtp.toFixed(2)}</Text>
            </View>
          </View>
          <View className="flex-row justify-between items-center pt-3 border-t border-zinc-800/50">
            <Text className="text-[10px] text-zinc-500 tracking-widest uppercase">Long press to modify SL</Text>
            <Text className="text-[10px] text-zinc-500 tracking-widest uppercase flex-row items-center">
               Swipe left for actions <Maximize2 size={10} color="#71717a" />
            </Text>
          </View>
        </TouchableOpacity>
      </Swipeable>
    </View>
  );
};

export default function FODashboardScreen() {
  const router = useRouter();
  
  // States
  const [isScalperMode, setIsScalperMode] = useState(false);
  const [selectedLots, setSelectedLots] = useState<number>(1);
  const lotSizeMultiplier = 50; 

  const marginData = {
    available: 245000,
    used: 120000,
    exposure: 45000,
    span: 38500
  };

  const [positions] = useState<PositionCard[]>([
    { id: '1', symbol: 'NIFTY 24MAY 22500 CE', quantity: 100, avgPrice: 125.50 },
    { id: '2', symbol: 'BANKNIFTY 24MAY 48000 PE', quantity: 30, avgPrice: 210.00 }
  ]);

  // Aggregate live prices to calculate Total PnL for the Scalper Mode header
  const prices = useMarketStore(state => state.prices);
  const totalPnL = positions.reduce((acc, pos) => {
    const ltp = prices[pos.symbol]?.current || pos.avgPrice;
    return acc + ((ltp - pos.avgPrice) * pos.quantity);
  }, 0);

  // Handlers
  const handleLongPress = async (position: PositionCard) => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    Alert.alert(
      "Modify Order",
      `Modify Stop-Loss / Target for ${position.symbol}`,
      [
        { text: "Cancel", style: "cancel" },
        { text: "Update SL", onPress: () => console.log("Update SL") },
        { text: "Update Target", onPress: () => console.log("Update Target") }
      ]
    );
  };

  const handleQuickOrder = async (type: 'CE' | 'PE') => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    const mockSymbol = type === 'CE' ? 'NIFTY 24MAY 22500 CE' : 'NIFTY 24MAY 22500 PE';
    const mockLtp = prices[mockSymbol]?.current?.toString() || (type === 'CE' ? '140.20' : '110.50');

    router.push({
      pathname: '/modals/order-window',
      params: { symbol: mockSymbol, type: 'BUY', ltp: mockLtp }
    });
  };

  const handleExit = async (symbol: string) => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    Alert.alert("Square Off", `Exit position for ${symbol}?`, [
      { text: "Cancel", style: "cancel" },
      { text: "Exit at Market", style: "destructive", onPress: async () => {
          await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          console.log(`Exited ${symbol}`);
        } 
      }
    ]);
  };

  const handleChart = async (symbol: string) => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push({ pathname: '/modals/full-chart', params: { symbol } });
  };

  return (
    <SafeAreaView className="flex-1 bg-black">
      <View className="px-6 py-4 border-b border-zinc-900 flex-row justify-between items-center">
        <Text className="text-2xl font-black text-white tracking-tighter">F&O Center</Text>
        <TouchableOpacity className="bg-zinc-900 p-2 rounded-full">
          <Settings2 size={20} color="#a1a1aa" />
        </TouchableOpacity>
      </View>

      <ScrollView className="flex-1" contentContainerStyle={{ paddingBottom: 100 }}>
        
        {/* 1. Margin Analysis Panel */}
        <View className="px-6 pt-6">
          <Text className="text-[11px] font-bold uppercase tracking-widest text-zinc-500 mb-4 ml-1">
            Margin Analysis
          </Text>
          <View className="bg-zinc-900/40 border border-zinc-800/80 rounded-2xl p-4 flex-row flex-wrap">
            <View className="w-1/2 p-2 border-r border-b border-zinc-800/50">
              <Text className="text-[10px] text-zinc-400 uppercase tracking-wider font-bold">Available Margin</Text>
              <Text className="text-emerald-400 font-black text-lg mt-1">₹{marginData.available.toLocaleString()}</Text>
            </View>
            <View className="w-1/2 p-2 border-b border-zinc-800/50">
              <Text className="text-[10px] text-zinc-400 uppercase tracking-wider font-bold">Used Margin</Text>
              <Text className="text-red-400 font-black text-lg mt-1">₹{marginData.used.toLocaleString()}</Text>
            </View>
            <View className="w-1/2 p-2 border-r border-zinc-800/50 pt-4">
              <Text className="text-[10px] text-zinc-400 uppercase tracking-wider font-bold">Span Margin</Text>
              <Text className="text-white font-bold text-sm mt-1">₹{marginData.span.toLocaleString()}</Text>
            </View>
            <View className="w-1/2 p-2 pt-4">
              <Text className="text-[10px] text-zinc-400 uppercase tracking-wider font-bold">Exposure Margin</Text>
              <Text className="text-white font-bold text-sm mt-1">₹{marginData.exposure.toLocaleString()}</Text>
            </View>
          </View>
        </View>

        {/* 2. Index Options Quick Access */}
        <View className="px-6 pt-8">
          <Text className="text-[11px] font-bold uppercase tracking-widest text-zinc-500 mb-4 ml-1">
            Index Options
          </Text>
          <View className="bg-zinc-900/30 border border-zinc-800/50 rounded-2xl overflow-hidden">
            {['NIFTY 50', 'BANKNIFTY', 'FINNIFTY'].map((idx) => (
              <LiveIndexRow key={idx} symbol={idx} />
            ))}
          </View>
        </View>

        {/* 3. GTT Smart Orders Entry */}
        <View className="px-6 pt-8">
          <Text className="text-[11px] font-bold uppercase tracking-widest text-zinc-500 mb-4 ml-1">
            Smart Orders
          </Text>
          <TouchableOpacity 
            onPress={() => router.push({ 
              pathname: '/modals/gtt-window', 
              params: { symbol: 'RELIANCE', ltp: prices['RELIANCE']?.current?.toString() || '2850.40', type: 'SELL' } 
            })}
            className="bg-purple-900/20 border border-purple-900/40 rounded-2xl p-4 flex-row items-center justify-between"
          >
            <View className="flex-row items-center gap-4">
              <View className="bg-purple-500/20 p-3 rounded-xl">
                <Clock size={22} color="#a855f7" />
              </View>
              <View>
                <Text className="text-white font-bold text-base">Create GTT Order</Text>
                <Text className="text-zinc-400 text-xs mt-0.5">Set Target & Stop-Loss (1 Yr)</Text>
              </View>
            </View>
            <ChevronRight size={20} color="#52525b" />
          </TouchableOpacity>
        </View>

        {/* 4. Scalper Mode UI */}
        <View className="px-6 pt-8">
          <View className="flex-row items-center justify-between mb-4 ml-1">
            <View className="flex-row items-center gap-2">
              <Activity size={16} color={isScalperMode ? "#3b82f6" : "#71717a"} />
              <Text className="text-[11px] font-bold uppercase tracking-widest text-zinc-500">
                Scalper Mode
              </Text>
            </View>
            <Switch
              value={isScalperMode}
              onValueChange={async (val) => {
                await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                setIsScalperMode(val);
              }}
              trackColor={{ false: '#27272a', true: '#1e3a8a' }}
              thumbColor={isScalperMode ? '#3b82f6' : '#71717a'}
            />
          </View>

          {isScalperMode ? (
            <View className="bg-blue-950/20 border border-blue-900/50 rounded-2xl p-5">
              <View className="flex-row justify-between items-center mb-6">
                <Text className="text-white font-bold">Quick P&L</Text>
                <Text className={`text-2xl font-black tracking-tighter ${totalPnL >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>
                  {totalPnL >= 0 ? '+' : ''}₹{totalPnL.toFixed(2)}
                </Text>
              </View>

              <Text className="text-[10px] text-zinc-400 uppercase tracking-wider font-bold mb-3">Pre-configured Lots (NIFTY)</Text>
              <View className="flex-row gap-2 mb-6">
                {[1, 5, 10, 20].map((lots) => (
                  <TouchableOpacity
                    key={lots}
                    onPress={async () => {
                      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      setSelectedLots(lots);
                    }}
                    className={`flex-1 py-2 rounded-lg border items-center ${selectedLots === lots ? 'bg-blue-600 border-blue-500' : 'bg-zinc-900 border-zinc-700'}`}
                  >
                    <Text className={`font-black ${selectedLots === lots ? 'text-white' : 'text-zinc-400'}`}>{lots}L</Text>
                    <Text className={`text-[9px] mt-0.5 ${selectedLots === lots ? 'text-blue-200' : 'text-zinc-500'}`}>{lots * lotSizeMultiplier} Qty</Text>
                  </TouchableOpacity>
                ))}
              </View>

              <View className="flex-row gap-4">
                <TouchableOpacity 
                  activeOpacity={0.7}
                  onPress={() => handleQuickOrder('CE')}
                  className="flex-1 bg-emerald-500/10 border border-emerald-500/50 py-5 rounded-2xl items-center"
                >
                  <TrendingUp size={24} color="#10b981" className="mb-2" />
                  <Text className="text-emerald-500 font-black text-lg tracking-tighter">BUY CE</Text>
                  <Text className="text-emerald-500/60 text-[10px] font-bold mt-1">Call Option (Up)</Text>
                </TouchableOpacity>

                <TouchableOpacity 
                  activeOpacity={0.7}
                  onPress={() => handleQuickOrder('PE')}
                  className="flex-1 bg-red-500/10 border border-red-500/50 py-5 rounded-2xl items-center"
                >
                  <TrendingDown size={24} color="#ef4444" className="mb-2" />
                  <Text className="text-red-500 font-black text-lg tracking-tighter">BUY PE</Text>
                  <Text className="text-red-500/60 text-[10px] font-bold mt-1">Put Option (Down)</Text>
                </TouchableOpacity>
              </View>
            </View>
          ) : (
            <View className="bg-zinc-900/30 border border-zinc-800/50 rounded-2xl p-4 items-center">
              <Text className="text-zinc-500 text-xs font-medium text-center">Enable Scalper Mode for 1-tap order placement and instant position tracking.</Text>
            </View>
          )}
        </View>

        {/* 5. Live Positions Cards with Swipe & Long Press */}
        <View className="pt-8">
          <Text className="text-[11px] font-bold uppercase tracking-widest text-zinc-500 mb-4 ml-7">
            Live Positions
          </Text>
          
          {positions.map((pos) => (
            <LivePositionCard 
              key={pos.id} 
              pos={pos} 
              onLongPress={handleLongPress}
              onExit={handleExit}
              onChart={handleChart}
            />
          ))}
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}