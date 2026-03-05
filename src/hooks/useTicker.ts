import { useMarketStore } from '../store/marketStore';

/**
 * Subscribes a component to a specific symbol's live price.
 * Re-renders ONLY when this specific symbol's price changes.
 */
export const useTicker = (symbol: string) => {
  return useMarketStore((state) => state.prices[symbol] || 0);
};

/**
 * Hook to get Market Depth (Order Book) for a specific symbol
 */
export const useMarketDepth = (symbol: string) => {
  return useMarketStore((state) => state.marketDepth[symbol] || { bids: [], asks: [] });
};