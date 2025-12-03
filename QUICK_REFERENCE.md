# BVB Portfolio Tracker - Quick Reference Card

## 🚀 Quick Start Commands

```bash
# Install & Run
npm install
npx expo start

# Development
npm run type-check    # Check TypeScript (if available)
npm run lint          # Run ESLint (if available)

# iOS Build
npx eas build --platform ios
```

---

## 📱 App Structure at a Glance

```
Portfolio List (index.tsx)
    ↓ (tap stock)
Stock Detail (stock/[symbol].tsx)
    ↓ (back)
Portfolio List
```

---

## 🎯 Key Hooks & Functions

### usePortfolio()
```typescript
import { usePortfolio } from '@/src/hooks/usePortfolio';

const { stocks, summary, loading, error, refresh } = usePortfolio();
```

**Properties:**
- `stocks[]` - Array of StockMetrics
- `summary` - PortfolioSummary (totals)
- `loading` - Boolean
- `error` - Error message or null
- `refresh()` - Async function to reload data

### t() - Translations
```typescript
import { t } from '@/src/i18n';

t('portfolio.title')           // Romanian (default)
t('portfolio.title', 'en')     // English
```

---

## 📊 Data Types Quick Reference

### PortfolioItem (from JSON)
```typescript
{
  symbol: string      // "SNN"
  shares: number      // 100
  avgBuyPrice: number // 45.20
}
```

### StockMetrics (computed)
```typescript
{
  // All PortfolioItem fields +
  currentPrice: number
  totalValue: number              // shares × currentPrice
  gainLossValue: number           // totalValue - invested
  gainLossPercentage: number      // (gainLoss / invested) × 100
  lastUpdate: number              // timestamp
}
```

### PortfolioSummary (aggregated)
```typescript
{
  totalValue: number
  totalInvested: number
  totalGainLoss: number
  totalGainLossPercentage: number
}
```

---

## 🛠️ Common Edits

### Update Your Portfolio
**File:** `assets/portfolio.json`

```json
[
  { "symbol": "SNN", "shares": 100, "avgBuyPrice": 45.20 },
  { "symbol": "TLV", "shares": 250, "avgBuyPrice": 17.35 }
]
```

### Add a Translation
**File:** `src/i18n/ro.json`

```json
{
  "myFeature": {
    "title": "Titlul meu",
    "description": "Descriere"
  }
}
```

**Use:** `t('myFeature.title')`

### Change App Title/Icon
**File:** `app.json`

```json
{
  "expo": {
    "name": "My Portfolio",
    "slug": "my-portfolio",
    "icon": "./assets/icon.png"
  }
}
```

### Update Mock Prices
**File:** `src/services/bvbApi.ts`

```typescript
const MOCK_PRICES: Record<string, number> = {
  SNN: 50.0,  // Update these
  TLV: 19.0,
  SNP: 0.75,
};
```

---

## 🎨 Color System

| Color | Usage | Code |
|-------|-------|------|
| 🔵 Blue | Primary | `#2196f3` |
| 🟢 Green | Gains | `#4caf50` |
| 🔴 Red | Losses | `#f44336` |
| ⚪ White | Surfaces | `#fff` |
| ⚫ Gray | Background | `#f8f8f8` |

---

## 🔄 State Management Flow

```
1. Component calls usePortfolio()
        ↓
2. Hook gets PortfolioContext
        ↓
3. Context loads portfolio.json
        ↓
4. Context fetches BVB prices
        ↓
5. Context calculates metrics
        ↓
6. Component receives stocks, summary, etc.
        ↓
7. Component renders UI
        ↓
8. User pulls-to-refresh → call refresh() → repeat
```

---

## 🧭 Navigation Quick Map

| Screen | File | Route | Params |
|--------|------|-------|--------|
| Portfolio | `app/index.tsx` | `/` | none |
| Stock Detail | `app/stock/[symbol].tsx` | `/stock/SNN` | `symbol` |

---

## 📂 File Purposes at a Glance

| File | Purpose |
|------|---------|
| `app/_layout.tsx` | Root navigator + PortfolioProvider wrapper |
| `app/index.tsx` | Portfolio list UI |
| `app/stock/[symbol].tsx` | Stock detail UI |
| `src/types/Stock.ts` | All TypeScript interfaces |
| `src/services/bvbApi.ts` | Fetch prices from BVB |
| `src/context/PortfolioContext.tsx` | Global state + calculations |
| `src/hooks/usePortfolio.ts` | Access portfolio state |
| `src/i18n/index.ts` | Translation setup |
| `src/i18n/ro.json` | Romanian strings |
| `src/i18n/en.json` | English strings |
| `assets/portfolio.json` | Your stocks data |

---

## 🐛 Troubleshooting

### App won't start
```bash
rm -rf node_modules && npm install
npx expo start --dev-client -c
```

### Prices not loading
1. Check console for errors
2. Verify mock prices in `bvbApi.ts`
3. Try pull-to-refresh

### Can't navigate to stock detail
- Ensure stock symbol matches exactly
- Check route file: `app/stock/[symbol].tsx`
- Use `useRouter()` and `useLocalSearchParams()` correctly

### TypeScript errors
- Run type check: `npm run type-check`
- Ensure all imports use absolute paths: `@/src/...`
- Check `tsconfig.json` paths configuration

---

## 📊 Calculations Cheat Sheet

```typescript
// Per-stock
invested = shares × avgBuyPrice
totalValue = shares × currentPrice
gainLoss = totalValue - invested
gainLossPercent = (gainLoss / invested) × 100

// Entire portfolio
totalValue = sum(all stocks' totalValue)
totalInvested = sum(all stocks' invested)
totalGainLoss = totalValue - totalInvested
totalGainLossPercent = (totalGainLoss / totalInvested) × 100
```

---

## 🎓 Example: Adding a Feature

### Add "Refresh Last Updated" field

1. **Update type** (`src/types/Stock.ts`)
   - Add `lastRefreshTime: number`

2. **Update context** (`src/context/PortfolioContext.tsx`)
   - Store `lastRefreshTime` in state

3. **Update screen** (`app/index.tsx`)
   - Display `lastRefreshTime` in header

4. **Update translation** (`src/i18n/ro.json`, `en.json`)
   - Add `"lastUpdated": "Ultima actualizare"`

5. **Use in component**
   - `<Text>{t('portfolio.lastUpdated')}: {formatTime(stocks.lastRefreshTime)}</Text>`

---

## 🚀 Production Checklist

- [ ] Replace mock BVB prices with real API
- [ ] Add error handling for API failures
- [ ] Test all translations
- [ ] Update app icon in `app.json`
- [ ] Test on real iOS device
- [ ] Add App Store privacy policy
- [ ] Configure app signing
- [ ] Run `npx eas build --platform ios`
- [ ] Submit to App Store

---

## 📚 Useful Links

- [Expo Router Docs](https://docs.expo.dev/router/introduction/)
- [React Native Components](https://reactnative.dev/docs/components-and-apis)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)
- [BVB Website](https://www.bvb.ro/)

---

**Build something awesome! 🚀**
