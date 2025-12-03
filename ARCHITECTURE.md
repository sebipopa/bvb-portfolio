# BVB Stock Portfolio Tracker

A minimal, clean iOS mobile app built with **Expo Router** and **React Native** for tracking your stock portfolio on the Bucharest Stock Exchange (BVB).

## 🎯 Features

- **Portfolio Dashboard**: View all your stocks with real-time prices
- **Stock Details**: Deep-dive into each stock's performance
- **Gain/Loss Tracking**: Color-coded gains (green) and losses (red)
- **Multi-language Support**: Romanian (default) + English structure
- **Lightweight**: Uses only React Native default components
- **TypeScript**: Full type safety throughout the codebase
- **Clean Architecture**: Modular, extensible, well-documented code

---

## 📁 Project Structure

```
.
├── app/
│   ├── _layout.tsx              # Root layout with Expo Router
│   ├── index.tsx                # Portfolio list screen
│   └── stock/
│       └── [symbol].tsx         # Stock detail screen (dynamic route)
│
├── src/
│   ├── types/
│   │   └── Stock.ts             # TypeScript domain types
│   ├── services/
│   │   └── bvbApi.ts            # BVB API client
│   ├── context/
│   │   └── PortfolioContext.tsx # Global state management
│   ├── hooks/
│   │   └── usePortfolio.ts      # Portfolio hook
│   └── i18n/
│       ├── index.ts             # i18n setup
│       ├── ro.json              # Romanian translations
│       └── en.json              # English translations
│
├── assets/
│   └── portfolio.json           # Your portfolio data (BVB tickers)
│
├── tsconfig.json                # TypeScript config
├── app.json                     # Expo config
└── package.json
```

---

## 🚀 Quick Start

### Prerequisites

- Node.js 16+ and npm/yarn
- Expo CLI (or npx)
- iOS Simulator (Mac) or physical device

### Installation & Setup

```bash
# Install dependencies
npm install
# or
yarn install

# Start the development server
npx expo start

# Press 'i' for iOS Simulator (Mac)
# or scan QR code with Expo Go app
```

The app will hot-reload as you make changes.

---

## 📦 Dependencies

The project uses minimal external dependencies:

```json
{
  "expo": "~latest",
  "expo-router": "~latest",
  "react": "18.x",
  "react-native": "0.73+",
  "typescript": "~5.x"
}
```

No UI framework libraries—uses only React Native's built-in components.

---

## 🏗️ Architecture

### State Management: React Context

We use **React Context + Hooks** for lightweight state management:

1. **PortfolioContext**: Manages portfolio data and API calls
2. **usePortfolio()**: Hook to access portfolio state in any component

```typescript
// Example usage in a component
import { usePortfolio } from '@/src/hooks/usePortfolio';

export default function MyComponent() {
  const { stocks, summary, loading, error } = usePortfolio();

  // Use portfolio data...
}
```

### Data Flow

```
Portfolio JSON
     ↓
PortfolioContext (loads JSON)
     ↓
getBvbPrices() (fetch live prices)
     ↓
Calculate Metrics (gain/loss, %)
     ↓
usePortfolio() hook
     ↓
Screens render data
```

### TypeScript Types

All types are defined in `src/types/Stock.ts`:

- `PortfolioItem`: Local portfolio data (symbol, shares, avgBuyPrice)
- `StockMarketData`: Live market data (symbol, currentPrice, lastUpdate)
- `StockMetrics`: Combined computed data (extends both above)
- `PortfolioSummary`: Aggregate portfolio metrics

---

## 🌐 Multi-Language Setup

The app is structured for easy multi-language support:

```typescript
// Use the t() function
import { t } from '@/src/i18n';

<Text>{t('portfolio.title')}</Text>     // Romanian
<Text>{t('portfolio.title', 'en')}</Text> // English
```

### Adding a New Language

1. Create `src/i18n/[language].json` (e.g., `fr.json`)
2. Add translations following the same structure as `ro.json`
3. Update `src/i18n/index.ts` to import the new language

```typescript
// Example: Add French
import frTranslations from './fr.json';

const translations: Record<LanguageKey, Record<string, any>> = {
  ro: roTranslations,
  en: enTranslations,
  fr: frTranslations,  // Add here
};
```

---

## 📊 Screens

### Screen 1: Portfolio Dashboard (`app/index.tsx`)

**Shows:**
- Total portfolio value
- Total gain/loss (value + percentage)
- List of stocks, each showing:
  - Ticker symbol (bold, large)
  - Current price
  - Shares owned
  - Average buy price
  - Total value
  - Gain/loss (color-coded: green/red)
- Pull-to-refresh support

**Interactions:**
- Tap a stock → Navigate to detail screen

### Screen 2: Stock Detail (`app/stock/[symbol].tsx`)

**Shows:**
- Stock symbol (header)
- Number of shares
- Average buy price
- Current price
- Total value
- Gain/loss (value + percentage)
- Chart placeholder (for future implementation)
- Last update timestamp

**Interactions:**
- Back button → Return to portfolio list

---

