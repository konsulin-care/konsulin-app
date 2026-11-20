import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

describe('SCSS palette tokens', () => {
  const scss = readFileSync(resolve(__dirname, '../_palette.scss'), 'utf8');

  it('defines the gold token used by the halo ring', () => {
    expect(scss).toMatch(/\$color-gold:\s*#ebcb8b/);
    expect(scss).toMatch(/--color-gold:\s*#\{\$color-gold\}/);
  });

  it('does not redeclare secondary, which now lives in the globals.css @theme', () => {
    expect(scss).not.toMatch(/--color-secondary:/);
    expect(scss).not.toMatch(/\$color-secondary/);
  });

  it('is loaded from index.scss', () => {
    const index = readFileSync(resolve(__dirname, '../index.scss'), 'utf8');
    expect(index).toMatch(/@use\s+'\.\/palette';/);
  });
});
