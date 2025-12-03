/**
 * BVB API Service
 * Handles fetching live stock prices from the Bucharest Stock Exchange
 *
 * Scrapes prices from the official BVB website
 *
 * ARCHITECTURE NOTES:
 * - This service abstracts API calls, making it easy to swap endpoints
 * - Fetches live price data by scraping the BVB details page
 * - Includes error handling and fallback for network issues
 */

import { StockMarketData } from '../types/Stock';

// Cache for storing prices with 1-hour expiry (3600000 ms)
const CACHE_DURATION = 3600000; // 1 hour
const priceCache = new Map<string, { price: StockMarketData; timestamp: number }>();

/**
 * Fetch the current price of a stock from BVB website
 *
 * @param symbol - Stock ticker (e.g., "SNN", "TLV", "BVB")
 * @returns Promise with market data
 *
 * Scrapes from: https://www.bvb.ro/FinancialInstruments/Details/FinancialInstrumentsDetails.aspx?s={symbol}
 * Extracts: document.querySelector('.tooltip-wrapper.inner-page .tooltip-value .value').innerHTML
 */
export async function getBvbPrice(symbol: string): Promise<StockMarketData> {
  const cacheKey = symbol.toUpperCase();
  const now = Date.now();

  // Check if we have a valid cached price (only if price > 0 and within 1 hour)
  const cached = priceCache.get(cacheKey);
  if (cached && cached.price.currentPrice > 0 && now - cached.timestamp < CACHE_DURATION) {
    const ageMinutes = Math.floor((now - cached.timestamp) / 60000);
    console.log(`💾 Using cached price for ${cacheKey}: ${cached.price.currentPrice} RON (${ageMinutes}m old)`);
    return cached.price;
  }

  try {
    console.log(`🌐 Fetching price for ${cacheKey} from BVB...`);
    const url = `https://www.bvb.ro/FinancialInstruments/Details/FinancialInstrumentsDetails.aspx?s=${cacheKey}`;

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
    // Look for: <div class="tooltip-wrapper inner-page">...<b class="value">PRICE_VALUE</b>
    const priceMatch = html.match(/<div\s+class="tooltip-wrapper\s+inner-page"[\s\S]*?<b\s+class="value">([^<]+)<\/b>/);

    if (!priceMatch || !priceMatch[1]) {
      console.warn(`Could not parse price from HTML for ${symbol}`);
      return {
        symbol: cacheKey,
        currentPrice: 0,
        lastUpdate: now,
      };
    }

    // Parse the price value (handle both . and , as decimal separator)
    let priceString = priceMatch[1].trim();
    // Replace comma with dot for consistent parsing
    priceString = priceString.replace(',', '.');
    const currentPrice = parseFloat(priceString);

    if (isNaN(currentPrice) || currentPrice < 0) {
      console.warn(`Invalid price parsed for ${symbol}:`, priceMatch[1]);
      return {
        symbol: cacheKey,
        currentPrice: 0,
        lastUpdate: now,
      };
    }

    const result = {
      symbol: cacheKey,
      currentPrice,
      lastUpdate: now,
    };

    // Cache the price only if it's > 0
    if (currentPrice > 0) {
      priceCache.set(cacheKey, { price: result, timestamp: now });
      console.log(`✅ Fetched ${cacheKey}: ${currentPrice} RON`);
    } else {
      console.log(`⚠️ Got zero price for ${cacheKey}`);
    }

    return result;
  } catch (error) {
    console.error(`Error fetching BVB price for ${symbol}:`, error);
    // Return 0 price on error instead of throwing
    return {
      symbol: cacheKey,
      currentPrice: 0,
      lastUpdate: now,
    };
  }
}

/**
 * Fetch prices for multiple stocks in parallel
 *
 * @param symbols - Array of stock tickers
 * @returns Promise with array of market data
 */
export async function getBvbPrices(symbols: string[]): Promise<StockMarketData[]> {
  try {
    const pricePromises = symbols.map((symbol) => getBvbPrice(symbol));
    return await Promise.all(pricePromises);
  } catch (error) {
    console.error('Error fetching multiple BVB prices:', error);
    // Return empty array on error - individual prices will be 0
    return symbols.map((symbol) => ({
      symbol: symbol.toUpperCase(),
      currentPrice: 0,
      lastUpdate: Date.now(),
    }));
  }
}

/**
 * Get the cached timestamp for a symbol
 *
 * @param symbol - Stock ticker
 * @returns Timestamp in milliseconds when the price was last fetched, or null if not cached
 */
export function getCachedTimestamp(symbol: string): number | null {
  const cacheKey = symbol.toUpperCase();
  const cached = priceCache.get(cacheKey);
  return cached ? cached.timestamp : null;
}

/**
 * Clear the price cache for a specific symbol or all symbols
 *
 * @param symbol - Optional stock ticker. If not provided, clears entire cache
 */
export function clearPriceCache(symbol?: string): void {
  if (symbol) {
    const cacheKey = symbol.toUpperCase();
    priceCache.delete(cacheKey);
    console.log(`🧹 Cleared price cache for ${cacheKey}`);
  } else {
    const count = priceCache.size;
    priceCache.clear();
    console.log(`🧹 Cleared entire price cache (${count} entries)`);
  }
}

