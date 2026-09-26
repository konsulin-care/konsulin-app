'use client';

import ContentWraper from '@/components/general/content-wraper';
import PageHeader from '@/components/page-header';
import { Roles } from '@/constants/roles';
import { useAuth } from '@/context/auth/authContext';
import { useReferralWrite } from '@/hooks/useReferralWrite';
import {
  EMPTY_QUESTIONNAIRE_INFO_MAP,
  useQuestionnaireTitles
} from '@/services/api/questionnaire-info';
import { useResearchProgress } from '@/services/api/research';
import { usePerQuestionnaireCounts } from '@/services/api/research-counts';
import { useResearcherDashboard } from '@/services/api/researcher';
import type { StudyProgress } from '@/utils/fhir/research';
import { useRouter, useSearchParams } from 'next/navigation';
import { useCallback, useMemo, useState } from 'react';
import ConsentDrawer from './consent-drawer';
import ResearchContent from './research-content';
import { mapResearcherStudyToProgress } from './researcher-content';
import StudyDetailView from './study-detail-view';
import { buildOverlapMap } from './study-sections';
import { useConsent } from './use-consent';
import { useDetailStudy } from './use-detail-study';
import { useResearchFabAction } from './use-fab-action';
import { useResearchHandlers } from './use-research-handlers';
import { useUrlSync } from './use-url-sync';

/** Target of the consent drawer: the study and the questionnaire to open next. */
interface PendingConsent {
  studyId: string;
  questionnaireId?: string;
}

/**
 * Research hub: study carousel, contribution dashboard, and detail drawer.
 * Participation is consent-gated for patients and guests alike.
 */
export default function ResearchPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { state: authState } = useAuth();
  const fhirId = authState?.userInfo?.fhirId;
  const isPatient = Boolean(fhirId);
  const { data: progress, isLoading } = useResearchProgress();
  useReferralWrite(progress);

  const studies = useMemo(() => progress?.studies ?? [], [progress]);
  const [activeStudyId, setActiveStudyId] = useState<string | null>(null);
  const [detailStudyId, setDetailStudyId] = useState<string | null>(null);
  const [pendingConsent, setPendingConsent] = useState<PendingConsent | null>(
    null
  );
  const overlapMap = useMemo(() => buildOverlapMap(studies), [studies]);

  const roleName = authState?.userInfo?.role_name;
  const isResearcher = roleName === Roles.Researcher;
  const practitionerId = authState?.userInfo?.fhirId;

  const { data: researcherData, isLoading: researcherLoading } =
    useResearcherDashboard(isResearcher ? practitionerId : undefined);
  const researcherStudies = useMemo(
    () => researcherData?.studies ?? [],
    [researcherData]
  );

  const detailStudy = useDetailStudy({
    isResearcher,
    detailStudyId,
    studies,
    researcherStudies
  });

  const resolvedStudies = useMemo(() => {
    if (!isResearcher) return studies;
    const converted = researcherStudies.map(s =>
      mapResearcherStudyToProgress(s)
    );
    const knownIds = new Set(studies.map(s => s.study.id));
    return [
      ...studies,
      ...converted.filter(
        (s): s is StudyProgress => s !== null && !knownIds.has(s.study.id)
      )
    ];
  }, [studies, researcherStudies, isResearcher]);

  const questionnaireIds = useMemo(
    () => [
      ...new Set([
        ...resolvedStudies.flatMap(s => s.currentBatch?.questionnaireIds ?? []),
        ...(progress?.completedQuestionnaireIds ?? [])
      ])
    ],
    [resolvedStudies, progress?.completedQuestionnaireIds]
  );
  const {
    data: titleMap = EMPTY_QUESTIONNAIRE_INFO_MAP,
    isPending: titlesPending
  } = useQuestionnaireTitles(questionnaireIds);

  useUrlSync({
    searchParams,
    studies: resolvedStudies,
    activeStudyId,
    setActiveStudyId,
    setDetailStudyId,
    router
  });

  const detailStudyQuestionnaireIds = useMemo(
    () => detailStudy?.currentBatch?.questionnaireIds ?? [],
    [detailStudy]
  );
  const { data: completionCounts } = usePerQuestionnaireCounts(
    isResearcher ? detailStudyQuestionnaireIds : []
  );

  const activeStudy = studies.find(s => s.study.id === activeStudyId) ?? null;

  const { isConsented, handleAgree } = useConsent({
    isPatient,
    studies,
    consentedStudyIds: progress?.consentedStudyIds ?? [],
    pendingConsent,
    setPendingConsent,
    router
  });

  const participate = useCallback(
    (study: StudyProgress | null, questionnaireId?: string) => {
      if (!study) return;
      const target = questionnaireId ?? study.firstUncompletedQuestionnaireId;
      if (isConsented(study.study.id)) {
        if (target) {
          router.push(`/assessments?id=${target}&study=${study.study.id}`);
        }
        return;
      }
      setPendingConsent({ studyId: study.study.id, questionnaireId });
    },
    [isConsented, router]
  );

  useResearchFabAction({ isResearcher, activeStudy, participate, router });

  const {
    handleSlideChange,
    handleResearcherStudyClick,
    handleStudyClick,
    handleSeeReport,
    handleDrawerClose
  } = useResearchHandlers({
    studies,
    detailStudyId,
    isConsented,
    setActiveStudyId,
    setDetailStudyId,
    setPendingConsent,
    router
  });

  const handleManageStudy = useCallback(
    (studyId: string) => {
      router.push(`/research/edit?id=${studyId}&page=title`);
    },
    [router]
  );

  const handleQuestionnaireClick = useCallback(
    (studyId: string, questionnaireId: string) => {
      const study = studies.find(entry => entry.study.id === studyId);
      participate(study ?? null, questionnaireId);
    },
    [participate, studies]
  );

  return (
    <>
      <PageHeader />
      <ContentWraper className='pt-4'>
        <div className='px-4'>
          <ResearchContent
            isResearcher={isResearcher}
            researcherLoading={researcherLoading}
            researcherStudies={researcherStudies}
            isLoading={isLoading}
            progress={progress}
            studies={studies}
            activeStudyId={activeStudyId ?? ''}
            activeStudy={activeStudy}
            titleMap={titleMap}
            titlesPending={titlesPending}
            fhirId={fhirId}
            practitionerId={practitionerId}
            onSlideChange={handleSlideChange}
            onResearcherStudyClick={handleResearcherStudyClick}
            onStudyClick={handleStudyClick}
            onQuestionnaireClick={handleQuestionnaireClick}
          />
        </div>
      </ContentWraper>
      <StudyDetailView
        progress={detailStudy}
        overlapMap={overlapMap}
        open={detailStudy !== null}
        onClose={handleDrawerClose}
        onParticipate={participate}
        onSeeReport={handleSeeReport}
        onQuestionnaireClick={handleQuestionnaireClick}
        onManageStudy={handleManageStudy}
        isPatient={isPatient}
        fhirId={fhirId}
        titleMap={titleMap}
        isTitlesLoading={titlesPending}
        completionCounts={completionCounts}
        roleName={roleName}
      />
      <ConsentDrawer
        open={pendingConsent !== null}
        onClose={() => setPendingConsent(null)}
        onAgree={handleAgree}
      />
    </>
  );
}
