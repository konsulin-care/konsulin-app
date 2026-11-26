import { describe, expect, it } from 'vitest';

import en from '@/messages/en/common.json';
import id from '@/messages/id/common.json';
import { buildRendererStrings } from '../renderer-strings';

/**
 * Builds a translator over a messages object.
 *
 * @param messages - Common messages.
 * @returns Translator function.
 */
function translator(messages: { renderer: { clear: string } }) {
  return (key: string): string =>
    key === 'renderer.clear' ? messages.renderer.clear : key;
}

describe('buildRendererStrings', () => {
  it('returns Clear for en', () => {
    expect(buildRendererStrings(translator(en)).clear).toBe('Clear');
  });

  it('returns Hapus for id', () => {
    expect(buildRendererStrings(translator(id)).clear).toBe('Hapus');
  });
});
