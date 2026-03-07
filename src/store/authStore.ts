import { create } from 'zustand';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

// Helper functions for platform-aware storage
const setStorageItemAsync = async (key: string, value: string) => {
  if (Platform.OS === 'web') {
    try {
      localStorage.setItem(key, value);
    } catch (e) {
      console.error('Local storage is unavailable:', e);
    }
  } else {
    await SecureStore.setItemAsync(key, value);
  }
};

const getStorageItemAsync = async (key: string) => {
  if (Platform.OS === 'web') {
    try {
      return localStorage.getItem(key);
    } catch (e) {
      console.error('Local storage is unavailable:', e);
      return null;
    }
  } else {
    return await SecureStore.getItemAsync(key);
  }
};

const deleteStorageItemAsync = async (key: string) => {
  if (Platform.OS === 'web') {
    try {
      localStorage.removeItem(key);
    } catch (e) {
      console.error('Local storage is unavailable:', e);
    }
  } else {
    await SecureStore.deleteItemAsync(key);
  }
};

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
    await setStorageItemAsync('token', token);
    await setStorageItemAsync('user', JSON.stringify(user));
    set({ user, token });
  },

  setupPin: async (pin, enableBiometric) => {
    await setStorageItemAsync('user_pin', pin);
    await setStorageItemAsync('biometric_enabled', String(enableBiometric));
    set({ isPinSet: true, biometricEnabled: enableBiometric });
  },

  logout: async () => {
    await deleteStorageItemAsync('token');
    await deleteStorageItemAsync('user');
    // Note: We usually keep the PIN and Biometric pref on the device even if logged out, 
    // but for complete clear:
    await deleteStorageItemAsync('user_pin');
    await deleteStorageItemAsync('biometric_enabled');
    
    set({ user: null, token: null, isPinSet: false, biometricEnabled: false });
  },

  restoreSession: async () => {
    try {
      const token = await getStorageItemAsync('token');
      const userStr = await getStorageItemAsync('user');
      const pin = await getStorageItemAsync('user_pin');
      const bio = await getStorageItemAsync('biometric_enabled');

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