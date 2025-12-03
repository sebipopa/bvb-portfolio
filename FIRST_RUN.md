# 🚀 BVB Portfolio Tracker - First Run Guide

Welcome! Your complete Expo app has been generated. Here's how to see it running in 2 minutes.

---

## ⚡ Quick Start (Copy & Paste)

### Step 1: Install Dependencies (1 minute)
```bash
cd /Users/sebi/mobile/test
npm install
```

This downloads all necessary packages. You'll see lots of output—that's normal.

---

### Step 2: Start the Development Server (30 seconds)
```bash
npx expo start
```

You should see something like:
```
Opening exp://192.168.x.x:19000 on <device>
```

---

### Step 3: Open in iOS Simulator (30 seconds)
In the terminal where Expo is running, press:
```
i
```

The iOS Simulator will launch automatically and the app will appear! 🎉

---

## ✨ What You'll See

### Portfolio List Screen
When the app opens, you'll see:
- **Header**: "Portofoliul meu" (My Portfolio)
- **Summary**: Total value and total gain/loss
- **Stock List**: Three sample stocks:
  - **SNN**: 100 shares @ 45.20 RON (avg buy price)
  - **TLV**: 250 shares @ 17.35 RON (avg buy price)
  - **SNP**: 500 shares @ 0.60 RON (avg buy price)

Each stock shows:
- Current price (randomly fluctuating for demo)
- Gain/loss in green (positive) or red (negative)
- Percentage change
- Total value for your position

**Try this**: Pull down to refresh prices! ⬇️

---

### Stock Detail Screen
**Try this**: Tap on any stock (e.g., SNN)

You'll navigate to a detailed view showing:
- Number of shares
- Average buy price
- Current price
- Total value
- Gain/loss (value + percentage)
- Chart placeholder (grayed out, ready for future features)
- Last update timestamp

**Back button**: Tap "Back" to return to portfolio list

---

## 🎨 UI Overview

The app uses a clean, minimal design:

| Element | Meaning |
|---------|---------|
| 🔵 Blue border on stock cards | Neutral/watchlist |
| 🟢 Green border + text | You're making money |
| 🔴 Red border + text | You're losing money |
| 💙 Blue header | App branding |

Colors automatically update as prices move!

---

## 🛠️ Hot Reload (Magic!)

The best part about Expo: **instant updates**

Try this:
1. Keep the simulator running
2. In VS Code, open `assets/portfolio.json`
3. Change SNN shares from `100` to `150`
4. Save the file (Cmd+S)
5. Watch the app update instantly! No restart needed.

This works for almost all code changes.

---

## 📝 Making Your First Edit

### Add Your Real Stocks

**Edit this file:** `assets/portfolio.json`

Replace the contents with your actual stocks:

