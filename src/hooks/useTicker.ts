import { useEffect } from 'react';
import { useMarketStore } from '../store/marketStore';
import { wsService } from '../services/websocket';

/**
 * Subscribes a component to a specific symbol's live price.
 * Automatically handles WebSocket subscription and cleanup.
 */
export const useTicker = (symbol: string) => {
  const priceData = useMarketStore((state) => state.prices[symbol]);

  useEffect(() => {
    if (!symbol) return;
    
    // Subscribe to live data stream when component mounts
    wsService.subscribe([symbol]);
    
    // Unsubscribe when component unmounts to save resources
    return () => {
      wsService.unsubscribe([symbol]);
    };
  }, [symbol]);

  // Return the live data, or fallback defaults if it hasn't loaded yet
  return priceData || { current: 0, change: 0, changePercent: 0 };
};

/**
 * Hook to get Market Depth (Order Book) for a specific symbol
 */
export const useMarketDepth = (symbol: string) => {
  return useMarketStore((state) => state.marketDepth[symbol] || { bids: [], asks: [] });
};