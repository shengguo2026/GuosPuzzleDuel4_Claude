/**
 * Content: i18n strings now; Campaign/Challenge manifests, achievements and
 * store items from M4/M5 (PLAN.md section 3). EN is the reference locale.
 */
import en from '../i18n/en.json' with { type: 'json' };
import zh from '../i18n/zh.json' with { type: 'json' };
import de from '../i18n/de.json' with { type: 'json' };

export type MessageKey = keyof typeof en;
export type Messages = Record<MessageKey, string>;

export const LOCALES = ['en', 'zh', 'de'] as const;
export type Locale = (typeof LOCALES)[number];

export const LOCALE_NAMES: Record<Locale, string> = { en: 'English', zh: '中文', de: 'Deutsch' };

export const messages: Record<Locale, Messages> = { en, zh, de };

/** Looks up a string and fills {placeholders}; falls back to English. */
export function translate(
  locale: Locale,
  key: MessageKey,
  params: Record<string, string | number> = {},
): string {
  const text = messages[locale][key] ?? messages.en[key];
  return text.replace(/\{(\w+)\}/g, (match, name: string) =>
    name in params ? String(params[name]) : match,
  );
}
