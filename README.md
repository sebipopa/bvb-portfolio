# 📈 BVB Portfolio Tracker

> **🤖 AI Vibe Coding Side Project** - Built exploring modern React Native development with AI-assisted coding workflows

A React Native mobile app for tracking multi-exchange stock investments with real-time price updates and comprehensive portfolio analytics. Supports Romanian (BVB) and London Stock Exchange (LSE) with more exchanges coming soon.

## ✨ Features

### Portfolio Management
- **Multi-Exchange Support** - Track stocks from BVB (Romanian) and London Stock Exchange in one portfolio
- **Transaction-based tracking** - Record all BUY/SELL transactions with full history
- **Real-time price updates** - Live prices from BVB website and Yahoo Finance API
- **Multi-currency** - Automatic currency handling (RON for BVB, GBP for London)
- **Automatic calculations** - Average buy price, gains/losses, and portfolio metrics computed from transaction history
- **Unlimited holdings** - Track as many stocks as you want across different exchanges

### User Interface
- **📊 Portfolio Overview** - See total value, invested amount, and overall gain/loss at a glance
- **🏷️ Exchange Badges** - Visual indicators showing which exchange each stock is from (BVB/London)
- **🔄 Multiple Sort Options** - Sort by value, alphabetically, or create custom order with drag-and-drop
- **🌐 Bilingual Support** - Full Romanian and English localization
- **📱 Native Mobile Experience** - Built with React Native and Expo for iOS and Android

### Stock Details
- **Transaction History** - View all transactions for each stock with dates and notes
- **Performance Metrics** - Current price, average buy price, total shares, and P&L with currency
- **Price Cache** - 1-hour cache for prices with manual refresh option
- **Quick Actions** - Add transactions or delete holdings directly from detail view

### Advanced Features
- **Exchange Selection** - Choose between BVB and London Stock Exchange when adding stocks
- **Custom Sort Order** - Drag-and-drop to reorder your holdings, persisted across sessions
- **Demo Data** - Load sample transactions for testing (mix of BVB and London stocks)
- **Smart Caching** - Efficient price fetching with automatic cache management per exchange
- **Comprehensive Logging** - Detailed console logs with emoji indicators for debugging

## 🛠️ Tech Stack

- **Framework**: React Native 0.81.5 with Expo 54
- **Language**: TypeScript 5.9 (strict mode)
- **Navigation**: Expo Router (file-based routing)
- **State Management**: React Context API
- **Storage**: AsyncStorage for local persistence
- **UI Components**:
  - react-native-draggable-flatlist for drag-and-drop
  - react-native-gesture-handler & reanimated for animations
  - Native React Native components

## 📱 Screens

1. **Portfolio List** - Main screen with all holdings, summary, and sort options
2. **Stock Detail** - Individual stock view with metrics and transaction history
3. **Add Transaction** - Modal for recording BUY/SELL transactions

## 🏗️ Architecture

### Transaction-Based Model
Instead of storing positions directly, the app records all transactions (BUY/SELL) and calculates:
- Total shares owned (BUY - SELL)
- Average buy price (weighted by quantity)
- Current value and gains/losses

### Multi-Exchange Price Fetching
**Symbol Format**: `SYMBOL.EXCHANGE` (e.g., `SNG.BVB`, `CSPX.L`)

**Supported Exchanges**:
- **BVB** (Bucharest Stock Exchange) - Web scraping from official BVB website
- **L** (London Stock Exchange) - Yahoo Finance API

**Features**:
- 1-hour cache duration per symbol to reduce API calls
- Parallel fetching for multiple symbols
- Automatic currency detection (RON for BVB, GBP for London)
- Graceful error handling with fallback to cached/zero prices

### Data Flow
```
AsyncStorage → Transactions → Calculate Metrics → Fetch Prices → Display Portfolio
```

## 🚀 Getting Started

### Prerequisites
- Node.js 20+
- npm or yarn
- Expo Go app (for testing on physical device)

### Installation

```bash
# Clone the repository
git clone https://github.com/sebipopa/bvb-portfolio.git

# Install dependencies
cd bvb-portfolio
npm install

# Start the development server
npm start
```

