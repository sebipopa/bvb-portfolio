/**
 * Domain types for the portfolio tracker
 * Represents the structure of stocks and portfolio data
 */

import { ExchangeCode } from '../services/exchangeService';

/** Transaction record (buy or sell) */
export interface Transaction {
  id: string; // UUID for unique identification
  symbol: string; // Full symbol with exchange (e.g., "SNG.BVB", "CSPX.L")
  type: 'BUY' | 'SELL';
  quantity: number; // Number of shares
  price: number; // Price per share in the exchange's currency
  date: number; // Timestamp in milliseconds
  notes?: string; // Optional notes
}

/** Portfolio item read from local JSON file */
export interface PortfolioItem {
  symbol: string; // Full symbol with exchange (e.g., "SNG.BVB")
  shares: number;
  avgBuyPrice: number;
}

/** Live market data from exchange API */
export interface StockMarketData {
  symbol: string; // Full symbol with exchange (e.g., "SNG.BVB")
  currentPrice: number;
  currency: string; // Currency code (RON, GBP, etc.)
  lastUpdate: number; // Timestamp in milliseconds
}

/** Computed portfolio metrics for a single stock */
export interface StockMetrics extends PortfolioItem, StockMarketData {
  totalValue: number; // shares × currentPrice
  gainLossValue: number; // totalValue - (shares × avgBuyPrice)
  gainLossPercentage: number; // (gainLossValue / (shares × avgBuyPrice)) × 100
}

/** Overall portfolio summary */
export interface PortfolioSummary {
  totalValue: number;
  totalInvested: number;
  totalGainLoss: number;
  totalGainLossPercentage: number;
}

/** Language key type for i18n */
export type LanguageKey = 'ro' | 'en';
