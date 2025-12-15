/**
 * Mock Data Service
 * Utilities to add mock transactions for demo purposes
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { Transaction } from '../types/Stock';

const TRANSACTIONS_KEY = '@portfolio_transactions';

// Mock transactions data - Multi-exchange stocks
const mockTransactionsData: Omit<Transaction, 'id'>[] = [
  // TLV.BVB - Banca Transilvania (multiple buys)
  {
    symbol: 'TLV.BVB',
    type: 'BUY',
    quantity: 300,
    price: 16.50,
    date: new Date('2024-01-15').getTime(),
    notes: 'Initial investment',
  },
  {
    symbol: 'TLV.BVB',
    type: 'BUY',
    quantity: 200,
    price: 17.20,
    date: new Date('2024-03-10').getTime(),
    notes: 'Adding to position',
  },
  {
    symbol: 'TLV.BVB',
    type: 'BUY',
    quantity: 93,
    price: 18.00,
    date: new Date('2024-06-05').getTime(),
  },

  // SNN.BVB - Nuclearelectrica
  {
    symbol: 'SNN.BVB',
    type: 'BUY',
    quantity: 250,
    price: 42.00,
    date: new Date('2024-02-01').getTime(),
    notes: 'Energy sector play',
  },
  {
    symbol: 'SNN.BVB',
    type: 'BUY',
    quantity: 75,
    price: 46.50,
    date: new Date('2024-05-15').getTime(),
  },

  // SNP.BVB - OMV Petrom
  {
    symbol: 'SNP.BVB',
    type: 'BUY',
    quantity: 10000,
    price: 0.55,
    date: new Date('2023-11-20').getTime(),
    notes: 'Large cap dividend play',
  },
  {
    symbol: 'SNP.BVB',
    type: 'BUY',
    quantity: 8000,
    price: 0.58,
    date: new Date('2024-01-25').getTime(),
  },
  {
    symbol: 'SNP.BVB',
    type: 'BUY',
    quantity: 3555,
    price: 0.62,
    date: new Date('2024-04-10').getTime(),
  },
  // Sell some SNP
  {
    symbol: 'SNP.BVB',
    type: 'SELL',
    quantity: 2000,
    price: 0.65,
    date: new Date('2024-08-10').getTime(),
    notes: 'Taking profits',
  },

  // SNG.BVB - Romgaz
  {
    symbol: 'SNG.BVB',
    type: 'BUY',
    quantity: 1500,
    price: 4.85,
    date: new Date('2024-02-14').getTime(),
    notes: 'Natural gas exposure',
  },
  {
    symbol: 'SNG.BVB',
    type: 'BUY',
    quantity: 650,
    price: 5.15,
    date: new Date('2024-05-20').getTime(),
  },

  // H2O.BVB - Societatea Energetica Electrica
  {
    symbol: 'H2O.BVB',
    type: 'BUY',
    quantity: 80,
    price: 118.00,
    date: new Date('2024-03-05').getTime(),
    notes: 'Utility sector',
  },
  {
    symbol: 'H2O.BVB',
    type: 'BUY',
    quantity: 29,
    price: 128.50,
    date: new Date('2024-07-01').getTime(),
  },

  // FP.BVB - Fondul Proprietatea
  {
    symbol: 'FP.BVB',
    type: 'BUY',
    quantity: 5000,
    price: 1.85,
    date: new Date('2024-02-20').getTime(),
    notes: 'Diversified holdings',
  },

  // CSPX.L - iShares Core S&P 500 UCITS ETF (London)
  {
    symbol: 'CSPX.L',
    type: 'BUY',
    quantity: 10,
    price: 485.50,
    date: new Date('2024-01-20').getTime(),
    notes: 'US market exposure',
  },
  {
    symbol: 'CSPX.L',
    type: 'BUY',
    quantity: 8,
    price: 512.30,
    date: new Date('2024-04-15').getTime(),
  },

  // VWRA.L - Vanguard FTSE All-World UCITS ETF (London)
  // Note: VWCE is the Xetra symbol, VWRA is the LSE symbol
  {
    symbol: 'VWRA.L',
    type: 'BUY',
    quantity: 15,
    price: 98.75,
    date: new Date('2024-02-10').getTime(),
    notes: 'Global diversification',
  },
  {
    symbol: 'VWRA.L',
    type: 'BUY',
    quantity: 12,
    price: 105.20,
    date: new Date('2024-06-01').getTime(),
  },

  // VUSA.L - Vanguard S&P 500 UCITS ETF (London)
  {
    symbol: 'VUSA.L',
    type: 'BUY',
    quantity: 25,
    price: 78.40,
    date: new Date('2024-03-01').getTime(),
    notes: 'S&P 500 tracker',
  },

  // BTC.CRYPTO - Bitcoin (Cryptocurrency)
  {
    symbol: 'BTC.CRYPTO',
    type: 'BUY',
    quantity: 0.15,
    price: 42000.00,
    date: new Date('2024-01-10').getTime(),
    notes: 'First Bitcoin purchase',
  },
  {
    symbol: 'BTC.CRYPTO',
    type: 'BUY',
    quantity: 0.08,
    price: 58000.00,
    date: new Date('2024-03-15').getTime(),
    notes: 'DCA into BTC',
  },
  {
    symbol: 'BTC.CRYPTO',
    type: 'BUY',
    quantity: 0.12,
    price: 67000.00,
    date: new Date('2024-06-20').getTime(),
  },

  // ADA.CRYPTO - Cardano (Cryptocurrency)
  {
    symbol: 'ADA.CRYPTO',
    type: 'BUY',
    quantity: 5000,
    price: 0.48,
    date: new Date('2024-02-05').getTime(),
    notes: 'Cardano accumulation',
  },
  {
    symbol: 'ADA.CRYPTO',
    type: 'BUY',
    quantity: 3000,
    price: 0.52,
    date: new Date('2024-04-12').getTime(),
  },
  {
    symbol: 'ADA.CRYPTO',
    type: 'BUY',
    quantity: 2000,
    price: 0.61,
    date: new Date('2024-07-08').getTime(),
  },
];

/**
 * Add mock transactions to AsyncStorage
 * This will merge with existing transactions
 */
