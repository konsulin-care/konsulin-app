import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/** Removes block comments so brace walking never reads prose. */
function stripComments(css: string): string {
  return css.replace(/\/\*[\s\S]*?\*\//g, '');
}

/**
 * Finds every declaration of `property` in `css` and returns the chain of
 * enclosing block headers for each one.
 * @param css - Raw stylesheet text.
 * @param property - Declaration name to look for, e.g. `border-color`.
 * @returns One array of enclosing block headers per matching declaration.
 */
function declarationsWithBlocks(css: string, property: string): string[][] {
  const text = stripComments(css);
  const stack: string[] = [];
  const found: string[][] = [];
  let buffer = '';

  for (const char of text) {
    if (char === '{') {
      stack.push(buffer.trim());
      buffer = '';
    } else if (char === '}') {
      stack.pop();
      buffer = '';
    } else if (char === ';') {
      const declaration = buffer.trim();
      if (declaration.startsWith(`${property}:`)) found.push([...stack]);
      buffer = '';
    } else {
      buffer += char;
    }
  }
  return found;
}

describe('Tailwind emission', () => {
  const stylesDir = resolve(__dirname, '..');
  const index = readFileSync(resolve(stylesDir, 'index.scss'), 'utf8');
  const globals = readFileSync(resolve(stylesDir, 'globals.css'), 'utf8');

  it('does not import Tailwind a second time from index.scss', () => {
    // globals.css already emits Tailwind. A second emission appends its
    // preflight after globals.css inside @layer base, and that preflight's
    // `border: 0 solid` resets the border-color default back to currentColor.
    expect(index).not.toMatch(/^\s*@use\s+['"]tailwindcss[^'"]*['"]/m);
    expect(index).not.toMatch(/^\s*@import\s+['"]tailwindcss[^'"]*['"]/m);
  });

  it('still loads the palette and the form stylesheets', () => {
    expect(index).toMatch(/@use\s+'\.\/palette';/);
    expect(index).toMatch(/meta\.load-css\('custom-smart-form\.scss'\)/);
    expect(index).toMatch(/meta\.load-css\('custom-soap-form\.scss'\)/);
  });

  it('keeps every border-color declaration inside an @layer block', () => {
    // An unlayered rule beats every layered utility, so `border-border`
    // would lose to a bare `* { border-color: … }`.
    const offenders = declarationsWithBlocks(globals, 'border-color').filter(
      blocks => !blocks.some(block => block.trim().startsWith('@layer'))
    );

    expect(offenders).toEqual([]);
  });
});
