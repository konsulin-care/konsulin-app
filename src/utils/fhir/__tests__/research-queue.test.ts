import type { ResearchStudy } from 'fhir/r4';
import { describe, expect, it } from 'vitest';
import type { StudyProgress } from '../research';
import { buildUpNextQueue } from '../research-queue';

function make(
  id: string,
  title: string,
  end: string,
  qids: string[],
  done: string[] = []
): StudyProgress {
  return {
    study: { resourceType: 'ResearchStudy', id, title } as ResearchStudy,
    batches: [],
    currentBatch: {
      id: `${id}-b`,
      start: '2026-01-01',
      end,
      questionnaireIds: qids
    },
    completedCount: done.length,
    totalCount: qids.length,
    isComplete: false,
    firstUncompletedQuestionnaireId: null,
    completedQuestionnaireIds: done,
    history: []
  };
}

const today = '2026-01-10';

describe('buildUpNextQueue', () => {
  it('merges by questionnaire with earliest closing lead', () => {
    const a = make('a', 'A', '2026-02-01', ['q1']);
    const b = make('b', 'B', '2026-01-20', ['q1']);
    const out = buildUpNextQueue({
      studies: [a, b],
      joinedIds: ['a', 'b'],
      waitingIds: [],
      today
    });
    expect(out).toHaveLength(1);
    expect(out[0].studies).toHaveLength(2);
    expect(out[0].leadStudy).toBe(b);
    expect(out[0].closesOn).toBe('2026-01-20');
  });

  it('sorts by closing date, study count, then title', () => {
    const a = make('a', 'Zed', '2026-01-20', ['q1']);
    const b = make('b', 'Alpha', '2026-01-20', ['q2']);
    const c = make('c', 'Mid', '2026-01-15', ['q3']);
    const d = make('d', 'Zed2', '2026-01-20', ['q1']);
    const out = buildUpNextQueue({
      studies: [a, b, c, d],
      joinedIds: ['a', 'b', 'c', 'd'],
      waitingIds: [],
      today
    });
    expect(out.map(i => i.questionnaireId)).toEqual(['q3', 'q1', 'q2']);
  });

  it('skips unjoined studies and waiting or answered questionnaires', () => {
    const a = make('a', 'A', '2026-02-01', ['q1', 'q2', 'q3'], ['q3']);
    const b = make('b', 'B', '2026-02-01', ['q9']);
    const out = buildUpNextQueue({
      studies: [a, b],
      joinedIds: ['a'],
      waitingIds: ['q1'],
      today
    });
    expect(out.map(i => i.questionnaireId)).toEqual(['q2']);
  });
});
