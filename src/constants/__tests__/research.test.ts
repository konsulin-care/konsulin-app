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
  XP_PER_MINUTE,
  buildMission,
  getNextResearchLevel,
  getResearchLevel,
  getResearchLevelNumber,
  getResearchLevelProgress,
  getXpInLevel,
  xpForDuration
} from '../research';

describe('level constants', () => {
  it('defines 100 XP per level, 5 XP per minute, and a 5 XP fallback', () => {
    expect(LEVEL_XP).toBe(100);
    expect(XP_PER_MINUTE).toBe(5);
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

describe('xpForDuration', () => {
  it('awards 5 XP per minute for known durations', () => {
    expect(xpForDuration(2)).toBe(10);
    expect(xpForDuration(8)).toBe(40);
    expect(xpForDuration(15)).toBe(75);
  });

  it('falls back to the default XP for null or missing durations', () => {
    expect(xpForDuration(null)).toBe(DEFAULT_QUESTIONNAIRE_XP);
    expect(xpForDuration()).toBe(DEFAULT_QUESTIONNAIRE_XP);
  });

  it('awards nothing for a zero-minute questionnaire', () => {
    expect(xpForDuration(0)).toBe(0);
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
  it('acknowledges the highest title when maxed out', () => {
    expect(
      buildMission({ totalXp: 700, questionnaires: [], isGuest: false })
    ).toBe('You reached Pioneer, the highest title. Keep contributing!');
  });

  it('acknowledges the highest level without a title for guests', () => {
    expect(
      buildMission({ totalXp: 700, questionnaires: [], isGuest: true })
    ).toBe('You reached the highest level. Keep contributing!');
  });

  it('falls back to referrals when no batch questionnaire is available', () => {
    expect(
      buildMission({ totalXp: 88, questionnaires: [], isGuest: false })
    ).toBe('Complete 12 referrals to reach Pathfinder');
  });

  it('tells guests to wait for the next batch when nothing is available', () => {
    expect(
      buildMission({ totalXp: 88, questionnaires: [], isGuest: true })
    ).toBe('Check back for the next batch to level up');
  });

  it('ignores questionnaires without a known duration', () => {
    expect(
      buildMission({
        totalXp: 88,
        questionnaires: [{ id: 'phq2', title: 'PHQ-2', durationMinutes: null }],
        isGuest: false
      })
    ).toBe('Complete 12 referrals to reach Pathfinder');
  });

  it('ignores zero-duration questionnaires', () => {
    expect(
      buildMission({
        totalXp: 88,
        questionnaires: [{ id: 'phq2', title: 'PHQ-2', durationMinutes: 0 }],
        isGuest: false
      })
    ).toBe('Complete 12 referrals to reach Pathfinder');
  });

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
    ).toBe('Complete PHQ-2 (+40 XP) or 8 referrals to reach Pathfinder');
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
    ).toBe('Complete PHQ-2 (+25 XP) or 12 referrals to reach Pathfinder');
  });

  it('keeps the guest level-up phrasing for single questionnaires', () => {
    expect(
      buildMission({
        totalXp: 92,
        questionnaires: [{ id: 'phq2', title: 'PHQ-2', durationMinutes: 8 }],
        isGuest: true
      })
    ).toBe('Complete PHQ-2 (+40 XP) to level up');
  });

  it('counts the smallest questionnaire subset that closes the gap', () => {
    expect(
      buildMission({
        totalXp: 70,
        questionnaires: [
          { id: 'phq2', title: 'PHQ-2', durationMinutes: 2 },
          { id: 'gad7', title: 'GAD-7', durationMinutes: 3 },
          { id: 'bfi', title: 'Big Five Inventory', durationMinutes: 4 }
        ],
        isGuest: false
      })
    ).toBe('Complete 2 questionnaires or 30 referrals to reach Pathfinder');
  });

  it('counts the subset without referrals for guests', () => {
    expect(
      buildMission({
        totalXp: 70,
        questionnaires: [
          { id: 'phq2', title: 'PHQ-2', durationMinutes: 2 },
          { id: 'gad7', title: 'GAD-7', durationMinutes: 3 },
          { id: 'bfi', title: 'Big Five Inventory', durationMinutes: 4 }
        ],
        isGuest: true
      })
    ).toBe('Complete 2 questionnaires to level up');
  });

  it('names the whole batch plus the referral shortfall when it is not enough', () => {
    expect(
      buildMission({
        totalXp: 70,
        questionnaires: [
          { id: 'phq2', title: 'PHQ-2', durationMinutes: 2 },
          { id: 'gad7', title: 'GAD-7', durationMinutes: 3 }
        ],
        isGuest: false
      })
    ).toBe('Complete this batch (+25 XP) and 5 referrals to reach Pathfinder');
  });

  it('names the batch XP shortfall for guests without referrals', () => {
    expect(
      buildMission({
        totalXp: 70,
        questionnaires: [
          { id: 'phq2', title: 'PHQ-2', durationMinutes: 2 },
          { id: 'gad7', title: 'GAD-7', durationMinutes: 3 }
        ],
        isGuest: true
      })
    ).toBe('Complete this batch (+25 XP) — 5 more XP to level up');
  });

  it('multiplies a shared questionnaire XP by its study count', () => {
    expect(
      buildMission({
        totalXp: 92,
        questionnaires: [
          { id: 'phq2', title: 'PHQ-2', durationMinutes: 8, studyCount: 2 }
        ],
        isGuest: false
      })
    ).toBe('Complete PHQ-2 (+80 XP) or 8 referrals to reach Pathfinder');
  });

  it('includes multiplied XP in the batch shortfall total', () => {
    expect(
      buildMission({
        totalXp: 0,
        questionnaires: [
          { id: 'phq2', title: 'PHQ-2', durationMinutes: 2, studyCount: 3 },
          { id: 'gad7', title: 'GAD-7', durationMinutes: 3 }
        ],
        isGuest: false
      })
    ).toBe('Complete this batch (+45 XP) and 55 referrals to reach Pathfinder');
  });
});
