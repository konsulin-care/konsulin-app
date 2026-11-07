'use client';

import ClaimReportFab from '@/components/assessment/claim-report-fab';
import { useFab } from '@/context/fabContext';
import { useShareStudy } from '@/hooks/useShareStudy';
import { useTranslations } from '@/i18n';
import { addToCalendar } from '@/utils/calendar/open';
import { sortBatches, type StudyProgress } from '@/utils/fhir/research';
import { getNextBatch } from '@/utils/fhir/research-schedule';
import { CalendarPlus, ClipboardList, Share2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useMemo } from 'react';

/**
 * Whether a study has an open current batch with an uncompleted questionnaire.
 * Uses early-return guards because prefer-optional-chain flags null-check
 * logical chains over related member expressions.
 *
 * @param study - Study progress, or null while the report is unknown.
 * @returns True when the report can be continued.
 */
function canStudyContinue(study: StudyProgress | null): boolean {
  if (study === null) return false;
  if (study.currentBatch === null) return false;
  return study.firstUncompletedQuestionnaireId !== null;
}

export interface ReportFabProps {
  /** Study progress backing the report; null while unknown. */
  study: StudyProgress | null;
  /** Study id from the URL, used for navigation and share links. */
  studyId: string;
  /** Reference date, yyyy-MM-dd, used to detect the next batch. */
  today: string;
  /** Whether the visitor is unauthenticated. */
  isGuest: boolean;
  /** Whether at least one report response is loaded. */
  hasResponses: boolean;
  /** Whether the visitor earns research XP as a patient. */
  isPatient: boolean;
  /** Patient FHIR id used for share attribution. */
  fhirId?: string;
}

/**
 * Contextual FAB for the research report page.
 *
 * Priority, first match wins: guests with responses get the shared
 * Claim Report FAB; patients whose current batch is open with an
 * uncompleted questionnaire get "Lanjutkan"; patients with a future batch
 * get an add-to-calendar reminder; every other patient gets the study
 * share action. The unmount effect clears the FAB action; the guest
 * dispatch effect registers no cleanup so the claim action is never
 * wiped when share-url state settles.
 *
 * @param props - Study progress, URL study id, reference date, and visitor context.
 */
export function ReportFab({
  study,
  studyId,
  today,
  isGuest,
  hasResponses,
  isPatient,
  fhirId
}: Readonly<ReportFabProps>) {
  const t = useTranslations('common');
  const { dispatch } = useFab();
  const router = useRouter();

  const { handleShare } = useShareStudy({
    studyId,
    isPatient,
    fhirId,
    title: study?.study.title
  });

  const canContinue = canStudyContinue(study);

  const nextBatch = useMemo(
    () => (study === null ? null : getNextBatch(study.batches, today)),
    [study, today]
  );

  /** 1-based position of the next batch in start order. */
  const nextBatchIndex = useMemo(() => {
    if (study === null || nextBatch === null) return 0;
    return (
      sortBatches(study.batches).findIndex(batch => batch.id === nextBatch.id) +
      1
    );
  }, [study, nextBatch]);

  const handleContinue = useCallback(() => {
    if (study === null) return;
    if (study.firstUncompletedQuestionnaireId === null) return;
    router.push(
      `/assessments?id=${study.firstUncompletedQuestionnaireId}&study=${studyId}`
    );
  }, [study, studyId, router]);

  const handleRemind = useCallback(() => {
    if (study === null || nextBatch === null) return;
    addToCalendar({
      uid: `${studyId}-${nextBatch.id}`,
      title: `${study.study.title} · ${t('report.batch_prefix', { index: nextBatchIndex })}`,
      description: `${nextBatch.start} - ${nextBatch.end} ${window.location.origin}/research?id=${studyId}`,
      startDate: nextBatch.start
    });
  }, [study, nextBatch, nextBatchIndex, studyId, t]);

  // Patient action: first-match priority. Guests are skipped here because
  // the rendered ClaimReportFab owns its own dispatch and cleanup. Only the
  // continue label is localized; the remind and share labels are fixed.
  useEffect(() => {
    if (isGuest) return;
    if (canContinue) {
      dispatch({
        type: 'SET_ACTION',
        config: {
          label: t('report.fab_continue'),
          icon: ClipboardList,
          onAction: handleContinue
        }
      });
    } else if (nextBatch !== null && study !== null) {
      dispatch({
        type: 'SET_ACTION',
        config: {
          label: 'Ingatkan Saya',
          icon: CalendarPlus,
          onAction: handleRemind
        }
      });
    } else {
      dispatch({
        type: 'SET_ACTION',
        config: {
          label: 'Ajak Teman',
          icon: Share2,
          onAction: handleShare
        }
      });
    }
  }, [
    isGuest,
    canContinue,
    nextBatch,
    study,
    dispatch,
    t,
    handleContinue,
    handleRemind,
    handleShare
  ]);

  // Clears the action when the report page goes away; runs only on
  // unmount because dispatch is stable, so guest claims survive.
  useEffect(
    () => () => dispatch({ type: 'SET_ACTION', config: null }),
    [dispatch]
  );

  if (isGuest) {
    return (
      <ClaimReportFab path={`/report?id=${studyId}`} visible={hasResponses} />
    );
  }

  return null;
}
