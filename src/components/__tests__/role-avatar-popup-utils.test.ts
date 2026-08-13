import { describe, expect, it } from 'vitest';

import { roleIcon, roleLabel } from '@/components/role-avatar-popup-utils';

describe('roleLabel', () => {
  it('returns the display label for known roles', () => {
    expect(roleLabel('Patient')).toBe('Patient');
    expect(roleLabel('Practitioner')).toBe('Practitioner');
    expect(roleLabel('Clinic Admin')).toBe('Clinic Admin');
    expect(roleLabel('Researcher')).toBe('Researcher');
  });

  it('falls back to the raw role string for unknown roles', () => {
    expect(roleLabel('Unknown Role')).toBe('Unknown Role');
  });
});

describe('roleIcon', () => {
  it('maps every known role to an icon component', () => {
    expect(roleIcon('Patient')).toBeDefined();
    expect(roleIcon('Practitioner')).toBeDefined();
    expect(roleIcon('Clinic Admin')).toBeDefined();
    expect(roleIcon('Researcher')).toBeDefined();
  });

  it('returns distinct icons for distinct roles', () => {
    const roleNames = ['Patient', 'Practitioner', 'Clinic Admin', 'Researcher'];
    const icons = roleNames.map(role => roleIcon(role));
    expect(new Set(icons).size).toBe(4);
  });

  it('falls back to the default User icon for unknown roles', () => {
    expect(roleIcon('Unknown Role')).toBeDefined();
  });
});
