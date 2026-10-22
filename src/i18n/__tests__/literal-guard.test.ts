import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  isAllowlisted,
  scanSource,
  scanTree,
  violationKey
} from './literal-guard-scanner';

// Vitest runs with the project root as cwd.
const SRC_DIR = path.resolve(process.cwd(), 'src');
const BASELINE_FILE = path.resolve(
  process.cwd(),
  'src/i18n/__tests__/fixtures/literal-guard-baseline.json'
);

/**
 * Pre-existing violations recorded when the guard was introduced.
 * Area commits that translate literals must remove the matching entries;
 * new literals not listed here fail the guard.
 */
const BASELINE: string[] = JSON.parse(
  fs.readFileSync(BASELINE_FILE, 'utf8')
) as string[];

describe('literal guard for hardcoded JSX attributes and toasts', () => {
  it('flags a fixture with untranslated literal attributes and toasts', () => {
    const fixture = [
      'function Fixture() {',
      '  return (',
      '    <AppDrawer',
      "      title='No results found'",
      '      subtitle="Try a different search"',
      "      ctaLabel='Get started'",
      '    >',
      '      <Input placeholder=\'Search patients\' aria-label="Close dialog" />',
      "      <img alt='patient photo' />",
      '      <Card label=\'Summary\' description="Patient summary card" />',
      '    </AppDrawer>',
      '  );',
      '}'
    ].join('\n');

    const violations = scanSource(
      'src/__fixtures__/literal-fixture.tsx',
      fixture
    );

    expect(violations.map(violationKey).sort()).toEqual([
      "src/__fixtures__/literal-fixture.tsx|attribute|alt='patient photo'",
      "src/__fixtures__/literal-fixture.tsx|attribute|aria-label='Close dialog'",
      "src/__fixtures__/literal-fixture.tsx|attribute|ctaLabel='Get started'",
      "src/__fixtures__/literal-fixture.tsx|attribute|description='Patient summary card'",
      "src/__fixtures__/literal-fixture.tsx|attribute|label='Summary'",
      "src/__fixtures__/literal-fixture.tsx|attribute|placeholder='Search patients'",
      "src/__fixtures__/literal-fixture.tsx|attribute|subtitle='Try a different search'",
      "src/__fixtures__/literal-fixture.tsx|attribute|title='No results found'"
    ]);
  });

  it('flags toasts called with a plain string literal', () => {
    const fixture = [
      "toast.success('Location added successfully');",
      'toast.error("Failed to save. Please try again.");',
      'toast.info(`Loading results`);' // skipcq: JS-0038 - fixture string, not a template literal
    ].join('\n');

    const violations = scanSource('src/__fixtures__/toast-fixture.ts', fixture);

    expect(violations.map(violationKey).sort()).toEqual([
      'src/__fixtures__/toast-fixture.ts|toast|toast:Failed to save. Please try again.',
      'src/__fixtures__/toast-fixture.ts|toast|toast:Loading results',
      'src/__fixtures__/toast-fixture.ts|toast|toast:Location added successfully'
    ]);
  });

  it('accepts a fixture that resolves strings via t() or variables', () => {
    const fixture = [
      'function Fixture({ errorMessage }: { errorMessage: string }) {',
      '  return (',
      "    <AppDrawer title={t('common.noResults')} subtitle={t('empty.subtitle')}>",
      "      <Input placeholder={t('search.placeholder')} aria-label={t('common.close')} />",
      "      <img alt={t('photo.alt')} />",
      "      <Card label={t('summary.label')} description={t('summary.description')} />",
      '      {toast.error(errorMessage)}',
      '      {toast.error(err.message)}',
      '      {toast.success(`Saved ${count} items`)}', // skipcq: JS-0038 - fixture string, not a template literal
      '    </AppDrawer>',
      '  );',
      '}'
    ].join('\n');

    expect(scanSource('src/__fixtures__/clean-fixture.tsx', fixture)).toEqual(
      []
    );
  });

  it('allowlists test files and the admin console', () => {
    expect(isAllowlisted('src/components/admin/admin-shell.tsx')).toBe(true);
    expect(isAllowlisted('src/app/admin/page.tsx')).toBe(true);
    expect(
      isAllowlisted('src/components/admin/__tests__/admin-shell.test.tsx')
    ).toBe(true);
    expect(isAllowlisted('src/app/clinic/__tests__/clinic-list.test.tsx')).toBe(
      true
    );
    expect(isAllowlisted('src/components/clinic/clinic-list.tsx')).toBe(false);
  });

  it('has no new literal attribute or toast violations in src/', () => {
    const found = scanTree(SRC_DIR);
    const currentKeys = [...found.keys()].sort();
    const baseline = new Set(BASELINE);

    const newViolations = currentKeys.filter(key => !baseline.has(key));
    const staleEntries = BASELINE.filter(key => !found.has(key));

    // Baseline entries disappear as areas get translated; log, do not fail.
    if (staleEntries.length > 0) {
      console.info(
        `[literal-guard] ${staleEntries.length} baseline entries no longer occur; ` +
          'remove them from fixtures/literal-guard-baseline.json'
      );
    }

    expect(
      newViolations,
      `Hardcoded literals must move to t() in src/messages. New violations:\n${newViolations.join('\n')}`
    ).toEqual([]);
  });
});
