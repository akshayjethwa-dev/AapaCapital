import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, Dimensions, TouchableOpacity, ScrollView, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import Svg, { Line, Rect, G } from 'react-native-svg';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, { 
  useSharedValue, 
  useAnimatedStyle, 
  runOnJS,
  withSpring
} from 'react-native-reanimated';
import { X, Maximize, Crosshair, PenTool, TrendingUp, Baseline, Settings2, BarChart2, Undo } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';

// --- Import the hook ---
import { useTicker } from '../../src/hooks/useTicker';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const CHART_WIDTH = SCREEN_WIDTH;
const CHART_HEIGHT = SCREEN_HEIGHT * 0.65; // Take up most of the screen
const VOLUME_HEIGHT = 80;

interface OHLCV {
  time: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

// Generate 100 points of historical data so we can pan and zoom!
const generateData = (points: number, initialPrice: number): OHLCV[] => {
  let currentPrice = initialPrice || 22500;
  return Array.from({ length: points }).map((_, i) => {
    const volatility = 50;
    const open = currentPrice;
    const close = open + (Math.random() - 0.5) * volatility;
    const high = Math.max(open, close) + Math.random() * (volatility * 0.8);
    const low = Math.min(open, close) - Math.random() * (volatility * 0.8);
    const volume = Math.floor(Math.random() * 20000) + 5000;
    currentPrice = close;
    
    const d = new Date();
    d.setMinutes(d.getMinutes() - (points - i) * 5);
    
    return {
      time: d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      open, high, low, close, volume
    };
  });
};

type InteractionMode = 'PAN' | 'CROSSHAIR' | 'DRAW_TREND' | 'DRAW_FIB';

export default function FullChartModal() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const symbol = (params.symbol as string) || 'NIFTY 50';

  // --- NEW: LIVE TICKER INTEGRATION ---
  const liveTicker = useTicker(symbol);
  
  // Use the live price to seed the initial chart data, so it doesn't jump wildly
  const [data, setData] = useState<OHLCV[]>(generateData(100, liveTicker.current || 22500));
  const [mode, setMode] = useState<InteractionMode>('PAN');
  const [activeIndex, setActiveIndex] = useState<number | null>(null);

  // Update the final candle dynamically when live price changes
  useEffect(() => {
    if (liveTicker.current) {
      setData(prev => {
        const newData = [...prev];
        const lastCandle = { ...newData[newData.length - 1] };
        
        lastCandle.close = liveTicker.current;
        lastCandle.high = Math.max(lastCandle.high, liveTicker.current);
        lastCandle.low = Math.min(lastCandle.low, liveTicker.current);
        
        newData[newData.length - 1] = lastCandle;
        return newData;
      });
    }
  }, [liveTicker.current]);
  
  // Math & Scaling
  const minPrice = Math.min(...data.map(d => d.low)) * 0.998;
  const maxPrice = Math.max(...data.map(d => d.high)) * 1.002;
  const priceRange = maxPrice - minPrice;
  const maxVolume = Math.max(...data.map(d => d.volume));
  
  // Base width before zoom
  const baseCandleWidth = (CHART_WIDTH / 50); // Show 50 candles initially

  // --- REANIMATED SHARED VALUES ---
  const scale = useSharedValue(1);
  const savedScale = useSharedValue(1);
  const translateX = useSharedValue(0);
  const savedTranslateX = useSharedValue(0);
  
  // Crosshair values
  const crosshairX = useSharedValue(0);
  const crosshairY = useSharedValue(0);
  const isCrosshairActive = useSharedValue(false);

  // --- GESTURE DEFINITIONS ---
  
  // 1. Pinch to Zoom
  const pinchGesture = Gesture.Pinch()
    .onUpdate((e) => {
      // Limit zoom between 0.5x (zoomed out) and 5x (zoomed in)
      scale.value = Math.max(0.5, Math.min(savedScale.value * e.scale, 5));
    })
    .onEnd(() => {
      savedScale.value = scale.value;
    });

  // 2. Drag to Pan Historical Data (Only active when in PAN mode)
  const panChartGesture = Gesture.Pan()
    .minPointers(1)
    .onUpdate((e) => {
      if (mode === 'PAN') {
        // Limit panning so they don't drag the chart off-screen
        const maxPan = (data.length * baseCandleWidth * scale.value) - CHART_WIDTH;
        translateX.value = Math.min(0, Math.max(savedTranslateX.value + e.translationX, -maxPan));
      }
    })
    .onEnd(() => {
      if (mode === 'PAN') savedTranslateX.value = translateX.value;
    });

