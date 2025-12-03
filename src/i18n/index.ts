/**
 * i18n setup with minimal dependencies
 * Provides language key-value translations without external libraries
 *
 * ARCHITECTURE:
 * - Simple approach: import JSON and use a helper function
 * - Easy to extend: just add new language files
 * - Future: can integrate with Context for runtime language switching
 */

import roTranslations from './ro.json';
import enTranslations from './en.json';
import { LanguageKey } from '../types/Stock';

// Language translations database
const translations: Record<LanguageKey, Record<string, any>> = {
  ro: roTranslations,
  en: enTranslations,
};

// Default language
const DEFAULT_LANGUAGE: LanguageKey = 'ro';

/**
 * Get a translated string using dot-notation path
 *
 * @param key - Path to translation key (e.g., "portfolio.title")
 * @param language - Language code (defaults to Romanian)
 * @returns Translated string or key if not found
 *
 * @example
 * t('portfolio.title') // Returns "Portofoliul meu"
 * t('stock.shares', 'en') // Returns "Shares"
 */
export function t(key: string, language: LanguageKey = DEFAULT_LANGUAGE): string {
  const keys = key.split('.');
  let value: any = translations[language];

  for (const k of keys) {
    if (value && typeof value === 'object' && k in value) {
      value = value[k];
    } else {
      // Fallback to key name if translation not found
      console.warn(`Translation key not found: ${key}`);
      return key;
    }
  }

  return typeof value === 'string' ? value : key;
}

/**
 * Get all translations for a specific language
 *
 * @param language - Language code
 * @returns Full translation object
 */
export function getTranslations(language: LanguageKey = DEFAULT_LANGUAGE) {
  return translations[language];
}

/**
 * Check if a language is supported
 *
 * @param language - Language code to check
 * @returns True if language is supported
 */
export function isLanguageSupported(language: string): language is LanguageKey {
  return language in translations;
}

// Export default translations for convenience
export const i18n = {
  t,
  getTranslations,
  isLanguageSupported,
  DEFAULT_LANGUAGE,
  SUPPORTED_LANGUAGES: Object.keys(translations) as LanguageKey[],
};
