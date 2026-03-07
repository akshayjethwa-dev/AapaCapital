import { Stack, useRouter, useSegments } from 'expo-router';
import { useEffect } from 'react';
import { View, ActivityIndicator } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { useAuthStore } from '../src/store/authStore';
import '../global.css';
import { wsService } from '../src/services/websocket';


export default function RootLayout() {
  const { token, isLoading, isPinSet, restoreSession } = useAuthStore();
  const segments = useSegments() as string[];
  const router = useRouter();

  useEffect(() => {
    restoreSession();
  }, []);

  useEffect(() => {
  wsService.connect();
  return () => wsService.disconnect();
}, []);

  useEffect(() => {
    if (isLoading) return;

    const inAuthGroup = segments[0] === '(auth)';
    
    if (!token) {
      if (!inAuthGroup) router.replace('/(auth)/login');
    } else {
      if (!isPinSet && segments[1] !== 'pin-setup') {
        router.replace('/(auth)/pin-setup');
      } else if (isPinSet && inAuthGroup && segments[1] !== 'pin-verify') {
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
    <GestureHandlerRootView style={{ flex: 1 }}>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(auth)" options={{ animation: 'fade' }} />
        <Stack.Screen name="(tabs)" options={{ animation: 'fade' }} />
        
        {/* Modals */}
        <Stack.Screen 
          name="modals/full-chart" 
          options={{ presentation: 'fullScreenModal', animation: 'slide_from_bottom' }} 
        />
        <Stack.Screen 
          name="modals/search" 
          options={{ presentation: 'fullScreenModal', animation: 'fade' }} 
        />
        <Stack.Screen 
          name="modals/option-chain" 
          options={{ presentation: 'modal', animation: 'slide_from_bottom' }} 
        />
        <Stack.Screen 
          name="modals/order-window" 
          options={{ presentation: 'modal', animation: 'slide_from_bottom' }} 
        />
        {/* ADDED THIS FOR GTT */}
        <Stack.Screen 
          name="modals/gtt-window" 
          options={{ presentation: 'modal', animation: 'slide_from_bottom' }} 
        />
      </Stack>
    </GestureHandlerRootView>
  );
}