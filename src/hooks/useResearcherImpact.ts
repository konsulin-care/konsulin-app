'use client';

import {
  RESEARCHER_IMPACT_PER_BATCH,
  RESEARCHER_IMPACT_PER_PARTICIPANT,
  RESEARCHER_MILESTONES,
  buildResearcherMission,
  getImpactInLevel,
  getResearcherLevel,
  getResearcherLevelNumber,
  type ResearcherLevel
} from '@/constants/research';
import { useStudyParticipantCount } from '@/services/api/research-counts';
import type { ResearchStudyWithBatches } from '@/services/api/researcher';
import { useResearcherReferralStats } from '@/services/api/researcher-circle';
import { useMemo } from 'react';

/** Per-study impact breakdown. */
export interface StudyImpact {
  studyId: string;
  participantCount: number | undefined;
  impactPoints: number;
  milestonesHit: number;
}

/** Return value of useResearcherImpact. */
export interface ResearcherImpactResult {
  totalImpact: number;
  level: ResearcherLevel;
  levelNumber: number;
  impactInLevel: number;
  perStudy: StudyImpact[];
  mission: string;
  isLoading: boolean;
}

/**
 * Computes the researcher's impact points, level, and mission across all
 * studies. Uses the total participant count from useResearcherDashboard
 * for consistent calculations regardless of which study is focused.
 *
 * @param studies - The researcher's studies from useResearcherDashboard.
 * @param activeStudyId - Currently focused study from the carousel.
 * @param practitionerId - FHIR Practitioner id for referral stats.
 * @param totalParticipants - Total participants across all studies.
 * @returns Impact points, level info, per-study breakdown, and mission text.
 */
export function useResearcherImpact(
  studies: ResearchStudyWithBatches[],
  activeStudyId: string,
  practitionerId?: string,
  totalParticipants = 0
): ResearcherImpactResult {
  // Only fetch participant count for the active study (for per-study display)
  const { data: activeParticipantCount, isLoading: activeLoading } =
    useStudyParticipantCount(studies.length > 0 ? activeStudyId : undefined);

  const { data: referralData, isLoading: referralsLoading } =
    useResearcherReferralStats(practitionerId);
  const referralCount = referralData?.referralCount ?? 0;

  const perStudy = useMemo<StudyImpact[]>(() => {
    return studies.map(study => {
      const isActive = study.study.id === activeStudyId;
      const participantCount = isActive ? activeParticipantCount : undefined;

      // Points from participants (per-study, for display only)
      const participantPoints =
        (participantCount ?? 0) * RESEARCHER_IMPACT_PER_PARTICIPANT;

      // Points from completed batches (all batches done)
      const allBatchesDone =
        study.currentBatch === null && study.batches.length > 0;
      const batchPoints = allBatchesDone
        ? study.batches.length * RESEARCHER_IMPACT_PER_BATCH
        : 0;

      // Milestone bonuses (per-study, for display only)
      let milestonePoints = 0;
      let milestonesHit = 0;
      if (participantCount !== undefined) {
        for (const milestone of RESEARCHER_MILESTONES) {
          if (participantCount >= milestone.participantCount) {
            milestonePoints += milestone.threshold;
            milestonesHit += 1;
          }
        }
      }

      return {
        studyId: study.study.id,
        participantCount,
        impactPoints: participantPoints + batchPoints + milestonePoints,
        milestonesHit
      };
    });
  }, [studies, activeStudyId, activeParticipantCount]);

  // Batch points are consistent across all studies (don't depend on participant counts)
  let batchPoints = 0;
  for (const study of studies) {
    const allBatchesDone =
      study.currentBatch === null && study.batches.length > 0;
    if (allBatchesDone) {
      batchPoints += study.batches.length * RESEARCHER_IMPACT_PER_BATCH;
    }
  }

  // Participant points use totalParticipants for consistency
  const participantPoints =
    totalParticipants * RESEARCHER_IMPACT_PER_PARTICIPANT;

  // Milestone points use totalParticipants for consistency
  let milestonePoints = 0;
  for (const milestone of RESEARCHER_MILESTONES) {
    if (totalParticipants >= milestone.participantCount) {
      milestonePoints += milestone.threshold;
    }
  }

  const referralPoints = referralCount * RESEARCHER_IMPACT_PER_PARTICIPANT;
  const totalImpact =
    participantPoints + batchPoints + milestonePoints + referralPoints;

  const level = getResearcherLevel(totalImpact);
  const levelNumber = getResearcherLevelNumber(totalImpact);
  const impactInLevel = getImpactInLevel(totalImpact);

  const mission = buildResearcherMission({
    impactPoints: totalImpact,
    totalParticipants
  });

  return {
    totalImpact,
    level,
    levelNumber,
    impactInLevel,
    perStudy,
    mission,
    isLoading: activeLoading || referralsLoading
  };
}
