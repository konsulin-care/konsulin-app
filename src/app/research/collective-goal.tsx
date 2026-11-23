'use client';

import { useTranslations } from '@/i18n';
import {
  COMPLETION_COUNT_FLOOR,
  useStudyParticipantCount
} from '@/services/api/research-counts';
import { getResearchTarget } from '@/utils/fhir/research-target';
import type { ResearchStudy } from 'fhir/r4';
import { GoalProgress } from './goal-progress';
import { ParticipantCountInfo } from './participant-count-info';

/** Props for the collective goal line of a study. */
interface CollectiveGoalProps {
  study: ResearchStudy;
  isGuest: boolean;
  isConsented: boolean;
}

/**
 * Renders the collective participation goal line for a study.
 *
 * Guests, pending queries and failed queries render nothing. Studies below
 * the k-anonymity floor show only the "just started" invitation. At or above
 * the floor the line reports how many others joined (consented participants)
 * or the total joined count (everyone else), followed by the cached-count
 * info tooltip.
 *
 * @param props - Study, guest status and consent status.
 * @returns The goal line, or null when it must stay hidden.
 */
export function CollectiveGoal({
  study,
  isGuest,
  isConsented
}: Readonly<CollectiveGoalProps>) {
  const t = useTranslations('research');
  const { data, isError } = useStudyParticipantCount(study.id, {
    enabled: !isGuest
  });

  if (isGuest || data === undefined || isError) return null;

  const others = isConsented ? data - 1 : data;
  const belowFloor =
    data < COMPLETION_COUNT_FLOOR ||
    (isConsented && others < COMPLETION_COUNT_FLOOR);
  const target = getResearchTarget(study);

  return (
    <div
      data-testid='collective-goal'
      className='text-muted-foreground flex flex-col gap-1 text-xs'
    >
      {belowFloor ? (
        <span>{t('goal.just_started')}</span>
      ) : (
        <>
          <div className='flex items-center gap-1'>
            <span>
              {isConsented
                ? t('goal.joined_with_you', { others })
                : t('goal.joined', { count: data })}
            </span>
            <ParticipantCountInfo />
          </div>
          {target === null ? null : (
            <GoalProgress count={data} target={target} />
          )}
          {target !== null && target > data ? (
            <span>{t('goal.remaining', { remaining: target - data })}</span>
          ) : null}
        </>
      )}
    </div>
  );
}
