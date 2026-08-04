import type { Communication } from 'fhir/r4';
import { describe, expect, it } from 'vitest';
import {
  communityMilestoneFor,
  deriveCircleStats,
  nextMilestoneTarget
} from '../circle-stats';

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

describe('communityMilestoneFor', () => {
  it('unlocks Buddy at 1, Community Researcher at 3, Captain at 5', () => {
    expect(communityMilestoneFor(0)).toBeNull();
    expect(communityMilestoneFor(1)).toBe('buddy');
    expect(communityMilestoneFor(2)).toBe('buddy');
    expect(communityMilestoneFor(3)).toBe('community-researcher');
    expect(communityMilestoneFor(4)).toBe('community-researcher');
    expect(communityMilestoneFor(5)).toBe('captain');
    expect(communityMilestoneFor(9)).toBe('captain');
  });
});

describe('nextMilestoneTarget', () => {
  it('returns the next threshold above the current count', () => {
    expect(nextMilestoneTarget(0)).toBe(1);
    expect(nextMilestoneTarget(1)).toBe(3);
    expect(nextMilestoneTarget(2)).toBe(3);
    expect(nextMilestoneTarget(3)).toBe(5);
    expect(nextMilestoneTarget(4)).toBe(5);
    expect(nextMilestoneTarget(5)).toBeNull();
    expect(nextMilestoneTarget(9)).toBeNull();
  });
});