```json
[
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

Save → App updates instantly → See your portfolio!

---

## 🌐 Changing Language (English)

The app defaults to Romanian. To see English:

1. Open: `src/i18n/index.ts`
2. Find line 16: `const DEFAULT_LANGUAGE: LanguageKey = 'ro';`
3. Change `'ro'` to `'en'`
4. Save → App updates to English!

---

## 🧪 Testing Different Scenarios

### Test Positive Gains
Edit `src/services/bvbApi.ts` line 25:

Change this (mock prices):
```typescript
const MOCK_PRICES: Record<string, number> = {
  SNN: 48.5,  // Lower than 45.20 avg buy
  TLV: 18.2,
  SNP: 0.72,
};
```

To higher prices (e.g., `SNN: 60.0`) → Green gains! 🟢

### Test Negative Losses
Set prices lower than average buy price → Red losses! 🔴

---

## 🚨 If Something Goes Wrong

### App won't start
```bash
# Stop the server (Ctrl+C)
# Then:
rm -rf node_modules
npm install
npx expo start -c  # -c clears cache
```

### Prices not updating
1. Check terminal for red error messages
2. Try pull-to-refresh in app
3. Restart dev server (Ctrl+C, then npx expo start)

### Navigation not working
- Make sure stock symbol in portfolio.json is uppercase
- Tap the stock item (not the text, the whole card)

---

## 📚 Next Steps

### Want to customize?
→ Read `QUICK_REFERENCE.md` for copy-paste snippets

### Want to understand architecture?
→ Read `ARCHITECTURE.md` for full explanation

### Want development tips?
→ Read `DEVELOPMENT.md` for workflows

---

## 🎓 What's Happening Behind the Scenes

1. **App starts**
   - `app/_layout.tsx` wraps everything with PortfolioProvider

2. **PortfolioProvider initializes**
   - Reads `assets/portfolio.json`
   - Fetches prices via `src/services/bvbApi.ts`
   - Calculates metrics (gain/loss, %)
   - Stores in React Context

3. **Screens render**
   - Use `usePortfolio()` hook to access data
   - Portfolio list shows all stocks
   - Tap stock → Navigate to detail

4. **User refreshes**
   - Pull-to-refresh calls `refresh()` function
   - Re-fetches prices and recalculates

**All this without Redux or complex state management!** ✨

---

## 💡 Pro Tips

### Tip 1: Understand Colors
- 🟢 Green = Your money is growing
- 🔴 Red = Your money is shrinking
- 📊 Numbers = How much and what %

### Tip 2: Edit Portfolio.json Without App Restart
```json
// ✅ Change this (hot reloads)
{
  "symbol": "SNN",
  "shares": 100,  // ← Change to 150
  "avgBuyPrice": 45.20
}
```

### Tip 3: Multiple Languages
The app is ready for:
- Romanian ✅
- English ✅
- Add French, German, Spanish, etc. (just follow the pattern)

---

## ❓ Common Questions

**Q: Why are prices random?**
A: The app uses mock data for now. This lets you test the UI without needing a real API. Replace `MOCK_PRICES` in `src/services/bvbApi.ts` when ready.

**Q: Can I run on Android?**
A: The base setup is iOS-only. To support Android:
1. Add platform-specific styles
2. Test on Android emulator
3. Handle differences in navigation

**Q: How do I deploy to App Store?**
A: See the "Production Checklist" in `QUICK_REFERENCE.md`

**Q: Can I save data persistently?**
A: Yes! Add AsyncStorage or expo-file-system (marked as TODO in code).

---

## 🎯 Your First Hour Plan

1. ✅ Run the app (10 min)
2. ✅ Edit portfolio.json with your stocks (5 min)
3. ✅ Try changing language to English (2 min)
4. ✅ Explore both screens (5 min)
5. ✅ Read QUICK_REFERENCE.md (10 min)
6. ✅ Try making a small code change (10 min)
7. ✅ Read ARCHITECTURE.md for understanding (15 min)

---

## 📞 Files You'll Need

| When You Want To... | Edit This File |
|---|---|
| Add/remove stocks | `assets/portfolio.json` |
| Change language | `src/i18n/index.ts` |
| Change colors | `app/index.tsx` or `app/stock/[symbol].tsx` |
| Customize texts | `src/i18n/ro.json` or `src/i18n/en.json` |
| Replace mock API | `src/services/bvbApi.ts` |
| Add new calculations | `src/context/PortfolioContext.tsx` |

---

## 🎉 You're All Set!

The hardest part is done—your app is fully scaffolded, typed, and ready to customize.

**Now:**
```bash
cd /Users/sebi/mobile/test
npm install
npx expo start
# Press 'i' for iOS Simulator
```

**See your portfolio in action!** 🚀

---

## 🆘 Get Help

1. Check console logs in terminal
2. Read the docs in this folder
3. Inspect the code—it's well-commented
4. Check `DEVELOPMENT.md` for troubleshooting

---

**Happy building! 💻✨**

---

*Once you're comfortable, check out `ARCHITECTURE.md` to understand the full design—it's actually quite elegant!*
