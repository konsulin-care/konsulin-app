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
 * studies. Participant counts are fetched only for the active study to
 * minimize API calls.
 *
 * @param studies - The researcher's studies from useResearcherDashboard.
 * @param activeStudyId - Currently focused study from the carousel.
 * @param practitionerId - FHIR Practitioner id for referral stats.
 * @returns Impact points, level info, per-study breakdown, and mission text.
 */
export function useResearcherImpact(
  studies: ResearchStudyWithBatches[],
  activeStudyId: string,
  practitionerId?: string
): ResearcherImpactResult {
  // Only fetch participant count for the active study
  const { data: activeParticipantCount, isLoading: activeLoading } =
    useStudyParticipantCount(studies.length > 0 ? activeStudyId : undefined);

  const { data: referralData, isLoading: referralsLoading } =
    useResearcherReferralStats(practitionerId);
  const referralCount = referralData?.referralCount ?? 0;

  const perStudy = useMemo<StudyImpact[]>(() => {
    return studies.map(study => {
      const isActive = study.study.id === activeStudyId;
      const participantCount = isActive ? activeParticipantCount : undefined;

      // Points from participants
      const participantPoints =
        (participantCount ?? 0) * RESEARCHER_IMPACT_PER_PARTICIPANT;

      // Points from completed batches (all batches done)
      const allBatchesDone =
        study.currentBatch === null && study.batches.length > 0;
      const batchPoints = allBatchesDone
        ? study.batches.length * RESEARCHER_IMPACT_PER_BATCH
        : 0;

      // Milestone bonuses
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

  const perStudyPoints = useMemo(
    () => perStudy.reduce((sum, s) => sum + s.impactPoints, 0),
    [perStudy]
  );

  const referralPoints = referralCount * RESEARCHER_IMPACT_PER_PARTICIPANT;
  const totalImpact = perStudyPoints + referralPoints;

  const level = getResearcherLevel(totalImpact);
  const levelNumber = getResearcherLevelNumber(totalImpact);
  const impactInLevel = getImpactInLevel(totalImpact);

  const activeStudyParticipants = useMemo(() => {
    const entry = perStudy.find(s => s.studyId === activeStudyId);
    return entry?.participantCount ?? 0;
  }, [perStudy, activeStudyId]);

  const mission = buildResearcherMission({
    impactPoints: totalImpact,
    studies: studies.map((s, i) => ({
      participantCount: perStudy[i]?.participantCount ?? 0,
      batchCompleted: s.currentBatch === null && s.batches.length > 0
    })),
    activeStudyParticipants
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
