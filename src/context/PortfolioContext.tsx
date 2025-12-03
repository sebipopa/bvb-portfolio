/**
 * Portfolio Context
 * Manages global state for portfolio data and metrics
 *
 * ARCHITECTURE:
 * - React Context API for lightweight state management
 * - Loads transactions from AsyncStorage
 * - Fetches live prices from BVB API
 * - Computes all portfolio metrics from transactions
 * - Exposes via usePortfolio() hook
 */

import React, { createContext, useEffect, useState, useCallback } from 'react';
import { PortfolioItem, StockMetrics, PortfolioSummary, Transaction } from '../types/Stock';
import { getBvbPrices } from '../services/bvbApi';
import {
  loadTransactions,
  addTransaction as serviceAddTransaction,
  deleteTransaction as serviceDeleteTransaction,
  deleteAllTransactionsBySymbol as serviceDeleteAllTransactionsBySymbol,
  calculateMetricsFromTransactions,
} from '../services/transactionService';

interface PortfolioContextType {
  stocks: StockMetrics[];
  summary: PortfolioSummary | null;
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  addTransaction: (
    symbol: string,
    type: 'BUY' | 'SELL',
    quantity: number,
    price: number,
    notes?: string
  ) => Promise<void>;
  deleteTransaction: (transactionId: string) => Promise<void>;
  deleteStock: (symbol: string) => Promise<void>;
  getTransactionsBySymbol: (symbol: string) => Transaction[];
}

export const PortfolioContext = createContext<PortfolioContextType | undefined>(undefined);

interface PortfolioProviderProps {
  children: React.ReactNode;
}

/**
 * Calculate portfolio metrics for a single stock from transactions
 */
function calculateStockMetrics(
  symbol: string,
  transactions: Transaction[],
  currentPrice: number
): StockMetrics {
  const metrics = calculateMetricsFromTransactions(transactions, currentPrice);

  return {
    symbol,
    shares: metrics.totalShares,
    avgBuyPrice: metrics.avgBuyPrice,
    currentPrice,
    totalValue: metrics.totalValue,
    gainLossValue: metrics.gainLossValue,
    gainLossPercentage: metrics.gainLossPercentage,
    lastUpdate: Date.now(),
  };
}

/**
 * Calculate overall portfolio summary
 */
function calculatePortfolioSummary(stocks: StockMetrics[]): PortfolioSummary {
  const totalValue = stocks.reduce((sum, stock) => sum + stock.totalValue, 0);
  const totalInvested = stocks.reduce((sum, stock) => sum + stock.shares * stock.avgBuyPrice, 0);
  const totalGainLoss = totalValue - totalInvested;
  const totalGainLossPercentage = totalInvested > 0 ? (totalGainLoss / totalInvested) * 100 : 0;

  return {
    totalValue,
    totalInvested,
    totalGainLoss,
    totalGainLossPercentage,
  };
}

export function PortfolioProvider({ children }: PortfolioProviderProps) {
  const [stocks, setStocks] = useState<StockMetrics[]>([]);
  const [summary, setSummary] = useState<PortfolioSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);

  /**
   * Fetch portfolio data and prices
   */
  const refreshPortfolio = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      // Load all transactions
      const allTransactions = await loadTransactions();
      console.log(`📊 Loaded ${allTransactions.length} transactions`);
      setTransactions(allTransactions);

      if (allTransactions.length === 0) {
        console.log('⚠️ No transactions found');
        setStocks([]);
        setSummary(null);
        return;
      }

      // Group transactions by symbol
      const transactionsBySymbol = new Map<string, Transaction[]>();
      for (const tx of allTransactions) {
        if (!transactionsBySymbol.has(tx.symbol)) {
          transactionsBySymbol.set(tx.symbol, []);
        }
        transactionsBySymbol.get(tx.symbol)!.push(tx);
      }

      // Fetch current prices from BVB
      const symbols = Array.from(transactionsBySymbol.keys());
      console.log(`🔍 Fetching prices for ${symbols.length} symbols:`, symbols.join(', '));
      const priceData = await getBvbPrices(symbols);
      console.log(`💰 Received ${priceData.length} prices`);

      // Create price map for easy lookup
      const priceMap = Object.fromEntries(priceData.map((pd) => [pd.symbol, pd.currentPrice]));

      // Calculate metrics for each stock
      const metricsArray = symbols
        .map((symbol) =>
          calculateStockMetrics(
            symbol,
            transactionsBySymbol.get(symbol)!,
            priceMap[symbol] || 0
          )
        )
        .filter((stock) => stock.shares > 0); // Only include stocks with positive shares

      console.log(`✅ Portfolio has ${metricsArray.length} stocks with positive shares`);
      setStocks(metricsArray);

      // Calculate and set portfolio summary
      const portfolioSummary = calculatePortfolioSummary(metricsArray);
      setSummary(portfolioSummary);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      setError(message);
      console.error('Portfolio refresh error:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  // Load portfolio on component mount
  useEffect(() => {
    refreshPortfolio();
  }, [refreshPortfolio]);

  /**
   * Add a transaction and refresh portfolio
   */
  const handleAddTransaction = useCallback(
    async (
      symbol: string,
      type: 'BUY' | 'SELL',
      quantity: number,
      price: number,
      notes?: string
    ) => {
      try {
        await serviceAddTransaction(symbol, type, quantity, price, notes);
        await refreshPortfolio();
      } catch (err) {
        console.error('Error adding transaction:', err);
        throw err;
      }
    },
    [refreshPortfolio]
  );

  /**
   * Delete a transaction and refresh portfolio
   */
  const handleDeleteTransaction = useCallback(
    async (transactionId: string) => {
      try {
        await serviceDeleteTransaction(transactionId);
        await refreshPortfolio();
      } catch (err) {
        console.error('Error deleting transaction:', err);
        throw err;
      }
    },
    [refreshPortfolio]
  );

  /**
   * Delete all transactions for a stock (removes the stock from portfolio)
   */
  const handleDeleteStock = useCallback(
    async (symbol: string) => {
      try {
        await serviceDeleteAllTransactionsBySymbol(symbol);
        await refreshPortfolio();
      } catch (err) {
        console.error('Error deleting stock:', err);
        throw err;
      }
    },
    [refreshPortfolio]
  );

  /**
   * Get transactions for a specific symbol
   */
  const getTransactionsBySymbol = useCallback(
    (symbol: string) => {
      return transactions.filter((t) => t.symbol === symbol.toUpperCase());
    },
    [transactions]
  );

  const value: PortfolioContextType = {
    stocks,
    summary,
    loading,
    error,
    refresh: refreshPortfolio,
    addTransaction: handleAddTransaction,
    deleteTransaction: handleDeleteTransaction,
    deleteStock: handleDeleteStock,
    getTransactionsBySymbol,
  };

  return (
    <PortfolioContext.Provider value={value}>
      {children}
    </PortfolioContext.Provider>
  );
}