  // 3. Crosshair Scrubbing (Only active when in CROSSHAIR mode)
  const updateScrubber = useCallback((x: number) => {
    // Calculate which candle we are touching based on current scale and pan
    const adjustedX = x - translateX.value;
    const currentCandleWidth = baseCandleWidth * scale.value;
    const index = Math.max(0, Math.min(data.length - 1, Math.floor(adjustedX / currentCandleWidth)));
    
    if (activeIndex !== index) {
      Haptics.selectionAsync();
      setActiveIndex(index);
    }
  }, [baseCandleWidth, data.length, activeIndex]);

  const crosshairGesture = Gesture.Pan()
    .minPointers(1)
    .onBegin((e) => {
      if (mode === 'CROSSHAIR') {
        isCrosshairActive.value = true;
        crosshairX.value = e.x;
        crosshairY.value = e.y;
        runOnJS(updateScrubber)(e.x);
      }
    })
    .onUpdate((e) => {
      if (mode === 'CROSSHAIR') {
        crosshairX.value = Math.max(0, Math.min(e.x, CHART_WIDTH));
        crosshairY.value = Math.max(0, Math.min(e.y, CHART_HEIGHT));
        runOnJS(updateScrubber)(e.x);
      }
    })
    .onEnd(() => {
      if (mode === 'CROSSHAIR') {
        isCrosshairActive.value = false;
        runOnJS(setActiveIndex)(null);
      }
    });

  // Compose Gestures: We allow Pinch and Pan to happen at the same time
  const composedGestures = Gesture.Simultaneous(
    pinchGesture, 
    mode === 'CROSSHAIR' ? crosshairGesture : panChartGesture
  );

  // --- ANIMATED STYLES ---
  
