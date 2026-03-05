import React, { useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity } from 'react-native';
import { 
  Bell, Search, ArrowUpRight, ArrowDownRight, 
  Activity, Star, PlusCircle, ArrowDownCircle 
} from 'lucide-react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { wsService } from '../../src/services/websocket';
import { useTicker } from '../../src/hooks/useTicker';
import { useMarketStore, Index, Stock } from '../../src/store/marketStore';
import { Card } from '../../src/components/shared/Card';
import { Colors } from '../../src/theme/colors';
import { cn } from '../../src/utils/cn';

// Sub-component for individual index with Granular Re-rendering
const IndexCard = ({ item }: { item: Index }) => {
  const livePrice = useTicker(item.symbol);
  const displayPrice = livePrice || item.price.current;
  
  // Calculate change based on original close price to maintain accuracy during live ticks
  const previousClose = item.price.current - item.price.change;
  const liveChange = displayPrice - previousClose;
  const liveChangePercent = (liveChange / previousClose) * 100;
  const isPositive = liveChange >= 0;

  return (
    <TouchableOpacity className="min-w-[140px] bg-zinc-900/40 border border-zinc-800/50 rounded-xl p-3 mr-3 active:bg-zinc-800 transition-colors">
      <View className="flex-row justify-between items-start mb-1">
        <Text className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">{item.symbol}</Text>
      </View>
      <Text className="text-base font-black text-white mt-1 tracking-tight">
        {displayPrice.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
      </Text>
      <View className="flex-row items-center mt-1">
        {isPositive ? (
          <ArrowUpRight size={12} color={Colors.trend.positive} />
        ) : (
          <ArrowDownRight size={12} color={Colors.trend.negative} />
        )}
        <Text className={cn(
          "text-[10px] font-bold ml-1",
          isPositive ? "text-emerald-500" : "text-rose-500"
        )}>
          {isPositive ? '+' : ''}{liveChange.toFixed(2)} ({liveChangePercent.toFixed(2)}%)
        </Text>
      </View>
    </TouchableOpacity>
  );
};

// Sub-component for individual stock
const StockCard = ({ item }: { item: Stock }) => {
  const livePrice = useTicker(item.symbol);
  const displayPrice = livePrice || item.price.current;
  
  const previousClose = item.price.current - item.price.change;
  const liveChangePercent = ((displayPrice - previousClose) / previousClose) * 100;
  const isPositive = liveChangePercent >= 0;

  return (
    <TouchableOpacity className="min-w-[160px] bg-zinc-900/20 border border-zinc-800/30 rounded-xl p-3 mr-3 active:bg-zinc-900 transition-colors">
      <View className="flex-row items-center gap-3 mb-2">
        <View className="w-8 h-8 rounded-lg bg-zinc-900 items-center justify-center">
          <Text className="text-[10px] font-black text-zinc-500">{item.symbol.substring(0, 2)}</Text>
        </View>
        <View>
          <Text className="text-sm font-bold text-white tracking-tight">{item.symbol}</Text>
          <Text className="text-[9px] font-bold text-zinc-600 uppercase">NSE</Text>
        </View>
      </View>
      <View>
        <Text className="text-sm font-bold text-white">
          ₹{displayPrice.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        </Text>
        <Text className={cn(
          "text-[10px] font-bold mt-0.5",
          isPositive ? "text-emerald-500" : "text-rose-500"
        )}>
          {isPositive ? '+' : ''}{liveChangePercent.toFixed(2)}%
        </Text>
      </View>
    </TouchableOpacity>
  );
};

export default function DashboardScreen() {
  const router = useRouter();
  const { indices, stocks } = useMarketStore();

  // Sort logic for Gainers and Losers
  const topGainers = [...stocks].sort((a, b) => b.price.changePercent - a.price.changePercent).slice(0, 3);
  const topLosers = [...stocks].sort((a, b) => a.price.changePercent - b.price.changePercent).slice(0, 3);

  // Start WebSocket connection when dashboard mounts
  useEffect(() => {
    wsService.connect();
    return () => wsService.disconnect();
  }, []);

  return (
    <SafeAreaView className="flex-1 bg-black">
      {/* Header */}
      <View className="flex-row items-center justify-between px-6 py-3 border-b border-zinc-900 bg-black/80">
        <View className="flex-row items-center gap-3">
          <View className="w-9 h-9 rounded-full bg-emerald-500 p-0.5 shadow-lg shadow-emerald-500/20">
             <View className="w-full h-full rounded-full bg-black" />
          </View>
          <Text className="text-lg font-black text-white tracking-tighter">
            AAPA <Text className="text-emerald-500">CAPITAL</Text>
          </Text>
        </View>
        <View className="flex-row gap-4">
          <TouchableOpacity 
            onPress={() => router.push('/modals/search')}
            className="p-2 rounded-xl bg-zinc-900 active:bg-zinc-800 transition-colors"
          >
            <Search size={20} color={Colors.text.secondary} />
          </TouchableOpacity>
          <TouchableOpacity className="p-2 rounded-xl bg-zinc-900 relative active:bg-zinc-800 transition-colors">
            <Bell size={20} color={Colors.text.secondary} />
            <View className="absolute top-2 right-2 w-2 h-2 bg-emerald-500 rounded-full border-2 border-zinc-900" />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView className="flex-1" contentContainerStyle={{ paddingBottom: 100 }}>
        
        {/* Live Market Indices Section */}
        <View className="px-5 mt-5">
          <Text className="text-[11px] font-bold uppercase tracking-widest text-zinc-500 mb-3 ml-1">
            Market Indices
          </Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} className="flex-row overflow-visible">
            {indices.map((index) => (
              <IndexCard key={index.symbol} item={index} />
            ))}
          </ScrollView>
        </View>

        {/* Portfolio Snapshot Card */}
        <View className="px-5 mt-6">
          <Card variant="glass" className="p-5">
            <View className="flex-row justify-between items-center mb-4">
              <View>
                <Text className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-1">Today's P&L</Text>
                <Text className="text-xl font-black text-emerald-500 tracking-tighter">
                  +₹12,450.00 <Text className="text-sm font-bold text-emerald-600">(2.4%)</Text>
                </Text>
              </View>
              <View className="flex-row items-center gap-1.5 bg-emerald-500/10 px-2 py-1 rounded">
                <View className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                <Text className="text-[9px] font-bold text-emerald-500 uppercase tracking-widest">Live</Text>
              </View>
            </View>
            
            <View className="flex-row border-t border-zinc-800/50 pt-4">
              <View className="flex-1">
                <Text className="text-[9px] font-bold text-zinc-600 uppercase tracking-widest mb-1">Invested Value</Text>
                <Text className="text-sm font-bold text-zinc-300">₹4,25,000</Text>
              </View>
              <View className="flex-1">
                <Text className="text-[9px] font-bold text-zinc-600 uppercase tracking-widest mb-1">Current Value</Text>
                <Text className="text-sm font-bold text-white">₹5,18,450</Text>
              </View>
            </View>
          </Card>
        </View>

        {/* Quick Action Buttons */}
        <View className="px-5 mt-6 flex-row justify-between gap-3">
          <TouchableOpacity className="flex-1 bg-emerald-500/10 border border-emerald-500/20 py-3 rounded-2xl items-center justify-center flex-row gap-2 active:bg-emerald-500/20 transition-all">
            <PlusCircle size={16} color={Colors.trend.positive} />
            <Text className="text-[10px] font-black text-emerald-500 uppercase tracking-widest">Buy</Text>
          </TouchableOpacity>
          <TouchableOpacity className="flex-1 bg-rose-500/10 border border-rose-500/20 py-3 rounded-2xl items-center justify-center flex-row gap-2 active:bg-rose-500/20 transition-all">
            <ArrowDownCircle size={16} color={Colors.trend.negative} />
            <Text className="text-[10px] font-black text-rose-500 uppercase tracking-widest">Sell</Text>
          </TouchableOpacity>
          <TouchableOpacity className="flex-1 bg-zinc-900 border border-zinc-800 py-3 rounded-2xl items-center justify-center flex-row gap-2 active:bg-zinc-800 transition-all">
            <Star size={16} color={Colors.text.primary} />
            <Text className="text-[10px] font-black text-white uppercase tracking-widest">Watch</Text>
          </TouchableOpacity>
        </View>

        {/* Market Sentiment Indicators */}
        <View className="px-5 mt-6">
          <Card className="p-4 flex-row justify-between items-center">
            <View className="items-center">
              <Text className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest mb-1">India VIX</Text>
              <Text className="text-sm font-bold text-white">14.25 <Text className="text-rose-500 text-[10px]">-2.4%</Text></Text>
            </View>
            <View className="w-[1px] h-8 bg-zinc-800" />
            <View className="items-center">
              <Text className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest mb-1">Adv / Dec</Text>
              <Text className="text-sm font-bold text-emerald-500">1240 <Text className="text-zinc-600">/</Text> <Text className="text-rose-500">850</Text></Text>
            </View>
            <View className="w-[1px] h-8 bg-zinc-800" />
            <View className="items-center">
              <Text className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest mb-1">Trend</Text>
              <View className="flex-row items-center gap-1">
                <Activity size={12} color={Colors.trend.positive} />
                <Text className="text-sm font-bold text-emerald-500">Bullish</Text>
              </View>
            </View>
          </Card>
        </View>

        {/* Top Gainers & Losers Horizontal Lists */}
        <View className="px-5 mt-8 space-y-6">
          <View>
            <View className="flex-row items-center justify-between mb-3 px-1">
              <Text className="text-[11px] font-bold uppercase tracking-widest text-emerald-500">Top Gainers</Text>
              <TouchableOpacity>
                <Text className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">View All</Text>
              </TouchableOpacity>
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} className="flex-row overflow-visible">
              {topGainers.map((stock) => (
                <StockCard key={stock.symbol} item={stock} />
              ))}
            </ScrollView>
          </View>

          <View>
            <View className="flex-row items-center justify-between mb-3 px-1">
              <Text className="text-[11px] font-bold uppercase tracking-widest text-rose-500">Top Losers</Text>
              <TouchableOpacity>
                <Text className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">View All</Text>
              </TouchableOpacity>
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} className="flex-row overflow-visible">
              {topLosers.map((stock) => (
                <StockCard key={stock.symbol} item={stock} />
              ))}
            </ScrollView>
          </View>
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}