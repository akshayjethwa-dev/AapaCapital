import { useMarketStore } from '../store/marketStore';

type TickCallback = (symbol: string, current: number, change: number, changePercent: number) => void;

class MockExchangeService {
  private subscriptions: Set<string> = new Set();
  private intervalId: NodeJS.Timeout | null = null;
  private callbacks: TickCallback[] = [];
  
  // Base prices to start the simulation matching the MarketStore
  private prices: Record<string, number> = {
    'NIFTY 50': 22145.20,
    'BANKNIFTY': 47500.10,
    'SENSEX': 72450.80,
    'FINNIFTY': 20540.00,
    'RELIANCE': 2950.40,
    'HDFCBANK': 1450.20,
    'ZOMATO': 165.40,
    'TCS': 4120.00,
    'PAYTM': 430.10,
    'NIFTY 24MAY 22500 CE': 140.20,
    'BANKNIFTY 24MAY 48000 PE': 210.00,
  };

  // Keep track of the 'open' price to calculate accurate % changes
  private openPrices: Record<string, number> = { ...this.prices };

  constructor() {
    // Automatically wire up the mock exchange to our Zustand store!
    this.onTick((symbol, current, change, changePercent) => {
      useMarketStore.getState().updatePrice(symbol, { current, change, changePercent });
    });
  }

  connect() {
    console.log('✅ Mock Market WebSocket Connected');
    useMarketStore.getState().setConnectionStatus(true);
    
    // Auto-subscribe to dashboard defaults
    this.subscribe(['NIFTY 50', 'SENSEX', 'BANKNIFTY', 'RELIANCE']);
  }

  disconnect() {
    this.stopTicking();
    console.log('❌ Mock Market WebSocket Disconnected');
    useMarketStore.getState().setConnectionStatus(false);
  }

  subscribe(symbols: string[]) {
    symbols.forEach(sym => this.subscriptions.add(sym));
    this.startTicking();
  }

  unsubscribe(symbols: string[]) {
    symbols.forEach(sym => this.subscriptions.delete(sym));
    if (this.subscriptions.size === 0) {
      this.stopTicking();
    }
  }

  onTick(callback: TickCallback) {
    this.callbacks.push(callback);
  }

  private startTicking() {
    if (this.intervalId) return;
    
    // Broadcast new prices every 500ms (Real-time speed!)
    this.intervalId = setInterval(() => {
      this.subscriptions.forEach((symbol) => {
        const currentPrice = this.prices[symbol] || 100;
        
        // Realistic market volatility formula (Brownian Motion)
        // Adjust the multiplier (0.0003) for higher or lower volatility
        const volatility = currentPrice * 0.0003; 
        const changeTick = (Math.random() - 0.5) * volatility;
        
        const newPrice = Number((currentPrice + changeTick).toFixed(2));
        this.prices[symbol] = newPrice;

        // Calculate absolute and % change from open
        const openPrice = this.openPrices[symbol] || currentPrice;
        const absoluteChange = Number((newPrice - openPrice).toFixed(2));
        const percentChange = Number(((absoluteChange / openPrice) * 100).toFixed(2));

        // Notify the store!
        this.callbacks.forEach(cb => cb(symbol, newPrice, absoluteChange, percentChange));
      });
    }, 500); // Ticks 2 times per second
  }

  private stopTicking() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }
}

// Export as wsService to keep all your existing app imports working perfectly
export const wsService = new MockExchangeService();