import React, { useState, useEffect, useRef, useMemo } from 'react';
import { 
  LayoutDashboard, 
  TrendingUp, 
  Wallet, 
  User as UserIcon, 
  PieChart, 
  ShieldCheck, 
  Bell, 
  Search,
  ArrowUpRight,
  ArrowDownRight,
  Plus,
  Minus,
  Zap,
  ChevronRight,
  ArrowLeft,
  Filter,
  Settings2,
  LogOut,
  Settings,
  HelpCircle,
  FileText,
  MoreHorizontal,
  Info,
  History,
  CreditCard,
  Users,
  AlertTriangle,
  Newspaper,
  Activity,
  Target,
  XCircle,
  AlertCircle,
  Calendar,
  ArrowRightLeft,
  BarChart3,
  MousePointer2,
  ZapOff,
  Layers,
  ChevronDown,
  ArrowRight
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useAuthStore } from './store/authStore';
import { cn, formatCurrency } from './lib/utils';
import { getStockSummary } from './services/geminiService';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  PieChart as RePieChart,
  Pie,
  Cell
} from 'recharts';

// --- Types ---
interface Stock {
  symbol: string;
  price: number;
  change: number;
  changePercent: number;
}

// --- Constants & Data ---

const INDEX_CONSTITUENTS: Record<string, string[]> = {
  "NIFTY 50": ["RELIANCE", "TCS", "HDFCBANK", "INFY", "ICICIBANK", "HINDUNILVR", "ITC", "SBIN", "BHARTIARTL", "KOTAKBANK"],
  "BANKNIFTY": ["HDFCBANK", "ICICIBANK", "SBIN", "KOTAKBANK", "AXISBANK", "INDUSINDBK", "AUBANK", "BANDHANBNK", "FEDERALBNK", "IDFCFIRSTB"],
  "FINNIFTY": ["HDFCBANK", "ICICIBANK", "HDFCLIFE", "SBILIFE", "BAJFINANCE", "BAJAJFINSV", "CHOLAFIN", "RECLTD", "PFC", "MUTHOOTFIN"],
  "MIDCAP NIFTY": ["AUROPHARMA", "CUMMINSIND", "FEDERALBNK", "IDFCFIRSTB", "MPHASIS", "PERSISTENT", "POLYCAB", "TATACOMM", "VOLTAS", "YESBANK"],
  "SENSEX": ["RELIANCE", "TCS", "HDFCBANK", "INFY", "ICICIBANK", "HINDUNILVR", "ITC", "SBIN", "BHARTIARTL", "KOTAKBANK"],
  "NIFTY IT": ["TCS", "INFY", "HCLTECH", "WIPRO", "LTIM", "TECHM", "PERSISTENT", "COFORGE", "MPHASIS", "KPITTECH"],
};

const F_O_INDICES = ["NIFTY 50", "BANKNIFTY", "FINNIFTY", "MIDCAP NIFTY"];

// --- Components ---

const Sparkline = ({ color = '#10b981' }: { color?: string }) => (
  <svg width="60" height="24" viewBox="0 0 60 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M1 23L10 15L20 18L30 8L40 12L50 2L59 5" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

const Navbar = ({ activeTab, setActiveTab }: { activeTab: string, setActiveTab: (t: string) => void }) => {
  const tabs = [
    { id: 'dashboard', icon: LayoutDashboard, label: 'Dashboard' },
    { id: 'market', icon: TrendingUp, label: 'Market' },
    { id: 'fo', icon: Zap, label: 'F&O' },
    { id: 'portfolio', icon: PieChart, label: 'Portfolio' },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-black border-t border-zinc-900 px-6 py-2.5 flex justify-between items-center z-50">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          onClick={() => setActiveTab(tab.id)}
          className={cn(
            "flex flex-col items-center gap-1 transition-all duration-300",
            activeTab === tab.id ? "text-emerald-500 scale-110" : "text-zinc-600 hover:text-zinc-400"
          )}
        >
          <tab.icon size={22} strokeWidth={activeTab === tab.id ? 2.5 : 2} />
          <span className="text-[9px] font-bold uppercase tracking-widest">{tab.label}</span>
        </button>
      ))}
    </nav>
  );
};

const Header = ({ onProfileClick, onSearchClick }: { onProfileClick: () => void, onSearchClick: () => void }) => {
  const { user } = useAuthStore();
  return (
    <header className="fixed top-0 left-0 right-0 bg-black/80 backdrop-blur-xl border-b border-zinc-900 px-6 py-2.5 flex justify-between items-center z-50">
      <div className="flex items-center gap-4 cursor-pointer group" onClick={onProfileClick}>
        <div className="w-9 h-9 rounded-full bg-gradient-to-br from-emerald-500 to-emerald-900 p-0.5 shadow-lg shadow-emerald-500/10 group-hover:scale-105 transition-transform overflow-hidden">
          <img src="/icon.png" alt="AAPA" className="w-full h-full object-cover rounded-full" referrerPolicy="no-referrer" />
        </div>
        <h1 className="text-lg font-black tracking-tighter text-white flex items-center">
          AAPA <span className="text-emerald-500 ml-1.5">CAPITAL</span>
        </h1>
      </div>

      <div className="flex items-center gap-4">
        <button 
          onClick={onSearchClick}
          className="p-2 rounded-xl hover:bg-zinc-900 text-zinc-400 transition-colors"
        >
          <Search size={20} />
        </button>
        <button className="p-2 rounded-xl hover:bg-zinc-900 text-zinc-400 transition-colors relative">
          <Bell size={20} />
          <span className="absolute top-2 right-2 w-2 h-2 bg-emerald-500 rounded-full border-2 border-black" />
        </button>
      </div>
    </header>
  );
};

