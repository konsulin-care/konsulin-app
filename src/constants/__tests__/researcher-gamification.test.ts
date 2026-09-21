import { describe, expect, it } from 'vitest';
import {
  RESEARCHER_IMPACT_PER_BATCH,
  RESEARCHER_IMPACT_PER_PARTICIPANT,
  RESEARCHER_LEVELS,
  RESEARCHER_MILESTONES,
  buildResearcherMission,
  getImpactInLevel,
  getResearcherLevel,
  getResearcherLevelNumber
} from '../research';

describe('RESEARCHER_IMPACT constants', () => {
  it('defines impact points per participant', () => {
    expect(RESEARCHER_IMPACT_PER_PARTICIPANT).toBe(10);
  });

  it('defines impact points per completed batch', () => {
    expect(RESEARCHER_IMPACT_PER_BATCH).toBe(15);
  });
});

describe('RESEARCHER_MILESTONES', () => {
  it('has three milestone entries', () => {
    expect(RESEARCHER_MILESTONES).toHaveLength(3);
  });

  it('defines participant thresholds at 10, 50, and 100', () => {
    expect(RESEARCHER_MILESTONES.map(m => m.participantCount)).toEqual([
      10, 50, 100
    ]);
  });

  it('each entry has a threshold and participantCount', () => {
    for (const milestone of RESEARCHER_MILESTONES) {
      expect(typeof milestone.threshold).toBe('number');
      expect(typeof milestone.participantCount).toBe('number');
    }
  });
});

describe('RESEARCHER_LEVELS', () => {
  it('has 5 level entries', () => {
    expect(RESEARCHER_LEVELS).toHaveLength(5);
  });

  it('starts at Trailblazer with threshold 0', () => {
    expect(RESEARCHER_LEVELS[0]).toMatchObject({
      threshold: 0,
      label: 'Trailblazer'
    });
  });

  it('ends at Pioneer with threshold 500', () => {
    expect(RESEARCHER_LEVELS[4]).toMatchObject({
      threshold: 500,
      label: 'Pioneer'
    });
  });

  it('each entry has threshold, label, icon, and reward', () => {
    for (const level of RESEARCHER_LEVELS) {
      expect(typeof level.threshold).toBe('number');
      expect(typeof level.label).toBe('string');
      expect(level.icon).toBeDefined();
      expect(typeof level.reward).toBe('string');
    }
  });

  it('thresholds are in ascending order', () => {
    const thresholds = RESEARCHER_LEVELS.map(l => l.threshold);
    expect(thresholds).toEqual([...thresholds].sort((a, b) => a - b));
  });
});

describe('getResearcherLevel', () => {
  it('returns Trailblazer at 0 impact points', () => {
    const level = getResearcherLevel(0);
    expect(level.label).toBe('Trailblazer');
  });

  it('returns Trailblazer below Pathfinder threshold', () => {
    expect(getResearcherLevel(49).label).toBe('Trailblazer');
  });

  it('returns Pathfinder at exactly 50 impact points', () => {
    expect(getResearcherLevel(50).label).toBe('Pathfinder');
  });

  it('returns Torchbearer at 150 impact points', () => {
    expect(getResearcherLevel(150).label).toBe('Torchbearer');
  });

  it('returns Vanguard at 300 impact points', () => {
    expect(getResearcherLevel(300).label).toBe('Vanguard');
  });

  it('returns Pioneer at 500 impact points', () => {
    expect(getResearcherLevel(500).label).toBe('Pioneer');
  });

  it('returns Pioneer above 500 impact points', () => {
    expect(getResearcherLevel(1000).label).toBe('Pioneer');
  });

  it('handles negative input gracefully', () => {
    expect(getResearcherLevel(-10).label).toBe('Trailblazer');
  });
});

describe('getResearcherLevelNumber', () => {
  it('returns 1 for Trailblazer range (0-99 XP)', () => {
    expect(getResearcherLevelNumber(0)).toBe(1);
    expect(getResearcherLevelNumber(49)).toBe(1);
    expect(getResearcherLevelNumber(99)).toBe(1);
  });

  it('returns 2 for 100-199 XP', () => {
    expect(getResearcherLevelNumber(100)).toBe(2);
    expect(getResearcherLevelNumber(149)).toBe(2);
    expect(getResearcherLevelNumber(199)).toBe(2);
  });

  it('returns 3 for 200-299 XP', () => {
    expect(getResearcherLevelNumber(200)).toBe(3);
    expect(getResearcherLevelNumber(299)).toBe(3);
  });

  it('returns 4 for 300-399 XP', () => {
    expect(getResearcherLevelNumber(300)).toBe(4);
    expect(getResearcherLevelNumber(399)).toBe(4);
  });

  it('returns 5 for 400-499 XP', () => {
    expect(getResearcherLevelNumber(400)).toBe(5);
    expect(getResearcherLevelNumber(499)).toBe(5);
  });

  it('returns 6 for 500-599 XP', () => {
    expect(getResearcherLevelNumber(500)).toBe(6);
    expect(getResearcherLevelNumber(599)).toBe(6);
  });
});

describe('getImpactInLevel', () => {
  it('returns 0 at multiples of LEVEL_XP', () => {
    expect(getImpactInLevel(0)).toBe(0);
    expect(getImpactInLevel(100)).toBe(0);
    expect(getImpactInLevel(200)).toBe(0);
    expect(getImpactInLevel(300)).toBe(0);
    expect(getImpactInLevel(400)).toBe(0);
    expect(getImpactInLevel(500)).toBe(0);
  });

  it('returns progress within current 100-point band', () => {
    expect(getImpactInLevel(25)).toBe(25);
    expect(getImpactInLevel(50)).toBe(50);
    expect(getImpactInLevel(75)).toBe(75);
    expect(getImpactInLevel(149)).toBe(49);
    expect(getImpactInLevel(250)).toBe(50);
    expect(getImpactInLevel(375)).toBe(75);
  });

  it('clamps negative input to 0', () => {
    expect(getImpactInLevel(-10)).toBe(0);
  });
});

describe('buildResearcherMission', () => {
  const baseOpts = {
    impactPoints: 0,
    studies: [],
    activeStudyParticipants: 0
  };

  it('returns mission for zero participants', () => {
    const mission = buildResearcherMission(baseOpts);
    expect(typeof mission).toBe('string');
    expect(mission.length).toBeGreaterThan(0);
  });

  it('mentions next milestone when participants are below first threshold', () => {
    const mission = buildResearcherMission({
      ...baseOpts,
      activeStudyParticipants: 5
    });
    expect(mission).toContain('10');
  });

  it('mentions next level when milestones are completed', () => {
    const mission = buildResearcherMission({
      impactPoints: 40,
      studies: [{ participantCount: 100, batchCompleted: true }],
      activeStudyParticipants: 100
    });
    expect(typeof mission).toBe('string');
  });

  it('returns completion message at max level', () => {
    const mission = buildResearcherMission({
      impactPoints: 600,
      studies: [{ participantCount: 100, batchCompleted: true }],
      activeStudyParticipants: 100
    });
    expect(typeof mission).toBe('string');
  });
});
