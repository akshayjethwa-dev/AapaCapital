import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { ArrowUpRight, ArrowDownRight } from 'lucide-react-native';
import { Index } from '../../store/marketStore';
import { Colors } from '../../theme/colors';
import { cn } from '../../utils/cn';

export const IndexCard = ({ item }: { item: Index }) => {
  const isPositive = item.price.change >= 0;

  return (
    <TouchableOpacity className="min-w-[140px] bg-zinc-900/40 border border-zinc-800/50 rounded-xl p-3 mr-3 active:bg-zinc-800 transition-colors">
      <View className="flex-row justify-between items-start mb-1">
        <Text className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">{item.symbol}</Text>
      </View>
      <Text className="text-base font-black text-white tracking-tight">
        {item.price.current.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
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
          {isPositive ? '+' : ''}{item.price.change} ({item.price.changePercent}%)
        </Text>
      </View>
    </TouchableOpacity>
  );
};