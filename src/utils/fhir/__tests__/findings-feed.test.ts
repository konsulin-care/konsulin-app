import type { ResearchStudy } from 'fhir/r4';
import { describe, expect, it } from 'vitest';
import { FhirExtensionUrls } from '../extensions';
import { buildFindingsFeed } from '../findings-feed';

function study(id: string, notes: [string, string, number?][]): ResearchStudy {
  return {
    resourceType: 'ResearchStudy',
    id,
    status: 'active',
    title: `T${id}`,
    sponsor: { reference: 'Organization/g', display: 'Group' },
    note: notes.map(([text, time, n]) => ({
      text,
      time,
      extension:
        n === undefined
          ? undefined
          : [
              {
                url: FhirExtensionUrls.findingParticipantCount,
                valueInteger: n
              }
            ]
    }))
  };
}

describe('buildFindingsFeed', () => {
  const studies = [
    study('1', [['a', '2024-01-01T00:00:00Z', 5]]),
    study('2', [
      ['b', '2024-01-02T00:00:00Z', 50],
      ['c', '2024-01-03T00:00:00Z']
    ])
  ];
  const feed = buildFindingsFeed({
    studies,
    joinedIds: ['1'],
    floor: 10,
    konsulinOrgId: 'k'
  });

  it('puts joined first, each group newest first', () => {
    expect(feed.map(i => i.text)).toEqual(['a', 'c', 'b']);
  });

  it('sets participant count only at or above the floor', () => {
    expect(feed.map(i => i.participantCount)).toEqual([
      undefined,
      undefined,
      50
    ]);
  });

  it('carries study title and group', () => {
    expect(feed[0].studyTitle).toBe('T1');
    expect(feed[0].groupName).toBe('Group');
  });
});
