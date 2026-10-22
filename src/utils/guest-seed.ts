/**
 * Generates a random lowercase-hex seed for the guest avatar.
 *
 * Uses `crypto.getRandomValues` instead of `crypto.randomUUID` so it works
 * on insecure contexts (HTTP localhost) where `randomUUID` is unavailable.
 *
 * @returns 16-character lowercase hex string.
 */
export const generateGuestSeed = (): string =>
  Array.from(crypto.getRandomValues(new Uint8Array(8)), byte =>
    byte.toString(16).padStart(2, '0')
  ).join('');
