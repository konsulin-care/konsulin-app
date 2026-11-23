import { describe, expect, it } from 'vitest';
import {
  RESEARCHER_IMPACT_PER_BATCH,
  RESEARCHER_IMPACT_PER_PARTICIPANT,
  RESEARCHER_LEVELS,
  RESEARCHER_MILESTONES,
  buildResearcherMissionCopy,
  getImpactInLevel,
  getResearcherLevel,
  getResearcherLevelFraction,
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
  it('returns 1 for Trailblazer range (0-49 points)', () => {
    expect(getResearcherLevelNumber(0)).toBe(1);
    expect(getResearcherLevelNumber(49)).toBe(1);
  });

  it('returns 2 from Pathfinder threshold at 50 points', () => {
    expect(getResearcherLevelNumber(50)).toBe(2);
    expect(getResearcherLevelNumber(149)).toBe(2);
  });

  it('returns 3 from Torchbearer threshold at 150 points', () => {
    expect(getResearcherLevelNumber(150)).toBe(3);
    expect(getResearcherLevelNumber(299)).toBe(3);
  });

  it('returns 4 from Vanguard threshold at 300 points', () => {
    expect(getResearcherLevelNumber(300)).toBe(4);
    expect(getResearcherLevelNumber(499)).toBe(4);
  });

  it('returns 5 from Pioneer threshold at 500 points and above', () => {
    expect(getResearcherLevelNumber(500)).toBe(5);
    expect(getResearcherLevelNumber(1000)).toBe(5);
  });
});

describe('getResearcherLevelFraction', () => {
  it('returns the fraction of the current level span earned', () => {
    expect(getResearcherLevelFraction(100)).toBe(0.5);
  });

  it('returns 0 at a level threshold', () => {
    expect(getResearcherLevelFraction(50)).toBe(0);
    expect(getResearcherLevelFraction(150)).toBe(0);
  });

  it('returns 1 at the top level and above', () => {
    expect(getResearcherLevelFraction(500)).toBe(1);
    expect(getResearcherLevelFraction(1000)).toBe(1);
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

describe('buildResearcherMissionCopy', () => {
  const baseOpts = {
    impactPoints: 0,
    totalParticipants: 0
  };

  it('returns mission key for zero participants', () => {
    const mission = buildResearcherMissionCopy(baseOpts);
    expect(mission).toEqual({
      key: 'researcher_mission.enroll_gap',
      gap: 10
    });
  });

  it('returns simplified CTA with gap to next milestone', () => {
    const mission = buildResearcherMissionCopy({
      ...baseOpts,
      totalParticipants: 4
    });
    expect(mission).toEqual({
      key: 'researcher_mission.enroll_gap',
      gap: 6
    });
  });

  it('shows correct gap at first milestone boundary', () => {
    const mission = buildResearcherMissionCopy({
      ...baseOpts,
      totalParticipants: 10
    });
    expect(mission).toEqual({
      key: 'researcher_mission.enroll_gap',
      gap: 40
    });
  });

  it('shows correct gap between first and second milestone', () => {
    const mission = buildResearcherMissionCopy({
      ...baseOpts,
      totalParticipants: 25
    });
    expect(mission).toEqual({
      key: 'researcher_mission.enroll_gap',
      gap: 25
    });
  });

  it('shows correct gap at second milestone boundary', () => {
    const mission = buildResearcherMissionCopy({
      ...baseOpts,
      totalParticipants: 50
    });
    expect(mission).toEqual({
      key: 'researcher_mission.enroll_gap',
      gap: 50
    });
  });

  it('shows correct gap between second and third milestone', () => {
    const mission = buildResearcherMissionCopy({
      ...baseOpts,
      totalParticipants: 75
    });
    expect(mission).toEqual({
      key: 'researcher_mission.enroll_gap',
      gap: 25
    });
  });

  it('uses the singular key for a one-participant gap', () => {
    const mission = buildResearcherMissionCopy({
      ...baseOpts,
      totalParticipants: 9
    });
    expect(mission).toEqual({
      key: 'researcher_mission.enroll_gap_singular',
      gap: 1
    });
  });

  it('returns completion message when all milestones are hit', () => {
    const mission = buildResearcherMissionCopy({
      ...baseOpts,
      totalParticipants: 100
    });
    expect(mission).toEqual({
      key: 'researcher_mission.all_milestones',
      gap: 0
    });
  });
});
