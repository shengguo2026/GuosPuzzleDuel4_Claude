import { describe, expect, it } from 'vitest';
import { LOCALES, messages, translate, type MessageKey } from '../src/index.js';

const placeholders = (s: string) => [...s.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort();

describe('i18n scaffolding', () => {
  const enKeys = Object.keys(messages.en).sort();

  it.each(LOCALES)('UI-06: locale %s has every key with the same placeholders', (locale) => {
    expect(Object.keys(messages[locale]).sort()).toEqual(enKeys);
    for (const key of enKeys as MessageKey[]) {
      const text = messages[locale][key];
      expect(text.trim(), `${locale}:${key}`).not.toBe('');
      expect(placeholders(text), `${locale}:${key}`).toEqual(placeholders(messages.en[key]));
    }
  });

  it('UI-06: fills placeholders', () => {
    expect(translate('de', 'host.connected', { port: 3001 })).toBe(
      'Mit dem Host auf Port 3001 verbunden.',
    );
  });
});
