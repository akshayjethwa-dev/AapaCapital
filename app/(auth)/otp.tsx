import React, { useState } from 'react';
import { View, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { OtpInput } from '../../src/components/shared/OtpInput';
import { Button } from '../../src/components/shared/Button';
import { useAuthStore } from '../../src/store/authStore';

export default function OtpScreen() {
  const router = useRouter();
  const { identifier } = useLocalSearchParams();
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const { setAuth } = useAuthStore();

  const handleVerify = async () => {
    if (otp.length !== 6) return;
    setLoading(true);
    
    // Simulate Verify OTP API Call
    setTimeout(async () => {
      setLoading(false);
      // Generate a mock JWT and User object
      await setAuth({ id: 1, role: 'user', balance: 0 }, "mock_token_xyz");
      
      // Navigate to PIN setup since they are newly logging in
      router.replace('/(auth)/pin-setup');
    }, 1000);
  };

  return (
    <SafeAreaView className="flex-1 bg-black p-6">
      <View className="flex-1 mt-10">
        <Text className="text-3xl font-black text-white tracking-tighter">Enter OTP</Text>
        <Text className="text-zinc-400 font-medium mt-2 leading-relaxed">
          We've sent a 6-digit secure code to{"\n"}
          <Text className="text-white font-bold">{identifier}</Text>
        </Text>

        <OtpInput length={6} value={otp} onChange={setOtp} />

        <View className="flex-row justify-between items-center mt-2">
          <Text className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Didn't receive code?</Text>
          <Text className="text-[10px] font-bold text-emerald-500 uppercase tracking-widest">Resend in 00:30</Text>
        </View>
      </View>

      <View className="mb-6">
        <Button 
          title="Verify & Continue" 
          onPress={handleVerify} 
          isLoading={loading} 
          disabled={otp.length !== 6} 
        />
      </View>
    </SafeAreaView>
  );
}