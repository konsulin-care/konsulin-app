import { describe, expect, it } from 'vitest';
import {
  buildShareMessage,
  buildShareUrl,
  buildWhatsAppShareUrl,
  captureReferralRef,
  clearReferralLocalState,
  isReferralWritten,
  markReferralWritten,
  parseReferralRef,
  readRefFromUrl,
  readShareCount,
  readStoredReferralRef,
  shareBadgeFor,
  writeShareCount,
  type ShareBadge
} from '../referral';

const ORIGIN = 'https://konsulin.care';

describe('buildShareUrl', () => {
  it('builds a patient link carrying ref=p_<fhirId>', () => {
    expect(
      buildShareUrl({
        origin: ORIGIN,
        isPatient: true,
        fhirId: 'DG3F3STPYZ6HX25A'
      })
    ).toBe('https://konsulin.care/research?ref=p_DG3F3STPYZ6HX25A');
  });

  it('builds a plain link for guests without a ref', () => {
    expect(buildShareUrl({ origin: ORIGIN, isPatient: false })).toBe(
      'https://konsulin.care/research'
    );
    expect(buildShareUrl({ origin: ORIGIN, isPatient: true })).toBe(
      'https://konsulin.care/research'
    );
  });
});

describe('parseReferralRef', () => {
  it('parses a patient ref', () => {
    expect(parseReferralRef('p_DG3F3STPYZ6HX25A')).toEqual({
      kind: 'patient',
      fhirId: 'DG3F3STPYZ6HX25A'
    });
  });

  it('returns null for absent, empty, or malformed refs', () => {
    expect(parseReferralRef(null)).toBeNull();
    expect(parseReferralRef()).toBeNull();
    expect(parseReferralRef('')).toBeNull();
    expect(parseReferralRef('DG3F3STPYZ6HX25A')).toBeNull();
    expect(parseReferralRef('g_DG3F3STPYZ6HX25A')).toBeNull();
    expect(parseReferralRef('p_')).toBeNull();
  });
});

describe('buildWhatsAppShareUrl', () => {
  it('encodes the prefilled message', () => {
    const url = buildWhatsAppShareUrl(buildShareMessage());
    expect(url).toMatch(/^https:\/\/wa\.me\/\?text=/);
    expect(url).not.toContain(' ');
    expect(url).not.toContain('%20%20');
    expect(decodeURIComponent(url.split('text=')[1])).toBe(buildShareMessage());
  });
});

describe('shareBadgeFor', () => {
  it('unlocks badges at 1, 3, and 5 shares', () => {
    expect(shareBadgeFor(0)).toBeNull();
    expect(shareBadgeFor(1)).toBe('buddy');
    expect(shareBadgeFor(2)).toBe('buddy');
    expect(shareBadgeFor(3)).toBe('community-researcher');
    expect(shareBadgeFor(4)).toBe('community-researcher');
    expect(shareBadgeFor(5)).toBe('captain');
    expect(shareBadgeFor(9)).toBe('captain');
  });

  it('exposes the badge order for UI display', () => {
    const badges: ShareBadge[] = ['buddy', 'community-researcher', 'captain'];
    expect(badges).toHaveLength(3);
  });
});

describe('share booster storage', () => {
  it('round-trips the counter through a Storage-like object', () => {
    const storage = new Map<string, string>();
    const fakeStorage = {
      getItem: (key: string) => storage.get(key) ?? null,
      setItem: (key: string, value: string) => {
        storage.set(key, value);
      }
    } as unknown as Storage;

    expect(readShareCount(fakeStorage)).toBe(0);
    writeShareCount(fakeStorage, 3);
    expect(readShareCount(fakeStorage)).toBe(3);
  });

  it('treats corrupt or negative stored values as zero', () => {
    const corrupt = {
      getItem: () => 'not-a-number'
    } as unknown as Storage;
    const negative = {
      getItem: () => '-2'
    } as unknown as Storage;
    expect(readShareCount(corrupt)).toBe(0);
    expect(readShareCount(negative)).toBe(0);
  });
});

describe('referral ref capture and storage', () => {
  function fakeStorage(): Storage {
    const store = new Map<string, string>();
    return {
      getItem: (key: string) => store.get(key) ?? null,
      setItem: (key: string, value: string) => {
        store.set(key, value);
      },
      removeItem: (key: string) => {
        store.delete(key);
      },
      key: (index: number) => [...store.keys()][index] ?? null,
      get length() {
        return store.size;
      }
    } as unknown as Storage;
  }

  it('captures only patient refs and reads them back', () => {
    const storage = fakeStorage();
    captureReferralRef('p_DG3F3STPYZ6HX25A', storage);
    expect(readStoredReferralRef(storage)).toBe('p_DG3F3STPYZ6HX25A');
  });

  it('ignores absent or guest refs', () => {
    const storage = fakeStorage();
    captureReferralRef('g_guest-1', storage);
    expect(readStoredReferralRef(storage)).toBeNull();
    captureReferralRef(null, storage);
    expect(readStoredReferralRef(storage)).toBeNull();
  });

  it('reads the ref from a landing url', () => {
    expect(
      readRefFromUrl('https://konsulin.care/research?ref=p_DG3F3STPYZ6HX25A')
    ).toBe('p_DG3F3STPYZ6HX25A');
    expect(readRefFromUrl('https://konsulin.care/research')).toBeNull();
  });

  it('tracks written batches per batch id', () => {
    const storage = fakeStorage();
    expect(isReferralWritten(storage, 'batch-1')).toBe(false);
    markReferralWritten(storage, 'batch-1');
    expect(isReferralWritten(storage, 'batch-1')).toBe(true);
    expect(isReferralWritten(storage, 'batch-2')).toBe(false);
  });

  it('clears referral ref, written flags, and share booster on erasure', () => {
    const storage = fakeStorage();
    captureReferralRef('p_DG3F3STPYZ6HX25A', storage);
    markReferralWritten(storage, 'batch-1');
    markReferralWritten(storage, 'batch-3');
    writeShareCount(storage, 4);
    storage.setItem('unrelated-key', 'keep');

    clearReferralLocalState(storage);

    expect(storage.getItem('konsulin_ref')).toBeNull();
    expect(storage.getItem('konsulin_referral_written_batch-1')).toBeNull();
    expect(storage.getItem('konsulin_referral_written_batch-3')).toBeNull();
    expect(storage.getItem('konsulin_share_booster')).toBeNull();
    expect(storage.getItem('unrelated-key')).toBe('keep');
  });
});
