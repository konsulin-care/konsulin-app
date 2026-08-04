import { describe, expect, it } from 'vitest';
import {
  buildShareMessage,
  buildShareUrl,
  buildWhatsAppShareUrl,
  parseReferralRef,
  readShareCount,
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
