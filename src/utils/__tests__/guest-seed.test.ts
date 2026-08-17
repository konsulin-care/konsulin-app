import { afterEach, describe, expect, it, vi } from 'vitest';
import { generateGuestSeed } from '../guest-seed';

/** Fixed 8 bytes so the derived seed is deterministic in tests. */
const FIXED_BYTES = new Uint8Array([
  0xde, 0xad, 0xbe, 0xef, 0x00, 0x0f, 0xff, 0x01
]);

describe('generateGuestSeed', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('returns a 16-character lowercase hex string', () => {
    const seed = generateGuestSeed();

    expect(seed).toMatch(/^[0-9a-f]{16}$/);
  });

  it('encodes crypto.getRandomValues bytes into the seed', () => {
    const getRandomValues = vi.spyOn(crypto, 'getRandomValues');
    getRandomValues.mockImplementation(arr => {
      FIXED_BYTES.forEach((byte, i) => {
        (arr as Uint8Array)[i] = byte;
      });
      return arr;
    });

    const seed = generateGuestSeed();

    expect(seed).toBe('deadbeef000fff01');
    expect(getRandomValues).toHaveBeenCalledTimes(1);
  });

  it('requests exactly 8 random bytes', () => {
    const getRandomValues = vi.spyOn(crypto, 'getRandomValues');

    generateGuestSeed();

    const arg = getRandomValues.mock.calls[0][0] as Uint8Array;
    expect(arg).toBeInstanceOf(Uint8Array);
    expect(arg.length).toBe(8);
  });

  it('does not depend on crypto.randomUUID (unavailable on insecure contexts)', () => {
    const randomUUID = vi.spyOn(crypto, 'randomUUID');

    generateGuestSeed();

    expect(randomUUID).not.toHaveBeenCalled();
  });
});
