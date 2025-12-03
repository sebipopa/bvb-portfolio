# 📈 BVB Portfolio Tracker

> **🤖 AI Vibe Coding Side Project** - Built exploring modern React Native development with AI-assisted coding workflows

A React Native mobile app for tracking Romanian stock market (BVB - Bucharest Stock Exchange) investments with real-time price updates and comprehensive portfolio analytics.

## ✨ Features

### Portfolio Management
- **Transaction-based tracking** - Record all BUY/SELL transactions with full history
- **Real-time price updates** - Live prices scraped from BVB website
- **Automatic calculations** - Average buy price, gains/losses, and portfolio metrics computed from transaction history
- **Multi-stock support** - Track unlimited stocks in your portfolio

### User Interface
- **📊 Portfolio Overview** - See total value, invested amount, and overall gain/loss at a glance
- **🔄 Multiple Sort Options** - Sort by value, alphabetically, or create custom order with drag-and-drop
- **🌐 Bilingual Support** - Full Romanian and English localization
- **📱 Native Mobile Experience** - Built with React Native and Expo for iOS and Android

### Stock Details
- **Transaction History** - View all transactions for each stock with dates and notes
- **Performance Metrics** - Current price, average buy price, total shares, and P&L
- **Price Cache** - 1-hour cache for prices with manual refresh option
- **Quick Actions** - Add transactions or delete holdings directly from detail view

### Advanced Features
- **Custom Sort Order** - Drag-and-drop to reorder your holdings, persisted across sessions
- **Demo Data** - Load sample transactions for testing (~20 transactions across 10 BVB stocks)
- **Smart Caching** - Efficient price fetching with automatic cache management
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

### Price Fetching
- Web scraping from BVB official website
- 1-hour cache duration to reduce API calls
- Parallel fetching for multiple symbols
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
The app includes demo data for testing:
- Tap "Load Demo Data" button on empty portfolio
- Adds ~20 realistic BVB transactions
- Includes popular stocks: TLV, SNN, SNP, SNG, H2O, BVB, TVBETETF, FP, M, SMTL

## 📂 Project Structure

```
bvb-portfolio/
├── app/                    # Expo Router screens
│   ├── index.tsx          # Portfolio list
│   ├── stock/[symbol].tsx # Stock detail
│   └── _layout.tsx        # Root layout
├── src/
│   ├── context/           # React Context providers
│   ├── hooks/             # Custom React hooks
│   ├── i18n/              # Localization files (ro/en)
│   ├── services/          # Business logic
│   │   ├── bvbApi.ts      # Price fetching & caching
│   │   ├── transactionService.ts  # Transaction CRUD
│   │   ├── mockDataService.ts     # Demo data
│   │   └── sortOrderService.ts    # Custom sort persistence
│   └── types/             # TypeScript definitions
└── assets/                # Images and static files
```

## 🔧 Key Services

### BVB API Service
- Scrapes prices from BVB website
- 1-hour in-memory cache
- Parallel fetching support
- Error handling with zero-price fallback

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
