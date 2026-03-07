import React, { useState } from 'react';
import { View, Text, Alert, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import * as LocalAuthentication from 'expo-local-authentication';
import { PinKeypad } from '../../src/components/shared/PinKeypad';
import { useAuthStore } from '../../src/store/authStore';
import { cn } from '../../src/utils/cn';

export default function PinSetupScreen() {
  const router = useRouter();
  const { setupPin } = useAuthStore();
  const [step, setStep] = useState<'create' | 'confirm'>('create');
  const [pin, setPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');

  const activePin = step === 'create' ? pin : confirmPin;

  const handleKeyPress = (digit: string) => {
    if (activePin.length < 4) {
      const newPin = activePin + digit;
      if (step === 'create') {
        setPin(newPin);
        if (newPin.length === 4) setTimeout(() => setStep('confirm'), 300);
      } else {
        setConfirmPin(newPin);
        if (newPin.length === 4) setTimeout(() => finalizeSetup(pin, newPin), 300);
      }
    }
  };

  const handleDelete = () => {
    if (step === 'create') setPin(pin.slice(0, -1));
    else setConfirmPin(confirmPin.slice(0, -1));
  };

  const finalizeSetup = async (p1: string, p2: string) => {
    if (p1 !== p2) {
      Alert.alert('Error', 'PINs do not match. Try again.');
      setStep('create');
      setPin('');
      setConfirmPin('');
      return;
    }

    let useBio = false;
    
    // Only attempt to register Biometrics on Mobile
    if (Platform.OS !== 'web') {
      const hasHardware = await LocalAuthentication.hasHardwareAsync();
      const isEnrolled = await LocalAuthentication.isEnrolledAsync();
      
      if (hasHardware && isEnrolled) {
        const result = await LocalAuthentication.authenticateAsync({
          promptMessage: 'Enable Biometric Login for Aapa Capital',
        });
        useBio = result.success;
      }
    }

    await setupPin(p1, useBio);
    router.replace('/(tabs)');
  };

  return (
    <SafeAreaView className="flex-1 bg-black">
      <View className="flex-1 items-center justify-center px-6 mt-10">
        <View className="items-center mb-12">
          <Text className="text-3xl font-black text-white tracking-tighter mb-2">
            {step === 'create' ? 'Setup Security PIN' : 'Confirm PIN'}
          </Text>
          <Text className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest text-center">
            Protect your trades and portfolio
          </Text>
        </View>

        {/* PIN Indicators */}
        <View className="flex-row gap-4 mb-10">
          {[0, 1, 2, 3].map((i) => (
            <View 
              key={i} 
              className={cn(
                "w-5 h-5 rounded-full transition-all",
                i < activePin.length ? "bg-emerald-500" : "bg-zinc-800"
              )} 
            />
          ))}
        </View>
      </View>

      <PinKeypad onPress={handleKeyPress} onDelete={handleDelete} />
    </SafeAreaView>
  );
}