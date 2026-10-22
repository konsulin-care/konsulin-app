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

  it('defines the secondary brand token', () => {
    expect(scss).toMatch(/\$color-secondary:\s*#13c2c2/);
    expect(scss).toMatch(/--color-secondary:\s*#\{\$color-secondary\}/);
  });

  it('is loaded from index.scss', () => {
    const index = readFileSync(resolve(__dirname, '../index.scss'), 'utf8');
    expect(index).toMatch(/@use\s+'\.\/palette';/);
  });
});
