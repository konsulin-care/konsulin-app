import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

interface Rgb {
  r: number;
  g: number;
  b: number;
}

interface DocumentedToken {
  name: string;
  hex: string;
  ratio: number;
}

const TOLERANCE = 0.01;

/**
 * Convert a 6-digit hex colour to its sRGB channels.
 *
 * @param hex - Hex colour, optionally prefixed with `#`.
 * @returns The red, green and blue channels in the 0-255 range.
 */
function parseHex(hex: string): Rgb {
  const value = hex.replace('#', '');
  return {
    r: Number.parseInt(value.slice(0, 2), 16),
    g: Number.parseInt(value.slice(2, 4), 16),
    b: Number.parseInt(value.slice(4, 6), 16)
  };
}

/**
 * Linearise a single sRGB channel as defined by WCAG 2.x.
 *
 * @param channel - Channel value in the 0-255 range.
 * @returns The linearised channel between 0 and 1.
 */
function linearise(channel: number): number {
  const c = channel / 255;
  return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
}

/**
 * Compute the WCAG 2.x relative luminance of a colour.
 *
 * @param hex - Hex colour, optionally prefixed with `#`.
 * @returns The relative luminance between 0 and 1.
 */
function luminance(hex: string): number {
  const { r, g, b } = parseHex(hex);
  return 0.2126 * linearise(r) + 0.7152 * linearise(g) + 0.0722 * linearise(b);
}

/**
 * Compute the WCAG 2.x contrast ratio between two colours.
 *
 * @param foreground - Hex colour, optionally prefixed with `#`.
 * @param background - Hex colour, optionally prefixed with `#`.
 * @returns The contrast ratio between 1 and 21.
 */
function contrast(foreground: string, background: string): number {
  const a = luminance(foreground);
  const b = luminance(background);
  const lighter = Math.max(a, b);
  const darker = Math.min(a, b);
  return (lighter + 0.05) / (darker + 0.05);
}

/**
 * Read the hex values declared inside the `@theme` block of globals.css.
 *
 * @returns A map from token name to its lowercase hex colour.
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
 * Read the documented token rows from the `# Tokens` table.
 *
 * @returns Every row that lists a concrete contrast ratio.
 */
function readDocumentedTokens(): DocumentedToken[] {
  const markdown = readFileSync(
    resolve(__dirname, '../../../docs/agents/design-tokens.md'),
    'utf8'
  );
  const start = markdown.indexOf('# Tokens');
  const end = markdown.indexOf('# Semantic Aliases');
  const section = markdown.slice(start, end === -1 ? undefined : end);
  const pattern =
    /^\|\s*`([^`]+)`\s*\|\s*`(#[0-9a-fA-F]{6})`\s*\|\s*([^|]+?)\s*\|/gm;
  const rows: DocumentedToken[] = [];
  for (const match of section.matchAll(pattern)) {
    const ratio = match[3].trim();
    if (ratio === 'n/a') {
      continue;
    }
    rows.push({
      name: match[1],
      hex: match[2].toLowerCase(),
      ratio: Number.parseFloat(ratio)
    });
  }
  return rows;
}

/**
 * Obtain the theme colour for a token, failing the test when it is missing.
 *
 * @param tokens - Map of theme tokens.
 * @param name - Token name without the `--color-` prefix.
 * @returns The lowercase hex colour.
 */
function tokenHex(tokens: Record<string, string>, name: string): string {
  const hex = tokens[name];
  expect(hex, `--color-${name} is missing from the @theme block`).toBeDefined();
  return hex;
}

describe('WCAG contrast of the design tokens', () => {
  const tokens = readThemeTokens();
  const documented = readDocumentedTokens();

  it('documents every contrast ratio that globals.css actually produces', () => {
    expect(documented.length).toBeGreaterThan(0);
    for (const token of documented) {
      const actual = contrast(token.hex, tokenHex(tokens, 'paper'));
      expect(
        Math.abs(actual - token.ratio),
        `${token.name}: documented ${token.ratio}, computed ${actual.toFixed(2)}`
      ).toBeLessThanOrEqual(TOLERANCE);
    }
  });

  it('keeps text tokens readable on paper and surface', () => {
    const paper = tokenHex(tokens, 'paper');
    const surface = tokenHex(tokens, 'surface');
    const textTokens = [
      'charcoal-900',
      'charcoal-700',
      'charcoal-600',
      'turquoise-deep',
      'danger',
      'warning-deep'
    ];

    for (const name of textTokens) {
      const hex = tokenHex(tokens, name);
      expect(contrast(hex, paper), `${name} on paper`).toBeGreaterThanOrEqual(
        4.5
      );
      expect(
        contrast(hex, surface),
        `${name} on surface`
      ).toBeGreaterThanOrEqual(4.5);
    }
  });

  it('keeps charcoal-400 usable for controls but not text', () => {
    const ratio = contrast(
      tokenHex(tokens, 'charcoal-400'),
      tokenHex(tokens, 'paper')
    );
    expect(ratio).toBeGreaterThanOrEqual(3);
  });

  it('keeps the documented foreground pairs readable', () => {
    const pairs: Array<[string, string]> = [
      ['charcoal-900', 'turquoise'],
      ['surface', 'danger'],
      ['charcoal-900', 'warning'],
      ['paper', 'charcoal-900'],
      ['charcoal-700', 'turquoise-tint'],
      ['charcoal-700', 'charcoal-100']
    ];

    for (const [foreground, background] of pairs) {
      const ratio = contrast(
        tokenHex(tokens, foreground),
        tokenHex(tokens, background)
      );
      expect(ratio, `${foreground} on ${background}`).toBeGreaterThanOrEqual(
        4.5
      );
    }
  });
});
