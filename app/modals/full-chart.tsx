import React, { useState, useEffect, useMemo } from 'react';
import { View, Text, TouchableOpacity, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { ChevronDown } from 'lucide-react-native';
import { useTicker } from '../../src/hooks/useTicker';
import { CandlestickChart, CandleData } from '../../src/components/charts/CandlestickChart';
import { Button } from '../../src/components/shared/Button';
import { Colors } from '../../src/theme/colors';
import { cn } from '../../src/utils/cn';

export default function FullChartModal() {
  const router = useRouter();
  // Pass symbol via router params (e.g., router.push({ pathname: '/modals/full-chart', params: { symbol: 'RELIANCE' } }))
  const { symbol = 'NIFTY 50' } = useLocalSearchParams<{ symbol: string }>();
  const [timeframe, setTimeframe] = useState('5m');
  
  // Hook into live WebSocket data
  const currentPrice = useTicker(symbol) || 22000; 

  // Generate mock historical data based on current price
  const historicalData = useMemo(() => {
    const base = currentPrice;
    return Array.from({ length: 30 }).map((_, i) => {
      const open = base + Math.sin(i) * 50;
      const close = open + (Math.random() - 0.5) * 40;
      return {
        open,
        high: Math.max(open, close) + Math.random() * 20,
        low: Math.min(open, close) - Math.random() * 20,
        close,
      };
    });
  }, [symbol, timeframe]); // Regenerate if symbol or timeframe changes

  // Append the live price to the final candle to make the chart "breathe"
  const liveChartData = useMemo(() => {
    const data = [...historicalData];
    const lastCandle = data[data.length - 1];
    
    data[data.length - 1] = {
      ...lastCandle,
      close: currentPrice, // Live update
      high: Math.max(lastCandle.high, currentPrice),
      low: Math.min(lastCandle.low, currentPrice),
    };
    return data;
  }, [historicalData, currentPrice]);

  return (
    <SafeAreaView className="flex-1 bg-black">
      {/* Header */}
      <View className="px-6 py-4 border-b border-zinc-900 flex-row justify-between items-center bg-black/80">
        <View className="flex-row items-center gap-3">
          <TouchableOpacity onPress={() => router.back()} className="p-2 rounded-xl bg-zinc-900">
            <ChevronDown size={24} color={Colors.text.secondary} />
          </TouchableOpacity>
          <View>
            <Text className="text-sm font-black text-white tracking-tight">{symbol}</Text>
            <Text className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Live Chart • {timeframe}</Text>
          </View>
        </View>
        <View className="items-end">
          <Text className={cn(
            "text-lg font-black tracking-tighter",
            currentPrice >= historicalData[historicalData.length - 1].open ? "text-emerald-500" : "text-rose-500"
          )}>
            ₹{currentPrice.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </Text>
          <Text className="text-[10px] font-bold text-zinc-500">{(Math.random() * 2).toFixed(2)}%</Text>
        </View>
      </View>

      {/* Toolbar */}
      <View className="px-6 py-3 border-b border-zinc-900 flex-row justify-between items-center">
        <ScrollView horizontal showsHorizontalScrollIndicator={false} className="flex-row gap-1">
          {['1m', '5m', '15m', '1h', '1D'].map(tf => (
            <TouchableOpacity 
              key={tf}
              onPress={() => setTimeframe(tf)}
              className={cn(
                "px-3 py-1.5 rounded-lg mr-2",
                timeframe === tf ? "bg-zinc-800" : "bg-transparent"
              )}
            >
              <Text className={cn(
                "text-[10px] font-black uppercase tracking-widest",
                timeframe === tf ? "text-white" : "text-zinc-500"
              )}>
                {tf}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
        
        {/* Indicators Toggle */}
        <View className="flex-row gap-2">
          <View className="flex-row items-center gap-1 px-2 py-1 rounded-lg bg-blue-500/10 border border-blue-500/20">
            <View className="w-1.5 h-1.5 rounded-full bg-blue-500" />
            <Text className="text-[8px] font-black text-blue-500 uppercase">EMA</Text>
          </View>
        </View>
      </View>

      {/* Chart Area */}
      <View className="flex-1 p-4 relative justify-center">
        <CandlestickChart data={liveChartData} />
      </View>

      {/* Footer Actions */}
      <View className="p-6 bg-black border-t border-zinc-900 flex-row gap-4">
        <Button 
          title="SELL" 
          variant="danger" 
          onPress={() => {
             // Open order modal config for SELL
          }} 
        />
        <Button 
          title="BUY" 
          variant="primary" 
          onPress={() => {
             // Open order modal config for BUY
          }} 
        />
      </View>
    </SafeAreaView>
  );
}