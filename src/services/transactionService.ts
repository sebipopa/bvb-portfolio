/**
 * Transaction Service
 * Handles loading, saving, and managing transactions using AsyncStorage
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { Transaction } from '../types/Stock';
import portfolio from '../../assets/portfolio.json';

const TRANSACTIONS_KEY = '@portfolio_transactions';

/**
 * Generate a simple UUID for transaction IDs
 */
function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Load all transactions from AsyncStorage
 */
export async function loadTransactions(): Promise<Transaction[]> {
  try {
    const stored = await AsyncStorage.getItem(TRANSACTIONS_KEY);
    if (stored) {
      const transactions = JSON.parse(stored);
      console.log(`📥 Loaded ${transactions.length} transactions from storage`);
      return transactions;
    }

    // First time - migrate from portfolio.json
    console.log('🔄 First load - migrating from portfolio.json');
    const initialTransactions = migrateFromPortfolio();
    await saveTransactions(initialTransactions);
    return initialTransactions;
  } catch (error) {
    console.error('❌ Error loading transactions:', error);
    return [];
  }
}

/**
 * Save transactions to AsyncStorage
 */
export async function saveTransactions(transactions: Transaction[]): Promise<void> {
  try {
    await AsyncStorage.setItem(TRANSACTIONS_KEY, JSON.stringify(transactions));
    console.log(`💾 Saved ${transactions.length} transactions to storage`);
  } catch (error) {
    console.error('❌ Error saving transactions:', error);
    throw error;
  }
}

/**
 * Add a new transaction
 */
export async function addTransaction(
  symbol: string,
  type: 'BUY' | 'SELL',
  quantity: number,
  price: number,
  notes?: string
): Promise<Transaction> {
  const transaction: Transaction = {
    id: generateId(),
    symbol: symbol.toUpperCase(),
    type,
    quantity,
    price,
    date: Date.now(),
    notes,
  };

  console.log(`➕ Adding transaction: ${type} ${quantity} ${symbol.toUpperCase()} @ ${price} RON`);
  const transactions = await loadTransactions();
  transactions.push(transaction);
  await saveTransactions(transactions);

  return transaction;
}

/**
 * Delete a transaction
 */
export async function deleteTransaction(transactionId: string): Promise<void> {
  const transactions = await loadTransactions();
  const toDelete = transactions.find((t) => t.id === transactionId);
  const filtered = transactions.filter((t) => t.id !== transactionId);

  if (toDelete) {
    console.log(`🗑️ Deleting transaction: ${toDelete.type} ${toDelete.quantity} ${toDelete.symbol}`);
  }
  await saveTransactions(filtered);
}

/**
 * Delete all transactions for a specific stock symbol
 */
export async function deleteAllTransactionsBySymbol(symbol: string): Promise<void> {
  const transactions = await loadTransactions();
  const symbolUpper = symbol.toUpperCase();
  const toDelete = transactions.filter((t) => t.symbol === symbolUpper);
  const filtered = transactions.filter((t) => t.symbol !== symbolUpper);

  console.log(`🗑️ Deleting ${toDelete.length} transactions for ${symbolUpper}`);
  await saveTransactions(filtered);
}

/**
 * Get all transactions for a specific symbol
 */
export async function getTransactionsBySymbol(symbol: string): Promise<Transaction[]> {
  const transactions = await loadTransactions();
  return transactions.filter((t) => t.symbol === symbol.toUpperCase());
}

/**
 * Migrate from portfolio.json to transactions
 * Creates BUY transactions from existing portfolio
 */
export function migrateFromPortfolio(): Transaction[] {
  const now = Date.now();
  return portfolio.map((item, index) => ({
    id: generateId(),
    symbol: item.symbol.toUpperCase(),
    type: 'BUY' as const,
    quantity: item.shares,
    price: item.avgBuyPrice,
    date: now,
    notes: 'Migrated from portfolio',
  }));
}

/**
 * Clear all transactions (for development/testing)
 */
export async function clearAllTransactions(): Promise<void> {
  try {
    await AsyncStorage.removeItem(TRANSACTIONS_KEY);
  } catch (error) {
    console.error('Error clearing transactions:', error);
    throw error;
  }
}

/**
 * Calculate portfolio metrics from transactions
 */
export function calculateMetricsFromTransactions(
  transactions: Transaction[],
  currentPrice: number
) {
  let totalShares = 0;
  let totalInvested = 0;

  for (const tx of transactions) {
    if (tx.type === 'BUY') {
      totalShares += tx.quantity;
      totalInvested += tx.quantity * tx.price;
    } else if (tx.type === 'SELL') {
      totalShares -= tx.quantity;
    }
  }

  const avgBuyPrice = totalShares > 0 ? totalInvested / totalShares : 0;
  const totalValue = totalShares * currentPrice;
  const gainLossValue = totalValue - totalInvested;
  const gainLossPercentage = totalInvested > 0 ? (gainLossValue / totalInvested) * 100 : 0;

  return {
    totalShares,
    avgBuyPrice,
    totalInvested,
    totalValue,
    gainLossValue,
    gainLossPercentage,
  };
}
