import enResearch from '@/messages/en/research.json';
import idResearch from '@/messages/id/research.json';
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
  buildMission,
  DEFAULT_QUESTIONNAIRE_XP,
  getNextResearchLevel,
  getResearchLevel,
  getResearchLevelFraction,
  getResearchLevelNumber,
  getResearchLevelProgress,
  GUEST_TITLE,
  LEVEL_XP,
  RESEARCH_LEVELS,
  RESEARCHER_LEVELS,
  XP_PER_MINUTE,
  xpForDuration
} from '../research';

/**
 * Resolves a dotted message key path inside a nested messages object.
 *
 * @param messages - Nested messages object.
 * @param key - Dotted key path, e.g. 'level.trailblazer'.
 * @returns The resolved string, or undefined when the path is missing.
 */
function resolveKey(
  messages: Record<string, unknown>,
  key: string
): string | undefined {
  let current: unknown = messages;
  for (const part of key.split('.')) {
    if (typeof current !== 'object' || current === null) return undefined;
    current = (current as Record<string, unknown>)[part];
  }
  return typeof current === 'string' ? current : undefined;
}

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
    expect(GUEST_TITLE).toEqual({
      label: 'Participant',
      labelKey: 'level.participant',
      icon: ClipboardList
    });
  });

  it('gives every level label and reward keys that resolve in en and id', () => {
    const messages = [enResearch, idResearch] as Record<string, unknown>[];
    for (const level of RESEARCH_LEVELS) {
      const name = level.label.toLowerCase();
      expect(level.labelKey).toBe(`level.${name}`);
      expect(level.rewardKey).toBe(`level_reward.${name}`);
      for (const locale of messages) {
        expect(resolveKey(locale, level.labelKey)).toBeTruthy();
        expect(resolveKey(locale, level.rewardKey)).toBeTruthy();
      }
    }
  });

  it('gives every researcher level a label key that resolves in en and id', () => {
    const messages = [enResearch, idResearch] as Record<string, unknown>[];
    for (const level of RESEARCHER_LEVELS) {
      expect(level.labelKey).toBe(`level.${level.label.toLowerCase()}`);
      for (const locale of messages) {
        expect(resolveKey(locale, level.labelKey)).toBeTruthy();
      }
    }
  });

  it('resolves the guest participant title key in en and id', () => {
    const messages = [enResearch, idResearch] as Record<string, unknown>[];
    for (const locale of messages) {
      expect(resolveKey(locale, GUEST_TITLE.labelKey)).toBeTruthy();
    }
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

describe('getResearchLevelNumber', () => {
  it.each([
    [0, 1],
    [100, 2],
    [200, 3],
    [399, 3],
    [400, 4],
    [600, 5],
    [999, 5]
  ])('maps %i XP to ladder level %i', (xp, expected) => {
    expect(getResearchLevelNumber(xp)).toBe(expected);
  });
});

describe('getResearchLevelFraction', () => {
  it.each([
    [50, 0.5],
    [250, 0.25],
    [550, 0.75],
    [600, 1],
    [900, 1]
  ])('maps %i XP to within-level fraction %f', (xp, expected) => {
    expect(getResearchLevelFraction(xp)).toBe(expected);
  });
});

describe('buildMission', () => {
  it('acknowledges the highest title with the current level key', () => {
    expect(
      buildMission({
        totalXp: 700,
        questionnaires: [],
        isGuest: false,
        nextBatchStart: null
      })
    ).toEqual({
      key: 'mission.top_level',
      params: {},
      levelKey: 'level.pioneer'
    });
  });

  it('acknowledges the highest level without a level key for guests', () => {
    expect(
      buildMission({
        totalXp: 700,
        questionnaires: [],
        isGuest: true,
        nextBatchStart: null
      })
    ).toEqual({ key: 'mission.top_level_guest', params: {} });
  });

  it('names the next batch date when no questionnaire remains', () => {
    expect(
      buildMission({
        totalXp: 88,
        questionnaires: [],
        isGuest: false,
        nextBatchStart: '2026-09-01'
      })
    ).toEqual({
      key: 'mission.next_batch',
      params: {},
      levelKey: 'level.pathfinder',
      date: '2026-09-01'
    });
  });

  it('invites friends without a count when no next batch exists', () => {
    const mission = buildMission({
      totalXp: 88,
      questionnaires: [],
      isGuest: false,
      nextBatchStart: null
    });

    expect(mission).toEqual({
      key: 'mission.invite',
      params: {},
      levelKey: 'level.pathfinder'
    });
    expect(mission.date).toBeUndefined();
  });

  it('invites guests without a level key when no next batch exists', () => {
    expect(
      buildMission({
        totalXp: 88,
        questionnaires: [],
        isGuest: true,
        nextBatchStart: null
      })
    ).toEqual({ key: 'mission.invite', params: {} });
  });

  it('asks to complete the remaining questionnaires when none has known XP', () => {
    expect(
      buildMission({
        totalXp: 88,
        questionnaires: [{ id: 'phq2', title: 'PHQ-2', durationMinutes: null }],
        isGuest: false,
        nextBatchStart: '2026-09-01'
      })
    ).toEqual({
      key: 'mission.complete_remaining',
      params: {},
      levelKey: 'level.pathfinder'
    });
  });

  it('ignores zero-duration questionnaires as remaining-without-XP', () => {
    expect(
      buildMission({
        totalXp: 88,
        questionnaires: [{ id: 'phq2', title: 'PHQ-2', durationMinutes: 0 }],
        isGuest: false,
        nextBatchStart: null
      }).key
    ).toBe('mission.complete_remaining');
  });

  it('names the single questionnaire that closes the XP gap', () => {
    expect(
      buildMission({
        totalXp: 92,
        questionnaires: [
          { id: 'phq2', title: 'PHQ-2', durationMinutes: 8 },
          { id: 'bfi', title: 'Big Five Inventory', durationMinutes: 15 }
        ],
        isGuest: false,
        nextBatchStart: null
      })
    ).toEqual({
      key: 'mission.single',
      params: { title: 'PHQ-2', xp: 40 },
      levelKey: 'level.pathfinder'
    });
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
        isGuest: false,
        nextBatchStart: null
      }).params
    ).toEqual({ title: 'PHQ-2', xp: 25 });
  });

  it('keeps the single-questionnaire copy for guests without a level key', () => {
    expect(
      buildMission({
        totalXp: 92,
        questionnaires: [{ id: 'phq2', title: 'PHQ-2', durationMinutes: 8 }],
        isGuest: true,
        nextBatchStart: null
      })
    ).toEqual({ key: 'mission.single', params: { title: 'PHQ-2', xp: 40 } });
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
        isGuest: false,
        nextBatchStart: null
      })
    ).toEqual({
      key: 'mission.subset',
      params: { count: 2 },
      levelKey: 'level.pathfinder'
    });
  });

  it('names the whole batch XP when it is not enough', () => {
    expect(
      buildMission({
        totalXp: 70,
        questionnaires: [
          { id: 'phq2', title: 'PHQ-2', durationMinutes: 2 },
          { id: 'gad7', title: 'GAD-7', durationMinutes: 3 }
        ],
        isGuest: false,
        nextBatchStart: null
      })
    ).toEqual({
      key: 'mission.whole_batch',
      params: { xp: 25 },
      levelKey: 'level.pathfinder'
    });
  });

  it('multiplies a shared questionnaire XP by its study count', () => {
    expect(
      buildMission({
        totalXp: 92,
        questionnaires: [
          { id: 'phq2', title: 'PHQ-2', durationMinutes: 8, studyCount: 2 }
        ],
        isGuest: false,
        nextBatchStart: null
      }).params
    ).toEqual({ title: 'PHQ-2', xp: 80 });
  });

  it('includes multiplied XP in the whole-batch total', () => {
    expect(
      buildMission({
        totalXp: 0,
        questionnaires: [
          { id: 'phq2', title: 'PHQ-2', durationMinutes: 2, studyCount: 3 },
          { id: 'gad7', title: 'GAD-7', durationMinutes: 3 }
        ],
        isGuest: false,
        nextBatchStart: null
      }).params
    ).toEqual({ xp: 45 });
  });

  it('never carries a referral count for patients or guests', () => {
    const cases: {
      isGuest: boolean;
      questionnaires: {
        id: string;
        title: string;
        durationMinutes: number | null;
      }[];
    }[] = [
      { isGuest: false, questionnaires: [] },
      { isGuest: true, questionnaires: [] },
      {
        isGuest: false,
        questionnaires: [{ id: 'phq2', title: 'PHQ-2', durationMinutes: 8 }]
      },
      {
        isGuest: true,
        questionnaires: [{ id: 'phq2', title: 'PHQ-2', durationMinutes: 8 }]
      },
      {
        isGuest: false,
        questionnaires: [{ id: 'phq2', title: 'PHQ-2', durationMinutes: null }]
      },
      {
        isGuest: true,
        questionnaires: [{ id: 'phq2', title: 'PHQ-2', durationMinutes: null }]
      }
    ];

    for (const { isGuest, questionnaires } of cases) {
      const mission = buildMission({
        totalXp: 88,
        questionnaires,
        isGuest,
        nextBatchStart: null
      });

      expect(Object.keys(mission.params)).not.toContain('referrals');
      expect(Object.keys(mission.params)).not.toContain('referral');
      expect(JSON.stringify(mission.params)).not.toMatch(/referral/i);
    }
  });
});
