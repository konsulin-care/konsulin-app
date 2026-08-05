import {
  ClipboardList,
  Compass,
  Crown,
  Flame,
  Footprints,
  ShieldCheck
} from 'lucide-react';
import { describe, expect, it } from 'vitest';
import {
  DEFAULT_QUESTIONNAIRE_XP,
  GUEST_TITLE,
  LEVEL_XP,
  RESEARCH_LEVELS,
  buildMission,
  getNextResearchLevel,
  getResearchLevel,
  getResearchLevelNumber,
  getResearchLevelProgress,
  getXpInLevel
} from '../research';

describe('level constants', () => {
  it('defines 100 XP per level and a 5 XP fallback for unknown durations', () => {
    expect(LEVEL_XP).toBe(100);
    expect(DEFAULT_QUESTIONNAIRE_XP).toBe(5);
  });

  it('defines five levels with ascending XP thresholds 0, 100, 200, 400, 600', () => {
    expect(RESEARCH_LEVELS.map(level => level.threshold)).toEqual([
      0, 100, 200, 400, 600
    ]);
  });

  it('labels levels Trailblazer/Pathfinder/Torchbearer/Vanguard/Pioneer', () => {
    expect(RESEARCH_LEVELS.map(level => level.label)).toEqual([
      'Trailblazer',
      'Pathfinder',
      'Torchbearer',
      'Vanguard',
      'Pioneer'
    ]);
  });

  it('assigns an icon and a non-empty reward to every level', () => {
    const icons = RESEARCH_LEVELS.map(level => level.icon);
    expect(icons).toEqual([Footprints, Compass, Flame, ShieldCheck, Crown]);
    for (const level of RESEARCH_LEVELS) {
      expect(level.reward.length).toBeGreaterThan(0);
    }
  });

  it('fixes the guest title to Participant with the ClipboardList icon', () => {
    expect(GUEST_TITLE).toEqual({ label: 'Participant', icon: ClipboardList });
  });
});

describe('getResearchLevel', () => {
  it.each([
    [0, 'Trailblazer'],
    [99, 'Trailblazer'],
    [100, 'Pathfinder'],
    [199, 'Pathfinder'],
    [200, 'Torchbearer'],
    [399, 'Torchbearer'],
    [400, 'Vanguard'],
    [599, 'Vanguard'],
    [600, 'Pioneer'],
    [999, 'Pioneer']
  ])('maps %i XP to level %s', (xp, expected) => {
    expect(getResearchLevel(xp).label).toBe(expected);
  });
});

describe('getNextResearchLevel', () => {
  it.each([
    [0, 'Pathfinder'],
    [99, 'Pathfinder'],
    [100, 'Torchbearer'],
    [399, 'Vanguard'],
    [599, 'Pioneer'],
    [600, null],
    [999, null]
  ])('maps %i XP to next level %s', (xp, expected) => {
    expect(getNextResearchLevel(xp)?.label ?? null).toBe(expected);
  });
});

describe('getResearchLevelProgress', () => {
  it('reports 0/100 progress toward Pathfinder when no XP is earned', () => {
    expect(getResearchLevelProgress(0)).toEqual({
      current: RESEARCH_LEVELS[0],
      next: RESEARCH_LEVELS[1],
      currentThreshold: 0,
      nextThreshold: 100,
      intoNext: 0,
      toNext: 100
    });
  });

  it('reports progress inside a level toward the next threshold', () => {
    expect(getResearchLevelProgress(150)).toEqual({
      current: RESEARCH_LEVELS[1],
      next: RESEARCH_LEVELS[2],
      currentThreshold: 100,
      nextThreshold: 200,
      intoNext: 50,
      toNext: 50
    });
  });

  it('reports the final level with no next level', () => {
    expect(getResearchLevelProgress(600)).toEqual({
      current: RESEARCH_LEVELS[4],
      next: null,
      currentThreshold: 600,
      nextThreshold: null,
      intoNext: 0,
      toNext: 0
    });
  });
});

describe('getResearchLevelNumber and getXpInLevel', () => {
  it('derives the level number and in-level XP from total XP', () => {
    expect(getResearchLevelNumber(0)).toBe(1);
    expect(getResearchLevelNumber(99)).toBe(1);
    expect(getResearchLevelNumber(100)).toBe(2);
    expect(getResearchLevelNumber(350)).toBe(4);
    expect(getResearchLevelNumber(600)).toBe(7);
    expect(getXpInLevel(0)).toBe(0);
    expect(getXpInLevel(99)).toBe(99);
    expect(getXpInLevel(100)).toBe(0);
    expect(getXpInLevel(150)).toBe(50);
  });
});

describe('buildMission', () => {
  it('names the single questionnaire that closes the XP gap', () => {
    expect(
      buildMission({
        totalXp: 92,
        questionnaires: [
          { id: 'phq2', title: 'PHQ-2', durationMinutes: 8 },
          { id: 'bfi', title: 'Big Five Inventory', durationMinutes: 15 }
        ],
        isGuest: false
      })
    ).toBe('Complete PHQ-2 (+8 XP) to reach Pathfinder');
  });

  it('picks the most efficient questionnaire when several close the gap', () => {
    expect(
      buildMission({
        totalXp: 88,
        questionnaires: [
          { id: 'phq2', title: 'PHQ-2', durationMinutes: 5 },
          { id: 'gad7', title: 'GAD-7', durationMinutes: 12 },
          { id: 'bfi', title: 'Big Five Inventory', durationMinutes: 20 }
        ],
        isGuest: false
      })
    ).toBe('Complete GAD-7 (+12 XP) to reach Pathfinder');
  });

  it('combines questionnaires and shares when no single one suffices', () => {
    expect(
      buildMission({
        totalXp: 88,
        questionnaires: [
          { id: 'phq2', title: 'PHQ-2', durationMinutes: 5 },
          { id: 'bfi', title: 'Big Five Inventory', durationMinutes: 8 }
        ],
        isGuest: false
      })
    ).toBe('2 questionnaires or 12 shares to reach Pathfinder');
  });

  it('falls back to shares when no questionnaire duration is known', () => {
    expect(
      buildMission({
        totalXp: 88,
        questionnaires: [{ id: 'phq2', title: 'PHQ-2', durationMinutes: null }],
        isGuest: false
      })
    ).toBe('12 shares to reach Pathfinder');
  });

  it('falls back to shares when there is no active batch', () => {
    expect(
      buildMission({
        totalXp: 88,
        questionnaires: [],
        isGuest: false
      })
    ).toBe('12 shares to reach Pathfinder');
  });

  it('targets a level-up instead of a title for guests', () => {
    expect(
      buildMission({
        totalXp: 88,
        questionnaires: [],
        isGuest: true
      })
    ).toBe('12 shares to level up');
  });

  it('keeps the guest level-up phrasing for single questionnaires', () => {
    expect(
      buildMission({
        totalXp: 92,
        questionnaires: [{ id: 'phq2', title: 'PHQ-2', durationMinutes: 8 }],
        isGuest: true
      })
    ).toBe('Complete PHQ-2 (+8 XP) to level up');
  });

  it('acknowledges the highest title when maxed out', () => {
    expect(
      buildMission({
        totalXp: 700,
        questionnaires: [],
        isGuest: false
      })
    ).toBe('You reached Pioneer, the highest title. Keep contributing!');
  });

  it('acknowledges the highest level without a title for guests', () => {
    expect(
      buildMission({
        totalXp: 700,
        questionnaires: [],
        isGuest: true
      })
    ).toBe('You reached the highest level. Keep contributing!');
  });
});