const Dashboard = ({ stocks, onMarketClick, onIndexClick }: { stocks: Record<string, number>, onMarketClick: () => void, onIndexClick: (index: string) => void }) => {
  const { user } = useAuthStore();
  const [portfolio, setPortfolio] = useState<any[]>([]);
  const [gainerLoserTab, setGainerLoserTab] = useState<'Gainers' | 'Losers'>('Gainers');
  const [eventFilter, setEventFilter] = useState('Upcoming');

  useEffect(() => {
    fetch('/api/portfolio', {
      headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
    }).then(res => res.json()).then(setPortfolio);
  }, []);

  const totalInvested = portfolio.reduce((acc, curr) => acc + (curr.quantity * curr.average_price), 0);
  const currentValue = portfolio.reduce((acc, curr) => acc + (curr.quantity * (stocks[curr.symbol] || curr.average_price)), 0);
  const dayPnL = currentValue - totalInvested;
  const dayPnLPercent = totalInvested > 0 ? (dayPnL / totalInvested) * 100 : 0;

  const primaryIndices = ["NIFTY 50", "SENSEX", "BANKNIFTY", "FINNIFTY", "MIDCAP NIFTY", "SMALLCAP NIFTY"];
  const secondaryIndices = ["NIFTY IT", "NIFTY AUTO", "NIFTY PHARMA", "NIFTY METAL", "NIFTY FMCG", "NIFTY REALTY"];

  const news = [
    { id: 1, headline: "Reliance Industries expansion plans drive stock higher", source: "Mint", time: "2h ago", thumb: "https://picsum.photos/seed/reliance/100/100" },
    { id: 2, headline: "RBI maintains repo rate, market reacts positively", source: "ET Now", time: "4h ago", thumb: "https://picsum.photos/seed/rbi/100/100" },
    { id: 3, headline: "NIFTY hits record high amid global rally", source: "CNBC TV18", time: "5h ago", thumb: "https://picsum.photos/seed/nifty/100/100" },
  ];

  const marketEvents = [
    { id: 1, company: "RELIANCE", type: "Results", date: "15 Mar 2026", countdown: "In 15 Days", color: "blue" },
    { id: 2, company: "TCS", type: "Dividend", date: "05 Mar 2026", countdown: "In 5 Days", color: "green" },
    { id: 3, company: "HDFCBANK", type: "Board Meeting", date: "03 Mar 2026", countdown: "In 3 Days", color: "orange" },
    { id: 4, company: "INFY", type: "Bonus", date: "20 Mar 2026", countdown: "In 20 Days", color: "purple" },
  ];

  const stocksInNews = [
    { symbol: "TATASTEEL", change: 2.45, tag: "Order Win" },
    { symbol: "ADANIENT", change: -1.20, tag: "Earnings Beat" },
    { symbol: "ZOMATO", change: 5.12, tag: "Expansion" },
    { symbol: "PAYTM", change: -3.40, tag: "Regulatory" },
    { symbol: "JIOFIN", change: 1.80, tag: "New Product" },
  ];

  const volumeRockers = [
    { symbol: "YESBANK", price: 28.45, change: 12.4, volumeMultiplier: "8.5x" },
    { symbol: "SUZLON", price: 45.10, change: -4.2, volumeMultiplier: "5.2x" },
    { symbol: "IDEA", price: 14.20, change: 8.1, volumeMultiplier: "4.1x" },
    { symbol: "RVNL", price: 245.60, change: 6.5, volumeMultiplier: "3.8x" },
  ];

  const filteredEvents = useMemo(() => {
    if (eventFilter === 'All') return marketEvents;
    if (eventFilter === 'This Week') return marketEvents.slice(0, 2);
    return marketEvents.filter(e => e.countdown.includes('Days'));
  }, [eventFilter, marketEvents]);

  const sortedGainersLosers = useMemo(() => {
    const list = Object.entries(stocks)
      .filter(([s]) => !primaryIndices.includes(s) && !secondaryIndices.includes(s))
      .map(([symbol, price]) => ({ symbol, price, change: (Math.random() * 10 - 5) })); // Mock change for sorting
    
    return list.sort((a, b) => gainerLoserTab === 'Gainers' ? b.change - a.change : a.change - b.change).slice(0, 5);
  }, [stocks, gainerLoserTab, primaryIndices, secondaryIndices]);

  return (
    <div className="space-y-5 pb-20">
      {/* Market Indices Section */}
      <div className="space-y-2.5">
        <div className="px-5 flex justify-between items-center">
          <h3 className="text-[11px] font-bold uppercase tracking-widest text-zinc-500">Market Indices</h3>
        </div>
        <div className="px-5 overflow-x-auto scrollbar-hide flex gap-2.5 py-2">
          {[...primaryIndices, ...secondaryIndices].map(index => (
            <motion.div 
              key={index} 
              whileHover={{ y: -2 }}
              onClick={() => onIndexClick(index)}
              className="min-w-[140px] bg-zinc-900/40 border border-zinc-800/50 rounded-xl pt-2.5 pb-3 px-3 flex flex-col gap-1 cursor-pointer"
            >
              <div className="flex justify-between items-start">
                <span className="text-[9px] font-bold text-zinc-500 uppercase tracking-wider">{index}</span>
                <Sparkline color={stocks[index] > (index.includes('SENSEX') ? 70000 : 20000) ? '#10b981' : '#ef4444'} />
              </div>
              <div>
                <p className="text-[15px] font-bold tracking-tight">{stocks[index]?.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</p>
                <div className="flex items-center gap-1">
                  {stocks[index] > (index.includes('SENSEX') ? 70000 : 20000) ? <ArrowUpRight size={10} className="text-emerald-500" /> : <ArrowDownRight size={10} className="text-rose-500" />}
                  <p className={cn("text-[9px] font-bold", stocks[index] > (index.includes('SENSEX') ? 70000 : 20000) ? "text-emerald-500" : "text-rose-500")}>
                    +1.24%
                  </p>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Portfolio Snapshot */}
      <div className="px-5">
        <div className="bg-zinc-900/30 border border-zinc-800/50 rounded-2xl p-4 space-y-4">
          <div className="flex justify-between items-center">
            <div>
              <p className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest mb-1">Today's P&L</p>
              <p className={cn("text-lg font-bold", dayPnL >= 0 ? "text-emerald-500" : "text-rose-500")}>
                {dayPnL >= 0 ? '+' : ''}{formatCurrency(dayPnL)} ({dayPnLPercent.toFixed(2)}%)
              </p>
            </div>
            <div className="text-right">
              <div className="flex items-center gap-2 justify-end">
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                <p className="text-[9px] font-bold text-emerald-500 uppercase tracking-widest">Live</p>
              </div>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-5 pt-4 border-t border-zinc-800/50">
            <div>
              <p className="text-[9px] font-bold text-zinc-600 uppercase tracking-widest mb-1">Invested</p>
              <p className="text-[13px] font-bold text-zinc-300">{formatCurrency(totalInvested)}</p>
            </div>
            <div>
              <p className="text-[9px] font-bold text-zinc-600 uppercase tracking-widest mb-1">Available Funds</p>
              <p className="text-[13px] font-bold text-zinc-300">{formatCurrency(user?.balance || 0)}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Market Sentiment Section */}
      <div className="px-5">
        <div className="bg-zinc-900/20 border border-zinc-800/30 rounded-2xl p-4 flex justify-between items-center">
          <div className="space-y-0.5">
            <p className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest">India VIX</p>
            <p className="text-[13px] font-bold text-white">14.25 <span className="text-emerald-500 text-[9px]">-2.4%</span></p>
          </div>
          <div className="h-7 w-[1px] bg-zinc-800" />
          <div className="space-y-0.5">
            <p className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest">Adv / Dec</p>
            <p className="text-[13px] font-bold text-white">1240 / 850</p>
          </div>
          <div className="h-7 w-[1px] bg-zinc-800" />
          <div className="flex items-center gap-2">
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            <p className="text-[9px] font-bold text-emerald-500 uppercase tracking-widest">Bullish</p>
          </div>
        </div>
      </div>

      {/* Top Gainers & Losers */}
      <div className="px-5 space-y-2.5">
        <div className="flex bg-zinc-900/50 p-1 rounded-xl border border-zinc-800/50">
          {['Gainers', 'Losers'].map(tab => (
            <button
              key={tab}
              onClick={() => setGainerLoserTab(tab as any)}
              className={cn(
                "flex-1 py-1.5 rounded-lg text-[9px] font-bold uppercase tracking-widest transition-all",
                gainerLoserTab === tab ? "bg-zinc-800 text-white shadow-lg" : "text-zinc-500"
              )}
            >
              {tab}
            </button>
          ))}
        </div>
        <div className="space-y-2">
          {sortedGainersLosers.map(({ symbol, price, change }) => (
            <div key={symbol} className="bg-zinc-900/20 border border-zinc-800/30 rounded-xl p-3 flex justify-between items-center">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-zinc-900 flex items-center justify-center font-bold text-[11px] text-zinc-500">
                  {symbol.substring(0, 2)}
                </div>
                <div>
                  <p className="text-[13px] font-bold text-white tracking-tight">{symbol}</p>
                  <p className="text-[9px] font-bold text-zinc-600 uppercase">NSE</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-[13px] font-bold text-white">{formatCurrency(price)}</p>
                <p className={cn("text-[9px] font-bold", change >= 0 ? "text-emerald-500" : "text-rose-500")}>
                  {change >= 0 ? '+' : ''}{change.toFixed(2)}%
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Stocks in News */}
      <div className="px-5 space-y-2.5">
        <div className="flex justify-between items-center">
          <h3 className="text-[11px] font-bold uppercase tracking-widest text-zinc-500">Stocks in News</h3>
          <button 
            onClick={onMarketClick}
            className="text-[9px] font-bold text-emerald-500 uppercase tracking-widest"
          >
            View All
          </button>
        </div>
        <div className="space-y-2">
          {stocksInNews.map((stock) => (
            <div key={stock.symbol} className="bg-zinc-900/20 border border-zinc-800/30 rounded-xl p-3 flex justify-between items-center">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-zinc-900 flex items-center justify-center">
                  <Newspaper size={16} className="text-zinc-600" />
                </div>
                <div>
                  <p className="text-[13px] font-bold text-white tracking-tight">{stock.symbol}</p>
                  <span className="px-1.5 py-0.5 rounded bg-zinc-800 text-[8px] font-bold text-zinc-400 uppercase tracking-wider">
                    {stock.tag}
                  </span>
                </div>
              </div>
              <div className="text-right">
                <p className={cn("text-[13px] font-bold", stock.change >= 0 ? "text-emerald-500" : "text-rose-500")}>
                  {stock.change >= 0 ? '+' : ''}{stock.change}%
                </p>
                <p className="text-[9px] font-bold text-zinc-600 uppercase">Today</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Volume Rockers */}
      <div className="px-5 space-y-2.5">
        <div className="flex justify-between items-center">
          <h3 className="text-[11px] font-bold uppercase tracking-widest text-zinc-500">Volume Rockers</h3>
          <Activity size={14} className="text-zinc-700" />
        </div>
        <div className="space-y-2">
          {volumeRockers.map((stock) => (
            <div key={stock.symbol} className="bg-zinc-900/20 border border-zinc-800/30 rounded-xl p-3 flex justify-between items-center">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-zinc-900 flex items-center justify-center font-bold text-[11px] text-zinc-500">
                  {stock.symbol.substring(0, 2)}
                </div>
                <div>
                  <p className="text-[13px] font-bold text-white tracking-tight">{stock.symbol}</p>
                  <p className="text-[9px] font-bold text-zinc-600 uppercase">
                    Vol: <span className={cn("font-black", stock.change >= 0 ? "text-emerald-500" : "text-rose-500")}>{stock.volumeMultiplier}</span>
                  </p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-[13px] font-bold text-white">{formatCurrency(stock.price)}</p>
                <p className={cn("text-[9px] font-bold", stock.change >= 0 ? "text-emerald-500" : "text-rose-500")}>
                  {stock.change >= 0 ? '+' : ''}{stock.change}%
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Market News Section */}
      <div className="space-y-2.5">
        <div className="px-5 flex justify-between items-center">
          <h3 className="text-[11px] font-bold uppercase tracking-widest text-zinc-500">Market News</h3>
          <Newspaper size={14} className="text-zinc-700" />
        </div>
        <div className="px-5 overflow-x-auto scrollbar-hide flex gap-2.5 py-2">
          {news.map(item => (
            <div key={item.id} className="min-w-[260px] bg-zinc-900/30 border border-zinc-800/50 rounded-xl p-3 flex gap-2.5">
              <img src={item.thumb} alt="" className="w-14 h-14 rounded-xl object-cover" referrerPolicy="no-referrer" />
              <div className="flex-1 space-y-1">
                <p className="text-[11px] font-bold text-white leading-snug line-clamp-2">{item.headline}</p>
                <div className="flex justify-between items-center pt-1">
                  <span className="text-[8px] font-bold text-zinc-500 uppercase">{item.source}</span>
                  <span className="text-[8px] font-bold text-zinc-600">{item.time}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Market Events */}
      <div className="space-y-2.5">
        <div className="px-5 flex justify-between items-center">
          <h3 className="text-[11px] font-bold uppercase tracking-widest text-zinc-500">Market Events</h3>
          <div className="flex bg-zinc-900/50 p-1 rounded-lg border border-zinc-800/50">
            {['Upcoming', 'This Week', 'All'].map(filter => (
              <button
                key={filter}
                onClick={() => setEventFilter(filter)}
                className={cn(
                  "px-2.5 py-1 rounded-md text-[8px] font-bold uppercase tracking-widest transition-all",
                  eventFilter === filter ? "bg-zinc-800 text-white" : "text-zinc-500"
                )}
              >
                {filter}
              </button>
            ))}
          </div>
        </div>
        <div className="px-5 overflow-x-auto scrollbar-hide flex gap-2.5 py-2">
          {filteredEvents.map(event => (
            <div key={event.id} className="min-w-[180px] bg-zinc-900/30 border border-zinc-800/50 rounded-xl p-3 space-y-2">
              <div className="flex justify-between items-start">
                <p className="text-[13px] font-bold text-white tracking-tight">{event.company}</p>
                <span className={cn(
                  "px-2 py-0.5 rounded text-[8px] font-bold uppercase tracking-wider",
                  event.color === 'blue' && "bg-blue-500/10 text-blue-400 border border-blue-500/20",
                  event.color === 'green' && "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20",
                  event.color === 'orange' && "bg-orange-500/10 text-orange-400 border border-orange-500/20",
                  event.color === 'purple' && "bg-purple-500/10 text-purple-400 border border-purple-500/20"
                )}>
                  {event.type}
                </span>
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-2 text-zinc-500">
                  <Calendar size={12} />
                  <span className="text-[10px] font-bold">{event.date}</span>
                </div>
                <p className="text-[10px] font-bold text-emerald-500 uppercase tracking-widest">{event.countdown}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

const IndexOverview = ({ indexName, stocks, onClose, onOpenOptionChain }: { 
  indexName: string, 
  stocks: Record<string, number>, 
  onClose: () => void,
  onOpenOptionChain: () => void 
}) => {
  const [sortBy, setSortBy] = useState<'change' | 'volume'>('change');
  const [viewMode, setViewMode] = useState<'list' | 'heatmap'>('list');
  
  const price = stocks[indexName] || 0;
  const change = 1.24; // Mock
  const isPositive = change >= 0;

  const constituents = useMemo(() => {
    const symbols = INDEX_CONSTITUENTS[indexName] || [];
    return symbols.map(symbol => ({
      symbol,
      price: stocks[symbol] || (Math.random() * 2000 + 500),
      change: (Math.random() * 4 - 1.5),
      volume: Math.floor(Math.random() * 50000000) + 1000000
    }));
  }, [indexName, stocks]);

  const sortedConstituents = useMemo(() => {
    return [...constituents].sort((a, b) => {
      if (sortBy === 'change') return b.change - a.change;
      return b.volume - a.volume;
    });
  }, [constituents, sortBy]);

  // Mock chart data
  const chartData = useMemo(() => {
    return Array.from({ length: 20 }, (_, i) => ({
      time: i,
      value: price * (1 + (Math.random() * 0.01 - 0.005))
    }));
  }, [price]);

  return (
    <motion.div 
      initial={{ y: '100%' }}
      animate={{ y: 0 }}
      exit={{ y: '100%' }}
      transition={{ type: 'spring', damping: 25, stiffness: 200 }}
      className="fixed inset-0 z-[80] bg-white flex flex-col text-zinc-900"
    >
      {/* Header */}
      <div className="px-6 py-4 flex items-center justify-between border-b border-zinc-100">
        <div className="flex items-center gap-4">
          <button onClick={onClose} className="p-2 -ml-2 rounded-full hover:bg-zinc-100 text-zinc-600">
            <ArrowLeft size={20} />
          </button>
          <div>
            <h2 className="text-lg font-black tracking-tight">{indexName}</h2>
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold">{price.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
              <span className={cn("text-[10px] font-bold", isPositive ? "text-emerald-600" : "text-rose-600")}>
                {isPositive ? '+' : ''}{change}%
              </span>
            </div>
          </div>
        </div>
        <div className="w-24 h-10">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData}>
              <Bar 
                dataKey="value" 
                fill={isPositive ? "#10b981" : "#ef4444"} 
                radius={[2, 2, 0, 0]}
                opacity={0.3}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="px-6 py-6 flex gap-3">
        <button 
          onClick={onOpenOptionChain}
          className="flex-1 bg-zinc-900 text-white py-4 rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl shadow-zinc-900/20 active:scale-95 transition-all flex items-center justify-center gap-2"
        >
          <Zap size={14} className="text-emerald-500" />
          Option Chain
        </button>
        <button 
          onClick={() => setViewMode(viewMode === 'list' ? 'heatmap' : 'list')}
          className={cn(
            "flex-1 py-4 rounded-2xl font-black text-xs uppercase tracking-widest active:scale-95 transition-all flex items-center justify-center gap-2",
            viewMode === 'heatmap' ? "bg-emerald-500 text-black shadow-xl shadow-emerald-500/20" : "bg-zinc-100 text-zinc-900"
          )}
        >
          <Layers size={14} className={viewMode === 'heatmap' ? "text-black" : "text-zinc-400"} />
          {viewMode === 'heatmap' ? 'List View' : 'Heatmap'}
        </button>
      </div>

      {/* Constituents Section */}
      <div className="flex-1 overflow-y-auto px-6 pb-24">
        {viewMode === 'list' ? (
          <>
            <div className="flex justify-between items-center mb-4 sticky top-0 bg-white py-2 z-10">
              <h3 className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">Constituents</h3>
              <div className="flex gap-2">
                <button 
                  onClick={() => setSortBy('change')}
                  className={cn(
                    "px-3 py-1 rounded-full text-[9px] font-bold uppercase tracking-wider border transition-all",
                    sortBy === 'change' ? "bg-zinc-900 text-white border-zinc-900" : "bg-white text-zinc-400 border-zinc-200"
                  )}
                >
                  % Change
                </button>
                <button 
                  onClick={() => setSortBy('volume')}
                  className={cn(
                    "px-3 py-1 rounded-full text-[9px] font-bold uppercase tracking-wider border transition-all",
                    sortBy === 'volume' ? "bg-zinc-900 text-white border-zinc-900" : "bg-white text-zinc-400 border-zinc-200"
                  )}
                >
                  Volume
                </button>
              </div>
            </div>

            <div className="space-y-3">
              {sortedConstituents.map(stock => (
                <div key={stock.symbol} className="bg-zinc-50 border border-zinc-100 rounded-2xl p-4 flex justify-between items-center">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-xl bg-white border border-zinc-100 flex items-center justify-center font-black text-[10px] text-zinc-400">
                      {stock.symbol.substring(0, 2)}
                    </div>
                    <div>
                      <p className="text-sm font-black text-zinc-900 tracking-tight">{stock.symbol}</p>
                      <p className="text-[9px] font-bold text-zinc-400 uppercase tracking-tighter">NSE • Vol: {(stock.volume / 1000000).toFixed(1)}M</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-6">
                    <div className="hidden sm:block">
                      <Sparkline color={stock.change >= 0 ? '#10b981' : '#ef4444'} />
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-bold text-zinc-900">{formatCurrency(stock.price)}</p>
                      <p className={cn("text-[10px] font-black", stock.change >= 0 ? "text-emerald-600" : "text-rose-600")}>
                        {stock.change >= 0 ? '+' : ''}{stock.change.toFixed(2)}%
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </>
        ) : (
          <div className="grid grid-cols-3 gap-2">
            {sortedConstituents.map(stock => (
              <div 
                key={stock.symbol}
                className={cn(
                  "aspect-square rounded-xl p-2 flex flex-col justify-between border",
                  stock.change >= 1 ? "bg-emerald-500 text-black border-emerald-600" :
                  stock.change > 0 ? "bg-emerald-100 text-emerald-900 border-emerald-200" :
                  stock.change > -1 ? "bg-rose-100 text-rose-900 border-rose-200" :
                  "bg-rose-500 text-white border-rose-600"
                )}
              >
                <p className="text-[10px] font-black uppercase tracking-tighter">{stock.symbol}</p>
                <p className="text-[11px] font-bold">{stock.change.toFixed(2)}%</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </motion.div>
  );
};

const OrderWindow = ({ config, onClose, onOrderPlaced }: { config: any, onClose: () => void, onOrderPlaced: () => void }) => {
  const [quantity, setQuantity] = useState(config.quantity || 1);
  const [orderType, setOrderType] = useState('Market');
  const [product, setProduct] = useState('Intraday');
  const [price, setPrice] = useState(config.price || 0);
  const [loading, setLoading] = useState(false);

  const handlePlaceOrder = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          symbol: config.strike ? `${config.symbol} ${config.strike} ${config.optionType}` : config.symbol,
          type: config.side.toLowerCase(),
          order_type: orderType.toLowerCase(),
          quantity: parseInt(quantity),
          price: orderType === 'Market' ? config.price : parseFloat(price)
        })
      });
      const data = await res.json();
      if (data.success) {
        onOrderPlaced();
        onClose();
      } else {
        alert(data.error || 'Order failed');
      }
    } catch (e) {
      alert('Network error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div 
      initial={{ y: '100%' }}
      animate={{ y: 0 }}
      exit={{ y: '100%' }}
      className="fixed inset-0 z-[110] bg-black flex flex-col"
    >
      <div className="px-6 py-4 border-b border-zinc-900 flex justify-between items-center">
        <div className="flex items-center gap-3">
          <button onClick={onClose} className="p-2 rounded-xl hover:bg-zinc-900 text-zinc-400">
            <ChevronRight className="rotate-180" size={24} />
          </button>
          <div>
            <h2 className="text-sm font-black text-white tracking-tight">
              {config.side} {config.symbol.replace(' 50', '')}{config.strike ? ` ${config.strike} ${config.optionType}` : ''}
            </h2>
            <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">
              {config.expiry || 'Equity • NSE'}
            </p>
          </div>
        </div>
        <div className={cn(
          "px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest",
          config.side === 'BUY' ? "bg-emerald-500/10 text-emerald-500" : "bg-rose-500/10 text-rose-500"
        )}>
          {config.side}
        </div>
      </div>

      <div className="flex-1 p-6 space-y-8 overflow-y-auto">
        {config.strike && (
          <div className="grid grid-cols-3 gap-4 pb-6 border-b border-zinc-900">
            <div>
              <p className="text-[9px] font-bold text-zinc-600 uppercase tracking-widest mb-1">Strike</p>
              <p className="text-xs font-bold text-white">{config.strike}</p>
            </div>
            <div>
              <p className="text-[9px] font-bold text-zinc-600 uppercase tracking-widest mb-1">Type</p>
              <p className="text-xs font-bold text-white">{config.optionType}</p>
            </div>
            <div>
              <p className="text-[9px] font-bold text-zinc-600 uppercase tracking-widest mb-1">Expiry</p>
              <p className="text-xs font-bold text-white">{config.expiry}</p>
            </div>
          </div>
        )}

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="text-[10px] font-bold text-zinc-600 uppercase tracking-widest ml-1">Quantity</label>
            <input 
              type="number" 
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              className="w-full bg-zinc-900/30 border border-zinc-800/50 rounded-2xl py-4 px-6 text-sm font-bold focus:outline-none focus:border-emerald-500/50 transition-all" 
            />
          </div>
          <div className="space-y-2">
            <label className="text-[10px] font-bold text-zinc-600 uppercase tracking-widest ml-1">Price</label>
            <input 
              type="number" 
              disabled={orderType === 'Market'}
              value={orderType === 'Market' ? config.price : price}
              onChange={(e) => setPrice(e.target.value)}
              className="w-full bg-zinc-900/30 border border-zinc-800/50 rounded-2xl py-4 px-6 text-sm font-bold focus:outline-none focus:border-emerald-500/50 transition-all disabled:opacity-50" 
            />
          </div>
        </div>

        <div className="space-y-3">
          <p className="text-[10px] font-bold text-zinc-600 uppercase tracking-widest ml-1">Order Type</p>
          <div className="flex bg-zinc-900/50 p-1 rounded-xl border border-zinc-800/50">
            {['Market', 'Limit'].map(t => (
              <button
                key={t}
                onClick={() => setOrderType(t)}
                className={cn(
                  "flex-1 py-3 rounded-lg text-[10px] font-bold uppercase tracking-widest transition-all",
                  orderType === t ? "bg-zinc-800 text-white shadow-lg" : "text-zinc-500"
                )}
              >
                {t}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-3">
          <p className="text-[10px] font-bold text-zinc-600 uppercase tracking-widest ml-1">Product</p>
          <div className="flex bg-zinc-900/50 p-1 rounded-xl border border-zinc-800/50">
            {['Intraday', 'Delivery'].map(p => (
              <button
                key={p}
                onClick={() => setProduct(p)}
                className={cn(
                  "flex-1 py-3 rounded-lg text-[10px] font-bold uppercase tracking-widest transition-all",
                  product === p ? "bg-zinc-800 text-white shadow-lg" : "text-zinc-500"
                )}
              >
                {p}
              </button>
            ))}
          </div>
        </div>

        <div className="bg-zinc-900/20 border border-zinc-800/30 rounded-2xl p-4 flex justify-between items-center">
          <div>
            <p className="text-[10px] font-bold text-zinc-600 uppercase tracking-widest">Approx Margin</p>
            <p className="text-sm font-bold text-white">{formatCurrency(quantity * (orderType === 'Market' ? config.price : price))}</p>
          </div>
          <div className="text-right">
            <p className="text-[10px] font-bold text-zinc-600 uppercase tracking-widest">Available</p>
            <p className="text-sm font-bold text-emerald-500">₹1,25,000.00</p>
          </div>
        </div>
      </div>

      <div className="p-6 bg-black border-t border-zinc-900">
        <button 
          onClick={handlePlaceOrder}
          disabled={loading}
          className={cn(
            "w-full font-black py-5 rounded-2xl transition-all shadow-xl uppercase text-xs tracking-widest",
            config.side === 'BUY' ? "bg-emerald-500 text-black shadow-emerald-500/10" : "bg-rose-500 text-black shadow-rose-500/10",
            loading && "opacity-50 cursor-not-allowed"
          )}
        >
          {loading ? 'Processing...' : `${config.side} ${config.symbol}`}
        </button>
      </div>
    </motion.div>
  );
};

const IndexDetail = ({ indexName, stocks, onClose, onPlaceOrder }: { 
  indexName: string, 
  stocks: Record<string, number>, 
  onClose: () => void,
  onPlaceOrder: (config: any) => void
}) => {
  const [activeTab, setActiveTab] = useState<'Stocks' | 'Option Chain'>(F_O_INDICES.includes(indexName) || indexName === 'SENSEX' ? 'Option Chain' : 'Stocks');
  const [expiry, setExpiry] = useState('27 MAR 2026');
  const [selectedStrike, setSelectedStrike] = useState<any>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const atmRef = useRef<HTMLDivElement>(null);
  
  const isFO = F_O_INDICES.includes(indexName) || indexName === 'SENSEX';
  const constituents = INDEX_CONSTITUENTS[indexName] || [];
  const spotPrice = stocks[indexName] || 0;
  const pcr = 0.92;
  
  const high = spotPrice * 1.005;
  const low = spotPrice * 0.992;

  const expiries = ['27 MAR 2026', '03 APR 2026', '10 APR 2026', '17 APR 2026'];
  const strikeInterval = indexName.includes('BANKNIFTY') ? 100 : 50;

  const jumpToATM = () => {
    atmRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  };

  // Simulate LTP updates for flashing effect
  const [ltpUpdates, setLtpUpdates] = useState<Record<number, boolean>>({});
  useEffect(() => {
    const interval = setInterval(() => {
      const randomStrikeIdx = Math.floor(Math.random() * 20);
      const baseStrike = Math.floor(spotPrice / strikeInterval) * strikeInterval;
      const strike = baseStrike + (randomStrikeIdx - 10) * strikeInterval;
      
      setLtpUpdates(prev => ({ ...prev, [strike]: true }));
      setTimeout(() => {
        setLtpUpdates(prev => ({ ...prev, [strike]: false }));
      }, 500);
    }, 1000);
    return () => clearInterval(interval);
  }, [spotPrice, strikeInterval]);

  return (
    <motion.div 
      initial={{ x: '100%' }}
      animate={{ x: 0 }}
      exit={{ x: '100%' }}
      className="fixed inset-0 z-[70] bg-zinc-50 flex flex-col text-zinc-900"
    >
      {/* Institutional Header */}
      <div className="px-4 py-2.5 border-b border-zinc-200 flex items-center justify-between bg-white sticky top-0 z-[60]">
        <div className="flex items-center gap-3">
          <button onClick={onClose} className="p-1.5 -ml-1.5 rounded-full hover:bg-zinc-100 text-zinc-600 transition-colors">
            <ArrowLeft size={18} />
          </button>
          <div>
            <h2 className="text-[13px] font-bold tracking-tight text-zinc-900">{indexName}</h2>
            <p className="text-[8px] font-bold text-zinc-400 uppercase tracking-widest">Option Chain</p>
          </div>
        </div>

        <div className="absolute left-1/2 -translate-x-1/2">
          <div className="relative group">
            <select 
              value={expiry}
              onChange={(e) => setExpiry(e.target.value)}
              className="bg-zinc-100 text-zinc-900 text-[10px] font-bold pl-2.5 pr-7 py-1 rounded-full border-none outline-none appearance-none cursor-pointer hover:bg-zinc-200 transition-colors"
            >
              {expiries.map(e => <option key={e} value={e}>{e}</option>)}
            </select>
            <ChevronDown size={10} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-500 pointer-events-none" />
          </div>
        </div>

        <div className="flex items-center gap-0.5">
          <button className="p-1.5 rounded-full hover:bg-zinc-100 text-zinc-500 transition-colors">
            <Filter size={16} />
          </button>
          <button className="p-1.5 rounded-full hover:bg-zinc-100 text-zinc-500 transition-colors">
            <Settings2 size={16} />
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto pb-20 scrollbar-hide flex flex-col bg-white" ref={scrollRef}>
        {/* Day High/Low - Minimalist */}
        <div className="px-4 py-1.5 bg-zinc-50/50 border-b border-zinc-100 flex justify-center gap-6">
          <div className="flex items-center gap-2">
            <span className="text-[8px] font-bold text-zinc-400 uppercase tracking-widest">Day High</span>
            <span className="text-[10px] font-bold text-emerald-600">{high.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[8px] font-bold text-zinc-400 uppercase tracking-widest">Day Low</span>
            <span className="text-[10px] font-bold text-rose-600">{low.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</span>
          </div>
        </div>

        {isFO && activeTab === 'Option Chain' ? (
          <div className="flex-1 flex flex-col relative">
            {/* Table Header */}
            <div className="grid grid-cols-[1fr_90px_1fr] border-b border-zinc-100 bg-white sticky top-0 z-30">
              <div className="py-2 text-center border-r border-zinc-100">
                <span className="text-[9px] font-bold text-zinc-400 uppercase tracking-widest">Call Price</span>
              </div>
              <div className="py-2 text-center bg-zinc-50/50">
                <span className="text-[9px] font-bold text-zinc-400 uppercase tracking-widest">Strike</span>
              </div>
              <div className="py-2 text-center border-l border-zinc-100">
                <span className="text-[9px] font-bold text-zinc-400 uppercase tracking-widest">Put Price</span>
              </div>
            </div>

            {/* Option Chain Rows */}
            <div className="divide-y divide-zinc-50 relative">
              {[...Array(40)].map((_, i) => {
                const baseStrike = Math.floor(spotPrice / strikeInterval) * strikeInterval;
                const strike = baseStrike + (i - 20) * strikeInterval;
                const isATM = strike === baseStrike;
                const isCallITM = strike < spotPrice;
                const isPutITM = strike > spotPrice;

                const callLtp = (Math.random() * 500 + 10).toFixed(2);
                const putLtp = (Math.random() * 500 + 10).toFixed(2);
                const callChange = (Math.random() * 4 - 2).toFixed(2);
                const putChange = (Math.random() * 4 - 2).toFixed(2);

                // Pressure bars data
                const callPressure = Math.random() * 100;
                const putPressure = Math.random() * 100;

                return (
                  <div 
                    key={strike} 
                    ref={isATM ? atmRef : null}
                    onClick={() => setSelectedStrike(null)}
                    className={cn(
                      "grid grid-cols-[1fr_90px_1fr] transition-colors relative group",
                      isATM ? "bg-emerald-50/30" : "hover:bg-zinc-50/50"
                    )}
                  >
                    {/* ATM Full Width Line */}
                    {isATM && (
                      <div className="absolute inset-x-0 top-0 h-[1px] bg-emerald-500/50 z-20" />
                    )}

                    {/* CALL SIDE */}
                    <div 
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedStrike({ strike, type: 'CE', price: callLtp });
                      }}
                      className={cn(
                        "flex flex-col items-center justify-center py-2.5 border-r border-zinc-100 cursor-pointer transition-all",
                        isCallITM && "bg-emerald-50/10",
                        selectedStrike?.strike === strike && selectedStrike?.type === 'CE' && "bg-emerald-500/10 ring-1 ring-inset ring-emerald-500/20"
                      )}
                    >
                      <motion.span 
                        animate={ltpUpdates[strike] ? { scale: [1, 1.05, 1], color: ['#18181b', '#059669', '#18181b'] } : {}}
                        className="text-[13px] font-bold text-zinc-900"
                      >
                        {callLtp}
                      </motion.span>
                      <span className={cn("text-[9px] font-medium", parseFloat(callChange) >= 0 ? "text-emerald-600" : "text-rose-600")}>
                        {parseFloat(callChange) >= 0 ? '+' : ''}{callChange}%
                      </span>
                    </div>

                    {/* STRIKE PRICE */}
                    <div className={cn(
                      "flex flex-col items-center justify-center py-2.5 bg-zinc-50/30 relative",
                      isATM && "bg-emerald-100/20"
                    )}>
                      <span className={cn(
                        "tracking-tight transition-all",
                        isATM ? "text-base font-black text-emerald-700 scale-105" : "text-[13px] font-bold text-zinc-400"
                      )}>
                        {strike}
                      </span>
                      
                      {/* Pressure Bars */}
                      <div className="absolute bottom-1 w-full px-3 flex gap-1 h-[1.5px]">
                        <div 
                          className="h-full bg-rose-500/60 rounded-full transition-all duration-700" 
                          style={{ width: `${callPressure}%` }}
                        />
                        <div 
                          className="h-full bg-emerald-500/60 rounded-full transition-all duration-700" 
                          style={{ width: `${putPressure}%` }}
                        />
                      </div>
                    </div>

                    {/* PUT SIDE */}
                    <div 
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedStrike({ strike, type: 'PE', price: putLtp });
                      }}
                      className={cn(
                        "flex flex-col items-center justify-center py-2.5 border-l border-zinc-100 cursor-pointer transition-all",
                        isPutITM && "bg-rose-50/10",
                        selectedStrike?.strike === strike && selectedStrike?.type === 'PE' && "bg-rose-500/10 ring-1 ring-inset ring-rose-500/20"
                      )}
                    >
                      <motion.span 
                        animate={ltpUpdates[strike] ? { scale: [1, 1.05, 1], color: ['#18181b', '#e11d48', '#18181b'] } : {}}
                        className="text-[13px] font-bold text-zinc-900"
                      >
                        {putLtp}
                      </motion.span>
                      <span className={cn("text-[9px] font-medium", parseFloat(putChange) >= 0 ? "text-emerald-600" : "text-rose-600")}>
                        {parseFloat(putChange) >= 0 ? '+' : ''}{putChange}%
                      </span>
                    </div>

                    {/* Floating ATM Label - Only on ATM row */}
                    {isATM && (
                      <div className="absolute left-1/2 top-0 -translate-x-1/2 -translate-y-1/2 z-50">
                        <div className="bg-black text-white px-3 py-1 rounded-full shadow-xl flex items-center gap-2 whitespace-nowrap border border-white/10">
                          <span className="text-[10px] font-black tracking-tight">
                            {spotPrice.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                          </span>
                          <div className="w-[1px] h-2.5 bg-white/20" />
                          <span className="text-[9px] font-bold text-rose-400">
                            -317.90 (1.25%)
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          <div className="space-y-5 bg-zinc-50 min-h-full pt-3">
            {/* Constituents List - Light Theme */}
            <div className="px-5 space-y-2.5">
              <h3 className="text-[9px] font-bold text-zinc-400 uppercase tracking-widest ml-1">Constituents</h3>
              {constituents.map(symbol => (
                <div key={symbol} className="bg-white border border-zinc-200 rounded-xl p-3.5 flex justify-between items-center shadow-sm">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-zinc-100 flex items-center justify-center font-bold text-[11px] text-zinc-400">
                      {symbol.substring(0, 2)}
                    </div>
                    <div>
                      <p className="text-[13px] font-bold text-zinc-900 tracking-tight">{symbol}</p>
                      <p className="text-[9px] font-bold text-zinc-400 uppercase">NSE</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-[13px] font-bold text-zinc-900">{formatCurrency(stocks[symbol] || 2500)}</p>
                    <p className="text-[9px] font-bold text-emerald-600">+1.45%</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Simplified Bottom Navigation for Index Detail */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-zinc-200 p-3.5 flex gap-2.5 z-[60]">
        <AnimatePresence mode="wait">
          {selectedStrike ? (
            <motion.div 
              key="trade-actions"
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 20, opacity: 0 }}
              className="flex-1 flex gap-3"
            >
              <button 
                onClick={() => onPlaceOrder({
                  side: 'SELL',
                  symbol: indexName,
                  strike: selectedStrike.strike,
                  optionType: selectedStrike.type,
                  expiry,
                  price: selectedStrike.price
                })}
                className="flex-1 bg-rose-500 text-white py-3 rounded-xl font-bold text-sm shadow-lg active:scale-95 transition-all"
              >
                SELL
              </button>
              <button 
                onClick={() => onPlaceOrder({
                  side: 'BUY',
                  symbol: indexName,
                  strike: selectedStrike.strike,
                  optionType: selectedStrike.type,
                  expiry,
                  price: selectedStrike.price
                })}
                className="flex-1 bg-emerald-500 text-white py-3 rounded-xl font-bold text-sm shadow-lg active:scale-95 transition-all"
              >
                BUY
              </button>
            </motion.div>
          ) : (
            <button 
              key="jump-to-atm-btn"
              onClick={jumpToATM}
              className="flex-1 bg-zinc-900 text-white py-3 rounded-xl font-bold text-sm shadow-lg active:scale-95 transition-all"
            >
              Jump to ATM
            </button>
          )}
        </AnimatePresence>
        <button className="w-12 h-12 bg-zinc-100 text-zinc-600 rounded-xl flex items-center justify-center hover:bg-zinc-200 transition-colors">
          <BarChart3 size={20} />
        </button>
      </div>
    </motion.div>
  );
};

const Market = ({ stocks, onIndexClick, onPlaceOrder, initialSelectedStock }: { 
  stocks: Record<string, number>, 
  onIndexClick: (index: string) => void,
  onPlaceOrder: (config: any) => void,
  initialSelectedStock?: string | null
}) => {
  const [activeSegment, setActiveSegment] = useState('Watchlist');
  const [selectedStock, setSelectedStock] = useState<string | null>(initialSelectedStock || null);
  const [aiAnalysis, setAiAnalysis] = useState<any>(null);
  const [loadingAi, setLoadingAi] = useState(false);
  const [watchlist, setWatchlist] = useState<string[]>(['RELIANCE', 'TCS', 'HDFCBANK', 'INFY', 'ICICIBANK']);

  useEffect(() => {
    if (initialSelectedStock) {
      handleStockClick(initialSelectedStock);
    }
  }, [initialSelectedStock]);

  const segments = ['Watchlist', 'Orders', 'Positions', 'F&O'];

  const handleStockClick = async (symbol: string) => {
    setSelectedStock(symbol);
    setLoadingAi(true);
    const analysis = await getStockSummary(symbol, stocks[symbol]);
    setAiAnalysis(analysis);
    setLoadingAi(false);
  };

  const toggleWatchlist = (symbol: string) => {
    if (watchlist.includes(symbol)) {
      setWatchlist(watchlist.filter(s => s !== symbol));
    } else {
      setWatchlist([...watchlist, symbol]);
    }
  };

  const primaryIndices = ["NIFTY 50", "SENSEX", "BANKNIFTY", "FINNIFTY", "MIDCAP NIFTY", "SMALLCAP NIFTY"];
  const secondaryIndices = ["NIFTY IT", "NIFTY AUTO", "NIFTY PHARMA", "NIFTY METAL", "NIFTY FMCG", "NIFTY REALTY"];

  return (
    <div className="space-y-4 pb-20">
      {/* Segmented Tabs */}
      <div className="px-4 pt-1.5">
        <div className="bg-zinc-900/50 p-1 rounded-xl flex gap-1 border border-zinc-800/50">
          {segments.map(segment => (
            <button
              key={segment}
              onClick={() => setActiveSegment(segment)}
              className={cn(
                "flex-1 py-1.5 rounded-lg text-[9px] font-bold uppercase tracking-widest transition-all",
                activeSegment === segment ? "bg-zinc-800 text-white shadow-lg" : "text-zinc-500 hover:text-zinc-300"
              )}
            >
              {segment}
            </button>
          ))}
        </div>
      </div>

      <div className="px-4 space-y-4">
        {activeSegment === 'Watchlist' && (
          <>
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-600" size={14} />
              <input 
                type="text" 
                placeholder="Search stocks..." 
                className="w-full bg-zinc-900/50 border border-zinc-800 rounded-xl py-2.5 pl-10 pr-4 text-[13px] focus:outline-none focus:border-emerald-500/50 transition-colors"
              />
            </div>
            
            {/* Indices Quick View */}
            <div className="overflow-x-auto scrollbar-hide flex gap-2 py-1">
              {primaryIndices.map(index => (
                <button 
                  key={index}
                  onClick={() => onIndexClick(index)}
                  className="px-3 py-1 bg-zinc-900/40 border border-zinc-800/50 rounded-xl whitespace-nowrap"
                >
                  <p className="text-[8px] font-bold text-zinc-500 uppercase tracking-wider">{index}</p>
                  <p className="text-[10px] font-bold text-white">{stocks[index]?.toLocaleString('en-IN')}</p>
                </button>
              ))}
            </div>

            <div className="flex justify-between items-center">
              <div className="flex gap-1.5">
                <button className="px-2 py-0.5 rounded-lg bg-emerald-500/10 text-emerald-500 text-[9px] font-bold border border-emerald-500/20 uppercase">Gainers</button>
                <button className="px-2 py-0.5 rounded-lg bg-rose-500/10 text-rose-500 text-[9px] font-bold border border-rose-500/20 uppercase">Losers</button>
              </div>
              <p className="text-[9px] font-bold text-zinc-600 uppercase">Sort by %</p>
            </div>

            <div className="space-y-2">
              {Object.entries(stocks)
                .filter(([s]) => !primaryIndices.includes(s) && !secondaryIndices.includes(s))
                .map(([symbol, price]) => (
                <motion.div 
                  layout
                  key={symbol} 
                  onClick={() => handleStockClick(symbol)}
                  className="bg-zinc-900/20 hover:bg-zinc-900/40 border border-zinc-800/30 rounded-xl p-3 flex justify-between items-center transition-all cursor-pointer"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-zinc-900 flex items-center justify-center font-bold text-[11px] text-zinc-500">
                      {symbol.substring(0, 2)}
                    </div>
                    <div>
                      <p className="text-[13px] font-bold text-white tracking-tight">{symbol}</p>
                      <p className="text-[9px] font-bold text-zinc-600 uppercase">NSE</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-[13px] font-bold text-white">{formatCurrency(price)}</p>
                    <p className="text-[9px] font-bold text-emerald-500">+{(Math.random() * 2).toFixed(2)}%</p>
                  </div>
                </motion.div>
              ))}
            </div>
          </>
        )}

        {activeSegment === 'Orders' && (
          <div className="space-y-2.5">
            <div className="flex justify-between items-center px-1">
              <h4 className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest">Active Orders</h4>
              <span className="px-1.5 py-0.5 rounded bg-zinc-800 text-[8px] font-bold text-zinc-400">0</span>
            </div>
            <div className="bg-zinc-900/30 border border-zinc-800/50 rounded-2xl p-5 text-center">
              <FileText className="mx-auto text-zinc-800 mb-2.5" size={32} />
              <p className="text-[13px] font-bold text-zinc-500">No Active Orders</p>
              <p className="text-[10px] text-zinc-700 mt-0.5">Your pending orders will appear here</p>
            </div>
            
            <div className="pt-2 space-y-2.5">
              <h4 className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest px-1">Order History</h4>
              {[1,2].map(i => (
                <div key={i} className="bg-zinc-900/20 border border-zinc-800/30 rounded-xl p-3 flex justify-between items-center">
                  <div className="flex items-center gap-3">
                    <div className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-500">
                      <ArrowUpRight size={14} />
                    </div>
                    <div>
                      <p className="text-[11px] font-bold text-white">RELIANCE Buy</p>
                      <p className="text-[8px] font-bold text-zinc-600 uppercase">Completed • 28 Feb</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="px-1.5 py-0.5 rounded bg-emerald-500/10 text-[8px] font-bold text-emerald-500 uppercase">Filled</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeSegment === 'Positions' && (
          <div className="space-y-2.5">
            <div className="flex bg-zinc-900/50 p-1 rounded-xl border border-zinc-800/50">
              {['Intraday', 'Delivery'].map(tab => (
                <button key={tab} className="flex-1 py-1.5 rounded-lg text-[9px] font-bold uppercase tracking-widest text-zinc-500 hover:text-white transition-all">
                  {tab}
                </button>
              ))}
            </div>
            <div className="bg-zinc-900/30 border border-zinc-800/50 rounded-2xl p-5 text-center">
              <TrendingUp className="mx-auto text-zinc-800 mb-2.5" size={32} />
              <p className="text-[13px] font-bold text-zinc-500">No Open Positions</p>
              <p className="text-[10px] text-zinc-700 mt-0.5">Live P&L updates will be shown here</p>
            </div>
          </div>
        )}

        {activeSegment === 'F&O' && (
          <div className="space-y-5">
            <div className="flex justify-between items-center bg-zinc-900/50 p-3 rounded-xl border border-zinc-800">
              <div className="space-y-0.5">
                <p className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest">NIFTY 50</p>
                <p className="text-[13px] font-bold text-white">22,145.20</p>
              </div>
              <div className="text-right space-y-0.5">
                <p className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest">Expiry</p>
                <p className="text-[11px] font-bold text-emerald-500">27 MAR 2026</p>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="bg-emerald-500/5 p-1.5 rounded-lg border border-emerald-500/10">
                <p className="text-[8px] font-bold text-emerald-500 uppercase">CALLS</p>
              </div>
              <div className="bg-zinc-900/50 p-1.5 rounded-lg border border-zinc-800">
                <p className="text-[8px] font-bold text-zinc-500 uppercase">STRIKE</p>
              </div>
              <div className="bg-rose-500/5 p-1.5 rounded-lg border border-rose-500/10">
                <p className="text-[8px] font-bold text-rose-500 uppercase">PUTS</p>
              </div>
            </div>

            <div className="space-y-2">
              {[22000, 22100, 22200].map(strike => (
                <div key={strike} className="grid grid-cols-3 gap-2 items-center text-center">
                  <div className="p-2.5 rounded-xl bg-zinc-900/20 border border-zinc-800/30">
                    <p className="text-[11px] font-bold text-white">145.20</p>
                    <p className="text-[8px] text-zinc-600 font-bold">OI: 1.2L</p>
                  </div>
                  <div className="p-2.5 rounded-xl bg-zinc-900/50 border border-zinc-800">
                    <p className="text-[11px] font-bold text-zinc-400">{strike}</p>
                  </div>
                  <div className="p-2.5 rounded-xl bg-zinc-900/20 border border-zinc-800/30">
                    <p className="text-[11px] font-bold text-white">88.40</p>
                    <p className="text-[8px] text-zinc-600 font-bold">OI: 0.8L</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Stock Detail Modal */}
      <AnimatePresence mode="wait">
        {selectedStock && (
          <motion.div 
            key="stock-detail-modal"
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            className="fixed inset-0 z-[60] bg-black p-6 flex flex-col"
          >
            <div className="flex justify-between items-center mb-8">
              <button onClick={() => setSelectedStock(null)} className="p-3 rounded-2xl bg-zinc-900 text-zinc-400">
                <ChevronRight className="rotate-180" size={24} />
              </button>
              <div className="text-center">
                <h2 className="text-lg font-bold tracking-tight">{selectedStock}</h2>
                <p className="text-[10px] font-bold text-zinc-500 uppercase">NSE • EQUITY</p>
              </div>
              <button 
                onClick={() => toggleWatchlist(selectedStock!)}
                className={cn(
                  "p-3 rounded-2xl transition-all",
                  watchlist.includes(selectedStock!) ? "bg-emerald-500 text-black" : "bg-zinc-900 text-zinc-400"
                )}
              >
                <Plus size={24} className={cn(watchlist.includes(selectedStock!) && "rotate-45")} />
              </button>
            </div>

            <div className="flex-1 space-y-8 overflow-y-auto pb-24 scrollbar-hide">
              <div className="text-center">
                <p className="text-5xl font-bold tracking-tighter mb-2">{formatCurrency(stocks[selectedStock])}</p>
                <p className="text-sm font-bold text-emerald-500">+₹12.45 (0.85%) Today</p>
              </div>

              <div className="h-56 bg-zinc-900/50 rounded-[32px] border border-zinc-800/50 flex items-center justify-center relative overflow-hidden">
                <div className="absolute inset-0 opacity-20 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-emerald-500/20 via-transparent to-transparent" />
                <TrendingUp size={64} className="text-emerald-500/10" />
                <p className="text-[10px] font-bold text-zinc-700 uppercase tracking-widest">Advanced TradingView Chart</p>
              </div>

              <div className="bg-emerald-500/5 border border-emerald-500/10 rounded-3xl p-6 space-y-4">
                <div className="flex items-center gap-2 text-emerald-500">
                  <Zap size={18} fill="currentColor" />
                  <h4 className="text-xs font-bold uppercase tracking-widest">AI Smart Analysis</h4>
                </div>
                {loadingAi ? (
                  <div className="animate-pulse space-y-3">
                    <div className="h-3 bg-zinc-800 rounded w-full" />
                    <div className="h-3 bg-zinc-800 rounded w-5/6" />
                    <div className="h-3 bg-zinc-800 rounded w-4/6" />
                  </div>
                ) : (
                  <div className="space-y-4">
                    <p className="text-sm text-zinc-400 leading-relaxed font-medium">{aiAnalysis?.summary}</p>
                    
                    <div className="grid grid-cols-2 gap-4 pt-4 border-t border-emerald-500/10">
                      <div>
                        <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-1">Technical Trend</p>
                        <p className="text-xs text-zinc-300 font-bold">{aiAnalysis?.trend}</p>
                      </div>
                      <div>
                        <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-1">Sentiment</p>
                        <p className={cn(
                          "text-xs font-bold",
                          aiAnalysis?.sentiment?.toLowerCase().includes('bullish') ? "text-emerald-500" : 
                          aiAnalysis?.sentiment?.toLowerCase().includes('bearish') ? "text-rose-500" : 
                          "text-zinc-300"
                        )}>
                          {aiAnalysis?.sentiment}
                        </p>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4 pt-4 border-t border-emerald-500/10">
                      <div>
                        <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-1">Support & Resistance</p>
                        <p className="text-xs text-zinc-400 font-medium">{aiAnalysis?.supportResistance}</p>
                      </div>
                      <div>
                        <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-1">Targets</p>
                        <p className="text-xs text-zinc-400 font-medium">{aiAnalysis?.targets}</p>
                      </div>
                    </div>

                    <div className="pt-4 border-t border-emerald-500/10">
                      <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-1">News Impact</p>
                      <p className="text-xs text-zinc-400 font-medium leading-relaxed">{aiAnalysis?.newsImpact}</p>
                    </div>

                    <div className="pt-4 border-t border-emerald-500/10">
                      <p className="text-[10px] font-bold text-rose-500 uppercase tracking-widest mb-1">Risk Assessment</p>
                      <p className="text-xs text-zinc-500 font-medium leading-relaxed">{aiAnalysis?.risks}</p>
                    </div>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-12 px-2">
                <div className="space-y-3">
                  <p className="text-[10px] font-bold text-zinc-600 uppercase tracking-widest">Bid Price</p>
                  {[1,2,3,4,5].map(i => (
                    <div key={`bid-${i}`} className="flex justify-between text-xs font-bold">
                      <span className="text-emerald-500">{(stocks[selectedStock] - i * 0.5).toFixed(2)}</span>
                      <span className="text-zinc-600">{i * 250}</span>
                    </div>
                  ))}
                </div>
                <div className="space-y-3 text-right">
                  <p className="text-[10px] font-bold text-zinc-600 uppercase tracking-widest">Ask Price</p>
                  {[1,2,3,4,5].map(i => (
                    <div key={`ask-${i}`} className="flex justify-between text-xs font-bold">
                      <span className="text-zinc-600">{i * 180}</span>
                      <span className="text-rose-500">{(stocks[selectedStock] + i * 0.5).toFixed(2)}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="fixed bottom-0 left-0 right-0 p-6 bg-black/80 backdrop-blur-xl border-t border-zinc-900 flex gap-4">
              <button 
                onClick={() => onPlaceOrder({
                  side: 'SELL',
                  symbol: selectedStock,
                  price: stocks[selectedStock!]
                })}
                className="flex-1 bg-rose-500 hover:bg-rose-600 text-black font-bold py-5 rounded-2xl transition-all shadow-xl shadow-rose-500/10"
              >
                SELL
              </button>
              <button 
                onClick={() => onPlaceOrder({
                  side: 'BUY',
                  symbol: selectedStock,
                  price: stocks[selectedStock!]
                })}
                className="flex-1 bg-emerald-500 hover:bg-emerald-600 text-black font-bold py-5 rounded-2xl transition-all shadow-xl shadow-emerald-500/10"
              >
                BUY
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};


const FullChartModal = ({ instrument, onClose }: { instrument: any, onClose: () => void }) => {
  const [timeframe, setTimeframe] = useState('5m');
  const [price, setPrice] = useState(instrument.ltp);

  useEffect(() => {
    const interval = setInterval(() => {
      setPrice((prev: number) => prev + (Math.random() - 0.5) * 2);
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  // Mock data for candlestick
  const chartData = Array.from({ length: 40 }).map((_, i) => {
    const base = instrument.ltp + Math.sin(i / 5) * 20;
    return {
      time: i,
      open: base,
      high: base + Math.random() * 5,
      low: base - Math.random() * 5,
      close: base + (Math.random() - 0.5) * 10,
      volume: Math.floor(Math.random() * 1000),
      ema: base + 2,
      vwap: base - 1
    };
  });

  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className="fixed inset-0 z-[100] bg-black flex flex-col"
    >
      {/* Header */}
      <div className="px-6 py-4 border-b border-zinc-900 flex justify-between items-center bg-black/80 backdrop-blur-xl">
        <div className="flex items-center gap-3">
          <button onClick={onClose} className="p-2 rounded-xl hover:bg-zinc-900 text-zinc-400">
            <ChevronRight className="rotate-180" size={24} />
          </button>
          <div>
            <h2 className="text-sm font-black text-white tracking-tight">{instrument.symbol}</h2>
            <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Live Chart • {timeframe}</p>
          </div>
        </div>
        <div className="text-right">
          <p className={cn("text-lg font-black tracking-tighter", price >= instrument.avgPrice ? "text-emerald-500" : "text-rose-500")}>
            {formatCurrency(price)}
          </p>
          <p className="text-[10px] font-bold text-zinc-500">{(Math.random() * 2).toFixed(2)}%</p>
        </div>
      </div>

      {/* Toolbar */}
      <div className="px-6 py-3 border-b border-zinc-900 flex justify-between items-center overflow-x-auto scrollbar-hide gap-4">
        <div className="flex gap-1">
          {['1m', '5m', '15m', '1h', '1D'].map(tf => (
            <button 
              key={tf}
              onClick={() => setTimeframe(tf)}
              className={cn(
                "px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all",
                timeframe === tf ? "bg-zinc-800 text-white" : "text-zinc-600 hover:text-zinc-400"
              )}
            >
              {tf}
            </button>
          ))}
        </div>
        <div className="flex gap-2">
          <div className="flex items-center gap-1 px-2 py-1 rounded-lg bg-blue-500/10 border border-blue-500/20">
            <div className="w-1.5 h-1.5 rounded-full bg-blue-500" />
            <span className="text-[8px] font-black text-blue-500 uppercase">EMA</span>
          </div>
          <div className="flex items-center gap-1 px-2 py-1 rounded-lg bg-amber-500/10 border border-amber-500/20">
            <div className="w-1.5 h-1.5 rounded-full bg-amber-500" />
            <span className="text-[8px] font-black text-amber-500 uppercase">VWAP</span>
          </div>
        </div>
      </div>

      {/* Chart Area */}
      <div className="flex-1 p-4 relative">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#18181b" vertical={false} />
            <XAxis dataKey="time" hide />
            <YAxis domain={['auto', 'auto']} orientation="right" tick={{ fill: '#52525b', fontSize: 10, fontWeight: 'bold' }} axisLine={false} tickLine={false} />
            <Tooltip 
              contentStyle={{ backgroundColor: '#000', border: '1px solid #27272a', borderRadius: '12px' }}
              itemStyle={{ color: '#fff', fontSize: '10px', fontWeight: 'bold' }}
              cursor={{ stroke: '#3f3f46', strokeWidth: 1 }}
            />
            {/* Mock Candlestick using Bars */}
            <Bar dataKey="high" fill="transparent" />
            <Bar dataKey="close" radius={[2, 2, 0, 0]}>
              {chartData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.close > entry.open ? '#10b981' : '#ef4444'} />
              ))}
            </Bar>
            {/* Volume Bars */}
            <Bar dataKey="volume" yAxisId={0} opacity={0.1} fill="#52525b" />
          </BarChart>
        </ResponsiveContainer>
        
        {/* Floating Price Line */}
        <div className="absolute right-4 top-1/2 -translate-y-1/2 bg-emerald-500 text-black px-2 py-1 rounded text-[10px] font-black shadow-lg">
          {price.toFixed(2)}
        </div>
      </div>

      {/* Footer Actions */}
      <div className="p-6 bg-black/80 backdrop-blur-xl border-t border-zinc-900 flex gap-4">
        <button className="flex-1 bg-rose-500 hover:bg-rose-600 text-black font-black py-5 rounded-2xl transition-all shadow-xl shadow-rose-500/10 uppercase text-xs tracking-widest">SELL</button>
        <button className="flex-1 bg-emerald-500 hover:bg-emerald-600 text-black font-black py-5 rounded-2xl transition-all shadow-xl shadow-emerald-500/10 uppercase text-xs tracking-widest">BUY</button>
      </div>
    </motion.div>
  );
};

const FOTradingCenter = ({ stocks, onOpenOptionChain }: { stocks: Record<string, number>, onOpenOptionChain: () => void }) => {
  const [isScalperMode, setIsScalperMode] = useState(false);
  const [activeChart, setActiveChart] = useState<any>(null);
  const [confirmExit, setConfirmExit] = useState<number | null>(null);
  const [slTgtModal, setSlTgtModal] = useState<any>(null);
  const [positions, setPositions] = useState<any[]>([
    { symbol: 'NIFTY 22200 CE', quantity: 50, avgPrice: 145.20, type: 'Intraday', ltp: 168.45, change: 15.2 },
    { symbol: 'BANKNIFTY 47500 PE', quantity: 15, avgPrice: 288.40, type: 'Delivery', ltp: 245.10, change: -12.4 },
  ]);

  const handleExit = (index: number) => {
    if (isScalperMode) {
      setPositions(positions.filter((_, i) => i !== index));
    } else {
      if (confirmExit === index) {
        setPositions(positions.filter((_, i) => i !== index));
        setConfirmExit(null);
      } else {
        setConfirmExit(index);
        setTimeout(() => setConfirmExit(null), 3000);
      }
    }
  };

  const [orders, setOrders] = useState<any[]>([
    { symbol: 'FINNIFTY 20500 CE', quantity: 40, price: 12.50, status: 'Pending', type: 'Buy' },
  ]);

  const totalPnL = positions.reduce((acc, pos) => {
    return acc + (pos.ltp - pos.avgPrice) * pos.quantity;
  }, 0);

  const margins = [
    { label: 'Available', value: 1250000, color: 'text-emerald-500' },
    { label: 'Used', value: 450000, color: 'text-rose-500' },
    { label: 'Exposure', value: 180000, color: 'text-blue-500' },
    { label: 'Span', value: 270000, color: 'text-amber-500' },
  ];

  return (
    <div className="space-y-4 pb-24">
      {/* Margin Panel */}
      <div className="px-4 pt-3">
        <div className="overflow-x-auto scrollbar-hide flex gap-2">
          {margins.map((m) => (
            <div key={m.label} className="min-w-[120px] bg-zinc-900/40 border border-zinc-800/50 rounded-xl p-3 space-y-0.5">
              <p className="text-[8px] font-bold text-zinc-500 uppercase tracking-widest">{m.label} Margin</p>
              <p className={cn("text-[12px] font-black tracking-tight", m.color)}>{formatCurrency(m.value)}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Scalper Mode & Summary */}
      <div className="px-4">
        <div className="bg-gradient-to-br from-zinc-900 to-black border border-zinc-800/50 rounded-2xl p-4 flex justify-between items-center shadow-2xl">
          <div>
            <p className="text-[8px] font-bold text-zinc-500 uppercase tracking-widest mb-0.5">Total Realized P&L</p>
            <h2 className={cn("text-xl font-black tracking-tighter", totalPnL >= 0 ? "text-emerald-500" : "text-rose-500")}>
              {totalPnL >= 0 ? '+' : ''}{formatCurrency(totalPnL)}
            </h2>
          </div>
          <div className="flex flex-col items-end gap-1">
            <div className="flex bg-zinc-950 p-1 rounded-xl border border-zinc-800">
              <button 
                onClick={() => setIsScalperMode(false)}
                className={cn("px-2 py-0.5 rounded-lg text-[8px] font-black uppercase tracking-widest transition-all", !isScalperMode ? "bg-zinc-800 text-white" : "text-zinc-600")}
              >Normal</button>
              <button 
                onClick={() => setIsScalperMode(true)}
                className={cn("px-2 py-0.5 rounded-lg text-[8px] font-black uppercase tracking-widest transition-all flex items-center gap-1", isScalperMode ? "bg-emerald-500 text-black" : "text-zinc-600")}
              >
                <Zap size={10} />
                Scalper
              </button>
            </div>
            <p className="text-[8px] font-bold text-zinc-600 uppercase tracking-widest">Speed Mode</p>
          </div>
        </div>
      </div>

      {/* Live Positions with Swipe */}
      <div className="px-4 space-y-2.5">
        <div className="flex justify-between items-center">
          <h3 className="text-[10px] font-black uppercase tracking-widest text-zinc-500 flex items-center gap-2">
            <Activity size={12} />
            Live Positions
          </h3>
          <span className="text-[8px] font-bold text-zinc-700">{positions.length} Active</span>
        </div>
        
        <div className="space-y-2.5">
          {positions.map((pos, i) => (
            <div key={pos.symbol} className="relative overflow-hidden rounded-xl group">
              {/* Action Panel (Revealed on Swipe) */}
              <div className="absolute inset-0 bg-zinc-900 flex justify-end items-stretch">
                <div className="flex h-full">
                  <button 
                    onClick={() => setSlTgtModal({ index: i, ...pos })}
                    className="px-3 bg-blue-600 text-white flex flex-col items-center justify-center gap-1 transition-colors hover:bg-blue-700"
                  >
                    <Target size={12} />
                    <span className="text-[7px] font-black uppercase">SL/Tgt</span>
                  </button>
                  <button 
                    onClick={() => setActiveChart(pos)}
                    className="px-3 bg-zinc-800 text-white flex flex-col items-center justify-center gap-1 transition-colors hover:bg-zinc-700"
                  >
                    <BarChart3 size={12} />
                    <span className="text-[7px] font-black uppercase">Chart</span>
                  </button>
                  <button 
                    onClick={() => handleExit(i)}
                    className={cn(
                      "px-4 flex flex-col items-center justify-center gap-1 transition-all duration-300",
                      confirmExit === i ? "bg-rose-500 text-black scale-105" : "bg-rose-600 text-white hover:bg-rose-700"
                    )}
                  >
                    <XCircle size={14} />
                    <span className="text-[7px] font-black uppercase">{confirmExit === i ? 'Confirm' : 'Exit'}</span>
                  </button>
                </div>
              </div>

              {/* Position Card */}
              <motion.div 
                drag="x"
                dragConstraints={{ left: -150, right: 0 }}
                dragElastic={0.1}
                className="relative bg-zinc-900/60 border border-zinc-800/50 p-3.5 space-y-2.5 z-10 cursor-grab active:cursor-grabbing"
              >
                <div className="flex justify-between items-start">
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-1.5">
                      <p className="text-[12px] font-black text-white tracking-tight">{pos.symbol}</p>
                      <span className={cn(
                        "px-1 py-0.5 rounded text-[7px] font-black uppercase tracking-tighter",
                        pos.type === 'Intraday' ? "bg-amber-500/10 text-amber-500" : "bg-blue-500/10 text-blue-500"
                      )}>{pos.type}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <p className="text-[8px] font-bold text-zinc-500 uppercase">{pos.quantity} Qty</p>
                      <span className="w-1 h-1 rounded-full bg-zinc-800" />
                      <p className="text-[8px] font-bold text-zinc-500 uppercase">Avg {formatCurrency(pos.avgPrice)}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="flex items-center gap-1.5 justify-end">
                      <Sparkline color={pos.change >= 0 ? '#10b981' : '#ef4444'} />
                      <p className={cn("text-sm font-black tracking-tighter", (pos.ltp - pos.avgPrice) >= 0 ? "text-emerald-500" : "text-rose-500")}>
                        {formatCurrency((pos.ltp - pos.avgPrice) * pos.quantity)}
                      </p>
                    </div>
                    <p className="text-[8px] font-bold text-zinc-500 mt-0.5">
                      LTP: <span className="text-white">{formatCurrency(pos.ltp)}</span>
                      <span className={cn("ml-1", pos.change >= 0 ? "text-emerald-500" : "text-rose-500")}>
                        ({pos.change >= 0 ? '+' : ''}{pos.change}%)
                      </span>
                    </p>
                  </div>
                </div>

                {/* Risk Management Indicators */}
                <div className="flex gap-2.5 pt-2 border-t border-zinc-800/50">
                  <div className="flex items-center gap-1">
                    <div className="w-1 h-1 rounded-full bg-rose-500/40" />
                    <span className="text-[8px] font-bold text-zinc-600 uppercase">SL: {formatCurrency(pos.avgPrice * 0.95)}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <div className="w-1 h-1 rounded-full bg-emerald-500/40" />
                    <span className="text-[8px] font-bold text-zinc-600 uppercase">Tgt: {formatCurrency(pos.avgPrice * 1.15)}</span>
                  </div>
                </div>
              </motion.div>
            </div>
          ))}
        </div>
      </div>

      {/* GTT & Risk Controls */}
      <div className="px-4 space-y-2.5">
        <h3 className="text-[10px] font-black uppercase tracking-widest text-zinc-500 flex items-center gap-2">
          <ShieldCheck size={12} />
          Risk Management
        </h3>
        <div className="grid grid-cols-2 gap-2">
          <button className="bg-zinc-900/30 border border-zinc-800/50 p-3 rounded-xl flex flex-col items-center gap-1 hover:bg-zinc-900/50 transition-all">
            <Target size={16} className="text-blue-500" />
            <span className="text-[8px] font-black uppercase tracking-widest text-zinc-400">Set GTT</span>
          </button>
          <button className="bg-zinc-900/30 border border-zinc-800/50 p-3 rounded-xl flex flex-col items-center gap-1 hover:bg-zinc-900/50 transition-all">
            <Layers size={16} className="text-amber-500" />
            <span className="text-[8px] font-black uppercase tracking-widest text-zinc-400">Trailing SL</span>
          </button>
        </div>
      </div>

      <AnimatePresence mode="wait">
        {activeChart && (
          <FullChartModal 
            key="full-chart-modal"
            instrument={activeChart} 
            onClose={() => setActiveChart(null)} 
          />
        )}
        {slTgtModal && (
          <motion.div 
            key="sl-tgt-modal"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[120] bg-black/80 backdrop-blur-sm flex items-center justify-center p-6"
          >
            <motion.div 
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              className="w-full max-w-sm bg-zinc-900 border border-zinc-800 rounded-[2.5rem] p-8 space-y-8"
            >
              <div className="text-center space-y-2">
                <h3 className="text-lg font-black tracking-tight text-white">Set SL & Target</h3>
                <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">{slTgtModal.symbol}</p>
              </div>

              <div className="space-y-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-zinc-600 uppercase tracking-widest ml-1">Stop Loss</label>
                  <input type="number" defaultValue={slTgtModal.avgPrice * 0.95} className="w-full bg-black border border-zinc-800 rounded-2xl py-4 px-6 text-sm font-bold focus:border-rose-500/50 outline-none transition-all" />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-zinc-600 uppercase tracking-widest ml-1">Target</label>
                  <input type="number" defaultValue={slTgtModal.avgPrice * 1.15} className="w-full bg-black border border-zinc-800 rounded-2xl py-4 px-6 text-sm font-bold focus:border-emerald-500/50 outline-none transition-all" />
                </div>
              </div>

              <div className="flex gap-3">
                <button onClick={() => setSlTgtModal(null)} className="flex-1 bg-zinc-800 text-zinc-400 font-bold py-4 rounded-2xl uppercase text-[10px] tracking-widest">Cancel</button>
                <button onClick={() => setSlTgtModal(null)} className="flex-1 bg-emerald-500 text-black font-black py-4 rounded-2xl uppercase text-[10px] tracking-widest">Update</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

const Portfolio = ({ stocks }: { stocks: Record<string, number> }) => {
  const { user } = useAuthStore();
  const [holdings, setHoldings] = useState<any[]>([]);

  useEffect(() => {
    fetch('/api/portfolio', {
      headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
    }).then(res => res.json()).then(setHoldings);
  }, []);

  const totalInvested = holdings.reduce((acc, h) => acc + (h.quantity * h.average_price), 0);
  const currentValue = holdings.reduce((acc, h) => acc + (h.quantity * (stocks[h.symbol] || h.average_price)), 0);
  const totalPnL = currentValue - totalInvested;
  const dayPnL = totalPnL * 0.05; // Simulated day P&L

  const allocationData = holdings.length > 0 ? holdings.map(h => ({
    name: h.symbol,
    value: h.quantity * (stocks[h.symbol] || h.average_price)
  })) : [{ name: 'Cash', value: user?.balance || 0 }];

  const COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6'];

  const mfHoldings = [
    { name: 'Quant Small Cap Fund', amount: 45000, pnl: 12400, type: 'Equity' },
    { name: 'Parag Parikh Flexi Cap', amount: 85000, pnl: 18500, type: 'Equity' },
  ];

  const sipInvestments = [
    { name: 'HDFC Index Fund Nifty 50', amount: 5000, date: '05 Mar 2026' },
    { name: 'ICICI Prudential Bluechip', amount: 3000, date: '12 Mar 2026' },
  ];

  return (
    <div className="space-y-5 pb-24 overflow-y-auto scroll-smooth">
      {/* Portfolio Summary */}
      <div className="px-5 pt-4">
        <div className="bg-gradient-to-br from-zinc-900 to-black border border-zinc-800/50 rounded-2xl p-6 space-y-5 shadow-2xl">
          <div className="space-y-0.5">
            <p className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest">Total Portfolio Value</p>
            <h2 className="text-3xl font-black tracking-tighter text-white">{formatCurrency(currentValue + (user?.balance || 0))}</h2>
          </div>
          
          <div className="grid grid-cols-2 gap-6 pt-5 border-t border-zinc-800/50">
            <div className="space-y-0.5">
              <p className="text-[9px] font-bold text-zinc-600 uppercase tracking-widest">Overall P&L</p>
              <p className={cn("text-base font-bold", totalPnL >= 0 ? "text-emerald-500" : "text-rose-500")}>
                {totalPnL >= 0 ? '+' : ''}{formatCurrency(totalPnL)}
              </p>
            </div>
            <div className="space-y-0.5">
              <p className="text-[9px] font-bold text-zinc-600 uppercase tracking-widest">Day P&L</p>
              <p className={cn("text-base font-bold", dayPnL >= 0 ? "text-emerald-500" : "text-rose-500")}>
                {dayPnL >= 0 ? '+' : ''}{formatCurrency(dayPnL)}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Analytics Section */}
      <div className="px-5 space-y-3">
        <h3 className="text-[11px] font-bold uppercase tracking-widest text-zinc-500">Portfolio Analytics</h3>
        <div className="bg-zinc-900/20 border border-zinc-800/30 rounded-2xl p-5 space-y-5">
          <div className="h-48 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <RePieChart>
                <Pie
                  data={allocationData}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={75}
                  paddingAngle={6}
                  dataKey="value"
                >
                  {allocationData.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip 
                  contentStyle={{ backgroundColor: '#000', border: '1px solid #27272a', borderRadius: '12px' }}
                  itemStyle={{ color: '#fff', fontSize: '9px', fontWeight: 'bold' }}
                />
              </RePieChart>
            </ResponsiveContainer>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-zinc-900/50 p-3.5 rounded-xl border border-zinc-800/50">
              <p className="text-[8px] font-bold text-zinc-600 uppercase tracking-widest mb-1">Risk Score</p>
              <div className="flex items-center gap-1.5">
                <AlertCircle size={12} className="text-amber-500" />
                <span className="text-[11px] font-bold text-amber-500 uppercase">Moderate</span>
              </div>
            </div>
            <div className="bg-zinc-900/50 p-3.5 rounded-xl border border-zinc-800/50">
              <p className="text-[8px] font-bold text-zinc-600 uppercase tracking-widest mb-1">Sector Exposure</p>
              <div className="flex items-center gap-1.5">
                <BarChart3 size={12} className="text-blue-500" />
                <span className="text-[11px] font-bold text-white uppercase">IT & Banking</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Equity Holdings */}
      <div className="px-5 space-y-3">
        <div className="flex justify-between items-center">
          <h3 className="text-[11px] font-bold uppercase tracking-widest text-zinc-500">Equity Holdings</h3>
          <span className="text-[9px] font-bold text-zinc-700">{holdings.length} Stocks</span>
        </div>
        <div className="space-y-2.5">
          {holdings.map(h => {
            const currentPrice = stocks[h.symbol] || h.average_price;
            const pnl = (currentPrice - h.average_price) * h.quantity;
            return (
              <div key={h.symbol} className="bg-zinc-900/20 border border-zinc-800/30 rounded-xl p-3.5 flex justify-between items-center">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-zinc-900 flex items-center justify-center font-bold text-[11px] text-zinc-500">
                    {h.symbol.substring(0, 2)}
                  </div>
                  <div>
                    <p className="text-[13px] font-bold text-white tracking-tight">{h.symbol}</p>
                    <p className="text-[9px] font-bold text-zinc-600 uppercase mt-0.5">{h.quantity} Qty • Avg {formatCurrency(h.average_price)}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-[13px] font-bold text-white">{formatCurrency(h.quantity * currentPrice)}</p>
                  <p className={cn("text-[9px] font-bold", pnl >= 0 ? "text-emerald-500" : "text-rose-500")}>
                    {pnl >= 0 ? '+' : ''}{formatCurrency(pnl)}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Mutual Funds */}
      <div className="px-5 space-y-3">
        <h3 className="text-[11px] font-bold uppercase tracking-widest text-zinc-500">Mutual Funds</h3>
        <div className="space-y-2.5">
          {mfHoldings.map((mf, i) => (
            <div key={i} className="bg-zinc-900/20 border border-zinc-800/30 rounded-xl p-3.5 flex justify-between items-center">
              <div>
                <p className="text-[13px] font-bold text-white tracking-tight">{mf.name}</p>
                <p className="text-[9px] font-bold text-zinc-600 uppercase mt-0.5">{mf.type} • Invested {formatCurrency(mf.amount)}</p>
              </div>
              <div className="text-right">
                <p className="text-[13px] font-bold text-white">{formatCurrency(mf.amount + mf.pnl)}</p>
                <p className="text-[9px] font-bold text-emerald-500">+{formatCurrency(mf.pnl)}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* SIP Investments */}
      <div className="px-5 space-y-3">
        <h3 className="text-[11px] font-bold uppercase tracking-widest text-zinc-500">SIP Investments</h3>
        <div className="space-y-2.5">
          {sipInvestments.map((sip, i) => (
            <div key={i} className="bg-zinc-900/20 border border-zinc-800/30 rounded-xl p-3.5 flex justify-between items-center">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-500">
                  <Calendar size={16} />
                </div>
                <div>
                  <p className="text-[13px] font-bold text-white tracking-tight">{sip.name}</p>
                  <p className="text-[9px] font-bold text-zinc-600 uppercase mt-0.5">Monthly {formatCurrency(sip.amount)}</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-[8px] font-bold text-zinc-500 uppercase tracking-widest">Next SIP</p>
                <p className="text-[11px] font-bold text-white mt-0.5">{sip.date}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Transaction History */}
      <div className="px-5 space-y-3">
        <h3 className="text-[11px] font-bold uppercase tracking-widest text-zinc-500">Transaction History</h3>
        <div className="space-y-2.5">
          {[
            { type: 'Deposit', amount: 50000, date: '25 Feb 2026', status: 'Success' },
            { type: 'Buy', amount: 12450, date: '22 Feb 2026', status: 'Success', symbol: 'TCS' },
            { type: 'Withdraw', amount: 5000, date: '18 Feb 2026', status: 'Success' },
          ].map((tx, i) => (
            <div key={i} className="bg-zinc-900/20 border border-zinc-800/30 rounded-xl p-3.5 flex justify-between items-center">
              <div className="flex items-center gap-3">
                <div className={cn("p-2 rounded-xl", tx.type === 'Deposit' ? "bg-emerald-500/10 text-emerald-500" : tx.type === 'Withdraw' ? "bg-rose-500/10 text-rose-500" : "bg-blue-500/10 text-blue-500")}>
                  {tx.type === 'Deposit' ? <Plus size={16} /> : tx.type === 'Withdraw' ? <Minus size={16} /> : <ArrowRightLeft size={16} />}
                </div>
                <div>
                  <p className="text-[13px] font-bold text-white tracking-tight">{tx.type} {tx.symbol ? `• ${tx.symbol}` : ''}</p>
                  <p className="text-[9px] font-bold text-zinc-600 uppercase mt-0.5">{tx.date}</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-[13px] font-bold text-white">{formatCurrency(tx.amount)}</p>
                <p className="text-[8px] font-bold text-emerald-500 uppercase tracking-widest mt-0.5">{tx.status}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

const Onboarding = ({ onComplete }: { onComplete: () => void }) => {
  const [step, setStep] = useState(1);
  return (
    <div className="min-h-screen bg-black p-8 space-y-10 pb-32">
      <div className="space-y-3 pt-12">
        <h2 className="text-3xl font-black tracking-tighter text-white">Demat Onboarding</h2>
        <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest leading-relaxed">
          Step {step} of 4: <span className="text-emerald-500">{step === 1 ? 'PAN Verification' : step === 2 ? 'Aadhaar eKYC' : step === 3 ? 'Bank Linking' : 'IPV Verification'}</span>
        </p>
      </div>
      
      <div className="flex gap-2">
        {[1,2,3,4].map(s => (
          <div key={s} className={cn("h-1.5 flex-1 rounded-full transition-all duration-500", s <= step ? "bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.3)]" : "bg-zinc-900")} />
        ))}
      </div>

      <motion.div 
        key={step}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-8"
      >
        {step === 1 && (
          <div className="space-y-6">
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-zinc-600 uppercase tracking-widest ml-1">PAN Number</label>
              <input type="text" placeholder="ABCDE1234F" className="w-full bg-zinc-900/30 border border-zinc-800/50 rounded-2xl py-5 px-6 text-sm uppercase font-bold tracking-widest focus:outline-none focus:border-emerald-500/50 transition-all" />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-zinc-600 uppercase tracking-widest ml-1">Date of Birth</label>
              <input type="date" className="w-full bg-zinc-900/30 border border-zinc-800/50 rounded-2xl py-5 px-6 text-sm font-bold focus:outline-none focus:border-emerald-500/50 transition-all" />
            </div>
          </div>
        )}
        {step === 2 && (
          <div className="space-y-6">
            <p className="text-sm text-zinc-500 font-medium leading-relaxed">We will securely redirect you to Digilocker for Aadhaar eKYC verification.</p>
            <div className="bg-zinc-900/20 border border-zinc-800/30 rounded-[2.5rem] p-12 text-center space-y-4">
              <div className="w-20 h-20 bg-emerald-500/10 rounded-3xl mx-auto flex items-center justify-center">
                <ShieldCheck className="text-emerald-500" size={40} />
              </div>
              <div>
                <p className="text-lg font-bold text-white">Secure Verification</p>
                <p className="text-[10px] font-bold text-zinc-600 uppercase tracking-widest mt-1">Powered by Digilocker</p>
              </div>
            </div>
          </div>
        )}
        {step === 3 && (
          <div className="space-y-6">
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-zinc-600 uppercase tracking-widest ml-1">Account Number</label>
              <input type="text" placeholder="000000000000" className="w-full bg-zinc-900/30 border border-zinc-800/50 rounded-2xl py-5 px-6 text-sm font-bold focus:outline-none focus:border-emerald-500/50 transition-all" />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-zinc-600 uppercase tracking-widest ml-1">IFSC Code</label>
              <input type="text" placeholder="HDFC0001234" className="w-full bg-zinc-900/30 border border-zinc-800/50 rounded-2xl py-5 px-6 text-sm uppercase font-bold tracking-widest focus:outline-none focus:border-emerald-500/50 transition-all" />
            </div>
          </div>
        )}
        {step === 4 && (
          <div className="space-y-6">
            <div className="aspect-video bg-zinc-900/30 rounded-[2.5rem] border border-zinc-800/50 flex items-center justify-center relative overflow-hidden group">
              <UserIcon size={64} className="text-zinc-800 group-hover:scale-110 transition-transform duration-700" />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
              <div className="absolute bottom-6 left-6 right-6 bg-zinc-900/80 backdrop-blur-xl p-4 rounded-2xl border border-zinc-800/50">
                <p className="text-[10px] font-bold text-white text-center uppercase tracking-widest">Record a 5-second video saying "1234"</p>
              </div>
            </div>
          </div>
        )}
      </motion.div>

      <div className="fixed bottom-0 left-0 right-0 p-8 bg-black/80 backdrop-blur-xl border-t border-zinc-900 flex gap-4 z-50">
        {step > 1 && (
          <button onClick={() => setStep(step - 1)} className="flex-1 bg-zinc-900 text-zinc-400 font-bold py-5 rounded-2xl border border-zinc-800 hover:text-white transition-all uppercase text-[10px] tracking-widest">Back</button>
        )}
        <button 
          onClick={() => step < 4 ? setStep(step + 1) : onComplete()} 
          className="flex-1 bg-emerald-500 text-black font-black py-5 rounded-2xl shadow-xl shadow-emerald-500/10 hover:bg-emerald-600 transition-all uppercase text-[10px] tracking-widest"
        >
          {step === 4 ? 'Finish' : 'Continue'}
        </button>
      </div>
    </div>
  );
};

const AdminPanel = () => {
  return (
    <div className="p-6 space-y-8 pb-24">
      <h2 className="text-2xl font-bold tracking-tight">Admin Dashboard</h2>
      <div className="grid grid-cols-2 gap-4">
        {[
          { label: 'Total Users', value: '12,450', change: '+12%' },
          { label: 'Revenue', value: '₹4.2L', change: '+8%' },
          { label: 'Active Trades', value: '1,205', change: '+15%' },
          { label: 'KYC Pending', value: '45', change: '-5%' },
        ].map(stat => (
          <div key={stat.label} className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4">
            <p className="text-[10px] font-bold text-zinc-500 uppercase">{stat.label}</p>
            <p className="text-xl font-bold mt-1">{stat.value}</p>
            <p className="text-[10px] font-bold text-emerald-500 mt-1">{stat.change}</p>
          </div>
        ))}
      </div>
      <div className="space-y-4">
        <h3 className="text-sm font-bold uppercase tracking-wider text-zinc-400">Recent KYC Requests</h3>
        {[1,2,3].map(i => (
          <div key={i} className="bg-zinc-900/50 border border-zinc-800/50 rounded-2xl p-4 flex justify-between items-center">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-zinc-800 flex items-center justify-center text-xs font-bold">JD</div>
              <div>
                <p className="text-xs font-bold">User #{1000 + i}</p>
                <p className="text-[10px] text-zinc-500">2 mins ago</p>
              </div>
            </div>
            <button className="text-[10px] font-bold text-emerald-500 uppercase">Approve</button>
          </div>
        ))}
      </div>
    </div>
  );
};

const Compliance = ({ type, onBack }: { type: string, onBack: () => void }) => {
  const content: Record<string, { title: string, text: string }> = {
    'SEBI Disclaimer': {
      title: 'SEBI Disclaimer',
      text: 'Investment in securities market are subject to market risks. Read all the related documents carefully before investing. Registration granted by SEBI and certification from NISM in no way guarantee performance of the intermediary or provide any assurance of returns to investors.'
    },
    'Risk Disclosure': {
      title: 'Risk Disclosure',
      text: 'Trading in derivatives (Futures and Options) involves significant risk and is not suitable for all investors. 9 out of 10 individual traders in equity Futures and Options Segment, incurred net losses. On an average, loss makers registered net loss close to ₹50,000.'
    },
    'Terms & Conditions': {
      title: 'Terms & Conditions',
      text: 'By using Aapa Capital, you agree to our terms of service. We provide a platform for trading and do not provide financial advice. All trades are executed at your own risk. Brokerage and other charges apply as per the fee schedule.'
    }
  };

  const data = content[type] || { title: 'Compliance', text: 'Information not available.' };

  return (
    <div className="min-h-screen bg-black p-8 space-y-8 pb-24">
      <div className="flex items-center gap-4 pt-12">
        <button onClick={onBack} className="p-3 rounded-2xl bg-zinc-900 text-zinc-400">
          <ChevronRight className="rotate-180" size={24} />
        </button>
        <h2 className="text-2xl font-black tracking-tighter text-white">{data.title}</h2>
      </div>
      <div className="bg-zinc-900/20 border border-zinc-800/30 rounded-[2.5rem] p-8">
        <p className="text-sm text-zinc-400 leading-relaxed font-medium">{data.text}</p>
      </div>
      <div className="p-6 bg-emerald-500/5 border border-emerald-500/10 rounded-2xl">
        <p className="text-[10px] font-bold text-emerald-500 uppercase tracking-widest text-center">I have read and understood the disclosure</p>
      </div>
    </div>
  );
};

const More = ({ setActiveTab, setComplianceType }: { setActiveTab: (t: string) => void, setComplianceType: (t: string) => void }) => {
  const { user, logout } = useAuthStore();
  
  const sections = [
    {
      title: 'Account',
      items: [
        { icon: UserIcon, label: 'Profile Details', status: 'Active', color: 'text-emerald-500' },
        { icon: ShieldCheck, label: 'KYC Status', status: 'Pending', color: 'text-amber-500', action: () => setActiveTab('onboarding') },
        { icon: Wallet, label: 'Funds & Withdrawals', status: '', color: 'text-blue-500' },
      ]
    },
    {
      title: 'Subscription',
      items: [
        { icon: Zap, label: 'Membership Plans', status: 'Free', color: 'text-purple-500' },
        { icon: Users, label: 'Refer & Earn', status: '₹500/ref', color: 'text-pink-500' },
      ]
    },
    {
      title: 'Security & App',
      items: [
        { icon: Settings, label: 'App Settings', status: '', color: 'text-zinc-500' },
        { icon: ShieldCheck, label: 'Security Settings', status: '', color: 'text-zinc-500' },
        { icon: HelpCircle, label: 'Help & Support', status: '', color: 'text-zinc-500' },
        { icon: LayoutDashboard, label: 'Admin Panel', status: 'Staff', color: 'text-rose-500', action: () => setActiveTab('admin') },
      ]
    },
    {
      title: 'Compliance',
      items: [
        { icon: Info, label: 'SEBI Disclaimer', status: '', color: 'text-zinc-600', action: () => { setComplianceType('SEBI Disclaimer'); setActiveTab('compliance'); } },
        { icon: AlertTriangle, label: 'Risk Disclosure', status: '', color: 'text-zinc-600', action: () => { setComplianceType('Risk Disclosure'); setActiveTab('compliance'); } },
        { icon: FileText, label: 'Terms & Conditions', status: '', color: 'text-zinc-600', action: () => { setComplianceType('Terms & Conditions'); setActiveTab('compliance'); } },
      ]
    }
  ];

  return (
    <div className="space-y-8 pb-24">
      {/* Profile Header */}
      <div className="flex flex-col items-center text-center space-y-4 pt-10">
        <div className="relative">
          <div className="w-24 h-24 rounded-full bg-gradient-to-br from-emerald-500 to-emerald-900 p-1 shadow-2xl shadow-emerald-500/20">
            <div className="w-full h-full rounded-full bg-black flex items-center justify-center overflow-hidden">
              <UserIcon size={40} className="text-zinc-800" />
            </div>
          </div>
          <div className="absolute bottom-0 right-0 w-7 h-7 bg-emerald-500 rounded-full border-4 border-black flex items-center justify-center">
            <ShieldCheck size={12} className="text-black" strokeWidth={3} />
          </div>
        </div>
        <div>
          <h2 className="text-xl font-bold tracking-tight">{user?.email.split('@')[0]}</h2>
          <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mt-1">Client ID: AAPA-{user?.id}001</p>
        </div>
      </div>

      {/* Menu Sections */}
      <div className="px-6 space-y-8">
        {sections.map((section, sIdx) => (
          <div key={sIdx} className="space-y-3">
            <h3 className="text-[10px] font-bold text-zinc-600 uppercase tracking-widest ml-1">{section.title}</h3>
            <div className="space-y-2">
              {section.items.map((item, iIdx) => (
                <button 
                  key={iIdx} 
                  onClick={item.action}
                  className="w-full bg-zinc-900/30 hover:bg-zinc-900/60 border border-zinc-800/30 rounded-2xl p-4 flex justify-between items-center transition-all group"
                >
                  <div className="flex items-center gap-4">
                    <div className={cn("p-2.5 rounded-xl bg-zinc-900/50", item.color)}>
                      <item.icon size={20} />
                    </div>
                    <span className="text-sm font-bold text-zinc-400 group-hover:text-white transition-colors">{item.label}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    {item.status && <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-600">{item.status}</span>}
                    <ChevronRight size={16} className="text-zinc-700 group-hover:text-zinc-400 transition-colors" />
                  </div>
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>

      <div className="px-6">
        <button 
          onClick={logout}
          className="w-full bg-rose-500/5 hover:bg-rose-500 text-rose-500 hover:text-black border border-rose-500/10 font-bold py-5 rounded-2xl transition-all flex items-center justify-center gap-2"
        >
          <LogOut size={20} />
          Log Out
        </button>
      </div>

      <div className="text-center opacity-30 pb-10">
        <p className="text-[9px] font-bold text-zinc-500 uppercase tracking-[0.2em]">Aapa Capital v1.0.0 • SEBI INZ000123456</p>
      </div>
    </div>
  );
};

const Auth = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [mobile, setMobile] = useState('');
  const { setAuth } = useAuthStore();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const endpoint = isLogin ? '/api/auth/login' : '/api/auth/register';
    const body = isLogin ? { login: email, password } : { email, mobile, password };

    const res = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });
    const data = await res.json();
    if (data.token) {
      setAuth(data.user, data.token);
    } else if (!isLogin && data.id) {
      setIsLogin(true);
    } else {
      alert(data.error || 'Something went wrong');
    }
  };

  return (
    <div className="min-h-screen bg-black flex flex-col items-center justify-center p-8">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md space-y-12"
      >
        <div className="text-center space-y-4">
          <div className="w-20 h-20 bg-emerald-500 rounded-[2rem] mx-auto flex items-center justify-center shadow-2xl shadow-emerald-500/20 rotate-12">
            <TrendingUp size={40} className="text-black -rotate-12" strokeWidth={3} />
          </div>
          <h1 className="text-4xl font-black tracking-tighter text-white">AAPA <span className="text-emerald-500">CAPITAL</span></h1>
          <p className="text-zinc-500 font-bold uppercase tracking-[0.2em] text-[10px]">Institutional Grade Trading</p>
        </div>

        <div className="bg-zinc-900/30 border border-zinc-800/50 rounded-[2.5rem] p-8 shadow-2xl">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-zinc-600 uppercase tracking-widest ml-1">Email Address</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-black border border-zinc-800 rounded-2xl py-4 px-6 text-sm focus:outline-none focus:border-emerald-500/50 transition-colors"
                  placeholder="name@example.com"
                  required
                />
              </div>
              {!isLogin && (
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-zinc-600 uppercase tracking-widest ml-1">Mobile Number</label>
                  <input
                    type="tel"
                    value={mobile}
                    onChange={(e) => setMobile(e.target.value)}
                    className="w-full bg-black border border-zinc-800 rounded-2xl py-4 px-6 text-sm focus:outline-none focus:border-emerald-500/50 transition-colors"
                    placeholder="+91 00000 00000"
                    required
                  />
                </div>
              )}
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-zinc-600 uppercase tracking-widest ml-1">Password</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-black border border-zinc-800 rounded-2xl py-4 px-6 text-sm focus:outline-none focus:border-emerald-500/50 transition-colors"
                  placeholder="••••••••"
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              className="w-full bg-emerald-500 hover:bg-emerald-600 text-black font-black py-5 rounded-2xl transition-all shadow-xl shadow-emerald-500/10 tracking-widest uppercase text-xs"
            >
              {isLogin ? 'Sign In' : 'Create Account'}
            </button>
          </form>

          <div className="mt-8 text-center">
            <button
              onClick={() => setIsLogin(!isLogin)}
              className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest hover:text-emerald-500 transition-colors"
            >
              {isLogin ? "Don't have an account? Sign Up" : "Already have an account? Sign In"}
            </button>
          </div>
        </div>

        <div className="text-center space-y-4">
          <p className="text-[9px] text-zinc-700 font-bold uppercase tracking-widest leading-relaxed">
            By continuing, you agree to Aapa Capital's<br />
            <span className="text-zinc-500">Terms of Service</span> and <span className="text-zinc-500">Privacy Policy</span>
          </p>
        </div>
      </motion.div>
    </div>
  );
};

// --- Main App ---

export default function App() {
  const { token } = useAuthStore();
  const [activeTab, setActiveTab] = useState('dashboard');
  const [stocks, setStocks] = useState<Record<string, number>>({});
  const [complianceType, setComplianceType] = useState('');
  const [selectedIndex, setSelectedIndex] = useState<string | null>(null);
  const [overviewIndex, setOverviewIndex] = useState<string | null>(null);
  const [orderConfig, setOrderConfig] = useState<any>(null);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStockFromSearch, setSelectedStockFromSearch] = useState<string | null>(null);

  const openOptionChain = (index: string = 'NIFTY 50') => {
    setSelectedIndex(index);
  };

  const filteredStocks = useMemo(() => {
    if (!searchQuery) return [];
    return Object.keys(stocks).filter(s => s.toLowerCase().includes(searchQuery.toLowerCase())).slice(0, 8);
  }, [searchQuery, stocks]);

  useEffect(() => {
    if (!token) return;

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const ws = new WebSocket(`${protocol}//${window.location.host}`);

    ws.onmessage = (event) => {
      const message = JSON.parse(event.data);
      if (message.type === 'ticker') {
        setStocks(message.data);
      }
    };

    return () => ws.close();
  }, [token]);

  if (!token) {
    return <Auth />;
  }

  return (
    <div className="min-h-screen bg-black text-zinc-100 font-sans selection:bg-emerald-500/30">
      <Header 
        onProfileClick={() => setActiveTab('more')} 
        onSearchClick={() => setIsSearchOpen(true)}
      />
      
      <main className="max-w-md mx-auto">
        <AnimatePresence mode="wait">
          {activeTab === 'dashboard' && <Dashboard key="dashboard" stocks={stocks} onMarketClick={() => setActiveTab('market')} onIndexClick={setSelectedIndex} />}
          {activeTab === 'market' && (
            <Market 
              key="market" 
              stocks={stocks} 
              onIndexClick={setOverviewIndex} 
              onPlaceOrder={setOrderConfig}
              initialSelectedStock={selectedStockFromSearch}
            />
          )}
          {activeTab === 'fo' && <FOTradingCenter key="fo" stocks={stocks} onOpenOptionChain={() => openOptionChain()} />}
          {activeTab === 'portfolio' && <Portfolio key="portfolio" stocks={stocks} />}
          {activeTab === 'onboarding' && <Onboarding key="onboarding" onComplete={() => setActiveTab('dashboard')} />}
          {activeTab === 'admin' && <AdminPanel key="admin" />}
          {activeTab === 'more' && <More key="more" setActiveTab={setActiveTab} setComplianceType={setComplianceType} />}
          {activeTab === 'compliance' && <Compliance key="compliance" type={complianceType} onBack={() => setActiveTab('more')} />}
        </AnimatePresence>
      </main>

      <AnimatePresence mode="wait">
        {isSearchOpen && (
          <motion.div 
            key="search-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[150] bg-black/95 backdrop-blur-xl p-6 flex flex-col"
          >
            <div className="flex items-center gap-4 mb-8">
              <button onClick={() => setIsSearchOpen(false)} className="p-2 -ml-2 rounded-full hover:bg-zinc-900 text-zinc-400">
                <ChevronRight className="rotate-180" size={24} />
              </button>
              <div className="flex-1 relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-600" size={18} />
                <input 
                  autoFocus
                  type="text" 
                  placeholder="Search Stocks, Indices, F&O..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-2xl py-4 pl-12 pr-6 text-sm font-bold focus:border-emerald-500/50 outline-none transition-all"
                />
              </div>
            </div>

            <div className="flex-1 overflow-y-auto space-y-4">
              {filteredStocks.length > 0 ? (
                filteredStocks.map(symbol => (
                  <div 
                    key={symbol} 
                    onClick={() => {
                      setIsSearchOpen(false);
                      setSelectedStockFromSearch(symbol);
                      setActiveTab('market');
                    }}
                    className="bg-zinc-900/40 border border-zinc-800/50 rounded-2xl p-4 flex justify-between items-center cursor-pointer hover:bg-zinc-900 transition-colors"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-xl bg-zinc-900 flex items-center justify-center font-bold text-xs text-zinc-500">
                        {symbol.substring(0, 2)}
                      </div>
                      <div>
                        <p className="text-sm font-bold text-white tracking-tight">{symbol}</p>
                        <p className="text-[10px] font-bold text-zinc-600 uppercase">NSE • Equity</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-bold text-white">{formatCurrency(stocks[symbol] || 0)}</p>
                      <p className="text-[10px] font-bold text-emerald-500">+1.24%</p>
                    </div>
                  </div>
                ))
              ) : searchQuery ? (
                <div className="text-center py-20">
                  <p className="text-sm font-bold text-zinc-600 uppercase tracking-widest">No results found</p>
                </div>
              ) : (
                <div className="space-y-6">
                  <h3 className="text-[10px] font-bold text-zinc-600 uppercase tracking-widest ml-1">Recent Searches</h3>
                  <div className="flex flex-wrap gap-2">
                    {['RELIANCE', 'NIFTY 50', 'TCS', 'ZOMATO'].map(s => (
                      <button key={s} onClick={() => setSearchQuery(s)} className="px-4 py-2 rounded-xl bg-zinc-900 border border-zinc-800 text-xs font-bold text-zinc-400 hover:text-white transition-colors">{s}</button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        )}

        {orderConfig && (
          <OrderWindow 
            key="order-window"
            config={orderConfig} 
            onClose={() => setOrderConfig(null)} 
            onOrderPlaced={() => {
              // Refresh portfolio or show success
            }}
          />
        )}
        {overviewIndex && (
          <IndexOverview 
            key="index-overview"
            indexName={overviewIndex}
            stocks={stocks}
            onClose={() => setOverviewIndex(null)}
            onOpenOptionChain={() => {
              setSelectedIndex(overviewIndex);
              setOverviewIndex(null);
            }}
          />
        )}
        {selectedIndex && (
          <IndexDetail 
            key="index-detail"
            indexName={selectedIndex} 
            stocks={stocks} 
            onClose={() => setSelectedIndex(null)} 
            onPlaceOrder={setOrderConfig}
          />
        )}
      </AnimatePresence>

      <Navbar activeTab={activeTab} setActiveTab={setActiveTab} />
    </div>
  );
}
