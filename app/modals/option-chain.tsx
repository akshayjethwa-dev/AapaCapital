import React, { useState, useRef, useEffect, useMemo, memo } from 'react';
import { View, Text, TouchableOpacity, FlatList } from 'react-native';
import { useTicker } from '../../src/hooks/useTicker';
import { Colors } from '../../src/theme/colors';
import { cn } from '../../src/utils/cn';

export interface Option {
  strike: number;
  type: 'CE' | 'PE';
  price: number;
  oi: number;
  delta: number;
  theta: number;
  intrinsic: number;
  extrinsic: number;
}

interface OptionChainProps {
  symbol: string;
  expiry: string;
  onTrade: (option: Option, type: 'BUY' | 'SELL') => void;
}

const ITEM_HEIGHT = 56;
const EXPANDED_ITEM_HEIGHT = 80;

const OptionRow = memo(({ 
  strike, 
  baseStrike, 
  spotPrice, 
  viewMode, 
  selectedOption, 
  onSelect 
}: { 
  strike: number, 
  baseStrike: number, 
  spotPrice: number, 
  viewMode: 'Price' | 'Greeks', 
  selectedOption: { strike: number, type: 'CE' | 'PE' } | null,
  onSelect: (strike: number, type: 'CE' | 'PE') => void 
}) => {
  const isATM = strike === baseStrike;
  const distance = strike - spotPrice;
  
  const callIntrinsic = Math.max(0, -distance);
  const putIntrinsic = Math.max(0, distance);
  const extrinsic = Math.max(0, 150 - Math.abs(distance) * 0.15); 
  
  const callData: Option = {
    strike, type: 'CE',
    price: callIntrinsic + extrinsic,
    intrinsic: callIntrinsic,
    extrinsic: extrinsic,
    oi: Math.max(10000, 5000000 - Math.abs(distance) * 10000),
    delta: distance < 0 ? 0.5 + Math.min(0.5, Math.abs(distance)/1000) : Math.max(0, 0.5 - distance/1000),
    theta: -12.4 + (Math.abs(distance) * 0.01)
  };

  const putData: Option = {
    strike, type: 'PE',
    price: putIntrinsic + extrinsic,
    intrinsic: putIntrinsic,
    extrinsic: extrinsic,
    oi: Math.max(10000, 5000000 - Math.abs(distance) * 10000),
    delta: distance > 0 ? -0.5 - Math.min(0.5, distance/1000) : Math.min(0, -0.5 + Math.abs(distance)/1000),
    theta: -10.2 + (Math.abs(distance) * 0.01)
  };

  const maxOi = 5000000;
  const callOiWidth = Math.min(100, (callData.oi / maxOi) * 100);
  const putOiWidth = Math.min(100, (putData.oi / maxOi) * 100);

  const isSelectedCE = selectedOption?.strike === strike && selectedOption?.type === 'CE';
  const isSelectedPE = selectedOption?.strike === strike && selectedOption?.type === 'PE';

  return (
    <View className={cn("flex-row border-b border-zinc-900", isATM && "bg-emerald-500/5", (isSelectedCE || isSelectedPE) ? "h-20" : "h-14")}>
      
      {isATM && <View className="absolute top-0 w-full h-px bg-emerald-500/30 z-10" />}

      <TouchableOpacity 
        onPress={() => onSelect(strike, 'CE')}
        className={cn("flex-1 flex-row items-center", isSelectedCE && "bg-emerald-500/10")}
      >
        <View className="flex-1 px-3 items-start justify-center h-full relative">
          {viewMode === 'Price' ? (
            <>
              <View className="absolute left-3 right-3 bottom-2 h-1 bg-zinc-900 rounded-full overflow-hidden">
                <View style={{ width: `${callOiWidth}%` }} className="h-full bg-rose-500/60" />
              </View>
              <Text className="text-[10px] font-bold text-zinc-500 mb-1">{(callData.oi / 100000).toFixed(1)}L</Text>
            </>
          ) : (
            <View className="space-y-0.5">
              <Text className="text-[9px] font-bold text-blue-400">Δ {callData.delta.toFixed(2)}</Text>
              <Text className="text-[9px] font-bold text-rose-400">θ {callData.theta.toFixed(2)}</Text>
            </View>
          )}
        </View>
        <View className="flex-1 px-3 items-end justify-center h-full">
          <Text className="text-[13px] font-black text-white">{callData.price.toFixed(2)}</Text>
          {isSelectedCE && (
             <Text className="text-[8px] font-bold text-zinc-500 uppercase tracking-widest mt-1">
               IV: {callData.intrinsic.toFixed(1)} | TV: {callData.extrinsic.toFixed(1)}
             </Text>
          )}
        </View>
      </TouchableOpacity>

      <View className={cn("w-20 items-center justify-center border-l border-r border-zinc-900 relative", isATM ? "bg-emerald-500/20" : "bg-zinc-950")}>
        <Text className={cn("text-[13px] tracking-tighter", isATM ? "font-black text-emerald-500" : "font-bold text-zinc-400")}>
          {strike.toLocaleString('en-IN')}
        </Text>
        {isATM && (
          <View className="absolute -top-2.5 bg-emerald-500 px-2 py-0.5 rounded shadow-lg z-20">
            <Text className="text-[7px] font-black text-black tracking-widest uppercase">ATM</Text>
          </View>
        )}
      </View>

      <TouchableOpacity 
        onPress={() => onSelect(strike, 'PE')}
        className={cn("flex-1 flex-row items-center", isSelectedPE && "bg-rose-500/10")}
      >
        <View className="flex-1 px-3 items-start justify-center h-full">
          <Text className="text-[13px] font-black text-white">{putData.price.toFixed(2)}</Text>
          {isSelectedPE && (
             <Text className="text-[8px] font-bold text-zinc-500 uppercase tracking-widest mt-1">
               IV: {putData.intrinsic.toFixed(1)} | TV: {putData.extrinsic.toFixed(1)}
             </Text>
          )}
        </View>
        <View className="flex-1 px-3 items-end justify-center h-full relative">
          {viewMode === 'Price' ? (
            <>
              <View className="absolute left-3 right-3 bottom-2 h-1 bg-zinc-900 rounded-full overflow-hidden items-end">
                <View style={{ width: `${putOiWidth}%` }} className="h-full bg-emerald-500/60" />
              </View>
              <Text className="text-[10px] font-bold text-zinc-500 mb-1">{(putData.oi / 100000).toFixed(1)}L</Text>
            </>
          ) : (
            <View className="space-y-0.5 items-end">
              <Text className="text-[9px] font-bold text-blue-400">Δ {putData.delta.toFixed(2)}</Text>
              <Text className="text-[9px] font-bold text-rose-400">θ {putData.theta.toFixed(2)}</Text>
            </View>
          )}
        </View>
      </TouchableOpacity>
    </View>
  );
}, (prevProps, nextProps) => {
  const wasSelected = prevProps.selectedOption?.strike === prevProps.strike;
  const isSelected = nextProps.selectedOption?.strike === nextProps.strike;
  return (
    prevProps.viewMode === nextProps.viewMode &&
    prevProps.spotPrice === nextProps.spotPrice &&
    wasSelected === isSelected
  );
});

