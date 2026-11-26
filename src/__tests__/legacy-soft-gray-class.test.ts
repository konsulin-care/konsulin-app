/* eslint-disable security/detect-non-literal-fs-filename */
import { readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const SRC_ROOT = path.resolve(process.cwd(), 'src');

/**
 * Tailwind classes whose colour name is still the dead `softGray` token.
 * No `--color-softGray` exists in the theme, so these emit no CSS at all.
 */
const FORBIDDEN =
  /(?<![\w-])(?:[\w-]+:)*(?:bg|border|text|ring)-softGray(?![\w-])/;

/**
 * Collects every `.ts`/`.tsx` file under `src`, skipping `__tests__`
 * directories and any `.archive` directory at any depth.
 * @param dir - Absolute directory to walk.
 * @returns Absolute paths of the collected source files.
 */
function collectSources(dir: string): string[] {
  const collected: string[] = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === '__tests__' || entry.name === '.archive') continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      collected.push(...collectSources(full));
      continue;
    }
    if (/\.tsx?$/.test(entry.name)) collected.push(full);
  }
  return collected;
}

/**
 * Reads a source file and returns the single line containing `needle`.
 * @param relativePath - Path relative to the repository root.
 * @param needle - Substring identifying the wanted line.
 * @returns The matching source line, trimmed.
 */
function lineContaining(relativePath: string, needle: string): string {
  const source = readFileSync(
    path.resolve(process.cwd(), relativePath),
    'utf8'
  );
  const line = source.split('\n').find(candidate => candidate.includes(needle));
  if (!line) throw new Error(`no line containing ${needle} in ${relativePath}`);
  return line.trim();
}

describe('legacy softGray class', () => {
  it('is not used by any source file, because the token does not exist', () => {
    const offenders = collectSources(SRC_ROOT).filter(file =>
      FORBIDDEN.test(readFileSync(file, 'utf8'))
    );

    expect(offenders).toEqual([]);
  });

  it('uses a muted fill for both faded action button variants', () => {
    expect(
      lineContaining('src/components/fab/action-button.tsx', 'secondary:')
    ).toContain('bg-muted');
    expect(
      lineContaining('src/components/fab/action-button.tsx', 'ghost:')
    ).toContain('hover:bg-muted');
  });
});
