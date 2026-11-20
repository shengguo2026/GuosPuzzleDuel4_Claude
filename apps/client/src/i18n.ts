import { createContext, useContext } from 'react';
import { LOCALES, translate, type Locale, type MessageKey } from '@gpd4/content';

const STORAGE_KEY = 'gpd4.locale';

/** Language for this browser; becomes a profile setting in M4/M6. */
export function initialLocale(): Locale {
  try {
    const saved = window.localStorage.getItem(STORAGE_KEY);
    if (saved && (LOCALES as readonly string[]).includes(saved)) return saved as Locale;
  } catch {
    // storage blocked: fall through
  }
  const nav = (navigator.language || 'en').slice(0, 2).toLowerCase();
  return (LOCALES as readonly string[]).includes(nav) ? (nav as Locale) : 'en';
}

export function saveLocale(locale: Locale): void {
  try {
    window.localStorage.setItem(STORAGE_KEY, locale);
  } catch {
    // ignore
  }
}

export type T = (key: MessageKey, params?: Record<string, string | number>) => string;

export const LocaleContext = createContext<{ locale: Locale; t: T }>({
  locale: 'en',
  t: (key, params) => translate('en', key, params),
});

export function useT() {
  return useContext(LocaleContext);
}
