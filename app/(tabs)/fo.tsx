import React from 'react';
import { View, Text, ScrollView, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Zap, Activity, ShieldCheck, Target } from 'lucide-react-native';
import { useMarketStore } from '../../src/store/marketStore';
import { useTicker } from '../../src/hooks/useTicker';
import { Colors } from '../../src/theme/colors';

export default function FODashboardScreen() {
  const router = useRouter();
  const spotNifty = useTicker('NIFTY 50') || 22000;

  return (
    <SafeAreaView className="flex-1 bg-black">
      <View className="px-6 py-4 border-b border-zinc-900">
        <Text className="text-2xl font-black text-white tracking-tighter">Derivatives</Text>
      </View>

      <ScrollView className="flex-1 px-6 pt-6 space-y-8" contentContainerStyle={{ paddingBottom: 100 }}>
        
        {/* Option Chain Quick Access */}
        <View>
          <Text className="text-[11px] font-bold uppercase tracking-widest text-zinc-500 mb-4 ml-1">
            Index Options
          </Text>
          <View className="bg-zinc-900/30 border border-zinc-800/50 rounded-2xl overflow-hidden">
            {['NIFTY 50', 'BANKNIFTY', 'FINNIFTY'].map((idx, i) => (
              <TouchableOpacity 
                key={idx}
                onPress={() => router.push({ pathname: '/modals/option-chain', params: { symbol: idx } })}
                className={`p-4 flex-row items-center justify-between ${i !== 0 ? 'border-t border-zinc-800/50' : ''}`}
              >
                <View className="flex-row items-center gap-3">
                  <View className="w-10 h-10 bg-emerald-500/10 rounded-xl items-center justify-center border border-emerald-500/20">
                    <Zap size={18} color={Colors.trend.positive} />
                  </View>
                  <View>
                    <Text className="text-sm font-black text-white tracking-tight">{idx}</Text>
                    <Text className="text-[10px] font-bold text-zinc-500 uppercase mt-0.5">Option Chain</Text>
                  </View>
                </View>
                <View className="items-end">
                  <Text className="text-sm font-bold text-white">{idx === 'NIFTY 50' ? spotNifty.toLocaleString() : '---'}</Text>
                  <Text className="text-[10px] font-bold text-emerald-500 mt-0.5">Open ↗</Text>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Scalper Mode Banner */}
        <View className="bg-gradient-to-br from-blue-900/40 to-black border border-blue-900/50 rounded-3xl p-6 mt-6">
          <View className="flex-row items-center gap-2 mb-2">
            <Activity size={18} color="#60a5fa" />
            <Text className="text-[10px] font-black text-blue-400 uppercase tracking-widest">Pro Feature</Text>
          </View>
          <Text className="text-xl font-black text-white tracking-tighter mb-2">Scalper Mode</Text>
          <Text className="text-xs font-medium text-zinc-400 mb-4 leading-relaxed">
            Execute F&O trades in milliseconds with single-tap order placement and instant position tracking.
          </Text>
          <TouchableOpacity className="bg-blue-500 py-3 rounded-xl items-center">
            <Text className="text-[10px] font-black text-black uppercase tracking-widest">Enable Scalping</Text>
          </TouchableOpacity>
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}