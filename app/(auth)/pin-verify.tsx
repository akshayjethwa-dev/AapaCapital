import React, { useState, useEffect } from 'react';
import { View, Text, Alert, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import * as LocalAuthentication from 'expo-local-authentication';
import * as SecureStore from 'expo-secure-store';
import { PinKeypad } from '../../src/components/shared/PinKeypad';
import { useAuthStore } from '../../src/store/authStore';
import { cn } from '../../src/utils/cn';

export default function PinVerifyScreen() {
  const router = useRouter();
  const { biometricEnabled, logout } = useAuthStore();
  const [pin, setPin] = useState('');

  useEffect(() => {
    // Only attempt Biometrics on actual iOS/Android devices
    if (biometricEnabled && Platform.OS !== 'web') {
      handleBiometric();
    }
  }, []);

  const handleBiometric = async () => {
    if (Platform.OS === 'web') return;
    
    const result = await LocalAuthentication.authenticateAsync({
      promptMessage: 'Unlock Aapa Capital',
      fallbackLabel: 'Use PIN',
    });
    if (result.success) {
      router.replace('/(tabs)');
    }
  };

  const handleKeyPress = async (digit: string) => {
    if (pin.length < 4) {
      const newPin = pin + digit;
      setPin(newPin);
      
      if (newPin.length === 4) {
        let savedPin;
        
        // Use localStorage on Web, SecureStore on Mobile
        if (Platform.OS === 'web') {
          savedPin = localStorage.getItem('user_pin');
        } else {
          savedPin = await SecureStore.getItemAsync('user_pin');
        }

        if (newPin === savedPin) {
          router.replace('/(tabs)');
        } else {
          Alert.alert('Incorrect PIN', 'Please try again.');
          setPin('');
        }
      }
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-black">
      <View className="flex-1 items-center justify-center px-6 mt-10">
        <View className="items-center mb-12">
          <Text className="text-3xl font-black text-white tracking-tighter mb-2">Welcome Back</Text>
          <Text className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest text-center">
            Enter PIN to unlock
          </Text>
        </View>

        <View className="flex-row gap-4 mb-10">
          {[0, 1, 2, 3].map((i) => (
            <View 
              key={i} 
              className={cn(
                "w-5 h-5 rounded-full transition-all",
                i < pin.length ? "bg-emerald-500" : "bg-zinc-800"
              )} 
            />
          ))}
        </View>
        
        <Text 
          onPress={logout} 
          className="text-[10px] font-bold text-rose-500 uppercase tracking-widest mt-6"
        >
          Logout / Reset PIN
        </Text>
      </View>

      <PinKeypad 
        onPress={handleKeyPress} 
        onDelete={() => setPin(pin.slice(0, -1))} 
        showBiometric={biometricEnabled && Platform.OS !== 'web'}
        onBiometric={handleBiometric}
      />
    </SafeAreaView>
  );
}