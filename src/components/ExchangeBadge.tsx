/**
 * Exchange Badge Component
 * Displays a small badge showing the stock exchange
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { parseSymbol } from '../services/exchangeService';

interface ExchangeBadgeProps {
  symbol: string;
  size?: 'small' | 'medium';
}

const EXCHANGE_COLORS = {
  BVB: '#2196f3', // Blue for BVB
  L: '#f44336',   // Red for London
};

export function ExchangeBadge({ symbol, size = 'small' }: ExchangeBadgeProps) {
  try {
    const parsed = parseSymbol(symbol);
    const color = EXCHANGE_COLORS[parsed.exchange];
    const isSmall = size === 'small';

    return (
      <View style={[styles.badge, { backgroundColor: color }, isSmall ? styles.badgeSmall : styles.badgeMedium]}>
        <Text style={[styles.badgeText, isSmall ? styles.badgeTextSmall : styles.badgeTextMedium]}>
          {parsed.exchange}
        </Text>
      </View>
    );
  } catch {
    return null;
  }
}

const styles = StyleSheet.create({
  badge: {
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
    alignSelf: 'flex-start',
  },
  badgeSmall: {
    paddingHorizontal: 5,
    paddingVertical: 1,
  },
  badgeMedium: {
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  badgeText: {
    color: '#fff',
    fontWeight: '600',
  },
  badgeTextSmall: {
    fontSize: 9,
  },
  badgeTextMedium: {
    fontSize: 11,
  },
});