### Loading Demo Data
The app includes multi-exchange demo data for testing:
- Tap "Load Demo Data" button on empty portfolio
- Adds transactions across both exchanges

**BVB Stocks (Romanian)**:
- TLV.BVB (Banca Transilvania)
- SNN.BVB (Nuclearelectrica)
- SNP.BVB (OMV Petrom)
- SNG.BVB (Romgaz)
- H2O.BVB (Hidroelectrica)
- FP.BVB (Fondul Proprietatea)

**London Stocks**:
- CSPX.L (iShares Core S&P 500 ETF)
- VWCE.L (Vanguard FTSE All-World ETF)
- VUSA.L (Vanguard S&P 500 ETF)

## 📂 Project Structure

```
bvb-portfolio/
├── app/                    # Expo Router screens
│   ├── index.tsx          # Portfolio list
│   ├── stock/[symbol].tsx # Stock detail
│   └── _layout.tsx        # Root layout
├── src/
│   ├── components/        # Reusable UI components
│   │   └── ExchangeBadge.tsx  # Exchange indicator badge
│   ├── context/           # React Context providers
│   ├── hooks/             # Custom React hooks
│   ├── i18n/              # Localization files (ro/en)
│   ├── services/          # Business logic
│   │   ├── marketDataApi.ts       # Multi-exchange price fetching
│   │   ├── exchangeService.ts     # Exchange parsing & validation
│   │   ├── transactionService.ts  # Transaction CRUD
│   │   ├── mockDataService.ts     # Multi-exchange demo data
│   │   └── sortOrderService.ts    # Custom sort persistence
│   └── types/             # TypeScript definitions
└── assets/                # Images and static files
```

## 🔧 Key Services

### Market Data API Service (`marketDataApi.ts`)
- **Multi-exchange support**: BVB (web scraping) and London (Yahoo Finance API)
- **Symbol format**: `SYMBOL.EXCHANGE` (e.g., `SNG.BVB`, `CSPX.L`)
- 1-hour in-memory cache per symbol
- Parallel fetching for multiple symbols
- Automatic currency detection
- Error handling with zero-price fallback

### Exchange Service (`exchangeService.ts`)
- Parse and validate symbol format
- Exchange metadata (name, currency, country code)
- Symbol formatting utilities

### Transaction Service
- Load/save transactions to AsyncStorage
- Add, delete, and query operations
- Metrics calculation from transaction history
- Migration from legacy portfolio format

### Sort Order Service
- Persist custom drag-and-drop order
- Load saved order on app start
- AsyncStorage-based persistence

## 📝 Logging

The app includes comprehensive console logging with emoji indicators:
- `📥` Loading data from storage
- `💾` Saving data to storage
- `🌐` Fetching from API
- `✅` Successful operations
- `⚠️` Warnings
- `❌` Errors
- `🗑️` Delete operations
- `➕` Add operations
- `🔍` Search/fetch operations

## 🌍 Localization

Full support for Romanian and English:
- Dynamic language switching
- All UI text localized
- Currency formatting (RON)
- Date formatting

## 🎨 Design Features

- Clean, modern interface
- Color-coded gains (green) and losses (red)
- Responsive layouts
- Native iOS/Android feel
- Smooth animations and transitions

## 🤖 About This Project

This is a personal side project built to explore AI-assisted development workflows ("AI vibe coding"). The goal was to experiment with rapid prototyping, iterative development, and leveraging AI tools to accelerate the development process while maintaining code quality and best practices.

## 📄 License

MIT License - feel free to use this project for your own portfolio tracking needs!

## 🤝 Contributing

Contributions welcome! Please feel free to submit a Pull Request.

## 🐛 Known Limitations

- Prices are scraped from BVB website (no official API available)
- Web scraping may break if BVB changes their HTML structure
- Limited to BVB (Bucharest Stock Exchange) stocks only
- No cloud sync (local storage only)

## 🔮 Future Enhancements

- Charts and performance graphs
- Dividend tracking
- Export to CSV/Excel
- Cloud backup and sync
- Price alerts and notifications
- Multi-currency support

---

**Built with ❤️ for Romanian investors** | **🤖 AI-Assisted Development**
