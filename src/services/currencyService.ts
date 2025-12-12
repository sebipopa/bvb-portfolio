/**
 * Currency Service
 * Handles currency conversion and exchange rate fetching
 *
 * Uses frankfurter.app (free, no API key required)
 * Caches rates for 24 hours
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

export type DisplayCurrency = 'RON' | 'USD' | 'EUR';

interface ExchangeRates {
  base: string;
  date: string;
  rates: Record<string, number>;
  timestamp: number;
}

const RATES_CACHE_KEY = '@currency_rates';
const DISPLAY_CURRENCY_KEY = '@display_currency';
const CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 hours

let ratesCache: ExchangeRates | null = null;

/**
 * Fetch exchange rates from frankfurter.app
 * Base currency is EUR by default
 */
async function fetchExchangeRates(): Promise<ExchangeRates> {
  try {
    console.log('💱 Fetching exchange rates...');

    // Fetch rates with EUR as base, include RON, USD, EUR
    const url = 'https://api.frankfurter.app/latest?from=EUR&to=RON,USD,EUR';

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`Exchange rate API error: ${response.status}`);
    }

    const data = await response.json();

    const rates: ExchangeRates = {
      base: data.base,
      date: data.date,
      rates: {
        ...data.rates,
        EUR: 1, // EUR to EUR is always 1
      },
      timestamp: Date.now(),
    };

    // Cache the rates
    await AsyncStorage.setItem(RATES_CACHE_KEY, JSON.stringify(rates));
    ratesCache = rates;

    console.log(`✅ Exchange rates fetched: 1 EUR = ${rates.rates.RON} RON, ${rates.rates.USD} USD`);
    return rates;
  } catch (error) {
    console.error('❌ Error fetching exchange rates:', error);
    throw error;
  }
}

/**
 * Load exchange rates (from cache or fetch new)
 */
export async function loadExchangeRates(): Promise<ExchangeRates> {
  // Check memory cache first
  if (ratesCache) {
    const age = Date.now() - ratesCache.timestamp;
    if (age < CACHE_DURATION) {
      const ageHours = Math.floor(age / (60 * 60 * 1000));
      console.log(`💾 Using cached exchange rates (${ageHours}h old)`);
      return ratesCache;
    }
  }

  // Check AsyncStorage cache
  try {
    const cached = await AsyncStorage.getItem(RATES_CACHE_KEY);
    if (cached) {
      const rates: ExchangeRates = JSON.parse(cached);
      const age = Date.now() - rates.timestamp;

      if (age < CACHE_DURATION) {
        ratesCache = rates;
        const ageHours = Math.floor(age / (60 * 60 * 1000));
        console.log(`💾 Loaded cached exchange rates from storage (${ageHours}h old)`);
        return rates;
      }
    }
  } catch (error) {
    console.warn('⚠️ Error loading cached rates:', error);
  }

  // Fetch fresh rates
  return await fetchExchangeRates();
}

/**
 * Convert amount from one currency to another
 *
 * @param amount - Amount in source currency
 * @param from - Source currency code
 * @param to - Target currency code
 * @param rates - Exchange rates object
 * @returns Converted amount
 */
export function convertCurrency(
  amount: number,
  from: string,
  to: string,
  rates: ExchangeRates
): number {
  if (from === to) {
    return amount;
  }

  // All rates are based on EUR, so convert through EUR
  // from -> EUR -> to

  const fromRate = rates.rates[from];
  const toRate = rates.rates[to];

  if (!fromRate || !toRate) {
    console.warn(`⚠️ Missing rate for ${from} or ${to}, returning original amount`);
    return amount;
  }

  // Convert to EUR first, then to target currency
  const amountInEur = amount / fromRate;
  const convertedAmount = amountInEur * toRate;

  return convertedAmount;
}

/**
 * Get display currency preference
 */
export async function getDisplayCurrency(): Promise<DisplayCurrency> {
  try {
    const stored = await AsyncStorage.getItem(DISPLAY_CURRENCY_KEY);
    if (stored && (stored === 'RON' || stored === 'USD' || stored === 'EUR')) {
      return stored as DisplayCurrency;
    }
  } catch (error) {
    console.warn('⚠️ Error loading display currency:', error);
  }

  // Default to RON
  return 'RON';
}

/**
 * Save display currency preference
 */
export async function saveDisplayCurrency(currency: DisplayCurrency): Promise<void> {
  try {
    await AsyncStorage.setItem(DISPLAY_CURRENCY_KEY, currency);
    console.log(`💱 Display currency set to ${currency}`);
  } catch (error) {
    console.error('❌ Error saving display currency:', error);
    throw error;
  }
}

/**
 * Clear cached exchange rates (force refresh)
 */
export async function clearRatesCache(): Promise<void> {
  try {
    await AsyncStorage.removeItem(RATES_CACHE_KEY);
    ratesCache = null;
    console.log('🧹 Cleared exchange rates cache');
  } catch (error) {
    console.error('❌ Error clearing rates cache:', error);
  }
}

/**
 * Format currency with symbol
 */
export function formatCurrencySymbol(currency: DisplayCurrency): string {
  const symbols: Record<DisplayCurrency, string> = {
    RON: 'RON',
    USD: '$',
    EUR: '€',
  };
  return symbols[currency];
}
