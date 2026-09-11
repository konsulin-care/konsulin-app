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

  it('has My Studies pill with correct properties', () => {
    const studiesPill = researcherPills[1];
    expect(studiesPill.label).toBe('My Studies');
    expect(studiesPill.action).toBe('navigate');
    expect(studiesPill.href).toBe('/');
    expect(studiesPill.delay).toBe(50);
    expect(studiesPill.icon).toBeDefined();
  });
});
