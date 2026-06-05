'use client';

import { LoadingSpinnerIcon } from '@/components/icons';
import PageHeader from '@/components/page-header';
import SoapForm from '@/components/soap-report/soap-form';
import { useAuth } from '@/context/auth/authContext';
import { useTodaySessions } from '@/hooks/useTodaySessions';
import { useQuestionnaireSoap } from '@/services/api/assessment';
import { useEffect, useState } from 'react';
import Participant from './participant';

export default function Soap() {
  const { state: authState, isLoading: isAuthLoading } = useAuth();
  const [participantId, setParticipantId] = useState('');
  const [patientsListToday, setPatientListToday] = useState([]);
  const { data: questionnaireData, isLoading: isQuestionnaireLoading } =
    useQuestionnaireSoap();
  const { data: todaySessions, isLoading: isPatientListLoading } =
    useTodaySessions();

  useEffect(() => {
    if (!todaySessions || todaySessions.length === 0) return;

    setPatientListToday(todaySessions);
  }, [todaySessions]);

  return (
    <>
      <PageHeader pageIndicator='SOAP Report' />

      <div className='mt-[-24px] rounded-[16px] bg-white'>
        {isQuestionnaireLoading || isAuthLoading || isPatientListLoading ? (
          <div className='flex min-h-screen min-w-full items-center justify-center'>
            <LoadingSpinnerIcon
              width={56}
              height={56}
              className='w-full animate-spin'
            />
          </div>
        ) : (
          <div className='flex min-h-screen flex-col gap-5 p-4'>
            <Participant
              list={patientsListToday}
              value={participantId}
              placeholder='Select patient'
              onSelect={value => setParticipantId(value.patientId)}
            />
            <SoapForm
              questionnaire={questionnaireData}
              patientId={participantId}
              practitionerId={authState.userInfo.fhirId}
              mode='create'
            />
          </div>
        )}
      </div>
    </>
  );
}
