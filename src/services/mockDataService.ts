/**
 * Mock Data Service
 * Utilities to add mock transactions for demo purposes
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { Transaction } from '../types/Stock';

const TRANSACTIONS_KEY = '@portfolio_transactions';

// Mock transactions data - BVB stocks
const mockTransactionsData: Omit<Transaction, 'id'>[] = [
  // TLV - Banca Transilvania (multiple buys)
  {
    symbol: 'TLV',
    type: 'BUY',
    quantity: 300,
    price: 16.50,
    date: new Date('2024-01-15').getTime(),
    notes: 'Initial investment',
  },
  {
    symbol: 'TLV',
    type: 'BUY',
    quantity: 200,
    price: 17.20,
    date: new Date('2024-03-10').getTime(),
    notes: 'Adding to position',
  },
  {
    symbol: 'TLV',
    type: 'BUY',
    quantity: 93,
    price: 18.00,
    date: new Date('2024-06-05').getTime(),
  },

  // SNN - Nuclearelectrica
  {
    symbol: 'SNN',
    type: 'BUY',
    quantity: 250,
    price: 42.00,
    date: new Date('2024-02-01').getTime(),
    notes: 'Energy sector play',
  },
  {
    symbol: 'SNN',
    type: 'BUY',
    quantity: 75,
    price: 46.50,
    date: new Date('2024-05-15').getTime(),
  },

  // SNP - OMV Petrom
  {
    symbol: 'SNP',
    type: 'BUY',
    quantity: 10000,
    price: 0.55,
    date: new Date('2023-11-20').getTime(),
    notes: 'Large cap dividend play',
  },
  {
    symbol: 'SNP',
    type: 'BUY',
    quantity: 8000,
    price: 0.58,
    date: new Date('2024-01-25').getTime(),
  },
  {
    symbol: 'SNP',
    type: 'BUY',
    quantity: 3555,
    price: 0.62,
    date: new Date('2024-04-10').getTime(),
  },
  // Sell some SNP
  {
    symbol: 'SNP',
    type: 'SELL',
    quantity: 2000,
    price: 0.65,
    date: new Date('2024-08-10').getTime(),
    notes: 'Taking profits',
  },

  // SNG - Romgaz
  {
    symbol: 'SNG',
    type: 'BUY',
    quantity: 1500,
    price: 4.85,
    date: new Date('2024-02-14').getTime(),
    notes: 'Natural gas exposure',
  },
  {
    symbol: 'SNG',
    type: 'BUY',
    quantity: 650,
    price: 5.15,
    date: new Date('2024-05-20').getTime(),
  },

  // H2O - Societatea Energetica Electrica
  {
    symbol: 'H2O',
    type: 'BUY',
    quantity: 80,
    price: 118.00,
    date: new Date('2024-03-05').getTime(),
    notes: 'Utility sector',
  },
  {
    symbol: 'H2O',
    type: 'BUY',
    quantity: 29,
    price: 128.50,
    date: new Date('2024-07-01').getTime(),
  },

  // BVB - Bursa de Valori București
  {
    symbol: 'BVB',
    type: 'BUY',
    quantity: 150,
    price: 42.50,
    date: new Date('2024-01-10').getTime(),
    notes: 'Financial sector',
  },

  // TVBETETF - BET-TR-AD ETF
  {
    symbol: 'TVBETETF',
    type: 'BUY',
    quantity: 2000,
    price: 25.80,
    date: new Date('2023-12-15').getTime(),
    notes: 'BET index exposure',
  },
  {
    symbol: 'TVBETETF',
    type: 'BUY',
    quantity: 1541,
    price: 27.50,
    date: new Date('2024-04-20').getTime(),
  },

  // FP - Fondul Proprietatea
  {
    symbol: 'FP',
    type: 'BUY',
    quantity: 5000,
    price: 1.85,
    date: new Date('2024-02-20').getTime(),
    notes: 'Diversified holdings',
  },

  // M - MedLife
  {
    symbol: 'M',
    type: 'BUY',
    quantity: 400,
    price: 8.50,
    date: new Date('2024-03-15').getTime(),
    notes: 'Healthcare sector',
  },

  // SMTL - Samedan Oil & Gas
  {
    symbol: 'SMTL',
    type: 'BUY',
    quantity: 40,
    price: 57.06,
    date: new Date('2024-05-01').getTime(),
    notes: 'Oil & gas sector',
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
