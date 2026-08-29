/* eslint-disable security/detect-non-literal-fs-filename */
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const PROJECT_ROOT = process.cwd();

/** Reads a file relative to project root and returns its contents. */
function read(relativePath: string): string {
  return readFileSync(path.join(PROJECT_ROOT, relativePath), 'utf8');
}

describe('dark mode removed', () => {
  it('popover.tsx has no dark: classes', () => {
    const source = read('src/components/ui/popover.tsx');
    expect(source).not.toContain('dark:bg-gray-950');
    expect(source).not.toContain('dark:text-gray-50');
  });

  it('checkbox.tsx has no dark: classes', () => {
    const source = read('src/components/ui/checkbox.tsx');
    expect(source).not.toContain('dark:bg-background');
    expect(source).not.toContain('dark:border-[#3F3F46]');
  });

  it('alert.tsx has no dark: classes', () => {
    const source = read('src/components/ui/alert.tsx');
    expect(source).not.toContain('dark:border-destructive');
  });

  it('globals.css has no .dark block', () => {
    const css = read('src/styles/globals.css');
    // The `.dark` selector should not appear as a style block
    expect(css).not.toMatch(/\.dark\s*\{/);
  });

  it('tailwind.config.ts has no darkMode setting', () => {
    const config = read('tailwind.config.ts');
    expect(config).not.toContain('darkMode');
  });
});
