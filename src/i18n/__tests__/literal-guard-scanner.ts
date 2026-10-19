import fs from 'node:fs';
import path from 'node:path';

/** JSX attributes whose string-literal values must come from t(). */
export const GUARDED_ATTRIBUTES = [
  'placeholder',
  'title',
  'aria-label',
  'alt',
  'label',
  'ctaLabel',
  'subtitle',
  'description'
] as const;

/** Path prefixes exempt from the guard: the admin console. */
export const ALLOWED_PATH_PREFIXES = [
  'src/app/admin/',
  'src/components/admin/'
];

/** A single hardcoded-literal finding in a source file. */
export interface Violation {
  /** Repo-relative file path using forward slashes. */
  file: string;
  /** What was flagged. */
  kind: 'attribute' | 'toast';
  /** Normalized description, e.g. `placeholder='Search'` or `toast:Saved`. */
  detail: string;
}

/** Stable dedupe/compare key for a violation. */
export function violationKey(violation: Violation): string {
  return `${violation.file}|${violation.kind}|${violation.detail}`;
}

// Literal pattern (no dynamic RegExp construction). Attribute names must be
// kept in sync with GUARDED_ATTRIBUTES above.
const ATTRIBUTE_PATTERN =
  /(?:^|[\s(<])(placeholder|title|aria-label|alt|label|ctaLabel|subtitle|description)\s*=\s*(["'])([^"']+?)\2/g;

const TOAST_PATTERN =
  /(?:^|[^a-zA-Z0-9_$.])toast(?:\.(?:success|error|info|warning|message))?\(\s*(["'`])((?:\\.|(?!\1)[^\\\n])*)\1/g;

/**
 * Detect hardcoded string literals in guarded JSX attributes and toast calls.
 *
 * @param file - Repo-relative file path (used for reporting only).
 * @param code - Full source text to scan.
 * @returns Violations found; empty when the code uses t() or variables.
 */
export function scanSource(file: string, code: string): Violation[] {
  const violations: Violation[] = [];
  const lines = code.split('\n');
  for (const line of lines) {
    for (const match of line.matchAll(ATTRIBUTE_PATTERN)) {
      const name = match.at(1) ?? '';
      const value = match.at(3) ?? '';
      violations.push({
        file,
        kind: 'attribute',
        detail: `${name}='${value}'`
      });
    }
    for (const match of line.matchAll(TOAST_PATTERN)) {
      const quote = match.at(1) ?? "'";
      const body = match.at(2) ?? '';
      if (quote === '`' && body.includes('${')) continue;
      if (body.trim() === '') continue;
      violations.push({ file, kind: 'toast', detail: `toast:${body}` });
    }
  }
  return violations;
}

/**
 * Check whether a repo-relative path is exempt from the guard.
 * Test files and the admin console are allowlisted.
 *
 * @param file - Repo-relative path with forward slashes.
 * @returns True when the file must not be scanned.
 */
export function isAllowlisted(file: string): boolean {
  if (file.includes('/__tests__/')) return true;
  if (/\.(test|spec)\.[tj]sx?$/.test(file)) return true;
  return ALLOWED_PATH_PREFIXES.some(prefix => file.startsWith(prefix));
}

/**
 * List every scannable (.ts/.tsx) source file under src/, excluding
 * allowlisted paths.
 *
 * @param srcDir - Absolute path to the src directory.
 * @returns Repo-relative file paths with forward slashes, sorted.
 */
export function listSourceFiles(srcDir: string): string[] {
  const root = path.dirname(srcDir);
  const files: string[] = [];
  const walk = (dir: string): void => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        walk(full);
        continue;
      }
      if (!/\.[tj]sx?$/.test(entry.name)) continue;
      const relative = path.relative(root, full).split(path.sep).join('/');
      if (isAllowlisted(relative)) continue;
      files.push(relative);
    }
  };
  walk(srcDir);
  return files.sort();
}

/**
 * Scan the whole src tree for hardcoded guarded literals.
 *
 * @param srcDir - Absolute path to the src directory.
 * @returns One entry per violation, keyed by {@link violationKey}.
 */
export function scanTree(srcDir: string): Map<string, Violation> {
  const root = path.dirname(srcDir);
  const found = new Map<string, Violation>();
  for (const file of listSourceFiles(srcDir)) {
    const code = fs.readFileSync(path.resolve(root, file), 'utf8');
    for (const violation of scanSource(file, code)) {
      found.set(violationKey(violation), violation);
    }
  }
  return found;
}
