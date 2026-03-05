import React, { useState, useRef, useEffect, useMemo } from 'react';
import { View, Text, TouchableOpacity, FlatList, Dimensions } from 'react-native';
import { useTicker } from '../../hooks/useTicker';
import { Colors } from '../../theme/colors';
import { cn } from '../../utils/cn';

export interface Option {
  strike: number;
  type: 'CE' | 'PE';
  price: number;
  oi: number;
  delta: number;
  theta: number;
}

interface OptionChainProps {
  symbol: string;
  expiry: string;
  onTrade: (option: Option, type: 'BUY' | 'SELL') => void;
}

const ITEM_HEIGHT = 56;

export const OptionChain = ({ symbol, expiry, onTrade }: OptionChainProps) => {
  const flatListRef = useRef<FlatList>(null);
  const spotPrice = useTicker(symbol) || 22000;
  
  const [viewMode, setViewMode] = useState<'Price' | 'Greeks'>('Price');
  const [selectedOption, setSelectedOption] = useState<{ strike: number, type: 'CE' | 'PE' } | null>(null);

  const strikeInterval = symbol.includes('BANKNIFTY') ? 100 : 50;
  const baseStrike = Math.round(spotPrice / strikeInterval) * strikeInterval;

  // Generate 41 strikes (20 ITM, 1 ATM, 20 OTM)
  const strikes = useMemo(() => {
    return Array.from({ length: 41 }, (_, i) => baseStrike + (i - 20) * strikeInterval);
  }, [baseStrike, strikeInterval]);

  const atmIndex = 20; // Middle of the array

  // Snap to ATM on initial load
  useEffect(() => {
    setTimeout(() => {
      flatListRef.current?.scrollToIndex({ index: atmIndex, animated: true, viewPosition: 0.5 });
    }, 500);
  }, [atmIndex]);

  const renderRow = ({ item: strike }: { item: number }) => {
    const isATM = strike === baseStrike;
    const distance = strike - spotPrice;
    
    // Mock realistic option dynamics based on live spot price
    const callIntrinsic = Math.max(0, -distance);
    const putIntrinsic = Math.max(0, distance);
    const extrinsic = Math.max(0, 150 - Math.abs(distance) * 0.2);
    
    const callData: Option = {
      strike, type: 'CE',
      price: callIntrinsic + extrinsic,
      oi: Math.max(10000, 5000000 - Math.abs(distance) * 10000),
      delta: distance < 0 ? 0.5 + Math.min(0.5, Math.abs(distance)/1000) : Math.max(0, 0.5 - distance/1000),
      theta: -12.4
    };

    const putData: Option = {
      strike, type: 'PE',
      price: putIntrinsic + extrinsic,
      oi: Math.max(10000, 5000000 - Math.abs(distance) * 10000),
      delta: distance > 0 ? -0.5 - Math.min(0.5, distance/1000) : Math.min(0, -0.5 + Math.abs(distance)/1000),
      theta: -10.2
    };

    const maxOi = 5000000;
    const callOiWidth = (callData.oi / maxOi) * 100;
    const putOiWidth = (putData.oi / maxOi) * 100;

    const isSelectedCE = selectedOption?.strike === strike && selectedOption?.type === 'CE';
    const isSelectedPE = selectedOption?.strike === strike && selectedOption?.type === 'PE';

    return (
      <View className={cn("flex-row h-[56px] border-b border-zinc-900", isATM && "bg-emerald-500/5")}>
        
        {/* ATM Top Line Overlay */}
        {isATM && <View className="absolute top-0 w-full h-[1px] bg-emerald-500/30 z-10" />}

        {/* CALLS SIDE */}
        <TouchableOpacity 
          onPress={() => setSelectedOption(isSelectedCE ? null : { strike, type: 'CE' })}
          className={cn("flex-1 flex-row items-center", isSelectedCE && "bg-emerald-500/10")}
        >
          <View className="flex-1 px-3 items-start justify-center">
            {viewMode === 'Price' ? (
              <>
                <Text className="text-[10px] font-bold text-zinc-500">{(callData.oi / 100000).toFixed(1)}L</Text>
                {/* Visual OI Pressure Bar */}
                <View className="w-full h-1 bg-zinc-900 rounded-full mt-1 overflow-hidden">
                  <View style={{ width: `${callOiWidth}%` }} className="h-full bg-rose-500/60" />
                </View>
              </>
            ) : (
              <Text className="text-[10px] font-bold text-blue-400">{callData.delta.toFixed(2)}</Text>
            )}
          </View>
          <View className="flex-1 px-3 items-end justify-center">
            <Text className="text-[13px] font-black text-white">{callData.price.toFixed(2)}</Text>
          </View>
        </TouchableOpacity>

        {/* STRIKE CENTER */}
        <View className={cn("w-[80px] items-center justify-center border-l border-r border-zinc-900 relative", isATM ? "bg-emerald-500/20" : "bg-zinc-950")}>
          <Text className={cn("text-[13px] tracking-tighter", isATM ? "font-black text-emerald-500" : "font-bold text-zinc-400")}>
            {strike.toLocaleString('en-IN')}
          </Text>
          {isATM && (
            <View className="absolute -top-3 bg-emerald-500 px-2 py-0.5 rounded shadow-lg">
              <Text className="text-[8px] font-black text-black tracking-widest uppercase">Spot</Text>
            </View>
          )}
        </View>

        {/* PUTS SIDE */}
        <TouchableOpacity 
          onPress={() => setSelectedOption(isSelectedPE ? null : { strike, type: 'PE' })}
          className={cn("flex-1 flex-row items-center", isSelectedPE && "bg-rose-500/10")}
        >
          <View className="flex-1 px-3 items-start justify-center">
            <Text className="text-[13px] font-black text-white">{putData.price.toFixed(2)}</Text>
          </View>
          <View className="flex-1 px-3 items-end justify-center">
            {viewMode === 'Price' ? (
              <>
                <Text className="text-[10px] font-bold text-zinc-500">{(putData.oi / 100000).toFixed(1)}L</Text>
                {/* Visual OI Pressure Bar */}
                <View className="w-full h-1 bg-zinc-900 rounded-full mt-1 overflow-hidden items-end">
                  <View style={{ width: `${putOiWidth}%` }} className="h-full bg-emerald-500/60" />
                </View>
              </>
            ) : (
              <Text className="text-[10px] font-bold text-blue-400">{putData.delta.toFixed(2)}</Text>
            )}
          </View>
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <View className="flex-1 bg-black">
      {/* Table Headers */}
      <View className="flex-row items-center h-10 border-b border-zinc-900 bg-zinc-950">
        <View className="flex-1 flex-row items-center">
          <View className="flex-1 px-3 items-start"><Text className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest">{viewMode === 'Price' ? 'OI (Call)' : 'Delta'}</Text></View>
          <View className="flex-1 px-3 items-end"><Text className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest">LTP</Text></View>
        </View>
        <View className="w-[80px] items-center justify-center">
          <Text className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest">Strike</Text>
        </View>
        <View className="flex-1 flex-row items-center">
          <View className="flex-1 px-3 items-start"><Text className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest">LTP</Text></View>
          <View className="flex-1 px-3 items-end"><Text className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest">{viewMode === 'Price' ? 'OI (Put)' : 'Delta'}</Text></View>
        </View>
      </View>

      <FlatList
        ref={flatListRef}
        data={strikes}
        keyExtractor={(item) => item.toString()}
        renderItem={renderRow}
        getItemLayout={(_, index) => ({ length: ITEM_HEIGHT, offset: ITEM_HEIGHT * index, index })}
        showsVerticalScrollIndicator={false}
        initialNumToRender={15}
        maxToRenderPerBatch={10}
        windowSize={5}
      />

      {/* Floating Action Bar */}
      {selectedOption ? (
        <View className="absolute bottom-6 left-6 right-6 bg-zinc-900 border border-zinc-800 rounded-3xl p-4 flex-row gap-3 shadow-2xl">
          <TouchableOpacity 
            onPress={() => onTrade({ strike: selectedOption.strike, type: selectedOption.type } as Option, 'SELL')}
            className="flex-1 bg-rose-500 py-4 rounded-2xl items-center justify-center shadow-xl shadow-rose-500/20"
          >
            <Text className="font-black text-black tracking-widest uppercase text-xs">SELL {selectedOption.type}</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            onPress={() => onTrade({ strike: selectedOption.strike, type: selectedOption.type } as Option, 'BUY')}
            className="flex-1 bg-emerald-500 py-4 rounded-2xl items-center justify-center shadow-xl shadow-emerald-500/20"
          >
            <Text className="font-black text-black tracking-widest uppercase text-xs">BUY {selectedOption.type}</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <View className="absolute bottom-6 self-center flex-row gap-3">
          <TouchableOpacity 
            onPress={() => flatListRef.current?.scrollToIndex({ index: atmIndex, animated: true, viewPosition: 0.5 })}
            className="bg-black/90 border border-zinc-800 px-6 py-3 rounded-full shadow-2xl backdrop-blur-lg"
          >
            <Text className="text-[10px] font-black text-white uppercase tracking-widest">Jump to ATM</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            onPress={() => setViewMode(prev => prev === 'Price' ? 'Greeks' : 'Price')}
            className="bg-black/90 border border-zinc-800 px-6 py-3 rounded-full shadow-2xl backdrop-blur-lg"
          >
            <Text className="text-[10px] font-black text-blue-400 uppercase tracking-widest">{viewMode === 'Price' ? 'Show Greeks' : 'Show Price'}</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
};