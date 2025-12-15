/**
 * Market Data API Service
 * Handles fetching live stock prices from multiple exchanges
 *
 * Supports:
 * - BVB (Bucharest Stock Exchange) - web scraping
 * - LSE (London Stock Exchange) - Twelve Data API
 * - CRYPTO (Cryptocurrency) - CoinGecko API
 */

import { StockMarketData } from '../types/Stock';
import { parseSymbol, getExchangeInfo, ExchangeCode } from './exchangeService';
import Constants from 'expo-constants';

// Cache for storing prices with 1-hour expiry (3600000 ms)
const CACHE_DURATION = 3600000; // 1 hour
const priceCache = new Map<string, { price: StockMarketData; timestamp: number }>();

/**
 * Fetch the current price of a stock from its exchange
 *
 * @param fullSymbol - Stock ticker with exchange (e.g., "SNG.BVB", "CSPX.L")
 * @returns Promise with market data
 */
export async function getStockPrice(fullSymbol: string): Promise<StockMarketData> {
  const parsed = parseSymbol(fullSymbol);
  const cacheKey = parsed.fullSymbol;
  const now = Date.now();

  // Check if we have a valid cached price (only if price > 0 and within 1 hour)
  const cached = priceCache.get(cacheKey);
  if (cached && cached.price.currentPrice > 0 && now - cached.timestamp < CACHE_DURATION) {
    const ageMinutes = Math.floor((now - cached.timestamp) / 60000);
    console.log(`💾 Using cached price for ${cacheKey}: ${cached.price.currentPrice} ${cached.price.currency} (${ageMinutes}m old)`);
    return cached.price;
  }

  console.log(`🌐 Fetching price for ${cacheKey} from ${parsed.exchange}...`);

  let result: StockMarketData;

  // Route to appropriate exchange API
  switch (parsed.exchange) {
    case 'BVB':
      result = await fetchBvbPrice(parsed.symbol, parsed.fullSymbol);
      break;
    case 'L':
      result = await fetchLondonPrice(parsed.symbol, parsed.fullSymbol);
      break;
    case 'CRYPTO':
      result = await fetchCryptoPrice(parsed.symbol, parsed.fullSymbol);
      break;
    default:
      throw new Error(`Unsupported exchange: ${parsed.exchange}`);
  }

  // Cache the price only if it's > 0
  if (result.currentPrice > 0) {
    priceCache.set(cacheKey, { price: result, timestamp: now });
    console.log(`✅ Fetched ${cacheKey}: ${result.currentPrice} ${result.currency}`);
  } else {
    console.log(`⚠️ Got zero price for ${cacheKey}`);
  }

  return result;
}

/**
 * Fetch price from BVB (Bucharest Stock Exchange)
 * Uses web scraping from official BVB website
 */
async function fetchBvbPrice(symbol: string, fullSymbol: string): Promise<StockMarketData> {
  const now = Date.now();
  const exchangeInfo = getExchangeInfo('BVB');

  try {
    const url = `https://www.bvb.ro/FinancialInstruments/Details/FinancialInstrumentsDetails.aspx?s=${symbol}`;

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X) AppleWebKit/605.1.15',
      },
    });

    if (!response.ok) {
      throw new Error(`BVB website error: ${response.status} ${response.statusText}`);
    }

    const html = await response.text();

    // Parse the HTML to extract the price
    const priceMatch = html.match(/<div\s+class="tooltip-wrapper\s+inner-page"[\s\S]*?<b\s+class="value">([^<]+)<\/b>/);

    if (!priceMatch || !priceMatch[1]) {
      console.warn(`Could not parse price from HTML for ${symbol}`);
      return {
        symbol: fullSymbol,
        currentPrice: 0,
        currency: exchangeInfo.currency,
        lastUpdate: now,
      };
    }

    // Parse the price value (handle both . and , as decimal separator)
    let priceString = priceMatch[1].trim();
    priceString = priceString.replace(',', '.');
    const currentPrice = parseFloat(priceString);

    if (isNaN(currentPrice) || currentPrice < 0) {
      console.warn(`Invalid price parsed for ${symbol}:`, priceMatch[1]);
      return {
        symbol: fullSymbol,
        currentPrice: 0,
        currency: exchangeInfo.currency,
        lastUpdate: now,
      };
    }

    return {
      symbol: fullSymbol,
      currentPrice,
      currency: exchangeInfo.currency,
      lastUpdate: now,
    };
  } catch (error) {
    console.error(`Error fetching BVB price for ${symbol}:`, error);
    return {
      symbol: fullSymbol,
      currentPrice: 0,
      currency: exchangeInfo.currency,
      lastUpdate: now,
    };
  }
}

