'use client';

import BackButton from '@/components/general/back-button';
import ContentWraper from '@/components/general/content-wraper';
import EmptyState from '@/components/general/empty-state';
import FhirFormsRenderer from '@/components/general/fhir-forms-renderer';
import Header from '@/components/header';
import { LoadingSpinnerIcon } from '@/components/icons';
import NavigationBar from '@/components/navigation-bar';
import { Skeleton } from '@/components/ui/skeleton';
import { Roles } from '@/constants/roles';
import { useAuth } from '@/context/auth/authContext';
import { useTodaySessions } from '@/hooks/useTodaySessions';
import { useQuestionnaire } from '@/services/api/assessment';
import { useEffect, useState } from 'react';
import Participant from '../soap/participant';

export interface IQuestionnaire {
  params: { assessmentsId: string };
}

export default function Questionnaire({ params }) {
  const { state: authState, isLoading: isAuthLoading } = useAuth();
  const { data: questionnaire, isLoading: questionnaireIsLoading } =
    useQuestionnaire(params.assessmentsId);
  const [participantId, setParticipantId] = useState('');
  const [patientsListToday, setPatientListToday] = useState([]);

  const { data: todaySessions, isLoading: isPatientListLoading } =
    useTodaySessions();

  const role = authState?.userInfo?.role_name;
  const isPractitioner = role === Roles.Practitioner;
  const practitionerId = isPractitioner ? authState?.userInfo?.fhirId : null;

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [params.assessmentsId]);

  useEffect(() => {
    if (!todaySessions || todaySessions.length === 0) return;

    setPatientListToday(todaySessions);
  }, [todaySessions]);

  return (
    <>
      <NavigationBar />
      <Header>
        <div className='flex w-full items-center'>
          <BackButton />
          <div className='text-[14px] font-bold text-white'>
            {questionnaireIsLoading || isAuthLoading ? (
              <Skeleton className='h-[24px] w-[175px]' />
            ) : (
              questionnaire?.[0]?.resource?.title || '-'
            )}
          </div>
        </div>
      </Header>
      <ContentWraper>
        <div className='min-h-screen p-4'>
          {questionnaireIsLoading || isAuthLoading || isPatientListLoading ? (
            <div className='flex min-h-screen min-w-full items-center justify-center'>
              <LoadingSpinnerIcon
                width={56}
                height={56}
                className='w-full animate-spin'
              />
            </div>
          ) : !questionnaire || questionnaire.length === 0 ? (
            <EmptyState
              className='py-16'
              title='Questionnaire not found'
              subtitle=''
            />
          ) : (
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
                patientId={
                  isPractitioner ? participantId : authState.userInfo.fhirId
                }
                formType={
                  questionnaire?.[0]?.resource?.useContext?.[0]
                    ?.valueCodeableConcept?.coding?.[0]?.code
                }
                role={role}
                practitionerId={practitionerId}
              />
            </div>
          )}
        </div>
      </ContentWraper>
    </>
  );
}
