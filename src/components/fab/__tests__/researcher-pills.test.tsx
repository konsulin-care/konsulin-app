import { describe, expect, it } from 'vitest';
import { researcherPills } from '../pills';

describe('researcherPills', () => {
  it('has one pill', () => {
    expect(researcherPills).toHaveLength(1);
  });

  it('has Register Survey pill with correct properties', () => {
    const registerPill = researcherPills[0];
    expect(registerPill.label).toBe('pill_register_survey');
    expect(registerPill.action).toBe('register-research');
    expect(registerPill.delay).toBe(0);
    expect(registerPill.icon).toBeDefined();
  });

  it('hides the Register Survey pill from the sidebar', () => {
    expect(researcherPills[0].sidebar).toBe(false);
  });
});