  // Applies the Zoom and Pan directly to the SVG Group for 60fps rendering
  const animatedChartStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: translateX.value },
      { scaleX: scale.value }
    ]
  }));

  const verticalCrosshairStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: crosshairX.value }],
    opacity: isCrosshairActive.value ? 1 : 0,
  }));

  const horizontalCrosshairStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: crosshairY.value }],
    opacity: isCrosshairActive.value ? 1 : 0,
  }));

  // Helper
  const toggleMode = async (newMode: InteractionMode) => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    if (newMode === 'DRAW_TREND' || newMode === 'DRAW_FIB') {
      Alert.alert('Drawing Tools', `Select points on the chart to draw ${newMode === 'DRAW_TREND' ? 'Trendline' : 'Fibonacci Retracement'}`);
    }
    setMode(newMode);
  };

  const activeData = activeIndex !== null ? data[activeIndex] : data[data.length - 1];
  const isUp = activeData.close >= activeData.open;

  // --- AMAZING FEATURE: Trade Directly From Chart ---
  const handleQuickTrade = async (type: 'BUY' | 'SELL') => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    router.push({
      pathname: '/modals/order-window',
      params: { symbol, type, ltp: activeData.close.toString() }
    });
  };

  return (
    <SafeAreaView className="flex-1 bg-zinc-950">
      
      {/* 1. Header & OHLC Data */}
      <View className="px-4 py-3 border-b border-zinc-900 bg-zinc-950 z-10">
        <View className="flex-row justify-between items-center mb-3">
          <View className="flex-row items-center gap-3">
            <TouchableOpacity onPress={() => router.back()} className="p-2 bg-zinc-900 rounded-full">
              <X size={20} color="#a1a1aa" />
            </TouchableOpacity>
            <View>
              <Text className="text-white font-black text-xl tracking-tighter">{symbol}</Text>
              {/* Live Ticker Price Header */}
              <Text className={`text-sm font-black ${liveTicker.change >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>
                ₹{liveTicker.current ? liveTicker.current.toFixed(2) : activeData.close.toFixed(2)}
              </Text>
            </View>
          </View>
          
          <TouchableOpacity onPress={() => {
            scale.value = withSpring(1);
            translateX.value = withSpring(0);
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          }} className="bg-blue-900/30 px-3 py-1.5 rounded-lg border border-blue-900/50">
            <Text className="text-blue-400 text-xs font-bold">Reset View</Text>
          </TouchableOpacity>
        </View>

        {/* OHLC Bar */}
        <View className="flex-row justify-between bg-zinc-900/50 p-2.5 rounded-xl border border-zinc-800">
          <View><Text className="text-[10px] text-zinc-500 uppercase font-bold">Open</Text><Text className="text-white text-xs font-black">{activeData.open.toFixed(1)}</Text></View>
          <View><Text className="text-[10px] text-zinc-500 uppercase font-bold">High</Text><Text className="text-white text-xs font-black">{activeData.high.toFixed(1)}</Text></View>
          <View><Text className="text-[10px] text-zinc-500 uppercase font-bold">Low</Text><Text className="text-white text-xs font-black">{activeData.low.toFixed(1)}</Text></View>
          <View><Text className="text-[10px] text-zinc-500 uppercase font-bold">Close</Text><Text className={`text-xs font-black ${isUp ? 'text-emerald-400' : 'text-red-400'}`}>{activeData.close.toFixed(1)}</Text></View>
        </View>
      </View>

      {/* 2. Main Chart Area */}
      <GestureDetector gesture={composedGestures}>
        <View className="flex-1 bg-black relative overflow-hidden">
          
          {/* AMAZING FEATURE: TradingView-Style Background Watermark */}
          <View className="absolute inset-0 items-center justify-center opacity-5" pointerEvents="none">
            <Text className="text-white font-black text-6xl text-center leading-tight">
              {symbol}{'\n'}
              <Text className="text-3xl">5m</Text>
            </Text>
          </View>

          {/* Static Y-Axis Grid Lines */}
          <Svg width={CHART_WIDTH} height={CHART_HEIGHT} style={{ position: 'absolute', zIndex: 0 }}>
            {[0.2, 0.4, 0.6, 0.8].map((ratio, i) => (
              <Line key={i} x1="0" y1={CHART_HEIGHT * ratio} x2={CHART_WIDTH} y2={CHART_HEIGHT * ratio} stroke="#18181b" strokeWidth="1" />
            ))}
          </Svg>

          {/* Animated Zooming/Panning Container */}
          <Animated.View style={[animatedChartStyle, { width: data.length * baseCandleWidth, height: CHART_HEIGHT + VOLUME_HEIGHT }]}>
            <Svg width={data.length * baseCandleWidth} height={CHART_HEIGHT + VOLUME_HEIGHT}>
              {data.map((d, i) => {
                const x = i * baseCandleWidth + (baseCandleWidth / 2);
                const openY = CHART_HEIGHT - ((d.open - minPrice) / priceRange) * CHART_HEIGHT;
                const closeY = CHART_HEIGHT - ((d.close - minPrice) / priceRange) * CHART_HEIGHT;
                const highY = CHART_HEIGHT - ((d.high - minPrice) / priceRange) * CHART_HEIGHT;
                const lowY = CHART_HEIGHT - ((d.low - minPrice) / priceRange) * CHART_HEIGHT;
                const isCandleUp = d.close >= d.open;
                const color = isCandleUp ? '#10b981' : '#ef4444';

                // Volume math
                const vHeight = (d.volume / maxVolume) * VOLUME_HEIGHT;
                const volColor = isCandleUp ? '#10b98130' : '#ef444430';

                return (
                  <G key={i}>
                    {/* Wick */}
                    <Line x1={x} y1={highY} x2={x} y2={lowY} stroke={color} strokeWidth="1" vectorEffect="non-scaling-stroke" />
                    {/* Body */}
                    <Rect 
                      x={x - baseCandleWidth * 0.35} 
                      y={Math.min(openY, closeY)} 
                      width={baseCandleWidth * 0.7} 
                      height={Math.max(Math.abs(openY - closeY), 1)} 
                      fill={color} 
                    />
                    {/* Volume Bar */}
                    <Rect 
                      x={x - baseCandleWidth * 0.4} 
                      y={CHART_HEIGHT + VOLUME_HEIGHT - vHeight} 
                      width={baseCandleWidth * 0.8} 
                      height={vHeight} 
                      fill={volColor} 
                    />
                  </G>
                );
              })}
            </Svg>
          </Animated.View>

          {/* Y-Axis Price Labels (Static on right edge) */}
          <View className="absolute right-0 top-0 bottom-0 w-14 bg-black/50 border-l border-zinc-900/80 justify-between py-4 items-center pointer-events-none">
             {[1, 0.75, 0.5, 0.25, 0].map(ratio => (
                <Text key={ratio} className="text-[9px] font-bold text-zinc-500">
                  {(minPrice + priceRange * ratio).toFixed(0)}
                </Text>
              ))}
          </View>

          {/* Crosshairs Overlay */}
          <Animated.View style={[verticalCrosshairStyle, { position: 'absolute', top: 0, bottom: 0, width: 1, backgroundColor: '#a1a1aa', borderStyle: 'dashed' }]} pointerEvents="none" />
          <Animated.View style={[horizontalCrosshairStyle, { position: 'absolute', left: 0, right: 0, height: 1, backgroundColor: '#a1a1aa' }]} pointerEvents="none" />
          
          {/* Mode Indicator Overlay */}
          {mode !== 'PAN' && (
            <View className="absolute top-4 left-4 bg-blue-600/20 border border-blue-500/30 px-3 py-1.5 rounded-full backdrop-blur-md pointer-events-none">
              <Text className="text-blue-400 text-[10px] font-black uppercase tracking-widest">{mode} MODE ACTIVE</Text>
            </View>
          )}

          {/* AMAZING FEATURE: Quick Floating Trade Buttons */}
          {/* Box-none allows touches to pass through empty space to the chart behind */}
          <View className="absolute bottom-6 left-4 right-20 flex-row gap-4" pointerEvents="box-none">
            <TouchableOpacity 
              activeOpacity={0.8}
              onPress={() => handleQuickTrade('BUY')} 
              className="flex-1 bg-emerald-500/90 py-3 rounded-2xl items-center shadow-lg border border-emerald-400/50 backdrop-blur-md"
            >
              <Text className="text-white font-black tracking-widest text-base">BUY</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              activeOpacity={0.8}
              onPress={() => handleQuickTrade('SELL')} 
              className="flex-1 bg-red-500/90 py-3 rounded-2xl items-center shadow-lg border border-red-400/50 backdrop-blur-md"
            >
              <Text className="text-white font-black tracking-widest text-base">SELL</Text>
            </TouchableOpacity>
          </View>

        </View>
      </GestureDetector>

      {/* 3. Bottom Toolbar (Interactive Drawing & Tools) */}
      <View className="bg-zinc-950 border-t border-zinc-900 pb-6 pt-2">
        
        {/* Top row of tools */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} className="flex-row px-4 mb-3">
          <View className="flex-row bg-zinc-900 rounded-xl p-1 mr-4">
            <TouchableOpacity 
              onPress={() => toggleMode('PAN')}
              className={`px-4 py-2 rounded-lg flex-row items-center gap-2 ${mode === 'PAN' ? 'bg-zinc-700' : ''}`}
            >
              <Maximize size={16} color={mode === 'PAN' ? '#fff' : '#a1a1aa'} />
              <Text className={`text-xs font-bold ${mode === 'PAN' ? 'text-white' : 'text-zinc-400'}`}>Pan</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              onPress={() => toggleMode('CROSSHAIR')}
              className={`px-4 py-2 rounded-lg flex-row items-center gap-2 ${mode === 'CROSSHAIR' ? 'bg-zinc-700' : ''}`}
            >
              <Crosshair size={16} color={mode === 'CROSSHAIR' ? '#fff' : '#a1a1aa'} />
              <Text className={`text-xs font-bold ${mode === 'CROSSHAIR' ? 'text-white' : 'text-zinc-400'}`}>Crosshair</Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity className="bg-zinc-900 px-4 py-2 rounded-xl flex-row items-center gap-2 border border-zinc-800 mr-2">
            <Settings2 size={16} color="#a1a1aa" />
            <Text className="text-xs font-bold text-zinc-300">Indicators</Text>
          </TouchableOpacity>
        </ScrollView>

        {/* Drawing Tools row */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} className="flex-row px-4">
          <View className="flex-row items-center mr-3 border-r border-zinc-800 pr-3">
            <PenTool size={14} color="#71717a" />
            <Text className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest ml-1.5">Draw</Text>
          </View>

          <TouchableOpacity 
            onPress={() => toggleMode('DRAW_TREND')}
            className={`mr-2 px-4 py-2 rounded-xl border flex-row items-center gap-2 ${mode === 'DRAW_TREND' ? 'bg-blue-900/30 border-blue-500' : 'bg-zinc-900 border-zinc-800'}`}
          >
            <TrendingUp size={14} color={mode === 'DRAW_TREND' ? '#3b82f6' : '#a1a1aa'} />
            <Text className={`text-xs font-bold ${mode === 'DRAW_TREND' ? 'text-blue-400' : 'text-zinc-400'}`}>Trendline</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            onPress={() => toggleMode('DRAW_FIB')}
            className={`mr-2 px-4 py-2 rounded-xl border flex-row items-center gap-2 ${mode === 'DRAW_FIB' ? 'bg-blue-900/30 border-blue-500' : 'bg-zinc-900 border-zinc-800'}`}
          >
            <Baseline size={14} color={mode === 'DRAW_FIB' ? '#3b82f6' : '#a1a1aa'} />
            <Text className={`text-xs font-bold ${mode === 'DRAW_FIB' ? 'text-blue-400' : 'text-zinc-400'}`}>Fibonacci</Text>
          </TouchableOpacity>
          
          <TouchableOpacity className="mr-4 px-3 py-2 rounded-xl bg-zinc-900 border border-zinc-800 justify-center">
            <Undo size={14} color="#a1a1aa" />
          </TouchableOpacity>
        </ScrollView>
      </View>

    </SafeAreaView>
  );
}