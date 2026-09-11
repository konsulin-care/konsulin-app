import { describe, expect, it } from 'vitest';
import { researcherPills } from '../pills';

describe('researcherPills', () => {
  it('has two pills', () => {
    expect(researcherPills).toHaveLength(2);
  });

  it('has Register Research pill with correct properties', () => {
    const registerPill = researcherPills[0];
    expect(registerPill.label).toBe('Register Research');
    expect(registerPill.action).toBe('register-research');
    expect(registerPill.delay).toBe(0);
    expect(registerPill.icon).toBeDefined();
  });

  it('has My Research pill with correct properties', () => {
    const researchPill = researcherPills[1];
    expect(researchPill.label).toBe('My Research');
    expect(researchPill.action).toBe('navigate');
    expect(researchPill.href).toBe('/research');
    expect(researchPill.delay).toBe(50);
    expect(researchPill.icon).toBeDefined();
  });
});
