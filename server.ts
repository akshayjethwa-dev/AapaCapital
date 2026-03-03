import express from "express";
import { createServer as createViteServer } from "vite";
import http from "http";
import { WebSocketServer, WebSocket } from "ws";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import Database from "better-sqlite3";
import path from "path";
import dotenv from "dotenv";

dotenv.config();

const db = new Database("sqlite.db");

// Initialize Database
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT UNIQUE,
    mobile TEXT UNIQUE,
    password TEXT,
    role TEXT DEFAULT 'user',
    is_kyc_approved INTEGER DEFAULT 0,
    balance REAL DEFAULT 100000.0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS portfolios (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    symbol TEXT,
    quantity INTEGER,
    average_price REAL,
    FOREIGN KEY(user_id) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS orders (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    symbol TEXT,
    type TEXT, -- 'buy' or 'sell'
    order_type TEXT, -- 'market', 'limit', 'sl'
    quantity INTEGER,
    price REAL,
    status TEXT DEFAULT 'completed', -- 'pending', 'completed', 'cancelled'
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(user_id) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS kyc_data (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    pan TEXT,
    aadhaar TEXT,
    bank_account TEXT,
    ifsc TEXT,
    status TEXT DEFAULT 'pending',
    FOREIGN KEY(user_id) REFERENCES users(id)
  );
`);

async function startServer() {
  const app = express();
  const server = http.createServer(app);
  const wss = new WebSocketServer({ server });

  app.use(express.json());

  const JWT_SECRET = process.env.JWT_SECRET || "fallback-secret";

  // Auth Middleware
  const authenticateToken = (req: any, res: any, next: any) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    if (!token) return res.sendStatus(401);

    jwt.verify(token, JWT_SECRET, (err: any, user: any) => {
      if (err) return res.sendStatus(403);
      req.user = user;
      next();
    });
  };

  // API Routes
  app.post("/api/auth/register", async (req, res) => {
    const { email, mobile, password } = req.body;
    const hashedPassword = await bcrypt.hash(password, 10);
    try {
      const info = db.prepare("INSERT INTO users (email, mobile, password) VALUES (?, ?, ?)").run(email, mobile, hashedPassword);
      res.json({ id: info.lastInsertRowid });
    } catch (e) {
      res.status(400).json({ error: "User already exists" });
    }
  });

  app.post("/api/auth/login", async (req, res) => {
    const { login, password } = req.body; // login can be email or mobile
    const user: any = db.prepare("SELECT * FROM users WHERE email = ? OR mobile = ?").get(login, login);
    if (!user || !(await bcrypt.compare(password, user.password))) {
      return res.status(401).json({ error: "Invalid credentials" });
    }
    const token = jwt.sign({ id: user.id, email: user.email, role: user.role }, JWT_SECRET);
    res.json({ token, user: { id: user.id, email: user.email, role: user.role, balance: user.balance } });
  });

  app.get("/api/user/profile", authenticateToken, (req: any, res) => {
    const user = db.prepare("SELECT id, email, mobile, role, is_kyc_approved, balance FROM users WHERE id = ?").get(req.user.id);
    res.json(user);
  });

  app.get("/api/portfolio", authenticateToken, (req: any, res) => {
    const holdings = db.prepare("SELECT * FROM portfolios WHERE user_id = ?").all(req.user.id);
    res.json(holdings);
  });

  app.post("/api/orders", authenticateToken, (req: any, res) => {
    const { symbol, type, order_type, quantity, price } = req.body;
    const userId = req.user.id;

    // Simple transaction logic
    const user: any = db.prepare("SELECT balance FROM users WHERE id = ?").get(userId);
    const totalCost = quantity * price;

    if (type === 'buy' && user.balance < totalCost) {
      return res.status(400).json({ error: "Insufficient balance" });
    }

    const transaction = db.transaction(() => {
      // Record order
      db.prepare("INSERT INTO orders (user_id, symbol, type, order_type, quantity, price) VALUES (?, ?, ?, ?, ?, ?)").run(userId, symbol, type, order_type, quantity, price);

      // Update balance
      const balanceChange = type === 'buy' ? -totalCost : totalCost;
      db.prepare("UPDATE users SET balance = balance + ? WHERE id = ?").run(balanceChange, userId);

      // Update portfolio
      if (type === 'buy') {
        const existing: any = db.prepare("SELECT * FROM portfolios WHERE user_id = ? AND symbol = ?").get(userId, symbol);
        if (existing) {
          const newQty = existing.quantity + quantity;
          const newAvg = (existing.quantity * existing.average_price + totalCost) / newQty;
          db.prepare("UPDATE portfolios SET quantity = ?, average_price = ? WHERE id = ?").run(newQty, newAvg, existing.id);
        } else {
          db.prepare("INSERT INTO portfolios (user_id, symbol, quantity, average_price) VALUES (?, ?, ?, ?)").run(userId, symbol, quantity, price);
        }
      } else {
        const existing: any = db.prepare("SELECT * FROM portfolios WHERE user_id = ? AND symbol = ?").get(userId, symbol);
        if (!existing || existing.quantity < quantity) {
          throw new Error("Insufficient holdings");
        }
        const newQty = existing.quantity - quantity;
        if (newQty === 0) {
          db.prepare("DELETE FROM portfolios WHERE id = ?").run(existing.id);
        } else {
          db.prepare("UPDATE portfolios SET quantity = ? WHERE id = ?").run(newQty, existing.id);
        }
      }
    });

    try {
      transaction();
      res.json({ success: true });
    } catch (e: any) {
      res.status(400).json({ error: e.message });
    }
  });

  // WebSocket for Real-time Market Data Simulation
  const primaryIndices = ["NIFTY 50", "SENSEX", "BANKNIFTY", "FINNIFTY", "MIDCAP NIFTY", "SMALLCAP NIFTY"];
  const secondaryIndices = ["NIFTY IT", "NIFTY AUTO", "NIFTY PHARMA", "NIFTY METAL", "NIFTY FMCG", "NIFTY REALTY"];
  const stocks = ["RELIANCE", "TCS", "HDFCBANK", "INFY", "ICICIBANK", "BHARTIARTL", "SBIN", "LICI", "ITC", "HINDUNILVR"];
  
  const allSymbols = [...primaryIndices, ...secondaryIndices, ...stocks];
  const stockPrices: Record<string, number> = {};
  
  allSymbols.forEach(symbol => {
    if (symbol.includes("NIFTY 50")) stockPrices[symbol] = 22000;
    else if (symbol.includes("SENSEX")) stockPrices[symbol] = 72000;
    else if (symbol.includes("BANKNIFTY")) stockPrices[symbol] = 48000;
    else if (symbol.includes("NIFTY")) stockPrices[symbol] = 15000;
    else stockPrices[symbol] = Math.random() * 3000 + 100;
  });

  setInterval(() => {
    allSymbols.forEach(symbol => {
      const change = (Math.random() - 0.5) * (stockPrices[symbol] * 0.001);
      stockPrices[symbol] = Math.max(1, stockPrices[symbol] + change);
    });

    const data = JSON.stringify({ type: 'ticker', data: stockPrices });
    wss.clients.forEach(client => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(data);
      }
    });
  }, 1000);

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.join(__dirname, "dist")));
    app.get("*", (req, res) => {
      res.sendFile(path.join(__dirname, "dist", "index.html"));
    });
  }

  const PORT = 3000;
  server.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
