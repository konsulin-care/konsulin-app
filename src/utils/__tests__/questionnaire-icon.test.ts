import { describe, expect, it } from 'vitest';
import { FhirSystems } from '../fhir/extensions';
import {
  CATEGORY_DEFAULT_ICONS,
  getLucideIconName
} from '../fhir/questionnaire-icon';

describe('getLucideIconName', () => {
  it('returns PascalCase name from kebab-case code', () => {
    const codes = [{ system: FhirSystems.lucide, code: 'activity' }];
    expect(getLucideIconName(codes)).toBe('Activity');
  });

  it('handles multi-word kebab-case codes', () => {
    const codes = [{ system: FhirSystems.lucide, code: 'squares-subtract' }];
    expect(getLucideIconName(codes)).toBe('SquaresSubtract');
  });

  it('returns null when no lucide icon code exists', () => {
    const codes = [{ system: 'https://loinc.org', code: '44249-1' }];
    expect(getLucideIconName(codes)).toBeNull();
  });

  it('returns null when codes array is undefined', () => {
    // deepsource:ignore JS-W1042 — explicit undefined input under test
    // eslint-disable-next-line unicorn/no-useless-undefined -- explicit undefined input under test
    expect(getLucideIconName(undefined)).toBeNull();
  });

  it('returns null when codes array is empty', () => {
    expect(getLucideIconName([])).toBeNull();
  });

  it('picks the lucide icon among other codes', () => {
    const codes = [
      { system: 'https://loinc.org', code: '44249-1' },
      { system: FhirSystems.lucide, code: 'brain' },
      { system: 'https://snomed.info/sct', code: '123456' }
    ];
    expect(getLucideIconName(codes)).toBe('Brain');
  });

  it('handles single-letter segments', () => {
    const codes = [{ system: FhirSystems.lucide, code: 'p-c' }];
    expect(getLucideIconName(codes)).toBe('PC');
  });
});

describe('CATEGORY_DEFAULT_ICONS', () => {
  it('maps physical-health to Heart', () => {
    expect(CATEGORY_DEFAULT_ICONS['physical-health']).toBe('Heart');
  });

  it('maps mental-emotional-health to Brain', () => {
    expect(CATEGORY_DEFAULT_ICONS['mental-emotional-health']).toBe('Brain');
  });

  it('maps social-health-relationships to Users', () => {
    expect(CATEGORY_DEFAULT_ICONS['social-health-relationships']).toBe('Users');
  });

  it('maps functional-capacity to Accessibility', () => {
    expect(CATEGORY_DEFAULT_ICONS['functional-capacity']).toBe('Accessibility');
  });

  it('maps meaning-purpose-fulfilment to Sparkles', () => {
    expect(CATEGORY_DEFAULT_ICONS['meaning-purpose-fulfilment']).toBe(
      'Sparkles'
    );
  });

  it('maps health-behaviours-lifestyle to Activity', () => {
    expect(CATEGORY_DEFAULT_ICONS['health-behaviours-lifestyle']).toBe(
      'Activity'
    );
  });

  it('maps environmental-contextual to Building', () => {
    expect(CATEGORY_DEFAULT_ICONS['environmental-contextual']).toBe('Building');
  });

  it('has exactly 7 category entries', () => {
    expect(Object.keys(CATEGORY_DEFAULT_ICONS)).toHaveLength(7);
  });
});
