import { Stack, useRouter, useSegments } from 'expo-router';
import { useEffect } from 'react';
import { View, ActivityIndicator } from 'react-native';
import { useAuthStore } from '../src/store/authStore';
import '../global.css';

export default function RootLayout() {
  const { token, isLoading, isPinSet, restoreSession } = useAuthStore();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    restoreSession();
  }, []);

  useEffect(() => {
    if (isLoading) return;

    const inAuthGroup = segments[0] === '(auth)';
    
    if (!token) {
      if (!inAuthGroup) router.replace('/(auth)/login');
    } else {
      // User has token. Do they have a PIN set?
      if (!isPinSet && segments[1] !== 'pin-setup') {
        router.replace('/(auth)/pin-setup');
      } else if (isPinSet && inAuthGroup && segments[1] !== 'pin-verify') {
        // If they have a token & pin, but are stuck in auth routing, verify them
        router.replace('/(auth)/pin-verify');
      }
    }
  }, [token, isPinSet, isLoading, segments]);

  if (isLoading) {
    return (
      <View className="flex-1 bg-black items-center justify-center">
        <ActivityIndicator size="large" color="#10b981" />
      </View>
    );
  }

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(auth)" options={{ animation: 'fade' }} />
      <Stack.Screen name="(tabs)" options={{ animation: 'fade' }} />
      
      {/* Modals */}
      <Stack.Screen 
        name="modals/full-chart" 
        options={{ 
          presentation: 'fullScreenModal',
          animation: 'slide_from_bottom' 
        }} 
      />
      <Stack.Screen 
        name="modals/search" 
        options={{ 
          presentation: 'fullScreenModal',
          animation: 'fade' 
        }} 
      />
    </Stack>
  );
}