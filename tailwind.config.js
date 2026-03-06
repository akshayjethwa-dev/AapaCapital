/** @type {import('tailwindcss').Config} */
module.exports = { 
  // 🚀 Add this line to fix the Dark Mode crash
  darkMode: 'class',

  content: [
    "./app/**/*.{js,jsx,ts,tsx}", 
    "./src/**/*.{js,jsx,ts,tsx}",
    "./components/**/*.{js,jsx,ts,tsx}"
  ],
  // 🚀 This is the critical line added for NativeWind
  presets: [require("nativewind/preset")],
  
  theme: {
    extend: {
      colors: {
        // Core background & neutrals
        black: '#000000',
        zinc: {
          100: '#f4f4f5',
          300: '#d4d4d8',
          400: '#a1a1aa',
          500: '#71717a',
          600: '#52525b',
          700: '#3f3f46',
          800: '#27272a',
          900: '#18181b',
          950: '#09090b',
        },
        // Action & Trend Colors
        emerald: {
          500: '#10b981', // Positive / Buy
          600: '#059669',
        },
        rose: {
          500: '#f43f5e', // Negative / Sell
          600: '#e11d48',
        },
        blue: {
          500: '#3b82f6', // Info / Delivery
        },
        amber: {
          500: '#f59e0b', // Warning / Intraday
        }
      },
      fontFamily: {
        sans: ['Inter', 'System'], // Note: You'll need to load Inter font in Expo
      },
      letterSpacing: {
        tighter: '-0.05em',
        tight: '-0.025em',
        widest: '0.1em', // Heavily used in your web app for small headers
      }
    },
  },
  plugins: [],
}