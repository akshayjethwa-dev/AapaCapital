import React, { useRef } from 'react';
import { View, Text, TextInput, Pressable } from 'react-native';
import { cn } from '../../utils/cn';

interface OtpInputProps {
  length?: number;
  value: string;
  onChange: (value: string) => void;
}

export const OtpInput = ({ length = 6, value, onChange }: OtpInputProps) => {
  const inputRef = useRef<TextInput>(null);

  const handlePress = () => {
    inputRef.current?.focus();
  };

  return (
    <View className="items-center w-full my-6">
      <Pressable onPress={handlePress} className="flex-row gap-3 w-full justify-between">
        {Array.from({ length }).map((_, index) => {
          const digit = value[index] || '';
          const isFocused = value.length === index;

          return (
            <View 
              key={index}
              className={cn(
                "w-12 h-14 rounded-2xl items-center justify-center bg-zinc-900/50 border transition-all",
                isFocused ? "border-emerald-500 shadow-lg shadow-emerald-500/20" : "border-zinc-800",
                digit ? "border-zinc-600" : ""
              )}
            >
              <Text className={cn(
                "text-2xl font-black",
                digit ? "text-white" : "text-zinc-600"
              )}>
                {digit}
              </Text>
            </View>
          );
        })}
      </Pressable>

      <TextInput
        ref={inputRef}
        value={value}
        onChangeText={(text) => {
          if (text.length <= length) onChange(text.replace(/[^0-9]/g, ''));
        }}
        keyboardType="number-pad"
        textContentType="oneTimeCode"
        className="absolute opacity-0 w-full h-full"
        maxLength={length}
        autoFocus
      />
    </View>
  );
};