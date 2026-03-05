import React from 'react';
import { TouchableOpacity, Text, ActivityIndicator, View } from 'react-native';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'danger' | 'ghost' | 'outline';
  size?: 'default' | 'sm';
  isLoading?: boolean;
  disabled?: boolean;
  className?: string;
  icon?: React.ReactNode;
}

export const Button = ({
  title,
  onPress,
  variant = 'primary',
  size = 'default',
  isLoading = false,
  disabled = false,
  className,
  icon
}: ButtonProps) => {
  const baseStyles = "rounded-2xl items-center justify-center flex-row flex-1 active:scale-95 transition-all";
  
  const variantStyles = {
    primary: "bg-emerald-500 shadow-xl shadow-emerald-500/10",
    danger: "bg-rose-500 shadow-xl shadow-rose-500/10",
    ghost: "bg-zinc-900",
    outline: "bg-transparent border border-zinc-800",
  };

  const textStyles = {
    primary: "text-black",
    danger: "text-black",
    ghost: "text-zinc-400",
    outline: "text-zinc-400",
  };

  const sizeStyles = {
    default: "py-5 px-6",
    sm: "py-3 px-4",
  };

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled || isLoading}
      className={cn(
        baseStyles,
        variantStyles[variant],
        sizeStyles[size],
        (disabled || isLoading) && "opacity-50",
        className
      )}
    >
      {isLoading ? (
        <ActivityIndicator color={variant === 'primary' || variant === 'danger' ? '#000' : '#10b981'} />
      ) : (
        <View className="flex-row items-center gap-2">
          {icon && icon}
          <Text className={cn(
            "font-black uppercase tracking-widest text-xs",
            textStyles[variant]
          )}>
            {title}
          </Text>
        </View>
      )}
    </TouchableOpacity>
  );
};