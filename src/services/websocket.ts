import { useMarketStore } from '../store/marketStore';

// In production, replace with your actual secure WSS endpoint
const WS_URL = 'ws://your-backend-url.com/ws'; 

class WebSocketService {
  private ws: WebSocket | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;

  connect() {
    if (this.ws?.readyState === WebSocket.OPEN) return;

    this.ws = new WebSocket(WS_URL);

    this.ws.onopen = () => {
      console.log('✅ Market WebSocket Connected');
      useMarketStore.getState().setConnectionStatus(true);
      this.reconnectAttempts = 0;
      
      // Subscribe to initial channels (Indices by default)
      this.subscribe(['NIFTY 50', 'SENSEX', 'BANKNIFTY']);
    };

    this.ws.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data);
        
        // Handle tick data
        if (message.type === 'ticker') {
          useMarketStore.getState().updateTickers(message.data);
        }
        
        // Handle Market Depth / Order Book
        if (message.type === 'depth') {
          useMarketStore.getState().updateDepth(message.symbol, message.data);
        }
      } catch (error) {
        console.error('Error parsing WS message:', error);
      }
    };

    this.ws.onclose = () => {
      console.log('❌ Market WebSocket Disconnected');
      useMarketStore.getState().setConnectionStatus(false);
      this.handleReconnect();
    };

    this.ws.onerror = (error) => {
      console.error('WebSocket Error:', error);
    };
  }

  subscribe(symbols: string[]) {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({ action: 'subscribe', symbols }));
    }
  }

  unsubscribe(symbols: string[]) {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({ action: 'unsubscribe', symbols }));
    }
  }

  private handleReconnect() {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      const timeout = Math.pow(2, this.reconnectAttempts) * 1000;
      console.log(`Reconnecting in ${timeout}ms...`);
      setTimeout(() => this.connect(), timeout);
    }
  }

  disconnect() {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }
}

export const wsService = new WebSocketService();