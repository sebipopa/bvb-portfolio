# BVB Portfolio Tracker - Development Guide

## 🚀 Getting Started

### First Run

```bash
# 1. Install dependencies
npm install

# 2. Start Expo development server
npx expo start

# 3. Press 'i' for iOS Simulator (Mac) or scan QR for physical device
```

The app will automatically load and hot-reload as you edit files.

---

## 📱 Screens Overview

### 1. Portfolio List Screen (`app/index.tsx`)
- **URL**: `/`
- **Shows**: List of all stocks in your portfolio
- **Actions**:
  - Pull-to-refresh to update prices
  - Tap stock to view details

### 2. Stock Detail Screen (`app/stock/[symbol].tsx`)
- **URL**: `/stock/SNN` (dynamic route by symbol)
- **Shows**: Detailed metrics for one stock
- **Actions**:
  - Tap back to return to portfolio

---

## 📝 Adding Stocks to Your Portfolio

Edit `assets/portfolio.json`:

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
  },
  {
    "symbol": "SNP",
    "shares": 500,
    "avgBuyPrice": 0.60
  }
]
```

Save the file—the app will hot-reload and show your new stocks.

---

## 🌐 Switching Languages

The app defaults to Romanian. To test English:

Update `src/i18n/index.ts` line 16:

```typescript
// Change this:
const DEFAULT_LANGUAGE: LanguageKey = 'ro';

// To this:
const DEFAULT_LANGUAGE: LanguageKey = 'en';
```

Or, pass language as parameter in components:

```typescript
<Text>{t('portfolio.title', 'en')}</Text> // English
```

---

## 🔌 Testing the BVB API Integration

Currently, the app uses **mock prices** in `src/services/bvbApi.ts`.

### View Mock Prices

The mock prices are defined in `src/services/bvbApi.ts`:

```typescript
const MOCK_PRICES: Record<string, number> = {
  SNN: 48.5,
  TLV: 18.2,
  SNP: 0.72,
};
```

Each time you refresh, prices fluctuate slightly for realism.

### When Ready: Connect to Real BVB API

1. Identify the BVB JSON endpoint (see ARCHITECTURE.md)
2. Replace the mock logic in `getBvbPrice()` function
3. Add error handling for network issues

---

## 🛠️ Development Workflow

### Hot Reload (Recommended)

1. Edit a file (e.g., `app/index.tsx`)
2. Save (Cmd+S)
3. Changes appear immediately in simulator

### Full Reload

If hot reload fails:
- Press **r** in terminal
- Or manually reload iOS Simulator (Cmd+R)

### Clear Cache

For stubborn cache issues:
- Press **c** in terminal
- Restarts dev server

---

## 🧪 Common Tasks

### Add a New Translation

1. Edit `src/i18n/ro.json` and `src/i18n/en.json`
2. Use in component:
   ```typescript
   <Text>{t('mykey.myfield')}</Text>
   ```

### Add a New Stock Type

1. Update `src/types/Stock.ts` with new interface
2. Update PortfolioContext if needed
3. Update screens to display new fields

### Change Color Scheme

Edit color constants at top of each screen file:

```typescript
// In styles StyleSheet.create():
primaryColor: '#2196f3',     // Blue
successColor: '#4caf50',     // Green
errorColor: '#f44336',       // Red
```

### Add a New Screen

1. Create `app/mynewscreen.tsx`
2. Import and use `usePortfolio()` hook
3. Use `useRouter()` for navigation

---

## 📊 Understanding the Data Flow

```
1. App starts
   ↓
2. PortfolioProvider wraps app
   ↓
3. Load portfolio.json from assets
   ↓
4. Call getBvbPrices() for current prices
   ↓
5. Calculate metrics (gain/loss, %)
   ↓
6. Store in PortfolioContext
   ↓
7. Screens access via usePortfolio() hook
   ↓
8. Display data and listen for refreshes
```

---

## 🎨 Styling Guide

All screens use `StyleSheet.create()` for performance:

```typescript
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f8f8',
  },
  // ... more styles
});

// Apply styles:
<View style={styles.container}>
```

For conditional styles:

```typescript
<View style={[
  styles.stockItem,
  stock.gainLossValue >= 0
    ? styles.stockItemGain
    : styles.stockItemLoss
]}>
```

---

## 🐛 Debugging Tips

### View Console Logs

Logs appear in terminal where you ran `npx expo start`.

### Check Portfolio Loading

Add console logs in `PortfolioContext.tsx`:

```typescript
console.log('Loaded portfolio:', portfolioItems);
console.log('Price data:', priceData);
```

### Network Issues

If prices don't load:
1. Check console for API errors
2. Verify mock prices are working first
3. When ready for real API, test endpoint in browser

### Navigation Issues

Ensure routes are correct:
- `app/index.tsx` → `/` (home)
- `app/stock/[symbol].tsx` → `/stock/SNN` (detail)

Use `useRouter()` and `useLocalSearchParams()` to debug.

---

## 🚀 Performance Tips

1. **Reduce Price Fetches**: Cache prices to avoid excessive API calls
2. **Memoize Components**: Use `React.memo()` for expensive renders
3. **Optimize Lists**: Consider `FlatList` if portfolio grows large
4. **Lazy Load Screens**: Use Expo Router's built-in code splitting

---

## 📦 Building for Production

```bash
# Create production build
npx expo build:ios

# or use EAS (Recommended)
npx eas build --platform ios
```

---

## 🤔 Common Issues

### App Won't Start
```bash
# Clear cache and reinstall
rm -rf node_modules
npm install
npx expo start --dev-client
```

### Prices Not Updating
- Check console for API errors
- Verify mock prices in `bvbApi.ts`
- Try pull-to-refresh in app

### Navigation Not Working
- Ensure file paths use absolute imports (`@/...`)
- Check route naming matches file structure

### TypeScript Errors
- Run `npm run type-check` (if available)
- Ensure all imports are properly typed

---

## 📚 File Quick Reference

| File | Edit For... |
|------|---------|
| `assets/portfolio.json` | Your stocks |
| `src/i18n/ro.json` | Romanian text |
| `src/i18n/en.json` | English text |
| `src/services/bvbApi.ts` | Price fetching logic |
| `app/index.tsx` | Portfolio list UI |
| `app/stock/[symbol].tsx` | Stock detail UI |
| `src/types/Stock.ts` | Data types |

---

## 🎯 Next Steps

1. ✅ Run the app
2. ✅ Edit `assets/portfolio.json` with your stocks
3. ✅ Test pull-to-refresh
4. ✅ Tap a stock to see details
5. ⏳ (When ready) Replace mock API with real BVB endpoint

---

**Happy coding! 🚀**
