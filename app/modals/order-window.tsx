import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, KeyboardAvoidingView, Platform, Alert, Dimensions, Keyboard, TouchableWithoutFeedback } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { X, Info, Minus, Plus, ChevronRight } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, { 
  useSharedValue, 
  useAnimatedStyle, 
  withSpring, 
  withRepeat, 
  withSequence, 
  withTiming, 
  runOnJS 
} from 'react-native-reanimated';

// Import the live ticker hook
import { useTicker } from '../../src/hooks/useTicker';

type OrderType = 'MARKET' | 'LIMIT' | 'SL' | 'SL-M' | 'AMO';
type ProductType = 'MIS' | 'CNC' | 'NRML';
type TransactionType = 'BUY' | 'SELL';

interface MarginBreakdown {
  available: number;
  required: number;
  charges: number;
  shortfall: number;
}

const { width } = Dimensions.get('window');
const BUTTON_WIDTH = width - 48; // Screen width minus padding
const THUMB_WIDTH = 56;
const SWIPE_RANGE = BUTTON_WIDTH - THUMB_WIDTH - 8; // 8 for internal padding

export default function OrderWindowModal() {
  const router = useRouter();
  const params = useLocalSearchParams();

  // Route Params
  const symbol = (params.symbol as string) || 'NIFTY 50';
  const initialLtp = parseFloat((params.ltp as string) || '22500.40');
  const initialTxType = (params.type as TransactionType) || 'BUY';

  // --- NEW: LIVE TICKER DATA ---
  const liveTicker = useTicker(symbol);
  const currentLtp = liveTicker.current || initialLtp;
  const isPositive = liveTicker.change >= 0;

  // States
  const [txType, setTxType] = useState<TransactionType>(initialTxType);
  const [productType, setProductType] = useState<ProductType>('MIS');
  const [orderType, setOrderType] = useState<OrderType>('MARKET');
  const [quantity, setQuantity] = useState<string>('50');
  const [price, setPrice] = useState<string>(initialLtp.toString());
  const [triggerPrice, setTriggerPrice] = useState<string>('');
  const [margin, setMargin] = useState<MarginBreakdown>({ available: 245000, required: 0, charges: 0, shortfall: 0 });

  // Theme Variables
  const isBuy = txType === 'BUY';
  const themeColor = isBuy ? 'bg-emerald-500' : 'bg-red-500';
  const themeBorder = isBuy ? 'border-emerald-500' : 'border-red-500';
  const themeText = isBuy ? 'text-emerald-500' : 'text-red-500';

  // --- ANIMATION VALUES ---
  const translateX = useSharedValue(0);
  const pulseOpacity = useSharedValue(1);

  // Live Price Pulse Animation
  useEffect(() => {
    pulseOpacity.value = withRepeat(
      withSequence(
        withTiming(0.4, { duration: 600 }),
        withTiming(1, { duration: 600 })
      ),
      -1, // infinite
      true // reverse
    );
  }, []);

  const animatedPulse = useAnimatedStyle(() => ({
    opacity: pulseOpacity.value,
  }));

  // Margin Calculator
  const calculateMargin = useCallback((qty: number, prc: number, pType: ProductType) => {
    const available = 245000; 
    const leverageMultiplier = pType === 'MIS' ? 0.2 : 1.0;
    let required = qty * prc * leverageMultiplier;
    
    // F&O Selling requires high margin
    if (pType === 'NRML' && !isBuy) required = (qty * prc * 0.15) + 50000; 
    
    return {
      available,
      required,
      charges: required * 0.0003,
      shortfall: required > available ? required - available : 0,
    };
  }, [isBuy]);

  // Recalculates margin dynamically when the live price ticks
  useEffect(() => {
    const numQty = parseFloat(quantity) || 0;
    const numPrice = (orderType === 'MARKET' || orderType === 'SL-M') ? currentLtp : (parseFloat(price) || currentLtp);
    setMargin(calculateMargin(numQty, numPrice, productType));
  }, [quantity, price, orderType, productType, calculateMargin, currentLtp]);

  // Execute Order Logic
  const handleExecute = useCallback(async () => {
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    
    if (margin.shortfall > 0) {
        Alert.alert('Margin Shortfall', `You need ₹${margin.shortfall.toLocaleString()} more to place this order.`);
        translateX.value = withSpring(0); // Reset slider
        return;
    }

    Alert.alert(
      'Order Submitted 🚀', 
      `Successfully placed ${txType} order for ${quantity}x ${symbol}\nType: ${orderType} | Product: ${productType}`,
      [{ text: 'Done', onPress: () => router.back() }]
    );
  }, [margin.shortfall, txType, quantity, symbol, orderType, productType, router, translateX]);

  // Swipe Gesture Definition
  const panGesture = Gesture.Pan()
    .onUpdate((event) => {
      // Clamp the swipe within the button bounds
      translateX.value = Math.max(0, Math.min(event.translationX, SWIPE_RANGE));
      
      // Haptic feedback as you drag (optional but feels amazing)
      if (event.translationX > 0 && event.translationX < SWIPE_RANGE && event.translationX % 20 < 2) {
        runOnJS(Haptics.impactAsync)(Haptics.ImpactFeedbackStyle.Light);
      }
    })
    .onEnd(() => {
      if (translateX.value > SWIPE_RANGE * 0.85) {
        // Successful swipe
        translateX.value = withSpring(SWIPE_RANGE);
        runOnJS(handleExecute)();
      } else {
        // Failed swipe, snap back
        translateX.value = withSpring(0, { damping: 15 });
        runOnJS(Haptics.impactAsync)(Haptics.ImpactFeedbackStyle.Medium);
      }
    });

  const animatedThumbStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
  }));

  const animatedSliderTrack = useAnimatedStyle(() => ({
    backgroundColor: isBuy ? '#10b981' : '#ef4444',
    width: translateX.value + THUMB_WIDTH,
    opacity: 0.2,
    position: 'absolute',
    height: '100%',
    borderRadius: 16,
  }));

  return (
    <SafeAreaView className="flex-1 bg-zinc-950" edges={['top']}>
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} className="flex-1">
          
          {/* Header */}
          <View className="px-6 py-4 flex-row justify-between items-center border-b border-zinc-900">
            <View>
              <Text className="text-xl font-black text-white tracking-tighter">{symbol}</Text>
              <View className="flex-row items-center gap-2 mt-1">
                <Text className="text-sm font-bold text-zinc-400">
                  ₹{currentLtp.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}
                </Text>
                {/* Live pulsing indicator with real data */}
                <Animated.View style={animatedPulse} className={`px-1.5 py-0.5 rounded ${isPositive ? 'bg-emerald-500/20' : 'bg-red-500/20'}`}>
                  <Text className={`text-[10px] font-bold ${isPositive ? 'text-emerald-500' : 'text-red-500'}`}>
                    {isPositive ? '+' : ''}{(liveTicker.changePercent || 0).toFixed(2)}%
                  </Text>
                </Animated.View>
              </View>
            </View>
            <TouchableOpacity onPress={() => router.back()} className="p-2 bg-zinc-900 rounded-full">
              <X size={20} color="#a1a1aa" />
            </TouchableOpacity>
          </View>

          <ScrollView className="flex-1 px-6 pt-6" contentContainerStyle={{ paddingBottom: 40 }} keyboardShouldPersistTaps="handled">
            
            {/* BUY / SELL Toggle */}
            <View className="flex-row bg-zinc-900 rounded-xl p-1 mb-8">
              {(['BUY', 'SELL'] as TransactionType[]).map((type) => (
                <TouchableOpacity
                  key={type}
                  onPress={async () => {
                      await Haptics.selectionAsync();
                      setTxType(type);
                  }}
                  className={`flex-1 py-3 items-center rounded-lg ${txType === type ? (type === 'BUY' ? 'bg-emerald-500' : 'bg-red-500') : 'bg-transparent'}`}
                >
                  <Text className={`font-black tracking-widest ${txType === type ? 'text-white' : 'text-zinc-500'}`}>{type}</Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Product Types */}
            <Text className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 mb-3 ml-1">Product</Text>
            <View className="flex-row gap-3 mb-8">
              {(['MIS', 'CNC', 'NRML'] as ProductType[]).map((type) => (
                <TouchableOpacity
                  key={type}
                  onPress={() => setProductType(type)}
                  className={`flex-1 py-3 items-center rounded-xl border ${productType === type ? `bg-zinc-800 ${themeBorder}` : 'bg-zinc-900 border-zinc-800'}`}
                >
                  <Text className={`font-bold text-xs ${productType === type ? 'text-white' : 'text-zinc-500'}`}>{type}</Text>
                  <Text className="text-[9px] text-zinc-500 mt-1">
                    {type === 'MIS' ? 'Intraday' : type === 'CNC' ? 'Delivery' : 'Options'}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Order Types */}
            <Text className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 mb-3 ml-1">Order Type</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mb-8 flex-row" contentContainerStyle={{ gap: 12 }}>
              {(['MARKET', 'LIMIT', 'SL', 'SL-M', 'AMO'] as OrderType[]).map((type) => (
                <TouchableOpacity
                  key={type}
                  onPress={() => setOrderType(type)}
                  className={`px-5 py-3 items-center rounded-xl border ${orderType === type ? `bg-zinc-800 ${themeBorder}` : 'bg-zinc-900 border-zinc-800'}`}
                >
                  <Text className={`font-bold text-xs ${orderType === type ? 'text-white' : 'text-zinc-500'}`}>{type}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            {/* Quantity & Price Inputs */}
            <View className="flex-row gap-4 mb-8">
              {/* Quantity */}
              <View className="flex-1">
                <Text className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 mb-3 ml-1">Quantity</Text>
                <View className="flex-row items-center bg-zinc-900 border border-zinc-800 rounded-xl px-2 h-14">
                  <TouchableOpacity onPress={() => setQuantity(p => Math.max(1, parseInt(p || '0') - 1).toString())} className="p-2">
                    <Minus size={16} color="#71717a" />
                  </TouchableOpacity>
                  <TextInput
                    value={quantity}
                    onChangeText={setQuantity}
                    keyboardType="number-pad"
                    className="flex-1 text-center text-white font-black text-lg"
                  />
                  <TouchableOpacity onPress={() => setQuantity(p => (parseInt(p || '0') + 1).toString())} className="p-2">
                    <Plus size={16} color="#71717a" />
                  </TouchableOpacity>
                </View>
              </View>

              {/* Price */}
              <View className="flex-1">
                <Text className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 mb-3 ml-1">Price</Text>
                <View className={`flex-row items-center rounded-xl px-4 h-14 border ${orderType === 'MARKET' || orderType === 'SL-M' ? 'bg-zinc-900/50 border-zinc-800/50' : 'bg-zinc-900 border-zinc-800'}`}>
                  <TextInput
                    value={orderType === 'MARKET' || orderType === 'SL-M' ? 'MARKET' : price}
                    onChangeText={setPrice}
                    keyboardType="decimal-pad"
                    editable={orderType !== 'MARKET' && orderType !== 'SL-M'}
                    className={`flex-1 text-center font-black text-lg ${orderType === 'MARKET' || orderType === 'SL-M' ? 'text-zinc-600' : 'text-white'}`}
                  />
                </View>
              </View>
            </View>

          </ScrollView>

          {/* Footer: Margin Calc & Swipe to Execute */}
          <View className="px-6 py-5 bg-zinc-950 border-t border-zinc-900">
            <View className="flex-row justify-between items-center mb-6">
              <View className="flex-row items-center gap-1.5">
                <Text className="text-xs text-zinc-400 font-medium">Margin Req.</Text>
                <Info size={14} color="#71717a" />
              </View>
              <View className="items-end">
                <Text className={`font-black text-base ${margin.shortfall > 0 ? 'text-red-400' : 'text-white'}`}>
                  ₹{margin.required.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}
                </Text>
                <Text className="text-[10px] text-zinc-500 font-bold mt-0.5">Avail: ₹{margin.available.toLocaleString()}</Text>
              </View>
            </View>

            {/* THE SWIPE TO TRADE BUTTON */}
            <View className="bg-zinc-900 rounded-2xl h-16 justify-center overflow-hidden border border-zinc-800">
              {/* Animated Track background expanding on drag */}
              <Animated.View style={animatedSliderTrack} />
              
              <Text className={`absolute w-full text-center text-sm font-black tracking-[0.2em] uppercase ${themeText}`}>
                {margin.shortfall > 0 ? 'Insufficient Funds' : `Swipe to ${txType}`}
              </Text>

              <GestureDetector gesture={panGesture}>
                <Animated.View 
                  style={[
                    animatedThumbStyle, 
                    { width: THUMB_WIDTH, height: THUMB_WIDTH }
                  ]}
                  className={`absolute left-1 rounded-xl items-center justify-center shadow-lg ${themeColor}`}
                >
                  <ChevronRight size={28} color="white" strokeWidth={3} />
                </Animated.View>
              </GestureDetector>
            </View>

          </View>

        </KeyboardAvoidingView>
      </TouchableWithoutFeedback>
    </SafeAreaView>
  );
}