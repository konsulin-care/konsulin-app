import { describe, expect, it } from 'vitest';
import {
  RESEARCH_LEVELS,
  getNextResearchLevel,
  getResearchLevel,
  getResearchLevelProgress
} from '../research';

describe('RESEARCH_LEVELS', () => {
  it('defines four levels with ascending thresholds 1, 5, 10, 20', () => {
    expect(RESEARCH_LEVELS.map(level => level.threshold)).toEqual([
      1, 5, 10, 20
    ]);
  });

  it('labels levels Participant/Contributor/Advocate/Champion with rewards', () => {
    expect(RESEARCH_LEVELS.map(level => level.label)).toEqual([
      'Participant',
      'Contributor',
      'Advocate',
      'Champion'
    ]);
    for (const level of RESEARCH_LEVELS) {
      expect(level.reward.length).toBeGreaterThan(0);
    }
  });
});

describe('getResearchLevel', () => {
  it.each([
    [0, null],
    [1, 'Participant'],
    [4, 'Participant'],
    [5, 'Contributor'],
    [9, 'Contributor'],
    [10, 'Advocate'],
    [19, 'Advocate'],
    [20, 'Champion'],
    [50, 'Champion']
  ])('maps %i cumulative responses to level %s', (count, expected) => {
    expect(getResearchLevel(count)?.label ?? null).toBe(expected);
  });
});

describe('getNextResearchLevel', () => {
  it.each([
    [0, 'Participant'],
    [1, 'Contributor'],
    [4, 'Contributor'],
    [5, 'Advocate'],
    [9, 'Advocate'],
    [10, 'Champion'],
    [19, 'Champion'],
    [20, null],
    [50, null]
  ])('maps %i cumulative responses to next level %s', (count, expected) => {
    expect(getNextResearchLevel(count)?.label ?? null).toBe(expected);
  });
});

describe('getResearchLevelProgress', () => {
  it('reports 0/1 progress toward Participant when nothing completed', () => {
    expect(getResearchLevelProgress(0)).toEqual({
      current: null,
      next: RESEARCH_LEVELS[0],
      currentThreshold: 0,
      nextThreshold: 1,
      intoNext: 0,
      toNext: 1
    });
  });

  it('reports progress inside a level toward the next threshold', () => {
    expect(getResearchLevelProgress(4)).toEqual({
      current: RESEARCH_LEVELS[0],
      next: RESEARCH_LEVELS[1],
      currentThreshold: 1,
      nextThreshold: 5,
      intoNext: 3,
      toNext: 1
    });
  });

  it('reports the final level with no next level', () => {
    expect(getResearchLevelProgress(20)).toEqual({
      current: RESEARCH_LEVELS[3],
      next: null,
      currentThreshold: 20,
      nextThreshold: null,
      intoNext: 0,
      toNext: 0
    });
  });
});
