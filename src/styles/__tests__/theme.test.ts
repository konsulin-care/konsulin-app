import tailwindcss from '@tailwindcss/postcss';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import postcss from 'postcss';
import { describe, expect, it } from 'vitest';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

describe('Tailwind v4 theme configuration', () => {
  const css = readFileSync(resolve(__dirname, '../globals.css'), 'utf8');
  const theme = css.slice(css.indexOf('@theme'), css.indexOf('@layer base'));

  it('defines the three-hue palette and the reserved status colours', () => {
    expect(theme).toMatch(/--color-charcoal-900:\s*#161c26/);
    expect(theme).toMatch(/--color-paper:\s*#fafaf8/);
    expect(theme).toMatch(/--color-turquoise:\s*#0abdc3/);
    expect(theme).toMatch(/--color-turquoise-deep:\s*#0f7981/);
    expect(theme).toMatch(/--color-danger:\s*#b3261e/);
    expect(theme).toMatch(/--color-warning-deep:\s*#7a5200/);
  });

  it('maps the semantic aliases onto the palette', () => {
    expect(theme).toMatch(/--color-primary:\s*var\(--color-charcoal-900\)/);
    expect(theme).toMatch(/--color-secondary:\s*var\(--color-turquoise\)/);
    expect(theme).toMatch(/--color-muted:\s*var\(--color-charcoal-100\)/);
    expect(theme).toMatch(/--color-accent:\s*var\(--color-turquoise-tint\)/);
    expect(theme).toMatch(/--color-ring:\s*var\(--color-turquoise-deep\)/);
  });

  it('resolves text-muted-foreground to the charcoal palette through the real pipeline', async () => {
    const stylesDir = resolve(__dirname, '..');
    const { css: out } = await postcss([
      tailwindcss({ base: stylesDir })
    ]).process(`${css}\n@source inline("text-muted-foreground");`, {
      from: resolve(stylesDir, 'globals.css')
    });

    expect(out).toMatch(
      /\.text-muted-foreground\s*\{[^}]*color:\s*var\(--color-muted-foreground\)/
    );
    expect(out).toMatch(
      /--color-muted-foreground:\s*var\(--color-charcoal-600\)/
    );
    expect(out).toMatch(/--color-charcoal-600:\s*#686c72/);
  }, 30_000);
});
