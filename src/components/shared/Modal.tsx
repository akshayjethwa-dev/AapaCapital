import React from 'react';
import { Modal as RNModal, View, TouchableOpacity, Text, KeyboardAvoidingView, Platform } from 'react-native';
import { ChevronDown } from 'lucide-react-native';
import { Colors } from '../../theme/colors';

interface ModalProps {
  visible: boolean;
  onClose: () => void;
  title?: string;
  subtitle?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
}

export const Modal = ({ visible, onClose, title, subtitle, children, footer }: ModalProps) => {
  return (
    <RNModal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <View className="flex-1 bg-black/60 justify-end">
        <KeyboardAvoidingView 
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          className="bg-black border-t border-zinc-900 rounded-t-3xl overflow-hidden max-h-[90%]"
        >
          {/* Header */}
          <View className="px-6 py-4 border-b border-zinc-900 flex-row justify-between items-center">
            <View>
              {title && <Text className="text-sm font-black text-white tracking-tight">{title}</Text>}
              {subtitle && <Text className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mt-0.5">{subtitle}</Text>}
            </View>
            <TouchableOpacity onPress={onClose} className="p-2 rounded-xl bg-zinc-900">
              <ChevronDown size={24} color={Colors.text.secondary} />
            </TouchableOpacity>
          </View>

          {/* Body */}
          <View className="p-6">
            {children}
          </View>

          {/* Footer (Fixed at bottom, e.g., Buy/Sell buttons) */}
          {footer && (
            <View className="p-6 bg-black border-t border-zinc-900 flex-row gap-4 pb-10">
              {footer}
            </View>
          )}
        </KeyboardAvoidingView>
      </View>
    </RNModal>
  );
};