/**
 * Map common cryptocurrency symbols to CoinGecko IDs
 * CoinGecko uses specific IDs for each cryptocurrency
 */
const CRYPTO_ID_MAP: Record<string, string> = {
  BTC: 'bitcoin',
  ETH: 'ethereum',
  ADA: 'cardano',
  SOL: 'solana',
  DOT: 'polkadot',
  MATIC: 'matic-network',
  AVAX: 'avalanche-2',
  LINK: 'chainlink',
  UNI: 'uniswap',
  XRP: 'ripple',
  DOGE: 'dogecoin',
  SHIB: 'shiba-inu',
  BNB: 'binancecoin',
  USDT: 'tether',
  USDC: 'usd-coin',
};

/**
 * Fetch price from CoinGecko API for cryptocurrency
 * Always returns prices in USD
 */
async function fetchCryptoPrice(symbol: string, fullSymbol: string): Promise<StockMarketData> {
  const now = Date.now();
  const exchangeInfo = getExchangeInfo('CRYPTO');

  try {
    // Map symbol to CoinGecko ID (lowercase)
    const coinId = CRYPTO_ID_MAP[symbol.toUpperCase()] || symbol.toLowerCase();

    // CoinGecko API endpoint (no API key required for basic usage)
    const url = `https://api.coingecko.com/api/v3/simple/price?ids=${coinId}&vs_currencies=usd`;

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
      },
    });

    if (!response.ok) {
      console.warn(`⚠️ CoinGecko API returned ${response.status} for ${symbol}`);
      return {
        symbol: fullSymbol,
        currentPrice: 0,
        currency: exchangeInfo.currency,
        lastUpdate: now,
      };
    }

    const data = await response.json();

    // Extract USD price from response
    const currentPrice = data?.[coinId]?.usd;

    if (!currentPrice || isNaN(currentPrice) || currentPrice <= 0) {
      console.warn(`⚠️ Could not extract price from CoinGecko for ${symbol}. Check if '${coinId}' is a valid CoinGecko ID.`);
      return {
        symbol: fullSymbol,
        currentPrice: 0,
        currency: exchangeInfo.currency,
        lastUpdate: now,
      };
    }

    console.log(`✅ Successfully fetched ${symbol}: $${currentPrice} USD`);

    return {
      symbol: fullSymbol,
      currentPrice,
      currency: 'USD', // Always USD for crypto
      lastUpdate: now,
    };
  } catch (error) {
    console.error(`❌ Error fetching crypto price for ${symbol}:`, error);
    return {
      symbol: fullSymbol,
      currentPrice: 0,
      currency: exchangeInfo.currency,
      lastUpdate: now,
    };
  }
}

/**
 * Fetch price from London Stock Exchange
 * Uses Twelve Data API (free tier: 8 calls/min, 800 calls/day)
 *
 * Note: Requires TWELVE_DATA_API_KEY environment variable
 * Get your free API key at: https://twelvedata.com/pricing
 */
