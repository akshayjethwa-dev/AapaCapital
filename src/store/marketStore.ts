import { create } from 'zustand';

export interface Price {
  current: number;
  change: number;
  changePercent: number;
}

export interface Index {
  symbol: string;
  price: Price;
}

export interface Stock {
  symbol: string;
  name: string;
  price: Price;
  volume: number;
}

export interface MarketDepth {
  bids: { price: number; quantity: number }[];
  asks: { price: number; quantity: number }[];
}

interface MarketState {
  // Dashboard UI State
  indices: Index[];
  stocks: Stock[];
  watchlist: string[];
  
  // WebSocket Live Data State
  prices: Record<string, number>;
  marketDepth: Record<string, MarketDepth>;
  isConnected: boolean;
  
  // Actions
  setConnectionStatus: (status: boolean) => void;
  updateTickers: (data: Record<string, number>) => void;
  updateDepth: (symbol: string, depth: MarketDepth) => void;
  updatePrice: (symbol: string, price: Price) => void;
  addToWatchlist: (symbol: string) => void;
  removeFromWatchlist: (symbol: string) => void;
}

// Initial mock data for the dashboard
const initialIndices: Index[] = [
  { symbol: 'NIFTY 50', price: { current: 22145.20, change: 124.50, changePercent: 0.56 } },
  { symbol: 'BANKNIFTY', price: { current: 47500.10, change: -120.30, changePercent: -0.25 } },
  { symbol: 'SENSEX', price: { current: 72450.80, change: 350.20, changePercent: 0.48 } },
  { symbol: 'FINNIFTY', price: { current: 20540.00, change: 85.10, changePercent: 0.42 } },
];

const initialStocks: Stock[] = [
  { symbol: 'RELIANCE', name: 'Reliance Industries', price: { current: 2950.40, change: 45.20, changePercent: 1.55 }, volume: 12500000 },
  { symbol: 'HDFCBANK', name: 'HDFC Bank Ltd.', price: { current: 1450.20, change: 25.10, changePercent: 1.76 }, volume: 18400000 },
  { symbol: 'ZOMATO', name: 'Zomato Ltd.', price: { current: 165.40, change: 12.20, changePercent: 7.96 }, volume: 45000000 },
  { symbol: 'TCS', name: 'Tata Consultancy', price: { current: 4120.00, change: -35.50, changePercent: -0.85 }, volume: 3200000 },
  { symbol: 'PAYTM', name: 'One97 Comm.', price: { current: 430.10, change: -18.40, changePercent: -4.10 }, volume: 22000000 },
];

export const useMarketStore = create<MarketState>((set) => ({
  indices: initialIndices,
  stocks: initialStocks,
  watchlist: ['RELIANCE', 'TCS'],
  prices: {},
  marketDepth: {},
  isConnected: false,

  setConnectionStatus: (status) => set({ isConnected: status }),
  
  updateTickers: (data) => set((state) => ({ 
    prices: { ...state.prices, ...data } 
  })),

  updateDepth: (symbol, depth) => set((state) => ({
    marketDepth: { ...state.marketDepth, [symbol]: depth }
  })),

  updatePrice: (symbol, price) => set((state) => ({
    indices: state.indices.map(idx => 
      idx.symbol === symbol ? { ...idx, price } : idx
    ),
    stocks: state.stocks.map(stock => 
      stock.symbol === symbol ? { ...stock, price } : stock
    )
  })),

  addToWatchlist: (symbol) => set((state) => ({
    watchlist: state.watchlist.includes(symbol) ? state.watchlist : [...state.watchlist, symbol]
  })),

  removeFromWatchlist: (symbol) => set((state) => ({
    watchlist: state.watchlist.filter(s => s !== symbol)
  }))
}));