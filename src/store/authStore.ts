import { create } from 'zustand';
import * as SecureStore from 'expo-secure-store';

interface User {
  id: number;
  email?: string;
  mobile?: string;
  role: string;
  balance: number;
}

interface AuthState {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  isPinSet: boolean;
  biometricEnabled: boolean;
  
  // Actions
  setAuth: (user: User, token: string) => Promise<void>;
  setupPin: (pin: string, enableBiometric: boolean) => Promise<void>;
  logout: () => Promise<void>;
  restoreSession: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  token: null,
  isLoading: true,
  isPinSet: false,
  biometricEnabled: false,

  setAuth: async (user, token) => {
    await SecureStore.setItemAsync('token', token);
    await SecureStore.setItemAsync('user', JSON.stringify(user));
    set({ user, token });
  },

  setupPin: async (pin, enableBiometric) => {
    await SecureStore.setItemAsync('user_pin', pin);
    await SecureStore.setItemAsync('biometric_enabled', String(enableBiometric));
    set({ isPinSet: true, biometricEnabled: enableBiometric });
  },

  logout: async () => {
    await SecureStore.deleteItemAsync('token');
    await SecureStore.deleteItemAsync('user');
    // Note: We usually keep the PIN and Biometric pref on the device even if logged out, 
    // but for complete clear:
    await SecureStore.deleteItemAsync('user_pin');
    await SecureStore.deleteItemAsync('biometric_enabled');
    
    set({ user: null, token: null, isPinSet: false, biometricEnabled: false });
  },

  restoreSession: async () => {
    try {
      const token = await SecureStore.getItemAsync('token');
      const userStr = await SecureStore.getItemAsync('user');
      const pin = await SecureStore.getItemAsync('user_pin');
      const bio = await SecureStore.getItemAsync('biometric_enabled');

      if (token && userStr) {
        set({ 
          token, 
          user: JSON.parse(userStr), 
          isPinSet: !!pin,
          biometricEnabled: bio === 'true',
          isLoading: false 
        });
      } else {
        set({ isLoading: false });
      }
    } catch (e) {
      set({ isLoading: false });
    }
  }
}));