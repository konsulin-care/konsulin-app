/**
 * Research gamification level ladder.
 *
 * Levels are intrinsic-only rewards that vary by cumulative contribution.
 * Thresholds represent the number of completed QuestionnaireResponses
 * required to reach each level.
 */

export interface ResearchLevel {
  /** Minimum cumulative responses required to reach this level. */
  threshold: number;
  /** Human-friendly level title. */
  label: string;
  /** Intrinsic reward unlocked at this level. */
  reward: string;
}

export const RESEARCH_LEVELS: readonly ResearchLevel[] = [
  {
    threshold: 1,
    label: 'Participant',
    reward: 'Standard result brief for every questionnaire'
  },
  {
    threshold: 5,
    label: 'Contributor',
    reward: 'Personalized summary report + badge'
  },
  {
    threshold: 10,
    label: 'Advocate',
    reward: 'Early access to batch results + cohort insights'
  },
  {
    threshold: 20,
    label: 'Champion',
    reward: 'Influence on future research topics'
  }
];

/** Progress toward the next research level. */
export interface ResearchLevelProgress {
  /** Highest level reached, or null below the first threshold. */
  current: ResearchLevel | null;
  /** Next level to unlock, or null at the top level. */
  next: ResearchLevel | null;
  /** Threshold of the current level (0 when below the first level). */
  currentThreshold: number;
  /** Threshold of the next level (null at the top level). */
  nextThreshold: number | null;
  /** Responses already accumulated within the current level. */
  intoNext: number;
  /** Responses still needed to reach the next level (0 when maxed). */
  toNext: number;
}

/**
 * Returns the highest level whose threshold is met, or null when the
 * cumulative response count is below the first threshold.
 *
 * @param cumulativeResponses - Total completed QuestionnaireResponses.
 * @returns The reached level, or null.
 */
export function getResearchLevel(
  cumulativeResponses: number
): ResearchLevel | null {
  let reached: ResearchLevel | null = null;
  for (const level of RESEARCH_LEVELS) {
    if (cumulativeResponses >= level.threshold) {
      reached = level;
    }
  }
  return reached;
}

/**
 * Returns the next level to unlock, or null at the top level.
 *
 * @param cumulativeResponses - Total completed QuestionnaireResponses.
 * @returns The next level, or null when maxed out.
 */
export function getNextResearchLevel(
  cumulativeResponses: number
): ResearchLevel | null {
  return (
    RESEARCH_LEVELS.find(level => cumulativeResponses < level.threshold) ?? null
  );
}

/**
 * Computes progress within the level ladder for a cumulative response count.
 *
 * @param cumulativeResponses - Total completed QuestionnaireResponses.
 * @returns Current level, next level, and progress toward the next threshold.
 */
export function getResearchLevelProgress(
  cumulativeResponses: number
): ResearchLevelProgress {
  const current = getResearchLevel(cumulativeResponses);
  const next = getNextResearchLevel(cumulativeResponses);

  const currentThreshold = current?.threshold ?? 0;
  const nextThreshold = next?.threshold ?? null;

  return {
    current,
    next,
    currentThreshold,
    nextThreshold,
    intoNext: Math.max(0, cumulativeResponses - currentThreshold),
    toNext:
      nextThreshold === null
        ? 0
        : Math.max(0, nextThreshold - cumulativeResponses)
  };
}
