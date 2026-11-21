import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

import { scanSource, scanStylesheet } from './raw-color-scan';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const repoRoot = resolve(__dirname, '../../..');

interface AllowlistEntry {
  path: string;
  reason: string;
}

/**
 * Files that legitimately define raw colours or legacy aliases (token palette
 * and colour-derivation helpers). Every entry must exist and be justified.
 */
const ALLOWLIST: AllowlistEntry[] = [
  {
    path: 'src/styles/tokens.ts',
    reason: 'Defines the canonical design-token palette and raw colour values.'
  },
  {
    path: 'src/utils/location-color.ts',
    reason: 'Maps location identifiers to design-token colour values.'
  },
  {
    path: 'src/utils/gradientAvatar.ts',
    reason: 'Generates avatar gradients from token colour values.'
  }
];

const SOURCE_ROOT = 'src';

/** Directories whose files are out of scope for the token sweep. */
const EXCLUDED_DIRS: string[] = [
  'src/app/research/',
  'src/app/report/',
  'src/components/research/'
];

/**
 * Lists every TypeScript source file under src, excluding tests, the research
 * and report directories, and any path already allowlisted.
 *
 * @returns Sorted repo-relative paths of the files the guard must scan.
 */
function collectSourceFiles(): string[] {
  const allowlisted = new Set(ALLOWLIST.map(entry => entry.path));

  return readdirSync(resolve(repoRoot, SOURCE_ROOT), { recursive: true })
    .map(entry => entry.toString().replaceAll('\\', '/'))
    .filter(name => name.endsWith('.ts') || name.endsWith('.tsx'))
    .map(name => `${SOURCE_ROOT}/${name}`)
    .filter(name => !name.includes('/__tests__/'))
    .filter(name => !/\.test\.[^.]+$/.test(name))
    .filter(name => !EXCLUDED_DIRS.some(dir => name.startsWith(dir)))
    .filter(name => !allowlisted.has(name))
    .sort();
}

describe('raw colour guard', () => {
  it('flags every guarded colour and utility form', () => {
    const source = [
      'className="bg-[#13c2c2] text-[#2c2f35]"',
      'className="text-[10px] text-[11px]"',
      'className="bg-[var(--secondary)] text-[var(--soft-gray)]"',
      'className="text-[var(--muted)] bg-[var(--primary)] border-[var(--border)]"',
      'className="text-gray-500 bg-slate-100 border-gray-200"',
      'className="bg-white text-black"',
      'className="text-teal-500"',
      'className="text-secondary"',
      'className="text-red-500 bg-amber-100 border-green-500 text-blue-600"'
    ].join('\n');

    const findings = scanSource(source);
    const matches = findings.map(finding => finding.match);
    const patterns = findings.map(finding => finding.pattern);

    expect(matches).toContain('#13c2c2');
    expect(matches).toContain('text-[10px]');
    expect(matches).toContain('text-[11px]');
    expect(matches).toContain('var(--secondary)');
    expect(matches).toContain('var(--soft-gray)');
    expect(matches).toContain('var(--muted)');
    expect(matches).toContain('var(--primary)');
    expect(matches).toContain('var(--border)');
    expect(matches).toContain('text-gray-500');
    expect(matches).toContain('bg-slate-100');
    expect(matches).toContain('border-gray-200');
    expect(matches).toContain('bg-white');
    expect(matches).toContain('text-black');
    expect(matches).toContain('text-teal-500');
    expect(matches).toContain('text-secondary');
    expect(matches).toContain('text-red-500');
    expect(matches).toContain('bg-amber-100');
    expect(matches).toContain('border-green-500');
    expect(matches).toContain('text-blue-600');

    expect(patterns).toContain('six-digit-hex');
    expect(patterns).toContain('text-10-11px');
    expect(patterns).toContain('legacy-css-var');
    expect(patterns).toContain('neutral-utility');
    expect(patterns).toContain('bg-white');
    expect(patterns).toContain('text-black');
    expect(patterns).toContain('text-teal');
    expect(patterns).toContain('text-secondary');
    expect(patterns).toContain('status-utility');
  });

  it('ignores allowed tokens, allowed utilities and three-digit hex', () => {
    const source = [
      'className="bg-secondary"',
      'className="text-secondary-foreground"',
      'className="text-white"',
      'className="shadow-md"',
      'className="bg-[var(--color-turquoise-deep)]"',
      'className="bg-[#fff] text-[#000]"'
    ].join('\n');

    expect(scanSource(source)).toEqual([]);
  });

  it('sweeps every src source file outside tests, exclusions and the allowlist', () => {
    const report: string[] = [];
    const files = collectSourceFiles();

    expect(files.length).toBeGreaterThan(0);

    for (const relativePath of files) {
      const text = readFileSync(resolve(repoRoot, relativePath), 'utf8');
      for (const finding of scanSource(text)) {
        report.push(`${relativePath}:${finding.line}:${finding.match}`);
      }
    }

    expect(report, report.join('\n')).toEqual([]);
  });

  it('keeps every allowlist entry pointing to an existing, justified file', () => {
    for (const entry of ALLOWLIST) {
      expect(
        existsSync(resolve(repoRoot, entry.path)),
        `${entry.path} must exist`
      ).toBe(true);
      expect(
        entry.reason.trim().length,
        `${entry.path} needs a non-empty reason`
      ).toBeGreaterThan(0);
    }
  });
});

describe('stylesheet token guard', () => {
  const readRepoFile = (relativePath: string): string =>
    readFileSync(resolve(repoRoot, relativePath), 'utf8');

  it('flags six-digit hex and legacy var reads in stylesheet text', () => {
    const findings = scanStylesheet(
      'color: #2c2f35; background: var(--primary); #fff; var(--color-border);'
    );

    expect(findings.map(finding => finding.match)).toEqual([
      '#2c2f35',
      'var(--primary)'
    ]);
    expect(findings.map(finding => finding.pattern)).toEqual([
      'six-digit-hex',
      'legacy-css-var'
    ]);
  });

  it('keeps phone input and soap form on design tokens', () => {
    for (const relativePath of [
      'src/styles/phone-input.css',
      'src/styles/custom-soap-form.scss'
    ]) {
      const findings = scanStylesheet(readRepoFile(relativePath));
      expect(findings, relativePath).toEqual([]);
    }
  });

  it('removes legacy aliases and legacy var reads from globals.css', () => {
    const globals = readRepoFile('src/styles/globals.css');

    expect(globals).not.toMatch(
      /--(primary|secondary|soft-gray|muted|border):/
    );
    expect(
      scanStylesheet(globals).filter(
        finding => finding.pattern === 'legacy-css-var'
      )
    ).toEqual([]);
  });
});
