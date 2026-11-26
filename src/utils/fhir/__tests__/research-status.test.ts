import { describe, expect, it } from 'vitest';

import { studyStatus } from '../research-status';

const batch = (id: string, start: string, end: string) => ({
  id,
  start,
  end,
  questionnaireIds: ['q']
});

const study = (done: string[] = []) => ({
  batches: [
    batch('b1', '2026-01-01', '2026-01-31'),
    batch('b2', '2026-03-01', '2026-03-31')
  ],
  participatedBatchIds: done
});

const none = new Set<string>();

describe('studyStatus', () => {
  it('unjoined: open with a batch, closed without', () => {
    expect(
      studyStatus({
        study: study(),
        joined: false,
        waitingIds: none,
        today: '2026-01-10'
      }).status
    ).toBe('open');
    expect(
      studyStatus({
        study: study(),
        joined: false,
        waitingIds: none,
        today: '2026-05-01'
      }).status
    ).toBe('closed');
  });

  it('joined: needs-you, shared-this-batch, waiting-sync', () => {
    const today = '2026-01-10';
    expect(
      studyStatus({ study: study(), joined: true, waitingIds: none, today })
        .status
    ).toBe('needs-you');
    expect(
      studyStatus({
        study: study(['b1']),
        joined: true,
        waitingIds: none,
        today
      }).status
    ).toBe('shared-this-batch');
    expect(
      studyStatus({
        study: study(),
        joined: true,
        waitingIds: new Set(['b1']),
        today
      }).status
    ).toBe('waiting-sync');
  });

  it('joined between batches: waiting-next-batch with start', () => {
    expect(
      studyStatus({
        study: study(['b1']),
        joined: true,
        waitingIds: none,
        today: '2026-02-10'
      })
    ).toEqual({
      status: 'waiting-next-batch',
      nextBatchStart: '2026-03-01'
    });
  });
});
