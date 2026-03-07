import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, Dimensions, TouchableOpacity, ScrollView } from 'react-native';
import Svg, { Line, Rect, Defs, LinearGradient, Stop, Polygon } from 'react-native-svg';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, { 
  useSharedValue, 
  useAnimatedStyle, 
  runOnJS 
} from 'react-native-reanimated';
import { Maximize2, Settings2, BarChart2, TrendingUp } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router'; 

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CHART_WIDTH = SCREEN_WIDTH - 48; // padding
const CHART_HEIGHT = 280;
const VOLUME_HEIGHT = 60;

// Types
type Timeframe = '1m' | '5m' | '15m' | '30m' | '1h' | '1D' | '1W' | '1M';
type Indicator = 'EMA' | 'VWAP' | 'RSI' | 'MACD' | 'BB';
type ChartType = 'CANDLE' | 'LINE';

interface OHLCV {
  time: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

// Generate Initial Mock Data
const generateData = (points: number): OHLCV[] => {
  let currentPrice = 22500;
  return Array.from({ length: points }).map((_, i) => {
    const volatility = 40;
    const open = currentPrice;
    const close = open + (Math.random() - 0.5) * volatility;
    const high = Math.max(open, close) + Math.random() * (volatility / 2);
    const low = Math.min(open, close) - Math.random() * (volatility / 2);
    const volume = Math.floor(Math.random() * 10000) + 1000;
    currentPrice = close;
    
    const d = new Date();
    d.setMinutes(d.getMinutes() - (points - i) * 5);
    
    return {
      time: d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      open, high, low, close, volume
    };
  });
};

export default function CandlestickChart({ symbol = "NIFTY 50" }: { symbol?: string }) {
  // State
  const [data, setData] = useState<OHLCV[]>(generateData(40));
  const [timeframe, setTimeframe] = useState<Timeframe>('5m');
  const [activeIndicators, setActiveIndicators] = useState<Indicator[]>(['EMA']);
  const [chartType, setChartType] = useState<ChartType>('CANDLE');
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const router = useRouter();

  // AMAZING FEATURE 1: Live Market Simulation
  // Simulates WebSockets ticking every 800ms
  useEffect(() => {
    const interval = setInterval(() => {
      setData(prev => {
        const newData = [...prev];
        const last = { ...newData[newData.length - 1] };
        
        // Random price movement
        const volatility = 10;
        const tick = (Math.random() - 0.5) * volatility;
        
        last.close = last.close + tick;
        last.high = Math.max(last.high, last.close);
        last.low = Math.min(last.low, last.close);
        last.volume += Math.floor(Math.random() * 150);
        
        newData[newData.length - 1] = last;
        return newData;
      });
    }, 800);
    return () => clearInterval(interval);
  }, []);

  // Math & Scaling
  const minPrice = Math.min(...data.map(d => d.low)) * 0.999;
  const maxPrice = Math.max(...data.map(d => d.high)) * 1.001;
  const priceRange = maxPrice - minPrice;
  const maxVolume = Math.max(...data.map(d => d.volume));

  const candleWidth = CHART_WIDTH / data.length;
  const latestData = data[data.length - 1];

  // Gestures
  const touchX = useSharedValue(0);
  const touchY = useSharedValue(0);
  const isActive = useSharedValue(false);

  const updateScrubber = useCallback((x: number) => {
    const index = Math.max(0, Math.min(data.length - 1, Math.floor(x / candleWidth)));
    if (activeIndex !== index) {
      Haptics.selectionAsync();
      setActiveIndex(index);
    }
  }, [candleWidth, data.length, activeIndex]);

  const resetScrubber = useCallback(() => {
    setActiveIndex(null);
  }, []);

  const panGesture = Gesture.Pan()
    .onBegin((e) => {
      isActive.value = true;
      touchX.value = e.x;
      touchY.value = e.y;
      runOnJS(updateScrubber)(e.x);
    })
    .onUpdate((e) => {
      touchX.value = Math.max(0, Math.min(e.x, CHART_WIDTH));
      touchY.value = Math.max(0, Math.min(e.y, CHART_HEIGHT));
      runOnJS(updateScrubber)(e.x);
    })
    .onEnd(() => {
      isActive.value = false;
      runOnJS(resetScrubber)();
    });

  const crosshairVerticalStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: touchX.value }],
    opacity: isActive.value ? 1 : 0,
  }));

  const crosshairHorizontalStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: touchY.value }],
    opacity: isActive.value ? 1 : 0,
  }));

  const activeData = activeIndex !== null ? data[activeIndex] : latestData;
  const isPositive = activeData.close >= activeData.open;

  // Calculate current price line position
  const currentPriceY = CHART_HEIGHT - ((latestData.close - minPrice) / priceRange) * CHART_HEIGHT;
  const currentPriceColor = latestData.close >= latestData.open ? '#10b981' : '#ef4444';

  // Area Chart Polygon points calculation
  const areaPoints = data.map((d, i) => {
    const x = i * candleWidth + (candleWidth / 2);
    const y = CHART_HEIGHT - ((d.close - minPrice) / priceRange) * CHART_HEIGHT;
    return `${x},${y}`;
  }).join(' ');
  // Complete the polygon to the bottom corners
  const fullAreaPoints = `${candleWidth / 2},${CHART_HEIGHT} ${areaPoints} ${CHART_WIDTH - candleWidth / 2},${CHART_HEIGHT}`;

  return (
    <View className="bg-zinc-950 rounded-3xl border border-zinc-900 p-4">
      
      {/* Header: Title & Controls */}
      <View className="flex-row justify-between items-start mb-4">
        <View>
          <View className="flex-row items-center gap-2">
            <Text className="text-white font-black text-lg">{symbol}</Text>
            {/* Live Indicator */}
            <View className="bg-red-500/20 px-1.5 py-0.5 rounded flex-row items-center gap-1">
              <View className="w-1.5 h-1.5 rounded-full bg-red-500" />
              <Text className="text-[9px] font-bold text-red-500 uppercase">Live</Text>
            </View>
          </View>
          <Text className={`text-xl font-black mt-1 ${isPositive ? 'text-emerald-500' : 'text-red-500'}`}>
            ₹{activeData.close.toFixed(2)}
          </Text>
        </View>
        <View className="flex-row gap-2">
          <TouchableOpacity 
            onPress={async () => {
              await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
              setChartType(chartType === 'CANDLE' ? 'LINE' : 'CANDLE');
              router.push({ pathname: '/modals/full-chart', params: { symbol } });
            }}
            className="bg-zinc-900 p-2 rounded-lg border border-zinc-800"
          >
            {chartType === 'CANDLE' ? <BarChart2 size={16} color="#3b82f6" /> : <TrendingUp size={16} color="#3b82f6" />}
          </TouchableOpacity>
          <TouchableOpacity className="bg-zinc-900 p-2 rounded-lg border border-zinc-800">
            <Maximize2 size={16} color="#a1a1aa" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Dynamic OHLC Display */}
      <View className="flex-row justify-between bg-zinc-900/50 p-2.5 rounded-xl mb-4 border border-zinc-800/50">
        <View><Text className="text-[9px] text-zinc-500 uppercase font-bold">O</Text><Text className="text-white text-xs font-black">{activeData.open.toFixed(1)}</Text></View>
        <View><Text className="text-[9px] text-zinc-500 uppercase font-bold">H</Text><Text className="text-white text-xs font-black">{activeData.high.toFixed(1)}</Text></View>
        <View><Text className="text-[9px] text-zinc-500 uppercase font-bold">L</Text><Text className="text-white text-xs font-black">{activeData.low.toFixed(1)}</Text></View>
        <View><Text className="text-[9px] text-zinc-500 uppercase font-bold">C</Text><Text className={`text-xs font-black ${isPositive ? 'text-emerald-400' : 'text-red-400'}`}>{activeData.close.toFixed(1)}</Text></View>
        <View><Text className="text-[9px] text-zinc-500 uppercase font-bold">Vol</Text><Text className="text-blue-400 text-xs font-black">{(activeData.volume / 1000).toFixed(1)}k</Text></View>
      </View>

      {/* Interactive Chart Canvas */}
      <GestureDetector gesture={panGesture}>
        <View className="relative bg-zinc-950 rounded-xl overflow-hidden pr-12">
          
          <Svg width={CHART_WIDTH - 48} height={CHART_HEIGHT + VOLUME_HEIGHT}>
            <Defs>
              <LinearGradient id="areaGradient" x1="0" y1="0" x2="0" y2="1">
                <Stop offset="0" stopColor="#3b82f6" stopOpacity="0.3" />
                <Stop offset="1" stopColor="#3b82f6" stopOpacity="0" />
              </LinearGradient>
            </Defs>

            {/* Grid Lines */}
            {[0, 0.25, 0.5, 0.75, 1].map((ratio, i) => (
              <Line key={`grid-${i}`} x1="0" y1={CHART_HEIGHT * ratio} x2={CHART_WIDTH} y2={CHART_HEIGHT * ratio} stroke="#27272a" strokeWidth="1" strokeDasharray="4 4" />
            ))}

            {/* Drawing Line Chart with Gradient Area */}
            {chartType === 'LINE' && (
              <>
                <Polygon points={fullAreaPoints} fill="url(#areaGradient)" />
                {data.map((d, i) => {
                  if (i === 0) return null;
                  const prev = data[i - 1];
                  const x1 = (i - 1) * candleWidth + (candleWidth / 2);
                  const y1 = CHART_HEIGHT - ((prev.close - minPrice) / priceRange) * CHART_HEIGHT;
                  const x2 = i * candleWidth + (candleWidth / 2);
                  const y2 = CHART_HEIGHT - ((d.close - minPrice) / priceRange) * CHART_HEIGHT;
                  return <Line key={`line-${i}`} x1={x1} y1={y1} x2={x2} y2={y2} stroke="#3b82f6" strokeWidth="2.5" />;
                })}
              </>
            )}

            {/* Drawing Candlesticks */}
            {chartType === 'CANDLE' && data.map((d, i) => {
              const x = i * candleWidth + (candleWidth / 2);
              const openY = CHART_HEIGHT - ((d.open - minPrice) / priceRange) * CHART_HEIGHT;
              const closeY = CHART_HEIGHT - ((d.close - minPrice) / priceRange) * CHART_HEIGHT;
              const highY = CHART_HEIGHT - ((d.high - minPrice) / priceRange) * CHART_HEIGHT;
              const lowY = CHART_HEIGHT - ((d.low - minPrice) / priceRange) * CHART_HEIGHT;
              const isUp = d.close >= d.open;
              const color = isUp ? '#10b981' : '#ef4444';

              return (
                <React.Fragment key={i}>
                  {/* Wick */}
                  <Line x1={x} y1={highY} x2={x} y2={lowY} stroke={color} strokeWidth="1.5" />
                  {/* Body */}
                  <Rect x={x - candleWidth * 0.4} y={Math.min(openY, closeY)} width={candleWidth * 0.8} height={Math.max(Math.abs(openY - closeY), 2)} fill={color} />
                </React.Fragment>
              );
            })}

            {/* Drawing EMA Indicator (Mocked as smoothed line) */}
            {activeIndicators.includes('EMA') && data.map((d, i) => {
              if (i < 2) return null;
              const prev = data[i - 1];
              const x1 = (i - 1) * candleWidth + (candleWidth / 2);
              const y1 = CHART_HEIGHT - (((prev.close + prev.open)/2 - minPrice) / priceRange) * CHART_HEIGHT;
              const x2 = i * candleWidth + (candleWidth / 2);
              const y2 = CHART_HEIGHT - (((d.close + d.open)/2 - minPrice) / priceRange) * CHART_HEIGHT;
              return <Line key={`ema-${i}`} x1={x1} y1={y1} x2={x2} y2={y2} stroke="#f59e0b" strokeWidth="1.5" strokeDasharray="3 3" />;
            })}

            {/* Volume Bars */}
            {data.map((d, i) => {
              const x = i * candleWidth + (candleWidth / 2);
              const vHeight = (d.volume / maxVolume) * VOLUME_HEIGHT;
              const color = d.close >= d.open ? '#10b98140' : '#ef444440'; 
              return (
                <Rect key={`vol-${i}`} x={x - candleWidth * 0.35} y={CHART_HEIGHT + VOLUME_HEIGHT - vHeight} width={candleWidth * 0.7} height={vHeight} fill={color} />
              );
            })}

            {/* Current Live Price Line */}
            <Line x1="0" y1={currentPriceY} x2={CHART_WIDTH} y2={currentPriceY} stroke={currentPriceColor} strokeWidth="1" strokeDasharray="4 4" />
          </Svg>

          {/* AMAZING FEATURE 3: Dynamic Y-Axis Labels */}
          <View className="absolute right-0 top-0 bottom-[60px] w-12 border-l border-zinc-800/50 items-center">
            {[1, 0.75, 0.5, 0.25, 0].map(ratio => (
              <View key={ratio} style={{ position: 'absolute', top: CHART_HEIGHT * (1 - ratio) - 6 }}>
                <Text className="text-[9px] font-bold text-zinc-600">
                  {(minPrice + priceRange * ratio).toFixed(0)}
                </Text>
              </View>
            ))}
            
            {/* Live Price Tag on Y-Axis */}
            <View 
              style={{ position: 'absolute', top: currentPriceY - 8, backgroundColor: currentPriceColor }}
              className="px-1 py-0.5 rounded shadow-lg"
            >
              <Text className="text-[9px] font-black text-white">{latestData.close.toFixed(0)}</Text>
            </View>
          </View>

          {/* Crosshairs Overlay */}
          <Animated.View style={[crosshairVerticalStyle, { position: 'absolute', top: 0, bottom: 0, width: 1, backgroundColor: '#a1a1aa' }]} pointerEvents="none" />
          <Animated.View style={[crosshairHorizontalStyle, { position: 'absolute', left: 0, right: 48, height: 1, backgroundColor: '#a1a1aa' }]} pointerEvents="none" />
          
          {/* Active Time Tooltip */}
          <Animated.View style={[crosshairVerticalStyle, { position: 'absolute', bottom: VOLUME_HEIGHT + 4, translateX: -20 }]} pointerEvents="none">
            <View className="bg-white px-2 py-1 rounded shadow-lg">
              <Text className="text-[9px] font-black text-black">{activeData.time}</Text>
            </View>
          </Animated.View>

        </View>
      </GestureDetector>

      {/* Footer: Timeframes & Indicators */}
      <View className="mt-4 gap-3">
        {/* Timeframes */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} className="flex-row">
          {(['1m', '5m', '15m', '30m', '1h', '1D', '1W', '1M'] as Timeframe[]).map((tf) => (
            <TouchableOpacity 
              key={tf} 
              onPress={async () => {
                await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                setTimeframe(tf);
              }}
              className={`mr-2 px-4 py-2 rounded-xl border ${timeframe === tf ? 'bg-blue-600 border-blue-500' : 'bg-zinc-900 border-zinc-800'}`}
            >
              <Text className={`text-xs font-bold ${timeframe === tf ? 'text-white' : 'text-zinc-500'}`}>{tf}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Indicators */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} className="flex-row">
          <View className="flex-row items-center mr-3 pr-3 border-r border-zinc-800">
            <Settings2 size={14} color="#71717a" />
            <Text className="text-[10px] font-bold text-zinc-500 ml-1.5 uppercase">Indicators</Text>
          </View>
          {(['EMA', 'VWAP', 'RSI', 'MACD', 'BB'] as Indicator[]).map((ind) => (
            <TouchableOpacity 
              key={ind} 
              onPress={async () => {
                await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                setActiveIndicators(prev => prev.includes(ind) ? prev.filter(i => i !== ind) : [...prev, ind]);
              }}
              className={`mr-2 px-3 py-1.5 rounded-lg border ${activeIndicators.includes(ind) ? 'bg-zinc-800 border-zinc-600' : 'bg-transparent border-zinc-800'}`}
            >
              <Text className={`text-[10px] font-bold ${activeIndicators.includes(ind) ? 'text-white' : 'text-zinc-500'}`}>{ind}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

    </View>
  );
}