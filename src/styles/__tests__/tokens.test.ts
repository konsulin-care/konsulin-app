import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { TOKENS } from '../tokens';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const RAMP_PREFIXES = [
  'charcoal-',
  'paper',
  'surface',
  'turquoise-',
  'danger-',
  'warning-'
];

/**
 * Read the hex tokens declared inside the `@theme` block of globals.css.
 *
 * @returns A map from kebab-case token name to its lowercase hex colour.
 */
function readThemeTokens(): Record<string, string> {
  const css = readFileSync(resolve(__dirname, '../globals.css'), 'utf8');
  const start = css.indexOf('@theme');
  const end = css.indexOf('@layer base');
  const block = css.slice(start, end === -1 ? undefined : end);
  const tokens: Record<string, string> = {};
  const pattern = /--color-([a-z0-9-]+):\s*(#[0-9a-fA-F]{6})\s*;/g;
  for (const match of block.matchAll(pattern)) {
    tokens[match[1]] = match[2].toLowerCase();
  }
  return tokens;
}

/**
 * Convert a camelCase token key to its kebab-case CSS name.
 *
 * @param key - Token key such as `charcoal900` or `turquoiseDeep`.
 * @returns The kebab-case name, e.g. `charcoal-900`.
 */
function toKebab(key: string): string {
  return key.replace(/([a-z])([A-Z0-9])/g, '$1-$2').toLowerCase();
}

/**
 * Check whether a kebab-case CSS token belongs to a documented colour ramp.
 *
 * @param name - Kebab-case token name without the `--color-` prefix.
 * @returns True when the token is a ramp colour rather than a semantic alias.
 */
function isRampToken(name: string): boolean {
  return RAMP_PREFIXES.some(
    prefix => name === prefix || name.startsWith(prefix)
  );
}

describe('TOKENS', () => {
  const themeTokens = readThemeTokens();

  it('matches every hex declared in the globals.css @theme block', () => {
    for (const [key, hex] of Object.entries(TOKENS)) {
      const name = toKebab(key);
      const expected = themeTokens[name];
      expect(
        expected,
        `--color-${name} is missing from the @theme block`
      ).toBeDefined();
      expect(hex.toLowerCase(), `${name} hex mismatch`).toBe(expected);
    }
  });

  it('covers every ramp colour declared in the globals.css @theme block', () => {
    const kebabKeys = Object.keys(TOKENS).map(toKebab);
    for (const name of Object.keys(themeTokens)) {
      if (!isRampToken(name)) {
        continue;
      }
      expect(kebabKeys, `TOKENS is missing ${name}`).toContain(name);
    }
  });
});
