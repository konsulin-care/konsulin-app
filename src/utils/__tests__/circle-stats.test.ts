import type { Communication } from 'fhir/r4';
import { describe, expect, it } from 'vitest';
import { deriveCircleStats } from '../circle-stats';

function comm(recipient: string): Communication {
  return {
    resourceType: 'Communication',
    id: Math.random().toString(),
    status: 'completed',
    sender: { reference: 'Patient/me' },
    recipient: [{ reference: `Patient/${recipient}` }]
  };
}

describe('deriveCircleStats', () => {
  it('counts distinct converted referees and joined referrals', () => {
    const stats = deriveCircleStats([
      comm('A'),
      comm('B'),
      comm('A'), // duplicate recipient deduped
      comm('C')
    ]);
    expect(stats.converted).toBe(3);
    expect(stats.joined).toBe(3);
  });

  it('returns zeroes for an empty set', () => {
    expect(deriveCircleStats([])).toEqual({ converted: 0, joined: 0 });
  });

  it('ignores communications without a recipient reference', () => {
    const noRecipient: Communication = {
      resourceType: 'Communication',
      id: 'x',
      status: 'completed'
    };
    expect(deriveCircleStats([noRecipient])).toEqual({
      converted: 0,
      joined: 0
    });
  });
});
