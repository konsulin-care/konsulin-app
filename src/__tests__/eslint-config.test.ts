import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * Read the eslint config file and extract rule definitions.
 * We parse the file as text because loading it as a module fails
 * due to Next.js patch incompatibilities in Node.js standalone mode.
 */
function readConfigText(): string {
  return readFileSync(resolve(__dirname, '../../eslint.config.cjs'), 'utf8');
}

/**
 * Extract a rule value from the config text.
 */
function getRuleLevel(rule: string): string | undefined {
  const text = readConfigText();

  // The rule name is controlled input from our known rule list — safe.
  // eslint-disable-next-line security/detect-non-literal-regexp
  const ruleRegex = new RegExp(
    `'${escapeRegex(rule)}'\\s*:\\s*(?:'([^']+)'|\\['([^']+)')`,
    'g'
  );
  const matches = [...text.matchAll(ruleRegex)];
  const lastMatch = matches.at(-1);
  return lastMatch?.[1] ?? lastMatch?.[2];
}

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

describe('ESLint config rule tiers', () => {
  // ── Tier 1: Always-on (error) — Real bugs & security ──
  describe('Tier 1: Always-on (error)', () => {
    const tier1Rules: [string, string][] = [
      ['no-nested-ternary', 'error'],
      ['no-implicit-coercion', 'error'],
      ['no-negated-condition', 'error'],
      ['consistent-return', 'error'],
      ['@typescript-eslint/no-floating-promises', 'error'],
      ['@typescript-eslint/no-misused-promises', 'error'],
      ['promise/catch-or-return', 'error'],
      ['@typescript-eslint/no-unnecessary-type-conversion', 'error'],
      ['promise/no-nesting', 'error'],
      ['@typescript-eslint/no-unused-vars', 'error'],
      ['sonarjs/no-unused-vars', 'error'],
      ['promise/always-return', 'error'],
      ['sonarjs/slow-regex', 'error'],
      ['sonarjs/no-dead-store', 'error'],
      ['sonarjs/no-identical-expressions', 'error'],
      ['unicorn/no-array-sort', 'error'],
      ['sonarjs/function-return-type', 'error'],
      ['@typescript-eslint/no-deprecated', 'error'],
      ['@typescript-eslint/use-unknown-in-catch-callback-variable', 'error'],
      ['@typescript-eslint/no-unnecessary-type-assertion', 'error'],
      ['max-depth', 'error'],
      ['security/detect-unsafe-regex', 'error'],
      ['max-params', 'error']
    ];

    const tier1Off: [string, string][] = [
      ['@typescript-eslint/no-unnecessary-condition', 'off']
    ];

    it.each(tier1Off)(
      'rule %s stays off (requires strictNullChecks)',
      (rule, expectedLevel) => {
        const level = getRuleLevel(rule);
        expect(level).toBe(expectedLevel);
      }
    );

    it.each(tier1Rules)('rule %s is set to %s', (rule, expectedLevel) => {
      const level = getRuleLevel(rule);
      if (level === undefined) {
        return;
      }
      expect(level).toBe(expectedLevel);
    });
  });

  // ── Tier 2: Hard-off — FHIR domain noise ──
  describe('Tier 2: Hard-off (with FHIR justification comments)', () => {
    const tier2Rules: [string, string][] = [
      ['@typescript-eslint/no-non-null-assertion', 'off'],
      ['@typescript-eslint/restrict-template-expressions', 'off'],
      ['security/detect-object-injection', 'off'],
      ['sonarjs/no-clear-text-protocols', 'off']
    ];

    it.each(tier2Rules)('rule %s is off', (rule, expectedLevel) => {
      const level = getRuleLevel(rule);
      expect(level).toBe(expectedLevel);
    });
  });

  // ── Tier 3: Progressive (warn) — Fixable debt ──
  describe('Tier 3: Progressive (warn)', () => {
    const tier3Rules: [string, string][] = [
      ['@typescript-eslint/no-unsafe-member-access', 'warn'],
      ['@typescript-eslint/no-unsafe-call', 'warn'],
      ['@typescript-eslint/no-unsafe-return', 'warn'],
      ['@typescript-eslint/no-unsafe-argument', 'warn'],
      ['no-console', 'warn'],
      ['complexity', 'warn'],
      ['security/detect-non-literal-regexp', 'warn'],
      ['import/no-named-as-default-member', 'warn']
    ];

    it.each(tier3Rules)('rule %s is set to %s', (rule, expectedLevel) => {
      const level = getRuleLevel(rule);
      expect(level).toBe(expectedLevel);
    });
  });

  // ── Other rules that should stay off (noise reducers) ──
  describe('Other permanently-off rules', () => {
    const offRules: string[] = [
      '@typescript-eslint/no-explicit-any',
      '@typescript-eslint/no-confusing-void-expression',
      '@typescript-eslint/consistent-type-definitions',
      '@typescript-eslint/array-type',
      '@typescript-eslint/prefer-regexp-exec',
      '@typescript-eslint/no-unnecessary-template-expression',
      '@typescript-eslint/prefer-nullish-coalescing',
      '@typescript-eslint/no-unnecessary-boolean-literal-compare',
      'unicorn/no-null',
      'unicorn/filename-case',
      'unicorn/prevent-abbreviations',
      'unicorn/import-style',
      'unicorn/no-array-for-each',
      'unicorn/consistent-function-scoping',
      'unicorn/prefer-logical-operator-over-ternary',
      'unicorn/prefer-split-limit',
      'unicorn/prefer-string-raw',
      'unicorn/prefer-string-replace-all',
      'unicorn/no-lonely-if',
      'unicorn/prefer-global-this',
      'unicorn/no-console-spaces',
      'unicorn/prefer-number-properties',
      'unicorn/prefer-regexp-test',
      'unicorn/prefer-code-point',
      'unicorn/consistent-compound-words',
      'unicorn/catch-error-name',
      'sonarjs/no-duplicate-string',
      'sonarjs/no-hardcoded-passwords',
      'sonarjs/prefer-read-only-props',
      'sonarjs/no-useless-catch',
      'sonarjs/pseudo-random',
      'sonarjs/deprecation',
      'sonarjs/prefer-regexp-exec',
      'import/no-named-as-default',
      'jsdoc/require-jsdoc'
    ];

    it.each(offRules)('rule %s is set to off', rule => {
      const level = getRuleLevel(rule);
      if (level === undefined) {
        return;
      }
      expect(level).toBe('off');
    });
  });

  // ── Config structure integrity ──
  describe('Config structure', () => {
    it('has a TS-specific config block for src/**/*.ts and src/**/*.tsx', () => {
      const text = readConfigText();
      expect(text).toMatch(/files:\s*\[[^\]]*src\/\*\*\/\*\.ts/);
    });

    it('has a general overrides block with plugins', () => {
      const text = readConfigText();
      expect(text).toMatch(/plugins:\s*\{[^}]*sonarjs[^}]*jsdoc[^}]*unicorn/);
    });

    it('has an auth-spa overrides block', () => {
      const text = readConfigText();
      expect(text).toMatch(/files:\s*\[[^\]]*web\/auth-spa/);
    });
  });
});
