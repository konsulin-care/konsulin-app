import { beforeEach, describe, expect, it } from 'vitest';
import {
  clearConsentFlag,
  CONSENT_FLAG_PREFIX,
  consentStorageKey,
  readConsentFlag,
  writeConsentFlag
} from '../consent';

describe('consent flags', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it('builds a namespaced storage key per study', () => {
    expect(consentStorageKey('study-a')).toBe('konsulin_consent_study-a');
    expect(consentStorageKey('study-a')).toBe(`${CONSENT_FLAG_PREFIX}study-a`);
  });

  it('writes and reads a consent flag per study', () => {
    expect(readConsentFlag(window.localStorage, 'study-a')).toBe(false);

    writeConsentFlag(window.localStorage, 'study-a');

    expect(readConsentFlag(window.localStorage, 'study-a')).toBe(true);
    expect(readConsentFlag(window.localStorage, 'study-b')).toBe(false);
  });

  it('clears a consent flag', () => {
    writeConsentFlag(window.localStorage, 'study-a');
    clearConsentFlag(window.localStorage, 'study-a');

    expect(readConsentFlag(window.localStorage, 'study-a')).toBe(false);
  });
});
