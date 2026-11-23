import { describe, expect, it } from 'vitest';

import { formatBatchDate } from '../format-batch-date';

describe('formatBatchDate', () => {
  it('formats in English', () => {
    expect(formatBatchDate('2026-12-01', 'en')).toBe('1 Dec 2026');
  });

  it('formats in Indonesian', () => {
    expect(formatBatchDate('2026-12-01', 'id')).toBe('1 Des 2026');
  });
});
