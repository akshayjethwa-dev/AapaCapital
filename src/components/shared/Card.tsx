import React from 'react';
import { View, ViewProps } from 'react-native';
import { cn } from '../../utils/cn';

interface CardProps extends ViewProps {
  variant?: 'default' | 'glass' | 'highlight';
}

export const Card = ({ children, variant = 'default', className, ...props }: CardProps) => {
  const variantStyles = {
    default: "bg-zinc-900/20 border-zinc-800/30",
    glass: "bg-zinc-900/30 border-zinc-800/50",
    highlight: "bg-emerald-500/5 border-emerald-500/10",
  };

  return (
    <View 
      className={cn(
        "border rounded-2xl p-4",
        variantStyles[variant],
        className
      )}
      {...props}
    >
      {children}
    </View>
  );
};