/**
 * Currency Context
 * Manages display currency preference and exchange rates
 */

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import {
  DisplayCurrency,
  loadExchangeRates,
  getDisplayCurrency,
  saveDisplayCurrency,
  convertCurrency,
  formatCurrencySymbol,
} from '../services/currencyService';

interface ExchangeRates {
  base: string;
  date: string;
  rates: Record<string, number>;
  timestamp: number;
}

interface CurrencyContextType {
  displayCurrency: DisplayCurrency;
  setDisplayCurrency: (currency: DisplayCurrency) => Promise<void>;
  exchangeRates: ExchangeRates | null;
  refreshRates: () => Promise<void>;
  convert: (amount: number, from: string, to?: string) => number;
  formatWithSymbol: (amount: number, decimals?: number) => string;
  loading: boolean;
}

const CurrencyContext = createContext<CurrencyContextType | undefined>(undefined);

interface CurrencyProviderProps {
  children: React.ReactNode;
}

export function CurrencyProvider({ children }: CurrencyProviderProps) {
  const [displayCurrency, setDisplayCurrencyState] = useState<DisplayCurrency>('RON');
  const [exchangeRates, setExchangeRates] = useState<ExchangeRates | null>(null);
  const [loading, setLoading] = useState(true);

  // Load currency preference and exchange rates on mount
  useEffect(() => {
    const initialize = async () => {
      try {
        setLoading(true);

        // Load display currency preference
        const currency = await getDisplayCurrency();
        setDisplayCurrencyState(currency);

        // Load exchange rates
        const rates = await loadExchangeRates();
        setExchangeRates(rates);

        console.log(`💱 Currency context initialized: ${currency}`);
      } catch (error) {
        console.error('❌ Error initializing currency context:', error);
      } finally {
        setLoading(false);
      }
    };

    initialize();
  }, []);

  // Set display currency and save preference
  const setDisplayCurrency = useCallback(async (currency: DisplayCurrency) => {
    try {
      await saveDisplayCurrency(currency);
      setDisplayCurrencyState(currency);
      console.log(`💱 Display currency changed to ${currency}`);
    } catch (error) {
      console.error('❌ Error setting display currency:', error);
      throw error;
    }
  }, []);

  // Refresh exchange rates
  const refreshRates = useCallback(async () => {
    try {
      console.log('🔄 Refreshing exchange rates...');
      const rates = await loadExchangeRates();
      setExchangeRates(rates);
    } catch (error) {
      console.error('❌ Error refreshing rates:', error);
      throw error;
    }
  }, []);

  // Convert amount from one currency to display currency
  const convert = useCallback(
    (amount: number, from: string, to?: string): number => {
      if (!exchangeRates) {
        return amount;
      }

      const targetCurrency = to || displayCurrency;
      return convertCurrency(amount, from, targetCurrency, exchangeRates);
    },
    [exchangeRates, displayCurrency]
  );

  // Format amount with currency symbol
  const formatWithSymbol = useCallback(
    (amount: number, decimals: number = 2): string => {
      const formatted = amount.toFixed(decimals).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
      const symbol = formatCurrencySymbol(displayCurrency);

      // Put symbol before for USD/EUR, after for RON
      if (displayCurrency === 'RON') {
        return `${formatted} ${symbol}`;
      } else {
        return `${symbol}${formatted}`;
      }
    },
    [displayCurrency]
  );

  const value: CurrencyContextType = {
    displayCurrency,
    setDisplayCurrency,
    exchangeRates,
    refreshRates,
    convert,
    formatWithSymbol,
    loading,
  };

  return <CurrencyContext.Provider value={value}>{children}</CurrencyContext.Provider>;
}

/**
 * Hook to use currency context
 */
export function useCurrency() {
  const context = useContext(CurrencyContext);
  if (context === undefined) {
    throw new Error('useCurrency must be used within a CurrencyProvider');
  }
  return context;
}