async function fetchLondonPrice(symbol: string, fullSymbol: string): Promise<StockMarketData> {
  const now = Date.now();
  const exchangeInfo = getExchangeInfo('L');

  try {
    // Twelve Data API endpoint for quote (current price)
    // Symbol format: TICKER (exchange is specified via 'exchange' parameter)
    const apiKey = Constants.expoConfig?.extra?.TWELVE_DATA_API_KEY || 'demo';
    const url = `https://api.twelvedata.com/quote?symbol=${symbol}&exchange=LSE&apikey=${apiKey}`;

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
      },
    });

    if (!response.ok) {
      console.warn(`⚠️ Twelve Data API returned ${response.status} for ${symbol}`);
      return {
        symbol: fullSymbol,
        currentPrice: 0,
        currency: exchangeInfo.currency,
        lastUpdate: now,
      };
    }

    const data = await response.json();

    // Check for API error
    if (data.status === 'error') {
      console.warn(`⚠️ Twelve Data API error for ${symbol}: ${data.message || 'Unknown error'}`);
      if (data.code === 429) {
        console.warn(`💡 Rate limit reached. Free tier: 8 calls/min, 800 calls/day`);
      }
      return {
        symbol: fullSymbol,
        currentPrice: 0,
        currency: exchangeInfo.currency,
        lastUpdate: now,
      };
    }

    // Extract price from Twelve Data quote response
    const currentPrice = parseFloat(data.close || data.price);

    if (!currentPrice || isNaN(currentPrice) || currentPrice <= 0) {
      console.warn(`⚠️ Could not extract price from Twelve Data for ${symbol}`);
      return {
        symbol: fullSymbol,
        currentPrice: 0,
        currency: exchangeInfo.currency,
        lastUpdate: now,
      };
    }

    console.log(`✅ Successfully fetched ${symbol} (LSE): ${currentPrice} ${data.currency || 'USD'}`);

    return {
      symbol: fullSymbol,
      currentPrice,
      currency: data.currency || 'USD',
      lastUpdate: now,
    };
  } catch (error) {
    console.error(`❌ Error fetching London price for ${symbol}:`, error);
    return {
      symbol: fullSymbol,
      currentPrice: 0,
      currency: exchangeInfo.currency,
      lastUpdate: now,
    };
  }
}

/**
 * Fetch prices for multiple stocks in parallel
 *
 * @param symbols - Array of stock tickers with exchange (e.g., ["SNG.BVB", "CSPX.L"])
 * @returns Promise with array of market data
 */
export async function getStockPrices(symbols: string[]): Promise<StockMarketData[]> {
  try {
    const pricePromises = symbols.map((symbol) => getStockPrice(symbol));
    return await Promise.all(pricePromises);
  } catch (error) {
    console.error('Error fetching multiple stock prices:', error);
    // Return empty array on error - individual prices will be 0
    return symbols.map((symbol) => {
      try {
        const parsed = parseSymbol(symbol);
        const exchangeInfo = getExchangeInfo(parsed.exchange);
        return {
          symbol: parsed.fullSymbol,
          currentPrice: 0,
          currency: exchangeInfo.currency,
          lastUpdate: Date.now(),
        };
      } catch {
        return {
          symbol: symbol,
          currentPrice: 0,
          currency: 'RON',
          lastUpdate: Date.now(),
        };
      }
    });
  }
}

/**
 * Get the cached timestamp for a symbol
 *
 * @param fullSymbol - Stock ticker with exchange
 * @returns Timestamp in milliseconds when the price was last fetched, or null if not cached
 */
export function getCachedTimestamp(fullSymbol: string): number | null {
  try {
    const parsed = parseSymbol(fullSymbol);
    const cached = priceCache.get(parsed.fullSymbol);
    return cached ? cached.timestamp : null;
  } catch {
    return null;
  }
}

/**
 * Clear the price cache for a specific symbol or all symbols
 *
 * @param fullSymbol - Optional stock ticker with exchange. If not provided, clears entire cache
 */
export function clearPriceCache(fullSymbol?: string): void {
  if (fullSymbol) {
    try {
      const parsed = parseSymbol(fullSymbol);
      priceCache.delete(parsed.fullSymbol);
      console.log(`🧹 Cleared price cache for ${parsed.fullSymbol}`);
    } catch (error) {
      console.error(`Error clearing cache for ${fullSymbol}:`, error);
    }
  } else {
    const count = priceCache.size;
    priceCache.clear();
    console.log(`🧹 Cleared entire price cache (${count} entries)`);
  }
}

// Legacy exports for backwards compatibility
export const getBvbPrice = getStockPrice;
export const getBvbPrices = getStockPrices;
