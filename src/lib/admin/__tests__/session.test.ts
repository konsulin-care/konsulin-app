import {
  clearKeyFlag,
  isKeySet,
  KEY_SET_FLAG,
  markKeySet
} from '@/lib/admin/session';
import { afterEach, describe, expect, it } from 'vitest';

describe('admin key session flag', () => {
  afterEach(() => {
    sessionStorage.clear();
  });

  it('defaults to unset', () => {
    expect(isKeySet()).toBe(false);
  });

  it('reflects markKeySet', () => {
    markKeySet();
    expect(isKeySet()).toBe(true);
    expect(sessionStorage.getItem(KEY_SET_FLAG)).toBe('1');
  });

  it('clearKeyFlag resets the flag', () => {
    markKeySet();
    clearKeyFlag();
    expect(isKeySet()).toBe(false);
  });

  it('never stores the actual key value', () => {
    markKeySet();
    const stored = sessionStorage.getItem(KEY_SET_FLAG);
    expect(stored).toBe('1');
  });
});
