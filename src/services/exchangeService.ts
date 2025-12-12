/**
 * Exchange Service
 * Handles parsing and formatting of multi-exchange stock symbols
 *
 * Symbol format: SYMBOL.EXCHANGE
 * Examples: SNG.BVB, CSPX.L, BTC.CRYPTO
 */

export type ExchangeCode = 'BVB' | 'L' | 'CRYPTO';

export interface ExchangeInfo {
  code: ExchangeCode;
  name: string;
  currency: string;
  countryCode: string;
}

export interface ParsedSymbol {
  symbol: string;      // e.g., "SNG", "BTC"
  exchange: ExchangeCode; // e.g., "BVB", "CRYPTO"
  fullSymbol: string;  // e.g., "SNG.BVB", "BTC.CRYPTO"
}

/**
 * Exchange metadata
 */
export const EXCHANGES: Record<ExchangeCode, ExchangeInfo> = {
  BVB: {
    code: 'BVB',
    name: 'Bursa de Valori București',
    currency: 'RON',
    countryCode: 'RO',
  },
  L: {
    code: 'L',
    name: 'London Stock Exchange',
    currency: 'USD', // Yahoo Finance returns prices in USD
    countryCode: 'GB',
  },
  CRYPTO: {
    code: 'CRYPTO',
    name: 'Cryptocurrency',
    currency: 'USD', // Crypto prices fetched in USD
    countryCode: 'GLOBAL',
  },
};

/**
 * Parse a symbol string into its components
 *
 * @param fullSymbol - Symbol with exchange suffix (e.g., "SNG.BVB" or "CSPX.L")
 * @returns Parsed symbol object
 * @throws Error if format is invalid
 */
export function parseSymbol(fullSymbol: string): ParsedSymbol {
  const normalized = fullSymbol.toUpperCase().trim();

  if (!normalized.includes('.')) {
    throw new Error(`Invalid symbol format: "${fullSymbol}". Expected format: SYMBOL.EXCHANGE (e.g., SNG.BVB)`);
  }

  const parts = normalized.split('.');

  if (parts.length !== 2) {
    throw new Error(`Invalid symbol format: "${fullSymbol}". Expected format: SYMBOL.EXCHANGE`);
  }

  const [symbol, exchangeCode] = parts;

  if (!symbol) {
    throw new Error(`Missing symbol in: "${fullSymbol}"`);
  }

  if (!isValidExchange(exchangeCode)) {
    throw new Error(`Unknown exchange: "${exchangeCode}". Supported exchanges: ${Object.keys(EXCHANGES).join(', ')}`);
  }

  return {
    symbol,
    exchange: exchangeCode as ExchangeCode,
    fullSymbol: normalized,
  };
}

/**
 * Format a symbol with exchange code
 *
 * @param symbol - Stock symbol (e.g., "SNG")
 * @param exchange - Exchange code (e.g., "BVB")
 * @returns Formatted symbol (e.g., "SNG.BVB")
 */
export function formatSymbol(symbol: string, exchange: ExchangeCode): string {
  return `${symbol.toUpperCase()}.${exchange}`;
}

/**
 * Check if an exchange code is valid
 */
export function isValidExchange(code: string): boolean {
  return code in EXCHANGES;
}

/**
 * Get exchange information
 *
 * @param exchange - Exchange code
 * @returns Exchange metadata
 */
export function getExchangeInfo(exchange: ExchangeCode): ExchangeInfo {
  return EXCHANGES[exchange];
}

/**
 * Validate symbol format
 *
 * @param fullSymbol - Symbol to validate
 * @returns true if valid, false otherwise
 */
export function isValidSymbolFormat(fullSymbol: string): boolean {
  try {
    parseSymbol(fullSymbol);
    return true;
  } catch {
    return false;
  }
}

/**
 * Get all supported exchanges
 */
export function getSupportedExchanges(): ExchangeCode[] {
  return Object.keys(EXCHANGES) as ExchangeCode[];
}
