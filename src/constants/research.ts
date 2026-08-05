import {
  ClipboardList,
  Compass,
  Crown,
  Flame,
  Footprints,
  ShieldCheck,
  type LucideIcon
} from 'lucide-react';

/**
 * Research gamification level ladder.
 *
 * Levels are intrinsic-only rewards that vary by cumulative experience.
 * Thresholds represent the total experience points (XP) required to reach
 * each level. XP comes from questionnaire submissions (estimated minutes),
 * share actions (+1), and converted referrals (+1).
 */

/** Experience points required to advance one level. */
export const LEVEL_XP = 100;

/** XP awarded per estimated minute of a completed questionnaire. */
export const XP_PER_MINUTE = 5;

/** Fallback XP awarded for a questionnaire whose duration is unknown. */
export const DEFAULT_QUESTIONNAIRE_XP = 5;

/**
 * XP earned from a single questionnaire: its estimated duration in minutes
 * times XP_PER_MINUTE, falling back to DEFAULT_QUESTIONNAIRE_XP when the
 * duration is unknown or missing.
 *
 * @param durationMinutes - Estimated minutes, or null/undefined when unknown.
 * @returns The questionnaire XP.
 */
export function xpForDuration(durationMinutes?: number | null): number {
  if (durationMinutes == null) return DEFAULT_QUESTIONNAIRE_XP;
  return durationMinutes * XP_PER_MINUTE;
}

export interface ResearchLevel {
  /** Minimum cumulative XP required to reach this level. */
  threshold: number;
  /** Human-friendly level title. */
  label: string;
  /** Icon representing the title badge. */
  icon: LucideIcon;
  /** Intrinsic reward unlocked at this level. */
  reward: string;
}

export const RESEARCH_LEVELS: readonly ResearchLevel[] = [
  {
    threshold: 0,
    label: 'Trailblazer',
    icon: Footprints,
    reward: 'Personal result brief for every questionnaire'
  },
  {
    threshold: 100,
    label: 'Pathfinder',
    icon: Compass,
    reward: 'Personalized summary report + in-app title badge'
  },
  {
    threshold: 200,
    label: 'Torchbearer',
    icon: Flame,
    reward: 'Early access to batch results + anonymized cohort insights'
  },
  {
    threshold: 400,
    label: 'Vanguard',
    icon: ShieldCheck,
    reward: 'Vote on future research topics'
  },
  {
    threshold: 600,
    label: 'Pioneer',
    icon: Crown,
    reward:
      'Co-design research questions (anonymously) + first access to new studies'
  }
];

/** Fixed title for guests: no persistent identity, so no progression. */
export const GUEST_TITLE: { label: string; icon: LucideIcon } = {
  label: 'Participant',
  icon: ClipboardList
};

/** Progress toward the next research level. */
export interface ResearchLevelProgress {
  /** Highest level reached (Trailblazer at minimum). */
  current: ResearchLevel;
  /** Next level to unlock, or null at the top level. */
  next: ResearchLevel | null;
  /** XP threshold of the current level. */
  currentThreshold: number;
  /** XP threshold of the next level (null at the top level). */
  nextThreshold: number | null;
  /** XP already accumulated within the current level. */
  intoNext: number;
  /** XP still needed to reach the next level (0 when maxed). */
  toNext: number;
}

/**
 * Returns the highest level whose XP threshold is met.
 *
 * @param xp - Total cumulative experience points.
 * @returns The reached level (Trailblazer at minimum).
 */
export function getResearchLevel(xp: number): ResearchLevel {
  const safe = Math.max(0, xp);
  let reached = RESEARCH_LEVELS[0];
  for (const level of RESEARCH_LEVELS) {
    if (safe >= level.threshold) {
      reached = level;
    }
  }
  return reached;
}

/**
 * Returns the next level to unlock, or null at the top level.
 *
 * @param xp - Total cumulative experience points.
 * @returns The next level, or null when maxed out.
 */
export function getNextResearchLevel(xp: number): ResearchLevel | null {
  const safe = Math.max(0, xp);
  return RESEARCH_LEVELS.find(level => safe < level.threshold) ?? null;
}

/**
 * Computes progress within the level ladder for a total XP count.
 *
 * @param xp - Total cumulative experience points.
 * @returns Current level, next level, and progress toward the next threshold.
 */
export function getResearchLevelProgress(xp: number): ResearchLevelProgress {
  const current = getResearchLevel(xp);
  const next = getNextResearchLevel(xp);

  return {
    current,
    next,
    currentThreshold: current.threshold,
    nextThreshold: next?.threshold ?? null,
    intoNext: Math.max(0, xp - current.threshold),
    toNext: next === null ? 0 : Math.max(0, next.threshold - xp)
  };
}

/**
 * Returns the numeric level for a total XP count (level 1 at 0-99 XP).
 *
 * @param xp - Total cumulative experience points.
 * @returns The level number, starting at 1.
 */