export const OptionChain = ({ symbol, expiry, onTrade }: OptionChainProps) => {
  const flatListRef = useRef<FlatList>(null);
  
  // FIX: Extract `.current` to get the actual number from the new Ticker object!
  const liveTicker = useTicker(symbol);
  const spotPrice = liveTicker.current || 22000;
  
  const [viewMode, setViewMode] = useState<'Price' | 'Greeks'>('Price');
  const [selectedOption, setSelectedOption] = useState<{ strike: number, type: 'CE' | 'PE' } | null>(null);

  const strikeInterval = symbol.includes('BANKNIFTY') ? 100 : 50;
  const baseStrike = Math.round(spotPrice / strikeInterval) * strikeInterval;

  const strikes = useMemo(() => {
    return Array.from({ length: 41 }, (_, i) => baseStrike + (i - 20) * strikeInterval);
  }, [baseStrike, strikeInterval]);

  const atmIndex = 20;

  useEffect(() => {
    setTimeout(() => {
      flatListRef.current?.scrollToIndex({ index: atmIndex, animated: true, viewPosition: 0.5 });
    }, 500);
  }, [atmIndex]);

  const handleSelect = (strike: number, type: 'CE' | 'PE') => {
    setSelectedOption(prev => 
      prev?.strike === strike && prev?.type === type ? null : { strike, type }
    );
  };

  return (
    <View className="flex-1 bg-black">
      <View className="flex-row items-center h-10 border-b border-zinc-900 bg-zinc-950">
        <View className="flex-1 flex-row items-center">
          <View className="flex-1 px-3 items-start"><Text className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest">{viewMode === 'Price' ? 'OI (Call)' : 'Greeks'}</Text></View>
          <View className="flex-1 px-3 items-end"><Text className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest">LTP</Text></View>
        </View>
        <View className="w-20 items-center justify-center">
          <Text className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest">Strike</Text>
        </View>
        <View className="flex-1 flex-row items-center">
          <View className="flex-1 px-3 items-start"><Text className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest">LTP</Text></View>
          <View className="flex-1 px-3 items-end"><Text className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest">{viewMode === 'Price' ? 'OI (Put)' : 'Greeks'}</Text></View>
        </View>
      </View>

      <FlatList
        ref={flatListRef}
        data={strikes}
        keyExtractor={(item) => item.toString()}
        renderItem={({ item }) => (
          <OptionRow 
            strike={item} 
            baseStrike={baseStrike}
            spotPrice={spotPrice}
            viewMode={viewMode}
            selectedOption={selectedOption}
            onSelect={handleSelect}
          />
        )}
        getItemLayout={(_, index) => {
          const isExpanded = selectedOption?.strike === strikes[index];
          return {
            length: isExpanded ? EXPANDED_ITEM_HEIGHT : ITEM_HEIGHT,
            offset: (ITEM_HEIGHT * index) + (isExpanded ? (EXPANDED_ITEM_HEIGHT - ITEM_HEIGHT) : 0),
            index
          }
        }}
        showsVerticalScrollIndicator={false}
        initialNumToRender={20}
        maxToRenderPerBatch={15}
        windowSize={5}
        contentContainerStyle={{ paddingBottom: 120 }}
      />

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
            className="bg-black/90 border border-zinc-800 px-6 py-3 rounded-full shadow-2xl"
          >
            <Text className="text-[10px] font-black text-white uppercase tracking-widest">Jump to ATM</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            onPress={() => setViewMode(prev => prev === 'Price' ? 'Greeks' : 'Price')}
            className="bg-black/90 border border-zinc-800 px-6 py-3 rounded-full shadow-2xl"
          >
            <Text className="text-[10px] font-black text-blue-400 uppercase tracking-widest">{viewMode === 'Price' ? 'Show Greeks' : 'Show Price'}</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
};