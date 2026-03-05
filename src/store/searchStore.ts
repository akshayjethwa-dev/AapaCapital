import { create } from 'zustand';
import * as SecureStore from 'expo-secure-store';

interface SearchState {
  recentSearches: string[];
  loadRecentSearches: () => Promise<void>;
  addRecentSearch: (query: string) => Promise<void>;
  clearRecentSearches: () => Promise<void>;
}

export const useSearchStore = create<SearchState>((set, get) => ({
  recentSearches: [],
  
  loadRecentSearches: async () => {
    try {
      const stored = await SecureStore.getItemAsync('recent_searches');
      if (stored) {
        set({ recentSearches: JSON.parse(stored) });
      }
    } catch (e) {
      console.error("Failed to load recent searches", e);
    }
  },

  addRecentSearch: async (query) => {
    const cleanQuery = query.trim().toUpperCase();
    if (!cleanQuery) return;

    const current = get().recentSearches;
    // Add to top, remove duplicates, keep only last 8
    const updated = [cleanQuery, ...current.filter(q => q !== cleanQuery)].slice(0, 8);
    
    await SecureStore.setItemAsync('recent_searches', JSON.stringify(updated));
    set({ recentSearches: updated });
  },

  clearRecentSearches: async () => {
    await SecureStore.deleteItemAsync('recent_searches');
    set({ recentSearches: [] });
  }
}));