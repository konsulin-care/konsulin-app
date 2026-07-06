import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const CONFIG_PATH = resolve(import.meta.dirname, '../../next.config.mjs');

/**
 * Read next.config.mjs as text to check for the conditional export pattern.
 * We parse as text because importing the module with vi.stubEnv is fragile
 * across test runners (ESM module caching, Next.js patches, etc.).
 */
function readConfig(): string {
  return readFileSync(CONFIG_PATH, 'utf8');
}

/**
 * Extract the value of a top-level config property.
 * Works for simple string values: `key: 'value'`
 * Returns the full expression for computed properties.
 */
function extractValue(key: string, text: string): string {
  // eslint-disable-next-line security/detect-non-literal-regexp
  const regex = new RegExp(
    `(?:^|\\s)${key}\\s*:\\s*([^,\\n]+(?:\\{[^}]*\\}[^,\\n]*)?)`,
    'm'
  );
  const match = text.match(regex);
  if (!match) return '';
  return match[1].trim();
}

describe('next.config.mjs', () => {
  it('has conditional output: export that skips in development', () => {
    const text = readConfig();

    // The config MUST use a computed property pattern that excludes
    // output: 'export' when NODE_ENV=development. This is the fix
    // for dev server 404s on app chunks.
    const hasConditional =
      text.includes('NODE_ENV') &&
      text.includes('output:') &&
      text.includes(`'export'`) &&
      (text.includes('...(process.env.NODE_ENV') ||
        text.includes("...(process.env['NODE_ENV'") ||
        text.includes('...(process.env[`NODE_ENV`'));

    expect(hasConditional).toBe(true);
  });

  it('keeps images.unoptimized: true regardless of environment', () => {
    const text = readConfig();
    expect(extractValue('unoptimized', text)).toBe('true');
  });

  it('keeps experimental.optimizePackageImports for production builds', () => {
    const text = readConfig();
    expect(text).toContain('optimizePackageImports');
    expect(text).toContain('lucide-react');
  });

  it('condition is NODE_ENV !== development (skipped in dev)', () => {
    const text = readConfig();
    // The condition must check for !== 'development' (or inverted ===)
    // so that export mode is active in production builds.
    const devSkipPattern =
      /NODE_ENV\s*(?:!==|!===\s*['"`]development['"`]|==\s*['"`]production['"`])/;
    expect(devSkipPattern.test(text)).toBe(true);
  });
});