export async function addMockTransactions(): Promise<number> {
  try {
    // Generate transactions with unique IDs
    const transactionsWithIds: Transaction[] = mockTransactionsData.map((tx, index) => ({
      ...tx,
      id: `mock-${Date.now()}-${index}-${Math.random().toString(36).substr(2, 9)}`,
    }));

    // Load existing transactions (if any)
    const existing = await AsyncStorage.getItem(TRANSACTIONS_KEY);
    const existingTransactions: Transaction[] = existing ? JSON.parse(existing) : [];

    // Merge with mock transactions
    const allTransactions = [...existingTransactions, ...transactionsWithIds];

    // Save to AsyncStorage
    await AsyncStorage.setItem(TRANSACTIONS_KEY, JSON.stringify(allTransactions));

    console.log(`✅ Successfully added ${transactionsWithIds.length} mock transactions!`);
    return transactionsWithIds.length;
  } catch (error) {
    console.error('❌ Error adding mock transactions:', error);
    throw error;
  }
}

/**
 * Clear all transactions from AsyncStorage
 */
export async function clearAllTransactions(): Promise<void> {
  try {
    await AsyncStorage.removeItem(TRANSACTIONS_KEY);
    console.log('✅ All transactions cleared');
  } catch (error) {
    console.error('❌ Error clearing transactions:', error);
    throw error;
  }
}

/**
 * Get transaction count
 */
export async function getTransactionCount(): Promise<number> {
  try {
    const existing = await AsyncStorage.getItem(TRANSACTIONS_KEY);
    const transactions: Transaction[] = existing ? JSON.parse(existing) : [];
    return transactions.length;
  } catch (error) {
    console.error('❌ Error getting transaction count:', error);
    return 0;
  }
}
