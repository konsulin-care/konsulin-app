import { describe, expect, it } from 'vitest';

import { createAssessmentTheme } from '../assessment-theme';

describe('createAssessmentTheme', () => {
  it('maps palette colours to the design tokens', () => {
    const theme = createAssessmentTheme();

    expect(theme.palette.primary.main).toBe('#0F7981');
    expect(theme.palette.success.main).toBe('#0F7981');
    expect(theme.palette.error.main).toBe('#B3261E');
    expect(theme.palette.text.primary).toBe('#161C26');
    expect(theme.palette.background.default).toBe('#FAFAF8');
  });

  it('sets typography and shape', () => {
    const theme = createAssessmentTheme();

    expect(theme.typography.fontFamily).toMatch(/^var\(--font-jakarta\)/);
    expect(theme.shape.borderRadius).toBe(8);
  });

  it('styles the form control label with a checked tint and ring', () => {
    const theme = createAssessmentTheme();
    const overrides = theme.components?.MuiFormControlLabel?.styleOverrides;
    const root = overrides?.root as
      Record<string, unknown> | ((props: unknown) => unknown) | undefined;
    const resolved = (typeof root === 'function' ? root({}) : root) as
      Record<string, unknown> | undefined;

    expect(resolved?.minHeight).toBe(44);

    const checkedRule = resolved?.['&:has(.Mui-checked)'] as
      Record<string, unknown> | undefined;

    expect(checkedRule?.backgroundColor).toBe('#D8F1F1');
    expect(checkedRule?.boxShadow).toContain('#0F7981');
    expect(checkedRule?.boxShadow).toContain('inset');
  });
});
