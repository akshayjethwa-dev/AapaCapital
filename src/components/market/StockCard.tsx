import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { Stock } from '../../store/marketStore';
import { cn } from '../../utils/cn';

export const StockCard = ({ item }: { item: Stock }) => {
  const isPositive = item.price.change >= 0;

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
          ₹{item.price.current.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
        </Text>
        <Text className={cn(
          "text-[10px] font-bold mt-0.5",
          isPositive ? "text-emerald-500" : "text-rose-500"
        )}>
          {isPositive ? '+' : ''}{item.price.changePercent}%
        </Text>
      </View>
    </TouchableOpacity>
  );
};