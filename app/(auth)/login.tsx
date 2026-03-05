import React, { useState } from 'react';
import { View, Text, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { TrendingUp } from 'lucide-react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Button } from '../../src/components/shared/Button';
import { Input } from '../../src/components/shared/Input';
import { cn } from '../../src/utils/cn';

export default function LoginScreen() {
  const router = useRouter();
  const [authMethod, setAuthMethod] = useState<'mobile' | 'email'>('mobile');
  const [identifier, setIdentifier] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSendOTP = async () => {
    if (!identifier) return;
    setLoading(true);
    // Simulate API call to send OTP
    setTimeout(() => {
      setLoading(false);
      router.push({ pathname: '/(auth)/otp', params: { identifier, method: authMethod } });
    }, 1000);
  };

  return (
    <SafeAreaView className="flex-1 bg-black">
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} className="flex-1">
        <ScrollView contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', padding: 24 }}>
          <View className="items-center space-y-4 mb-10">
            <View className="w-16 h-16 bg-emerald-500 rounded-[1.5rem] items-center justify-center rotate-12 mb-2">
              <TrendingUp size={32} color="#000" strokeWidth={3} className="-rotate-12" />
            </View>
            <Text className="text-3xl font-black tracking-tighter text-white">Welcome</Text>
            <Text className="text-zinc-500 font-bold uppercase tracking-widest text-[10px]">Enter details to continue</Text>
          </View>

          <View className="bg-zinc-900/30 border border-zinc-800/50 rounded-[2rem] p-6 shadow-2xl">
            {/* Toggle Mobile / Email */}
            <View className="flex-row bg-zinc-950 p-1 rounded-xl border border-zinc-800/50 mb-6">
              {(['mobile', 'email'] as const).map(method => (
                <Text
                  key={method}
                  onPress={() => { setAuthMethod(method); setIdentifier(''); }}
                  className={cn(
                    "flex-1 text-center py-3 rounded-lg text-[10px] font-bold uppercase tracking-widest overflow-hidden",
                    authMethod === method ? "bg-zinc-800 text-white" : "text-zinc-500"
                  )}
                >
                  {method}
                </Text>
              ))}
            </View>

            <View className="mb-8">
              <Input
                label={authMethod === 'mobile' ? "Mobile Number" : "Email Address"}
                placeholder={authMethod === 'mobile' ? "+91 00000 00000" : "name@example.com"}
                value={identifier}
                onChangeText={setIdentifier}
                keyboardType={authMethod === 'mobile' ? "phone-pad" : "email-address"}
                autoCapitalize="none"
              />
            </View>

            <Button title="Get OTP" onPress={handleSendOTP} isLoading={loading} disabled={!identifier} />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}