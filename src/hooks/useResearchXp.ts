'use client';

import { GUEST_TITLE, getResearchLevel } from '@/constants/research';
import { useAuth } from '@/context/auth/authContext';
import { useCircleStats } from '@/services/api/circle';
import type { QuestionnaireInfo } from '@/services/api/research';
import {
  computeQuestionnaireXp,
  type ResearchProgress
} from '@/utils/fhir/research';
import type { LucideIcon } from 'lucide-react';
import { useMemo } from 'react';

/** Return value of useResearchXp. */
export interface ResearchXpResult {
  /** Questionnaire XP plus converted referral XP. */
  totalXp: number;
  /** XP earned from completed questionnaires alone. */
  questionnaireXp: number;
  /** People converted through the patient's invite link (0 for guests). */
  converted: number;
  /** Whether the signed-in user has a FHIR id (guests do not). */
  isPatient: boolean;
  /** Research title: level badge for patients, fixed badge for guests. */
  title: { label: string; icon: LucideIcon };
}

/**
 * Computes the participant's research XP totals and title.
 *
 * Questionnaire XP comes from the duration map of resolved questionnaires;
 * patients additionally credit circle referrals. The title resolves from the
 * level ladder for patients and stays fixed for guests.
 *
 * @param progress - Aggregate research progress with questionnaire responses.
 * @param questionnaireInfo - Resolved titles and durations per questionnaire.
 * @returns Total/questionnaire XP, converted count, patient flag, and title.
 */
export function useResearchXp(
  progress: ResearchProgress,
  questionnaireInfo: ReadonlyMap<string, QuestionnaireInfo>
): ResearchXpResult {
  const { state: authState } = useAuth();
  const fhirId = authState?.userInfo?.fhirId;
  const isPatient = Boolean(fhirId);
  const { data: circleStats } = useCircleStats(isPatient ? fhirId : undefined);
  const converted = isPatient ? (circleStats?.converted ?? 0) : 0;

  const durationMap = useMemo(
    () =>
      new Map(
        [...questionnaireInfo].map(([id, info]) => [id, info.durationMinutes])
      ),
    [questionnaireInfo]
  );
  const questionnaireXp = useMemo(
    () => computeQuestionnaireXp(progress.questionnaireResponses, durationMap),
    [progress.questionnaireResponses, durationMap]
  );
  const totalXp = questionnaireXp + converted;

  const title: { label: string; icon: LucideIcon } = isPatient
    ? getResearchLevel(totalXp)
    : GUEST_TITLE;

  return { totalXp, questionnaireXp, converted, isPatient, title };
}
