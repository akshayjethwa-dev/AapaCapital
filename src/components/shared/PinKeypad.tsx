import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { Delete, Fingerprint } from 'lucide-react-native';
import { Colors } from '../../theme/colors';

interface PinKeypadProps {
  onPress: (digit: string) => void;
  onDelete: () => void;
  onBiometric?: () => void;
  showBiometric?: boolean;
}

export const PinKeypad = ({ onPress, onDelete, onBiometric, showBiometric }: PinKeypadProps) => {
  const keys = [
    ['1', '2', '3'],
    ['4', '5', '6'],
    ['7', '8', '9'],
    ['bio', '0', 'delete']
  ];

  return (
    <View className="w-full px-8 py-6 gap-6">
      {keys.map((row, rowIndex) => (
        <View key={rowIndex} className="flex-row justify-between w-full">
          {row.map((key) => (
            <TouchableOpacity
              key={key}
              onPress={() => {
                if (key === 'delete') onDelete();
                else if (key === 'bio' && onBiometric) onBiometric();
                else if (key !== 'bio') onPress(key);
              }}
              className="w-20 h-20 items-center justify-center rounded-full active:bg-zinc-900 transition-colors"
              disabled={key === 'bio' && !showBiometric}
            >
              {key === 'delete' ? (
                <Delete size={28} color={Colors.text.primary} />
              ) : key === 'bio' ? (
                showBiometric ? <Fingerprint size={32} color={Colors.trend.positive} /> : <View />
              ) : (
                <Text className="text-3xl font-black text-white">{key}</Text>
              )}
            </TouchableOpacity>
          ))}
        </View>
      ))}
    </View>
  );
};