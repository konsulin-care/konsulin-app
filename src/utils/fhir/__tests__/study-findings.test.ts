import type { ResearchStudy } from 'fhir/r4';
import { describe, expect, it } from 'vitest';
import { appendFinding, readFindings } from '../study-findings';

const base: ResearchStudy = {
  resourceType: 'ResearchStudy',
  status: 'active',
  note: [{ text: 'old', time: '2024-01-01T00:00:00Z' }]
};

describe('study-findings', () => {
  it('appendFinding adds a note and keeps existing notes', () => {
    const out = appendFinding(base, {
      text: 'new',
      time: '2024-02-01T00:00:00Z',
      authorReference: 'Practitioner/1',
      authorDisplay: 'Dr A',
      participantCount: 12
    });
    expect(out.note).toHaveLength(2);
    expect(out.note?.[1].authorReference?.reference).toBe('Practitioner/1');
    expect(readFindings(out)[0]).toEqual({
      text: 'new',
      time: '2024-02-01T00:00:00Z',
      authorName: 'Dr A',
      participantCount: 12
    });
  });

  it('readFindings returns newest first', () => {
    const out = appendFinding(base, {
      text: 'new',
      time: '2024-02-01T00:00:00Z',
      authorReference: 'Practitioner/1',
      participantCount: 3
    });
    expect(readFindings(out).map(f => f.text)).toEqual(['new', 'old']);
  });

  it('yields undefined count without the extension', () => {
    expect(readFindings(base)[0].participantCount).toBeUndefined();
  });
});
