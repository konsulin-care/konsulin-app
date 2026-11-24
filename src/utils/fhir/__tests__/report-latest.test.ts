import { describe, expect, it } from 'vitest';
import { latestResponsesByQuestionnaire } from '../report';

/** Minimal response fixture; full QRs are structurally compatible. */
function resp(id: string, questionnaire: string, authored?: string) {
  return {
    resourceType: 'QuestionnaireResponse' as const,
    id,
    questionnaire,
    status: 'completed' as const,
    authored
  };
}

describe('latestResponsesByQuestionnaire', () => {
  it('returns one entry per questionnaire id holding the newest authored response across batches', () => {
    const oldPhq = resp('r1', 'Questionnaire/phq-9', '2026-08-10T10:00:00Z');
    const newPhq = resp('r2', 'Questionnaire/phq-9', '2026-09-10T10:00:00Z');
    const gad = resp('r3', 'Questionnaire/gad-7', '2026-09-12T10:00:00Z');

    const latest = latestResponsesByQuestionnaire([oldPhq, newPhq, gad]);

    expect(latest.size).toBe(2);
    expect(latest.get('phq-9')).toBe(newPhq);
    expect(latest.get('gad-7')).toBe(gad);
  });

  it('skips responses whose questionnaire id cannot be extracted', () => {
    const missing = resp('r4', '', '2026-09-10T10:00:00Z');
    const valid = resp('r5', 'Questionnaire/phq-9', '2026-09-10T10:00:00Z');

    const latest = latestResponsesByQuestionnaire([missing, valid]);

    expect(latest.size).toBe(1);
    expect(latest.get('phq-9')).toBe(valid);
  });

  it('prefers dated responses over undated ones', () => {
    const undated = resp('r6', 'Questionnaire/phq-9');
    const dated = resp('r7', 'Questionnaire/phq-9', '2026-09-10T10:00:00Z');

    expect(latestResponsesByQuestionnaire([undated, dated]).get('phq-9')).toBe(
      dated
    );
    expect(latestResponsesByQuestionnaire([dated, undated]).get('phq-9')).toBe(
      dated
    );
  });

  it('keeps the later array position when authored timestamps tie', () => {
    const first = resp('r8', 'Questionnaire/phq-9', '2026-09-10T10:00:00Z');
    const second = resp('r9', 'Questionnaire/phq-9', '2026-09-10T10:00:00Z');

    expect(latestResponsesByQuestionnaire([first, second]).get('phq-9')).toBe(
      second
    );
    expect(latestResponsesByQuestionnaire([second, first]).get('phq-9')).toBe(
      first
    );
  });

  it('keeps the later array position when all candidates are undated', () => {
    const first = resp('r10', 'Questionnaire/phq-9');
    const second = resp('r11', 'Questionnaire/phq-9');

    expect(latestResponsesByQuestionnaire([first, second]).get('phq-9')).toBe(
      second
    );
  });
});
