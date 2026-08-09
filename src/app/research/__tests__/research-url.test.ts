import { describe, expect, it } from 'vitest';
import { updateResearchUrl } from '../research-url';

/** Builds a searchParams-shaped object from a query string. */
function params(query: string): URLSearchParams {
  return new URLSearchParams(query);
}

describe('updateResearchUrl', () => {
  it('keeps a current key when the update omits it', () => {
    expect(updateResearchUrl(params('?id=abc'), {})).toBe('/research?id=abc');
  });

  it('applies an explicit string update over the current value', () => {
    expect(updateResearchUrl(params('?id=abc'), { id: 'def' })).toBe(
      '/research?id=def'
    );
  });

  it('removes a key when the update is null, even if the param exists', () => {
    expect(updateResearchUrl(params('?id=abc'), { id: null })).toBe(
      '/research'
    );
  });

  it('drops the view param when explicitly nulled while keeping the id', () => {
    // The drawer-close path: focus stays on the study, drawer closes.
    expect(
      updateResearchUrl(params('?id=abc&view=def'), { id: 'abc', view: null })
    ).toBe('/research?id=abc');
  });

  it('lets view win over id in the canonical URL', () => {
    expect(updateResearchUrl(params('?id=abc&view=def'), { id: 'ghi' })).toBe(
      '/research?view=def'
    );
  });

  it('keeps an omitted ref from the current params', () => {
    expect(updateResearchUrl(params('?ref=r1'), {})).toBe('/research?ref=r1');
  });

  it('returns the bare path when every key is removed', () => {
    expect(
      updateResearchUrl(params('?id=abc&ref=r1'), { id: null, ref: null })
    ).toBe('/research');
  });
});
