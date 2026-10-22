import { describe, expect, it } from 'vitest';
import { buildEditUrl } from '../build-edit-url';

function makeSearchParams(str: string): URLSearchParams {
  return new URLSearchParams(str);
}

describe('buildEditUrl', () => {
  it('builds url with page only when no id', () => {
    const params = makeSearchParams('page=title');
    expect(buildEditUrl(params as never, 'questionnaire')).toBe(
      '/research/edit?page=questionnaire'
    );
  });

  it('preserves id when building url', () => {
    const params = makeSearchParams('id=study-1&page=title');
    expect(buildEditUrl(params as never, 'questionnaire')).toBe(
      '/research/edit?id=study-1&page=questionnaire'
    );
  });

  it('preserves id when id is the only param', () => {
    const params = makeSearchParams('id=study-1');
    expect(buildEditUrl(params as never, 'batch')).toBe(
      '/research/edit?id=study-1&page=batch'
    );
  });

  it('returns page-only url when no id and empty params', () => {
    const params = makeSearchParams('');
    expect(buildEditUrl(params as never, 'title')).toBe(
      '/research/edit?page=title'
    );
  });

  it('handles all page transitions with id', () => {
    const params = makeSearchParams('id=abc');

    expect(buildEditUrl(params as never, 'title')).toBe(
      '/research/edit?id=abc&page=title'
    );
    expect(buildEditUrl(params as never, 'questionnaire')).toBe(
      '/research/edit?id=abc&page=questionnaire'
    );
    expect(buildEditUrl(params as never, 'batch')).toBe(
      '/research/edit?id=abc&page=batch'
    );
  });
});
