'use client';

import Unauthorized from '@/app/unauthorized/page';
import EmptyState from '@/components/general/empty-state';
import { usePatientProfile } from '@/components/shared/hooks/usePatientProfile';
import SoapHeaderCards from '@/components/shared/soap-header-cards';
import SoapLoadingSpinner from '@/components/shared/soap-loading-spinner';
import SoapForm from '@/components/soap-report/soap-form';
import { Roles } from '@/constants/roles';
import { useAuth } from '@/context/auth/authContext';
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

  const role = authState?.userInfo?.role_name;
  const isPatient = role === Roles.Patient;

  useEffect(() => {
    if (!soapData) return;

    const patientId = soapData?.subject?.reference?.split('/')[1];
    setPatientId(patientId);
  }, [soapData]);

  const { displayName, isProfileLoading } = usePatientProfile(patientId);

  if (!patientId) {
    return <EmptyState className='py-16' title='No Data Found' />;
  }

  if (isPatient) {
    return <Unauthorized />;
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
  );
}
