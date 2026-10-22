import { describe, expect, it } from 'vitest';
import { getRoleValue, setRoleValue } from '../role-map';

describe('getRoleValue', () => {
  it('reads an existing key', () => {
    const map = { patient: 'res-1', practitioner: 'res-2' };
    expect(getRoleValue(map, 'patient')).toBe('res-1');
  });

  it('returns undefined for a missing key', () => {
    const map = { patient: 'res-1' };
    expect(getRoleValue(map, 'company')).toBeUndefined();
  });

  it('returns undefined when the map is undefined', () => {
    expect(getRoleValue(undefined, 'patient')).toBeUndefined();
  });

  it('throws a TypeError for a banned key that is not present', () => {
    const map = { patient: 'res-1' };
    expect(() => getRoleValue(map, '__proto__')).toThrow(TypeError);
    expect(() => getRoleValue(map, 'constructor')).toThrow(TypeError);
  });

  it('rejects __-prefixed keys that are not present', () => {
    const map = { patient: 'res-1' };
    expect(() => getRoleValue(map, '__hidden')).toThrow(TypeError);
  });

  it('allows a banned key that already exists (backward compat)', () => {
    const map = { patient: 'res-1' } as Record<string, string>;
    Object.defineProperty(map, 'constructor', {
      value: 'res-legacy',
      enumerable: true,
      configurable: true
    });
    expect(getRoleValue(map, 'constructor')).toBe('res-legacy');
  });
});

describe('setRoleValue', () => {
  it('writes a new key', () => {
    const map: Record<string, number> = {};
    setRoleValue(map, 'patient', 1);
    expect(map.patient).toBe(1);
  });

  it('overwrites an existing key', () => {
    const map: Record<string, number> = { patient: 1 };
    setRoleValue(map, 'patient', 2);
    expect(map.patient).toBe(2);
  });

  it('throws a TypeError for a banned key that is not present', () => {
    const map: Record<string, number> = {};
    expect(() => setRoleValue(map, '__proto__', 1)).toThrow(TypeError);
    expect(() => setRoleValue(map, 'prototype', 1)).toThrow(TypeError);
  });

  it('rejects __-prefixed keys that are not present', () => {
    const map: Record<string, number> = {};
    expect(() => setRoleValue(map, '__hidden', 1)).toThrow(TypeError);
  });
});
