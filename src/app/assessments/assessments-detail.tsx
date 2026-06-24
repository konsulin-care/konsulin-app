/* eslint-disable complexity */
'use client';

import ContentWraper from '@/components/general/content-wraper';
import EmptyState from '@/components/general/empty-state';
import FhirFormsRenderer from '@/components/general/fhir-forms-renderer';
import { LoadingSpinnerIcon } from '@/components/icons';
import PageHeader from '@/components/page-header';
import { Roles } from '@/constants/roles';
import { useAuth } from '@/context/auth/authContext';
import { useTodaySessions } from '@/hooks/useTodaySessions';
import { useQuestionnaire } from '@/services/api/assessment';
import { useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import Participant from './soap/participant';

/** Assessment detail page: loads and renders a FHIR Questionnaire via AEHRC forms. */
export default function AssessmentsDetail() {
  const searchParams = useSearchParams();
  const assessmentsId = searchParams.get('assessmentsId') ?? '';
  const { state: authState, isLoading: isAuthLoading } = useAuth();
  const { data: questionnaire, isLoading: questionnaireIsLoading } =
    useQuestionnaire(assessmentsId);
  const [participantId, setParticipantId] = useState('');
  const [patientsListToday, setPatientListToday] = useState([]);

  const { data: todaySessions, isLoading: isPatientListLoading } =
    useTodaySessions();

  const role = authState?.userInfo?.role_name;
  const isPractitioner = role === Roles.Practitioner;
  const practitionerId = isPractitioner ? authState?.userInfo?.fhirId : null;

  useEffect(() => {
    globalThis.window.scrollTo(0, 0);
  }, [assessmentsId]);

  useEffect(() => {
    if (todaySessions.length === 0) return;

    setPatientListToday(todaySessions);
  }, [todaySessions]);

  const title =
    questionnaireIsLoading || isAuthLoading
      ? ''
      : questionnaire?.[0]?.resource?.title || '-';

  const renderContent = () => {
    if (questionnaireIsLoading || isAuthLoading || isPatientListLoading) {
      return (
        <div className='flex min-h-screen min-w-full items-center justify-center'>
          <LoadingSpinnerIcon
            width={56}
            height={56}
            className='w-full animate-spin'
          />
        </div>
      );
    }
    if (!questionnaire || questionnaire.length === 0) {
      return (
        <EmptyState
          className='py-16'
          title='Questionnaire not found'
          subtitle=''
        />
      );
    }
    return (
      <div className='flex flex-col gap-5'>
        {practitionerId && (
          <Participant
            list={patientsListToday}
            value={participantId}
            placeholder='Select patient'
            onSelect={value => setParticipantId(value.patientId)}
          />
        )}
        <FhirFormsRenderer
          questionnaire={questionnaire?.[0]?.resource}
          isAuthenticated={authState.isAuthenticated}
          patientId={isPractitioner ? participantId : authState.userInfo.fhirId}
          formType={
            questionnaire?.[0]?.resource?.useContext?.[0]?.valueCodeableConcept
              ?.coding?.[0]?.code
          }
          role={role}
          practitionerId={practitionerId}
        />
      </div>
    );
  };

  return (
    <>
      <PageHeader pageIndicator={title} />
      <ContentWraper>
        <div className='min-h-screen p-4'>{renderContent()}</div>
      </ContentWraper>
    </>
  );
}
