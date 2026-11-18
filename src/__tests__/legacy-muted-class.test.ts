/* eslint-disable security/detect-non-literal-fs-filename */
import { readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const SRC_ROOT = path.resolve(process.cwd(), 'src');

/** Tailwind class names that start with `text-muted` elsewhere. */
const FORBIDDEN = /(?<![\w-])text-muted(?![\w-])/;

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

describe('legacy muted text class', () => {
  it('is not used by any source file, because it maps to charcoal-100', () => {
    const offenders = collectSources(SRC_ROOT).filter(file =>
      FORBIDDEN.test(readFileSync(file, 'utf8'))
    );

    expect(offenders).toEqual([]);
  });
});
