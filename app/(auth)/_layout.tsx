import { Stack } from 'expo-router';

export default function AuthLayout() {
  return (
    <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: '#000' } }}>
      <Stack.Screen name="login" options={{ animation: 'fade' }} />
      <Stack.Screen name="otp" options={{ animation: 'slide_from_right' }} />
      <Stack.Screen name="pin-setup" options={{ animation: 'slide_from_right' }} />
      <Stack.Screen name="pin-verify" options={{ animation: 'fade' }} />
    </Stack>
  );
}