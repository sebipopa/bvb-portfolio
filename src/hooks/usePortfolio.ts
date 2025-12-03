/**
 * usePortfolio Hook
 * Provides access to portfolio state with error handling
 *
 * ARCHITECTURE:
 * - Simple wrapper around PortfolioContext
 * - Ensures context is used correctly
 * - Throws helpful error if used outside provider
 */

import { useContext } from 'react';
import { PortfolioContext } from '../context/PortfolioContext';

export function usePortfolio() {
  const context = useContext(PortfolioContext);

  if (!context) {
    throw new Error(
      'usePortfolio must be used within PortfolioProvider. ' +
      'Wrap your component tree with <PortfolioProvider> at the top level.'
    );
  }

  return context;
}
