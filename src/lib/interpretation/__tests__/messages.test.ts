import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { INSTRUMENTS } from '../instruments';
import { keysFor } from '../interpret';

const LOCALES = ['en', 'id'] as const;

/**
 * Read a message namespace JSON file for a locale.
 *
 * @param locale - Locale directory name under src/messages.
 * @param namespace - Namespace file name without extension.
 * @returns Parsed message object.
 */
function readNamespace(
  locale: string,
  namespace: string
): Record<string, unknown> {
  const file = path.resolve(
    process.cwd(),
    'src/messages',
    locale,
    `${namespace}.json`
  );
  return JSON.parse(fs.readFileSync(file, 'utf8')) as Record<string, unknown>;
}

/**
 * Resolve a dot-separated message key inside a nested message object.
 *
 * @param messages - Parsed nested message object.
 * @param key - Dot-separated key path.
 * @returns The resolved value, or undefined when any segment is missing.
 */
function resolve(messages: Record<string, unknown>, key: string): unknown {
  let current: unknown = messages;
  for (const segment of key.split('.')) {
    if (current === null || typeof current !== 'object') return undefined;
    current = (current as Record<string, unknown>)[segment];
  }
  return current;
}

describe('interpretation messages', () => {
  it.each(LOCALES)('has a non-empty string for every key in %s', locale => {
    const messages = readNamespace(locale, 'interpretation');
    const missing: string[] = [];

    for (const def of INSTRUMENTS) {
      for (const key of keysFor(def)) {
        const value = resolve(messages, key);
        if (typeof value !== 'string' || value.trim().length === 0) {
          missing.push(key);
        }
      }
    }

    expect(missing, `Missing or empty keys in ${locale}`).toEqual([]);
  });

  it.each(LOCALES)('mentions 119 in the phq-9 crisis copy in %s', locale => {
    const messages = readNamespace(locale, 'interpretation');
    const flag = resolve(messages, 'phq-9.flag.self-harm');
    const severe = resolve(messages, 'phq-9.total.severe.body');

    expect(typeof flag === 'string' && flag.includes('119')).toBe(true);
    expect(typeof severe === 'string' && severe.includes('119')).toBe(true);
  });

  it('has identical key sets in both locales', () => {
    const collect = (value: unknown, prefix: string): string[] => {
      if (value === null || typeof value !== 'object') return [prefix];
      return Object.entries(value as Record<string, unknown>).flatMap(
        ([childKey, child]) =>
          collect(child, prefix ? `${prefix}.${childKey}` : childKey)
      );
    };

    const en = collect(readNamespace('en', 'interpretation'), '').sort();
    const id = collect(readNamespace('id', 'interpretation'), '').sort();

    expect(id).toEqual(en);
  });
});
