import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
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
});
