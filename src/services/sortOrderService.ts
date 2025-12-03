/**
 * Sort Order Service
 * Manages custom sort order for portfolio stocks
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

const SORT_ORDER_KEY = '@bvb_portfolio:custom_sort_order';

/**
 * Save custom sort order (array of symbol strings)
 */
export async function saveCustomSortOrder(symbols: string[]): Promise<void> {
  try {
    await AsyncStorage.setItem(SORT_ORDER_KEY, JSON.stringify(symbols));
    console.log(`📋 Saved custom sort order: ${symbols.join(', ')}`);
  } catch (error) {
    console.error('❌ Error saving custom sort order:', error);
    throw error;
  }
}

/**
 * Load custom sort order
 * Returns null if no custom order is saved
 */
export async function loadCustomSortOrder(): Promise<string[] | null> {
  try {
    const data = await AsyncStorage.getItem(SORT_ORDER_KEY);
    const order = data ? JSON.parse(data) : null;
    if (order) {
      console.log(`📋 Loaded custom sort order: ${order.join(', ')}`);
    } else {
      console.log('📋 No custom sort order found');
    }
    return order;
  } catch (error) {
    console.error('❌ Error loading custom sort order:', error);
    return null;
  }
}

/**
 * Clear custom sort order
 */
export async function clearCustomSortOrder(): Promise<void> {
  try {
    await AsyncStorage.removeItem(SORT_ORDER_KEY);
    console.log('🧹 Cleared custom sort order');
  } catch (error) {
    console.error('❌ Error clearing custom sort order:', error);
    throw error;
  }
}
