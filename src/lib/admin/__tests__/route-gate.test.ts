import { isAdminPath, isBareShellPath } from '@/lib/admin/route-gate';
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
    // skipcq: JS-W1042 — tests the undefined branch of string | undefined
    expect(isAdminPath(undefined)).toBe(false);
  });
});

describe('isBareShellPath', () => {
  it('returns true for each bare root', () => {
    expect(isBareShellPath('/auth')).toBe(true);
    expect(isBareShellPath('/logout')).toBe(true);
    expect(isBareShellPath('/remove-account')).toBe(true);
    expect(isBareShellPath('/unauthorized')).toBe(true);
    expect(isBareShellPath('/~offline')).toBe(true);
  });

  it('returns true for nested bare paths', () => {
    expect(isBareShellPath('/auth/callback')).toBe(true);
    expect(isBareShellPath('/logout/confirm')).toBe(true);
    expect(isBareShellPath('/unauthorized/')).toBe(true);
  });

  it('returns false for the app root and non-bare paths', () => {
    expect(isBareShellPath('/')).toBe(false);
    expect(isBareShellPath('/profile')).toBe(false);
    expect(isBareShellPath('/admin')).toBe(false);
    expect(isBareShellPath('/admin/settings')).toBe(false);
  });

  it('returns false for lookalike prefixes', () => {
    expect(isBareShellPath('/authority')).toBe(false);
    expect(isBareShellPath('/auth-x')).toBe(false);
    expect(isBareShellPath('/logout-review')).toBe(false);
  });

  it('handles undefined and empty pathname', () => {
    // skipcq: JS-W1042 — tests the undefined branch of string | undefined
    expect(isBareShellPath(undefined)).toBe(false);
    expect(isBareShellPath('')).toBe(false);
  });
});
