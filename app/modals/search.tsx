import React, { useState, useEffect, useMemo } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { ChevronRight, Search, X } from 'lucide-react-native';
import { useMarketStore } from '../../src/store/marketStore';
import { useSearchStore } from '../../src/store/searchStore';
import { useDebounce } from '../../src/hooks/useDebounce';
import { Colors } from '../../src/theme/colors';
import { cn } from '../../src/utils/cn';

type Category = 'All' | 'Equity' | 'Indices' | 'F&O' | 'Mutual Funds';
const CATEGORIES: Category[] = ['All', 'Equity', 'Indices', 'F&O', 'Mutual Funds'];

export default function SearchModal() {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState<Category>('All');
  
  // Custom Hook for Debouncing
  const debouncedQuery = useDebounce(query, 300);
  
  // Stores
  const { stocks, indices } = useMarketStore();
  const { recentSearches, loadRecentSearches, addRecentSearch, clearRecentSearches } = useSearchStore();

  useEffect(() => {
    loadRecentSearches();
  }, []);

  // Filter Logic
  const searchResults = useMemo(() => {
    if (!debouncedQuery) return [];
    
    const lowerQuery = debouncedQuery.toLowerCase();
    let results: any[] = [];

    if (activeCategory === 'All' || activeCategory === 'Equity') {
      results = [...results, ...stocks.filter(s => 
        s.symbol.toLowerCase().includes(lowerQuery) || 
        s.name.toLowerCase().includes(lowerQuery)
      ).map(s => ({ ...s, type: 'Equity' }))];
    }

    if (activeCategory === 'All' || activeCategory === 'Indices') {
      results = [...results, ...indices.filter(i => 
        i.symbol.toLowerCase().includes(lowerQuery)
      ).map(i => ({ ...i, type: 'Index' }))];
    }

    // You can add F&O and Mutual Funds logic here as the data grows in marketStore

    return results.slice(0, 15); // Limit results for performance
  }, [debouncedQuery, activeCategory, stocks, indices]);

  const handleSelectResult = async (symbol: string) => {
    await addRecentSearch(symbol);
    // Route to market detail screen or chart
    router.replace({ pathname: '/(tabs)/market', params: { symbol } });
  };

  return (
    <SafeAreaView className="flex-1 bg-black/95">
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} className="flex-1">
        
        {/* Search Header */}
        <View className="px-6 py-4 flex-row items-center gap-4 border-b border-zinc-900">
          <TouchableOpacity onPress={() => router.back()} className="p-2 -ml-2 rounded-full active:bg-zinc-900">
            <ChevronRight size={24} color={Colors.text.secondary} className="rotate-180" />
          </TouchableOpacity>
          
          <View className="flex-1 relative justify-center">
            <View className="absolute left-4 z-10">
              <Search size={18} color={Colors.text.muted} />
            </View>
            <TextInput
              autoFocus
              value={query}
              onChangeText={setQuery}
              placeholder="Search Stocks, Indices, F&O..."
              placeholderTextColor={Colors.text.muted}
              className="w-full bg-zinc-900 border border-zinc-800 rounded-2xl py-3 pl-12 pr-10 text-sm font-bold text-white focus:border-emerald-500/50"
            />
            {query.length > 0 && (
              <TouchableOpacity 
                onPress={() => setQuery('')} 
                className="absolute right-4 z-10 p-1 bg-zinc-800 rounded-full"
              >
                <X size={12} color={Colors.text.secondary} />
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Category Filters */}
        <View className="py-3 border-b border-zinc-900/50">
          <ScrollView horizontal showsHorizontalScrollIndicator={false} className="px-6 flex-row gap-2">
            {CATEGORIES.map(cat => (
              <TouchableOpacity
                key={cat}
                onPress={() => setActiveCategory(cat)}
                className={cn(
                  "px-4 py-2 rounded-xl border transition-colors mr-2",
                  activeCategory === cat 
                    ? "bg-zinc-800 border-zinc-700" 
                    : "bg-transparent border-transparent"
                )}
              >
                <Text className={cn(
                  "text-[10px] font-bold uppercase tracking-widest",
                  activeCategory === cat ? "text-white" : "text-zinc-500"
                )}>
                  {cat}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* Results or Recent Searches Area */}
        <ScrollView className="flex-1 px-6 pt-4" keyboardShouldPersistTaps="handled">
          
          {/* Default State: Recent Searches */}
          {!debouncedQuery && (
            <View className="space-y-4">
              <View className="flex-row justify-between items-center mb-4">
                <Text className="text-[10px] font-bold text-zinc-600 uppercase tracking-widest">Recent Searches</Text>
                {recentSearches.length > 0 && (
                  <TouchableOpacity onPress={clearRecentSearches}>
                    <Text className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Clear All</Text>
                  </TouchableOpacity>
                )}
              </View>
              
              {recentSearches.length === 0 ? (
                <Text className="text-sm font-bold text-zinc-700 text-center py-10">No recent searches</Text>
              ) : (
                <View className="flex-row flex-wrap gap-2">
                  {recentSearches.map(s => (
                    <TouchableOpacity 
                      key={s} 
                      onPress={() => handleSelectResult(s)}
                      className="px-4 py-2 mb-2 rounded-xl bg-zinc-900 border border-zinc-800 active:bg-zinc-800"
                    >
                      <Text className="text-xs font-bold text-zinc-300">{s}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </View>
          )}

          {/* Searching State: Results */}
          {debouncedQuery.length > 0 && searchResults.length === 0 && (
            <View className="items-center py-20">
              <Search size={32} color={Colors.text.muted} className="mb-4 opacity-50" />
              <Text className="text-sm font-bold text-zinc-500 uppercase tracking-widest">No results found</Text>
            </View>
          )}

          {debouncedQuery.length > 0 && searchResults.map((item, index) => (
            <TouchableOpacity 
              key={`${item.symbol}-${index}`}
              onPress={() => handleSelectResult(item.symbol)}
              className="bg-zinc-900/40 border border-zinc-800/50 rounded-2xl p-4 flex-row justify-between items-center mb-3 active:bg-zinc-800"
            >
              <View className="flex-row items-center gap-4">
                <View className="w-10 h-10 rounded-xl bg-zinc-900 items-center justify-center">
                  <Text className="font-bold text-xs text-zinc-500">{item.symbol.substring(0, 2)}</Text>
                </View>
                <View>
                  <Text className="text-sm font-bold text-white tracking-tight">{item.symbol}</Text>
                  <Text className="text-[10px] font-bold text-zinc-600 uppercase mt-0.5">NSE • {item.type}</Text>
                </View>
              </View>
              <View className="items-end">
                <Text className="text-sm font-bold text-white">
                  ₹{item.price.current.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </Text>
                <Text className={cn(
                  "text-[10px] font-bold mt-0.5",
                  item.price.change >= 0 ? "text-emerald-500" : "text-rose-500"
                )}>
                  {item.price.change >= 0 ? '+' : ''}{item.price.changePercent}%
                </Text>
              </View>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}