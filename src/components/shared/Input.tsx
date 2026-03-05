import React, { useState } from 'react';
import { View, Text, TextInput, TextInputProps } from 'react-native';
import { Colors } from '../../theme/colors';
import { cn } from '../../utils/cn'; // Assuming you port your cn utility

interface InputProps extends TextInputProps {
  label?: string;
  error?: string;
  leftIcon?: React.ReactNode;
}

export const Input = ({ label, error, leftIcon, className, ...props }: InputProps) => {
  const [isFocused, setIsFocused] = useState(false);

  return (
    <View className="space-y-2 w-full">
      {label && (
        <Text className="text-[10px] font-bold text-zinc-600 uppercase tracking-widest ml-1">
          {label}
        </Text>
      )}
      
      <View className={cn(
        "flex-row items-center bg-zinc-900/30 border rounded-2xl px-4 h-14",
        isFocused ? "border-emerald-500/50" : "border-zinc-800/50",
        error && "border-rose-500/50",
        className
      )}>
        {leftIcon && <View className="mr-3">{leftIcon}</View>}
        
        <TextInput
          className="flex-1 text-sm font-bold text-zinc-100 placeholder:text-zinc-600"
          placeholderTextColor={Colors.text.muted}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          {...props}
        />
      </View>

      {error && (
        <Text className="text-[10px] font-bold text-rose-500 ml-1 mt-1">
          {error}
        </Text>
      )}
    </View>
  );
};