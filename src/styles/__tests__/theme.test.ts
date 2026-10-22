import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

describe('Tailwind v4 theme configuration', () => {
  const css = readFileSync(resolve(__dirname, '../globals.css'), 'utf8');

  it('has @theme block with --color-primary', () => {
    expect(css).toMatch(/@theme\s*\{/);
    expect(css).toMatch(/--color-primary:\s*#2c2f35/);
  });

  it('has @theme block with --color-secondary', () => {
    expect(css).toMatch(/@theme\s*\{/);
    expect(css).toMatch(/--color-secondary:\s*#13c2c2/);
  });
});