## 🔌 BVB API Integration

### Current Implementation

The app uses **mock price data** for development. The API logic is in `src/services/bvbApi.ts`.

```typescript
export async function getBvbPrice(symbol: string): Promise<StockMarketData>
```

### TODO: Production Integration

The BVB (Bucharest Stock Exchange) exposes JSON endpoints at **https://www.bvb.ro/**

Possible endpoints to investigate:
- `https://www.bvb.ro/TradingAndStatistics/Trading/TradingSummary.svc/GetTradingSummary`
- `https://www.bvb.ro/api/stock/{symbol}`

**To enable real BVB data:**

1. Identify the correct API endpoint
2. Update `getBvbPrice()` in `src/services/bvbApi.ts`
3. Add error handling and caching

Example production code:

```typescript
export async function getBvbPrice(symbol: string): Promise<StockMarketData> {
  const response = await fetch(`https://www.bvb.ro/api/stock/${symbol}`);
  const data = await response.json();

  return {
    symbol,
    currentPrice: data.lastPrice,
    lastUpdate: Date.now(),
  };
}
```

---

## 📄 Portfolio Data Format

Edit `assets/portfolio.json` to add your stocks:

```json
[
  {
    "symbol": "SNN",
    "shares": 100,
    "avgBuyPrice": 45.20
  },
  {
    "symbol": "TLV",
    "shares": 250,
    "avgBuyPrice": 17.35
  }
]
```

**Fields:**
- `symbol`: BVB ticker (uppercase)
- `shares`: Number of shares owned (integer or float)
- `avgBuyPrice`: Average purchase price per share in RON

---

## 🧮 Calculations

### Per-Stock Metrics

```
totalValue = shares × currentPrice
gainLossValue = totalValue - (shares × avgBuyPrice)
gainLossPercentage = (gainLossValue / invested) × 100
```

### Portfolio Summary

```
totalValue = sum(all stocks' totalValue)
totalInvested = sum(all stocks' invested amount)
totalGainLoss = totalValue - totalInvested
totalGainLossPercentage = (totalGainLoss / totalInvested) × 100
```

---

## 🎨 Styling

The app uses **React Native default styles** (no UI libraries):

- Clean, minimal design
- Color scheme:
  - Primary: `#2196f3` (blue)
  - Success: `#4caf50` (green, gains)
  - Error: `#f44336` (red, losses)
  - Background: `#f8f8f8` (light gray)
  - Surfaces: `#fff` (white)

All styles are defined in `StyleSheet.create()` within each screen for easy customization.

---

## 🚧 Future Enhancements (TODO)

1. **Real BVB API Integration**: Replace mock data with live prices
2. **Charts**: Add price history charts (suggest: `react-native-chart-kit`)
3. **Persistent Storage**: Save portfolio to device (expo-file-system or AsyncStorage)
4. **Cloud Sync**: Sync portfolio across devices
5. **Notifications**: Price alerts and portfolio changes
6. **Dark Mode**: Full dark theme support
7. **More Languages**: Add more translations
8. **Performance Optimization**: Memoization, lazy loading
9. **Unit Tests**: Jest + React Native Testing Library
10. **Android Support**: Extend from iOS-only

---

## 🐛 Debugging

### Enable Debug Mode

```bash
# Start with verbose logging
npx expo start --dev-client
```

### Check Portfolio Loading

The `PortfolioContext` logs errors to the console:

```bash
# Watch for errors in terminal
npx expo start
```

### Reload App

- **Fast Refresh**: Edit a file and save (Cmd+S)
- **Full Reload**: Press 'r' in terminal
- **Clear Cache**: Press 'c' in terminal

---

## 📝 Code Quality

- **TypeScript**: Full static typing
- **Comments**: Architecture notes and TODOs throughout
- **Modularity**: Each file has a single responsibility
- **Extensibility**: Easy to add features without breaking existing code

---

## 📚 Key Files Reference

| File | Purpose |
|------|---------|
| `src/types/Stock.ts` | Domain types and interfaces |
| `src/services/bvbApi.ts` | BVB price fetching logic |
| `src/context/PortfolioContext.tsx` | Global state management |
| `src/hooks/usePortfolio.ts` | Hook for accessing portfolio |
| `src/i18n/index.ts` | Translation setup |
| `app/index.tsx` | Portfolio list screen |
| `app/stock/[symbol].tsx` | Stock detail screen |
| `assets/portfolio.json` | Your portfolio data |

---

## 🤝 Contributing

This is a personal project, but feel free to fork and customize:

1. Update `assets/portfolio.json` with your stocks
2. Replace mock BVB data with real API
3. Extend screens and features as needed

---

## 📜 License

This project is open source and available under the MIT License.

---

## 🎓 Learning Resources

- **Expo Router**: https://docs.expo.dev/router/introduction/
- **React Native Docs**: https://reactnative.dev/
- **TypeScript**: https://www.typescriptlang.org/docs/
- **BVB Official Site**: https://www.bvb.ro/

---

**Built with ❤️ using Expo, React Native, and TypeScript**

**Last Updated**: December 2025