export function getResearchLevelNumber(xp: number): number {
  return Math.floor(Math.max(0, xp) / LEVEL_XP) + 1;
}

/**
 * Returns the XP accumulated within the current level.
 *
 * @param xp - Total cumulative experience points.
 * @returns XP within the current level, in [0, LEVEL_XP).
 */
export function getXpInLevel(xp: number): number {
  return Math.max(0, xp) % LEVEL_XP;
}

/** A questionnaire the user can complete, with its XP basis when known. */
export interface MissionQuestionnaire {
  id: string;
  title: string;
  /** Estimated minutes; null when the extension is missing. */
  durationMinutes: number | null;
}

/** A questionnaire with its derived XP value. */
interface MissionQuestionnaireWithXp extends MissionQuestionnaire {
  xp: number;
}

/**
 * Keeps questionnaires with a known, positive duration and derives their XP.
 *
 * @param questionnaires - Batch questionnaires to evaluate.
 * @returns The questionnaires worth XP, with xp attached.
 */
function withKnownXp(
  questionnaires: readonly MissionQuestionnaire[]
): MissionQuestionnaireWithXp[] {
  return questionnaires
    .filter(
      (q): q is MissionQuestionnaire & { durationMinutes: number } =>
        q.durationMinutes != null && q.durationMinutes > 0
    )
    .map(q => ({ ...q, xp: q.durationMinutes * XP_PER_MINUTE }));
}

/**
 * Smallest questionnaire whose XP alone closes the gap, if any.
 *
 * @param available - Questionnaires with known XP.
 * @param xpNeeded - XP required to reach the next level.
 * @returns The cheapest closing questionnaire, or undefined.
 */
function smallestClosing(
  available: readonly MissionQuestionnaireWithXp[],
  xpNeeded: number
): MissionQuestionnaireWithXp | undefined {
  return available
    .filter(q => q.xp >= xpNeeded)
    .toSorted((a, b) => a.xp - b.xp)[0];
}

/**
 * Number of questionnaires (greedy, largest first) needed to reach xpNeeded.
 *
 * @param available - Questionnaires with known XP.
 * @param xpNeeded - XP required to reach the next level.
 * @returns The minimal greedy count.
 */
function subsetCountNeeded(
  available: readonly MissionQuestionnaireWithXp[],
  xpNeeded: number
): number {
  let sum = 0;
  let count = 0;
  for (const q of available.toSorted((a, b) => b.xp - a.xp)) {
    sum += q.xp;
    count += 1;
    if (sum >= xpNeeded) break;
  }
  return count;
}

/**
 * Builds the mission line: the most efficient path to the next level.
 *
 * The mission is contextual to the active batch: only the remaining (not yet
 * completed) questionnaires with a known duration are considered, each worth
 * duration × XP_PER_MINUTE. A single questionnaire that closes the XP gap is
 * named; otherwise the smallest greedy subset is counted; when even the whole
 * batch is not enough, the batch XP plus the referral shortfall is shown.
 * Guests never see a title name — they level up toward registration.
 *
 * @param opts - Total XP, remaining batch questionnaires, and guest flag.
 * @returns The mission text.
 */
export function buildMission(opts: {
  totalXp: number;
  questionnaires: readonly MissionQuestionnaire[];
  isGuest: boolean;
}): string {
  const { totalXp, questionnaires, isGuest } = opts;
  const xpNeeded = LEVEL_XP - getXpInLevel(totalXp);
  const next = getNextResearchLevel(totalXp);

  if (next === null) {
    return isGuest
      ? 'You reached the highest level. Keep contributing!'
      : `You reached ${getResearchLevel(totalXp).label}, the highest title. Keep contributing!`;
  }

  const target = isGuest ? 'level up' : `reach ${next.label}`;
  const available = withKnownXp(questionnaires);

  if (available.length === 0) {
    return isGuest
      ? 'Check back for the next batch to level up'
      : `Complete ${xpNeeded} referrals to ${target}`;
  }

  const single = smallestClosing(available, xpNeeded);
  if (single) {
    return isGuest
      ? `Complete ${single.title} (+${single.xp} XP) to ${target}`
      : `Complete ${single.title} (+${single.xp} XP) or ${xpNeeded} referrals to ${target}`;
  }

  const batchXp = available.reduce((sum, q) => sum + q.xp, 0);
  if (batchXp >= xpNeeded) {
    const count = subsetCountNeeded(available, xpNeeded);
    return isGuest
      ? `Complete ${count} questionnaires to ${target}`
      : `Complete ${count} questionnaires or ${xpNeeded} referrals to ${target}`;
  }

  const shortfall = xpNeeded - batchXp;
  return isGuest
    ? `Complete this batch (+${batchXp} XP) — ${shortfall} more XP to ${target}`
    : `Complete this batch (+${batchXp} XP) and ${shortfall} referrals to ${target}`;
}
