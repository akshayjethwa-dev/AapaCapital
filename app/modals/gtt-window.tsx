import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, KeyboardAvoidingView, Platform, Alert, Dimensions, Keyboard, TouchableWithoutFeedback } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { X, Minus, Plus, ChevronRight, ShieldAlert, Target, TrendingUp, TrendingDown } from 'lucide-react-native';
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

type TransactionType = 'BUY' | 'SELL';
type GTTType = 'SINGLE' | 'OCO';
type ValidityType = '1 DAY' | '1 WEEK' | '1 MONTH' | '1 YEAR';

const { width } = Dimensions.get('window');
const BUTTON_WIDTH = width - 48;
const THUMB_WIDTH = 56;
const SWIPE_RANGE = BUTTON_WIDTH - THUMB_WIDTH - 8;

export default function GTTWindowModal() {
  const router = useRouter();
  const params = useLocalSearchParams();

  // Route Params
  const symbol = (params.symbol as string) || 'RELIANCE';
  const initialLtp = parseFloat((params.ltp as string) || '2850.40');
  const initialTxType = (params.type as TransactionType) || 'SELL'; // GTTs are usually SELL orders on holdings

  // States
  const [txType, setTxType] = useState<TransactionType>(initialTxType);
  const [gttType, setGttType] = useState<GTTType>('OCO');
  const [validity, setValidity] = useState<ValidityType>('1 YEAR');
  const [quantity, setQuantity] = useState<string>('50');

  // Single GTT States
  const [singleTrigger, setSingleTrigger] = useState<string>((initialLtp * 0.95).toFixed(2));
  const [singlePrice, setSinglePrice] = useState<string>((initialLtp * 0.95).toFixed(2));

  // OCO GTT States (Target + Stop Loss)
  const [slTrigger, setSlTrigger] = useState<string>((initialLtp * 0.95).toFixed(2));
  const [slPrice, setSlPrice] = useState<string>((initialLtp * 0.95).toFixed(2));
  const [targetTrigger, setTargetTrigger] = useState<string>((initialLtp * 1.05).toFixed(2));
  const [targetPrice, setTargetPrice] = useState<string>((initialLtp * 1.05).toFixed(2));

  // Theme Variables
  const isBuy = txType === 'BUY';
  const themeColor = isBuy ? 'bg-blue-600' : 'bg-purple-600'; 
  const themeText = isBuy ? 'text-blue-500' : 'text-purple-500';
  const themeBorder = isBuy ? 'border-blue-500' : 'border-purple-500';

  // --- ANIMATION VALUES ---
  const translateX = useSharedValue(0);
  const pulseOpacity = useSharedValue(1);

  useEffect(() => {
    pulseOpacity.value = withRepeat(
      withSequence(withTiming(0.4, { duration: 600 }), withTiming(1, { duration: 600 })),
      -1, true
    );
  }, []);

  const animatedPulse = useAnimatedStyle(() => ({ opacity: pulseOpacity.value }));

  // --- AMAZING FEATURE: RISK / REWARD CALCULATOR ---
  const qtyNum = parseInt(quantity || '0');
  
  const projectedLoss = useMemo(() => {
    const priceDiff = initialLtp - (parseFloat(slPrice) || initialLtp);
    const loss = priceDiff * qtyNum;
    const percent = (priceDiff / initialLtp) * 100;
    return { amount: Math.abs(loss), percent: Math.abs(percent) };
  }, [slPrice, qtyNum, initialLtp]);

  const projectedProfit = useMemo(() => {
    const priceDiff = (parseFloat(targetPrice) || initialLtp) - initialLtp;
    const profit = priceDiff * qtyNum;
    const percent = (priceDiff / initialLtp) * 100;
    return { amount: Math.max(0, profit), percent: Math.max(0, percent) };
  }, [targetPrice, qtyNum, initialLtp]);

  // --- AMAZING FEATURE: QUICK SET BUTTONS ---
  const applyQuickPercent = async (type: 'TARGET' | 'SL', percent: number) => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (type === 'TARGET') {
      const newTarget = (initialLtp * (1 + (percent / 100))).toFixed(2);
      setTargetPrice(newTarget);
      setTargetTrigger(newTarget); // Keep trigger same as limit for simplicity in quick-set
    } else {
      const newSl = (initialLtp * (1 - (percent / 100))).toFixed(2);
      setSlPrice(newSl);
      setSlTrigger(newSl);
    }
  };

  const handleExecute = useCallback(async () => {
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    
    let message = '';
    if (gttType === 'SINGLE') {
      message = `Successfully created SINGLE GTT for ${quantity}x ${symbol}\nTrigger: ₹${singleTrigger} | Limit: ₹${singlePrice}\nValid for: ${validity}`;
    } else {
      message = `Successfully created OCO GTT for ${quantity}x ${symbol}\n\n🛑 Stop-Loss: ₹${slPrice}\n🎯 Target: ₹${targetPrice}\n\nValid for: ${validity}`;
    }

    Alert.alert('GTT Created ⏳', message, [{ text: 'Done', onPress: () => router.back() }]);
  }, [gttType, quantity, symbol, singleTrigger, singlePrice, slPrice, targetPrice, validity, router]);

  // Swipe Gesture Definition
  const panGesture = Gesture.Pan()
    .onUpdate((event) => {
      translateX.value = Math.max(0, Math.min(event.translationX, SWIPE_RANGE));
      if (event.translationX > 0 && event.translationX < SWIPE_RANGE && event.translationX % 20 < 2) {
        runOnJS(Haptics.impactAsync)(Haptics.ImpactFeedbackStyle.Light);
      }
    })
    .onEnd(() => {
      if (translateX.value > SWIPE_RANGE * 0.85) {
        translateX.value = withSpring(SWIPE_RANGE);
        runOnJS(handleExecute)();
      } else {
        translateX.value = withSpring(0, { damping: 15 });
        runOnJS(Haptics.impactAsync)(Haptics.ImpactFeedbackStyle.Medium);
      }
    });

  const animatedThumbStyle = useAnimatedStyle(() => ({ transform: [{ translateX: translateX.value }] }));
  const animatedSliderTrack = useAnimatedStyle(() => ({
    backgroundColor: isBuy ? '#2563eb' : '#9333ea',
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
              <View className="flex-row items-center gap-2">
                <Text className="text-xl font-black text-white tracking-tighter">{symbol}</Text>
                <View className="bg-zinc-800 px-2 py-0.5 rounded">
                  <Text className="text-[10px] font-bold text-zinc-400">GTT</Text>
                </View>
              </View>
              <View className="flex-row items-center gap-2 mt-1">
                <Text className="text-sm font-bold text-zinc-400">
                  ₹{initialLtp.toLocaleString(undefined, {minimumFractionDigits: 2})}
                </Text>
                <Animated.View style={animatedPulse} className="px-1.5 py-0.5 rounded bg-emerald-500/20">
                  <Text className="text-[10px] font-bold text-emerald-500">Live</Text>
                </Animated.View>
              </View>
            </View>
            <TouchableOpacity onPress={() => router.back()} className="p-2 bg-zinc-900 rounded-full">
              <X size={20} color="#a1a1aa" />
            </TouchableOpacity>
          </View>

          <ScrollView className="flex-1 px-6 pt-6" contentContainerStyle={{ paddingBottom: 40 }} keyboardShouldPersistTaps="handled">
            
            {/* BUY / SELL Toggle */}
            <View className="flex-row bg-zinc-900 rounded-xl p-1 mb-6">
              {(['BUY', 'SELL'] as TransactionType[]).map((type) => (
                <TouchableOpacity
                  key={type}
                  onPress={async () => {
                      await Haptics.selectionAsync();
                      setTxType(type);
                  }}
                  className={`flex-1 py-3 items-center rounded-lg ${txType === type ? (type === 'BUY' ? 'bg-blue-600' : 'bg-purple-600') : 'bg-transparent'}`}
                >
                  <Text className={`font-black tracking-widest ${txType === type ? 'text-white' : 'text-zinc-500'}`}>{type}</Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* GTT Type */}
            <View className="flex-row gap-3 mb-6">
              {(['SINGLE', 'OCO'] as GTTType[]).map((type) => (
                <TouchableOpacity
                  key={type}
                  onPress={() => setGttType(type)}
                  className={`flex-1 py-3 items-center rounded-xl border ${gttType === type ? `bg-zinc-800 ${themeBorder}` : 'bg-zinc-900 border-zinc-800'}`}
                >
                  <Text className={`font-bold text-xs ${gttType === type ? 'text-white' : 'text-zinc-500'}`}>{type}</Text>
                  <Text className="text-[9px] text-zinc-500 mt-1">
                    {type === 'SINGLE' ? 'One Trigger' : 'Target + Stoploss'}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Quantity */}
            <View className="mb-6">
              <Text className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 mb-3 ml-1">Quantity</Text>
              <View className="flex-row items-center bg-zinc-900 border border-zinc-800 rounded-xl px-2 h-14">
                <TouchableOpacity onPress={() => setQuantity(p => Math.max(1, parseInt(p || '0') - 1).toString())} className="p-4">
                  <Minus size={16} color="#71717a" />
                </TouchableOpacity>
                <TextInput
                  value={quantity}
                  onChangeText={setQuantity}
                  keyboardType="number-pad"
                  className="flex-1 text-center text-white font-black text-lg"
                />
                <TouchableOpacity onPress={() => setQuantity(p => (parseInt(p || '0') + 1).toString())} className="p-4">
                  <Plus size={16} color="#71717a" />
                </TouchableOpacity>
              </View>
            </View>

            {/* SINGLE GTT INPUTS */}
            {gttType === 'SINGLE' && (
              <View className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-4 mb-6">
                <View className="flex-row gap-4">
                  <View className="flex-1">
                    <Text className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 mb-2">Trigger Price</Text>
                    <TextInput
                      value={singleTrigger}
                      onChangeText={setSingleTrigger}
                      keyboardType="decimal-pad"
                      className="bg-zinc-900 border border-zinc-800 rounded-xl h-12 text-center text-white font-black"
                    />
                  </View>
                  <View className="flex-1">
                    <Text className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 mb-2">Limit Price</Text>
                    <TextInput
                      value={singlePrice}
                      onChangeText={setSinglePrice}
                      keyboardType="decimal-pad"
                      className="bg-zinc-900 border border-zinc-800 rounded-xl h-12 text-center text-white font-black"
                    />
                  </View>
                </View>
              </View>
            )}

            {/* OCO GTT INPUTS (WITH P&L PROJECTIONS & QUICK BUTTONS) */}
            {gttType === 'OCO' && (
              <View className="mb-6">
                
                {/* Stop Loss Section */}
                <View className="bg-red-950/20 border border-red-900/40 rounded-3xl p-5 mb-5">
                  <View className="flex-row justify-between items-center mb-4">
                    <View className="flex-row items-center gap-2">
                      <ShieldAlert size={18} color="#ef4444" />
                      <Text className="text-sm font-black text-red-400 uppercase tracking-widest">Stop Loss</Text>
                    </View>
                    {/* Quick Select Buttons */}
                    <View className="flex-row gap-2">
                      {[3, 5, 10].map((pct) => (
                        <TouchableOpacity key={`sl-${pct}`} onPress={() => applyQuickPercent('SL', pct)} className="bg-red-500/10 px-2 py-1 rounded">
                          <Text className="text-[10px] font-bold text-red-400">-{pct}%</Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </View>

                  <View className="flex-row gap-4 mb-4">
                    <View className="flex-1">
                      <Text className="text-[10px] font-bold uppercase tracking-widest text-red-500/70 mb-2">Trigger Price</Text>
                      <TextInput
                        value={slTrigger}
                        onChangeText={setSlTrigger}
                        keyboardType="decimal-pad"
                        className="bg-red-950/40 border border-red-900/50 rounded-xl h-14 text-center text-red-100 font-black text-lg"
                      />
                    </View>
                    <View className="flex-1">
                      <Text className="text-[10px] font-bold uppercase tracking-widest text-red-500/70 mb-2">Limit Price</Text>
                      <TextInput
                        value={slPrice}
                        onChangeText={setSlPrice}
                        keyboardType="decimal-pad"
                        className="bg-red-950/40 border border-red-900/50 rounded-xl h-14 text-center text-red-100 font-black text-lg"
                      />
                    </View>
                  </View>

                  {/* Projected Risk */}
                  <View className="flex-row items-center justify-between bg-red-950/50 rounded-xl p-3">
                    <Text className="text-xs text-red-300/70 font-bold">Projected Risk:</Text>
                    <View className="flex-row items-center gap-2">
                      <TrendingDown size={14} color="#ef4444" />
                      <Text className="text-red-400 font-black">-₹{projectedLoss.amount.toFixed(2)}</Text>
                      <Text className="text-red-500/80 text-[10px] font-bold">(-{projectedLoss.percent.toFixed(1)}%)</Text>
                    </View>
                  </View>
                </View>

                {/* Target Section */}
                <View className="bg-emerald-950/20 border border-emerald-900/40 rounded-3xl p-5">
                  <View className="flex-row justify-between items-center mb-4">
                    <View className="flex-row items-center gap-2">
                      <Target size={18} color="#10b981" />
                      <Text className="text-sm font-black text-emerald-400 uppercase tracking-widest">Target</Text>
                    </View>
                    {/* Quick Select Buttons */}
                    <View className="flex-row gap-2">
                      {[5, 10, 20].map((pct) => (
                        <TouchableOpacity key={`tgt-${pct}`} onPress={() => applyQuickPercent('TARGET', pct)} className="bg-emerald-500/10 px-2 py-1 rounded">
                          <Text className="text-[10px] font-bold text-emerald-400">+{pct}%</Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </View>

                  <View className="flex-row gap-4 mb-4">
                    <View className="flex-1">
                      <Text className="text-[10px] font-bold uppercase tracking-widest text-emerald-500/70 mb-2">Trigger Price</Text>
                      <TextInput
                        value={targetTrigger}
                        onChangeText={setTargetTrigger}
                        keyboardType="decimal-pad"
                        className="bg-emerald-950/40 border border-emerald-900/50 rounded-xl h-14 text-center text-emerald-100 font-black text-lg"
                      />
                    </View>
                    <View className="flex-1">
                      <Text className="text-[10px] font-bold uppercase tracking-widest text-emerald-500/70 mb-2">Limit Price</Text>
                      <TextInput
                        value={targetPrice}
                        onChangeText={setTargetPrice}
                        keyboardType="decimal-pad"
                        className="bg-emerald-950/40 border border-emerald-900/50 rounded-xl h-14 text-center text-emerald-100 font-black text-lg"
                      />
                    </View>
                  </View>

                  {/* Projected Profit */}
                  <View className="flex-row items-center justify-between bg-emerald-950/50 rounded-xl p-3">
                    <Text className="text-xs text-emerald-300/70 font-bold">Projected Reward:</Text>
                    <View className="flex-row items-center gap-2">
                      <TrendingUp size={14} color="#10b981" />
                      <Text className="text-emerald-400 font-black">+₹{projectedProfit.amount.toFixed(2)}</Text>
                      <Text className="text-emerald-500/80 text-[10px] font-bold">(+{projectedProfit.percent.toFixed(1)}%)</Text>
                    </View>
                  </View>
                </View>

              </View>
            )}

            {/* Validity */}
            <Text className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 mb-3 ml-1">Validity Period</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mb-8 flex-row" contentContainerStyle={{ gap: 12 }}>
              {(['1 DAY', '1 WEEK', '1 MONTH', '1 YEAR'] as ValidityType[]).map((v) => (
                <TouchableOpacity
                  key={v}
                  onPress={() => setValidity(v)}
                  className={`px-5 py-3 items-center rounded-xl border ${validity === v ? `bg-zinc-800 ${themeBorder}` : 'bg-zinc-900 border-zinc-800'}`}
                >
                  <Text className={`font-bold text-xs ${validity === v ? 'text-white' : 'text-zinc-500'}`}>{v}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

          </ScrollView>

          {/* Footer: Swipe to Execute */}
          <View className="px-6 py-5 bg-zinc-950 border-t border-zinc-900">
            <View className="bg-zinc-900 rounded-2xl h-16 justify-center overflow-hidden border border-zinc-800">
              <Animated.View style={animatedSliderTrack} />
              <Text className={`absolute w-full text-center text-sm font-black tracking-[0.2em] uppercase ${themeText}`}>
                Swipe to Create GTT
              </Text>
              <GestureDetector gesture={panGesture}>
                <Animated.View 
                  style={[animatedThumbStyle, { width: THUMB_WIDTH, height: THUMB_WIDTH }]}
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