# Transaction System Setup

## Installation Required

The transaction system uses AsyncStorage for persistence. Install with:

```bash
npx expo install @react-native-async-storage/async-storage
```

## What's New

### Phase 1: Transaction Service (`src/services/transactionService.ts`)
- Load/save transactions from AsyncStorage
- Migrate existing portfolio.json to transactions on first run
- Add, delete, and query transactions
- Calculate portfolio metrics from transactions

### Phase 2: Updated PortfolioContext
- Loads transactions instead of static portfolio.json
- Calculates all metrics from transaction history
- Exposes methods to add/delete transactions
- Automatically refreshes when transactions change

### Phase 3: Transaction History Screen (`app/transactions/[symbol].tsx`)
- View all buy/sell transactions for a stock
- Shows quantity, price, date, and total value
- Delete transactions with confirmation
- Sorted by most recent first

## First Run Behavior

On first run, the app will:
1. Check AsyncStorage for existing transactions
2. If none found, migrate from portfolio.json
3. Create BUY transactions for all current holdings
4. Use current timestamp for migration

## Data Structure

Each transaction includes:
- `id`: Unique identifier
- `symbol`: Stock ticker (uppercase)
- `type`: 'BUY' or 'SELL'
- `quantity`: Number of shares
- `price`: Price per share
- `date`: Timestamp in milliseconds
- `notes`: Optional description

## Portfolio Calculations

Portfolio metrics are now calculated from transactions:
- Total shares = sum of BUY quantities - sum of SELL quantities
- Average buy price = total invested / total shares
- Total value = total shares * current price
- Gain/loss = total value - total invested

## To Access Transaction History

Navigate to: `/transactions/{symbol}`
Or add a button to the stock detail screen to view transactions.
