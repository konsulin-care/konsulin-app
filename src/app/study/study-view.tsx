'use client';

import { useRuntimeConfig } from '@/components/general/runtime-config-provider';
import ReferralNotice from '@/components/research/referral-notice';
import ShareResearchButton from '@/components/research/share-research-button';
import { Skeleton } from '@/components/ui/skeleton';
import { Roles } from '@/constants/roles';
import { useAuth } from '@/context/auth/authContext';
import { useReferralWrite } from '@/hooks/useReferralWrite';
import { useTranslations } from '@/i18n';
import { useResearchProgress } from '@/services/api/research';
import { useStudyById } from '@/services/api/research-study';
import { readStudyProfile } from '@/utils/fhir/study-profile';
import { useRouter, useSearchParams } from 'next/navigation';
import { useState } from 'react';
import ConsentDrawer from '../research/consent-drawer';
import { useConsent } from '../research/use-consent';
import { useParticipate } from '../research/use-participate';
import { getBackItems, studyKind } from './study-facts';
import { StudyNotFound } from './study-not-found';
import StudyOverview from './study-overview';
import { StudySideFacts } from './study-side-facts';
import { TakePartPanel } from './take-part-panel';

const EMPTY_IDS: string[] = [];

interface PendingConsent {
  studyId: string;
  questionnaireId?: string;
}

/**
 * Loading placeholder for the study page.
 * @returns skeleton blocks
 */
function StudySkeleton() {
  return (
    <div data-testid='study-skeleton' className='flex flex-col gap-3'>
      <Skeleton className='h-8 w-2/3' />
      <Skeleton className='h-24 w-full' />
    </div>
  );
}

/**
 * Study page body: overview, take-part block and side facts.
 * @returns the study view
 */
export default function StudyView() {
  const t = useTranslations('common');
  const s = useStudyState();
  if (!s.id) return <StudyNotFound />;
  if (s.isLoading) return <StudySkeleton />;
  if (s.isError) {
    return <p role='alert'>{t('error.page_load')}</p>;
  }
  if (!s.data) return <StudyNotFound />;
  return <StudyBody {...s} data={s.data} />;
}

/**
 * Loads study, progress and consent state for the page.
 * @returns derived page state
 */
function useStudyState() {
  const router = useRouter();
  const params = useSearchParams();
  const id = params.get('id') ?? '';
  const { state: authState } = useAuth();
  const { konsulinOrganizationId } = useRuntimeConfig();
  const fhirId = authState?.userInfo?.fhirId;
  const isPatient = Boolean(fhirId);
  const { data: progress } = useResearchProgress();
  useReferralWrite(progress);
  const { data, isLoading, isError } = useStudyById(id);
  const [pending, setPending] = useState<PendingConsent | null>(null);
  const studies = data ? [data] : [];
  const { isConsented, handleAgree } = useConsent({
    isPatient,
    studies,
    consentedStudyIds: progress?.consentedStudyIds ?? EMPTY_IDS,
    pendingConsent: pending,
    setPendingConsent: setPending,
    router
  });
  const participate = useParticipate({
    isConsented,
    setPendingConsent: setPending,
    router
  });

  return {
    id,
    data,
    isLoading,
    isError,
    pending,
    setPending,
    isConsented,
    handleAgree,
    participate,
    authState,
    konsulinOrganizationId,
    fhirId,
    isPatient
  };
}

type StudyState = ReturnType<typeof useStudyState>;
type BodyProps = StudyState & {
  data: NonNullable<StudyState['data']>;
};

/**
 * Renders the loaded study.
 * @param props state from useStudyState with loaded data
 * @returns study body
 */
function StudyBody(props: BodyProps) {
  const {
    data,
    pending,
    setPending,
    isConsented,
    handleAgree,
    participate,
    authState,
    konsulinOrganizationId,
    fhirId,
    isPatient
  } = props;
  const study = data.study;
  const profile = readStudyProfile(study, konsulinOrganizationId ?? '');
  const isLead =
    authState?.userInfo?.role_name === Roles.Researcher &&
    study.principalInvestigator?.reference === `Practitioner/${fhirId}`;
  const consented = isConsented(study.id ?? '');

  return (
    <div className='grid gap-6 lg:grid-cols-3'>
      <div className='order-1 lg:col-span-2'>
        <ReferralNotice />
        <StudyOverview
          title={study.title}
          headingLevel='h1'
          group={profile.groupName}
          lead={profile.leadName}
          question={profile.question}
          description={study.description}
          kind={studyKind(data)}
          whoCanJoin={profile.whoCanJoin}
          getBack={getBackItems(data, profile)}
          joined={consented}
        />
      </div>
      <div className='order-2 flex flex-col gap-4 lg:col-start-3 lg:row-start-1'>
        <TakePartPanel
          studyId={study.id ?? ''}
          isJoined={consented}
          isClosed={study.status !== 'active'}
          isLead={isLead}
          onTakePart={() => participate(data)}
          onContinue={() => participate(data)}
        />
        <ShareResearchButton
          title={study.title ?? ''}
          isPatient={isPatient}
          fhirId={fhirId}
          studyId={study.id}
        />
        <StudySideFacts
          study={study}
          isPatient={isPatient}
          isConsented={consented}
          group={profile.groupName}
          lead={profile.leadName}
          ethics={profile.ethics === 'not-stated' ? undefined : profile.ethics}
        />
      </div>
      <ConsentDrawer
        open={pending !== null}
        onClose={() => setPending(null)}
        onAgree={handleAgree}
        profile={{
          title: study.title ?? '',
          groupName: profile.groupName ?? 'Konsulin',
          leadName: profile.leadName ?? '',
          batchCount: data.batches.length
        }}
      />
    </div>
  );
}
