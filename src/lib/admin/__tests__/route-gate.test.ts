import { isAdminPath } from '@/lib/admin/route-gate';
import { describe, expect, it } from 'vitest';

describe('isAdminPath', () => {
  it('returns true for the /admin root', () => {
    expect(isAdminPath('/admin')).toBe(true);
    expect(isAdminPath('/admin/')).toBe(true);
  });

  it('returns true for nested admin paths', () => {
    expect(isAdminPath('/admin/settings')).toBe(true);
  });

  it('returns false for non-admin paths', () => {
    expect(isAdminPath('/')).toBe(false);
    expect(isAdminPath('/profile')).toBe(false);
  });

  it('returns false for lookalike prefixes', () => {
    expect(isAdminPath('/administrator')).toBe(false);
    expect(isAdminPath('/admin-api')).toBe(false);
  });

  it('handles undefined pathname', () => {
    expect(isAdminPath(undefined)).toBe(false);
  });
});
