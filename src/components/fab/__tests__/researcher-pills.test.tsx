import { describe, expect, it } from 'vitest';
import { researcherPills } from '../pills';

describe('researcherPills', () => {
  it('has two pills', () => {
    expect(researcherPills).toHaveLength(2);
  });

  it('has Register Survey pill with correct properties', () => {
    const registerPill = researcherPills[0];
    expect(registerPill.label).toBe('Register Survey');
    expect(registerPill.action).toBe('register-research');
    expect(registerPill.delay).toBe(0);
    expect(registerPill.icon).toBeDefined();
  });

  it('has My Survey pill with correct properties', () => {
    const researchPill = researcherPills[1];
    expect(researchPill.label).toBe('My Survey');
    expect(researchPill.action).toBe('navigate');
    expect(researchPill.href).toBe('/research');
    expect(researchPill.delay).toBe(50);
    expect(researchPill.icon).toBeDefined();
  });
});
