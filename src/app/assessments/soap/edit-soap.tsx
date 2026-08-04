'use client';
/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-argument */

import { PractitionerRoute } from '@/components/auth/practitioner-route';
import EmptyState from '@/components/general/empty-state';
import SoapHeaderCards from '@/components/shared/soap-header-cards';
import SoapLoadingSpinner from '@/components/shared/soap-loading-spinner';
import SoapForm from '@/components/soap-report/soap-form';
import { useAuth } from '@/context/auth/authContext';
import { usePatientProfile } from '@/hooks/usePatientProfile';
import { useQuestionnaireSoap } from '@/services/api/assessment';
import { useGetSingleRecord } from '@/services/api/record';
import { useEffect, useState } from 'react';

type Props = {
  readonly soapId: string;
  readonly title: string;
};

/**
 *
 */
export default function EditSoap({ soapId, title }: Props) {
  const { state: authState, isLoading: isAuthLoading } = useAuth();
  const [patientId, setPatientId] = useState('');
  const { data: soapData, isLoading: isSoapLoading } = useGetSingleRecord({
    id: soapId,
    resourceType: 'QuestionnaireResponse'
  });
  const { data: questionnaireData, isLoading: isQuestionnaireLoading } =
    useQuestionnaireSoap();

  useEffect(() => {
    if (!soapData) return;

    const patientId = soapData?.subject?.reference?.split('/')[1];
    setPatientId(patientId);
  }, [soapData]);

  const { displayName, isProfileLoading } = usePatientProfile(patientId);

  if (!patientId) {
    return <EmptyState className='py-16' title='No Data Found' />;
  }

  if (
    isAuthLoading ||
    isSoapLoading ||
    isQuestionnaireLoading ||
    isProfileLoading
  ) {
    return <SoapLoadingSpinner />;
  }

  return (
    <PractitionerRoute>
      <div className='flex flex-col gap-5'>
        <SoapHeaderCards displayName={displayName} title={title} />
        <SoapForm
          questionnaire={questionnaireData}
          patientId={patientId}
          practitionerId={authState.userInfo.fhirId}
          mode='edit'
          questionnaireResponse={soapData}
        />
      </div>
    </PractitionerRoute>
  );
}
