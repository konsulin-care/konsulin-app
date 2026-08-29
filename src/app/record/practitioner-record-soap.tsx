/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-argument */
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
};

/**
 *
 */
export default function PractitionerRecordSoap({ soapId }: Props) {
  const { state: authState, isLoading: isAuthLoading } = useAuth();

  const [patientId, setPatientId] = useState('');
  const [isAuthorSame, setIsAuthorSame] = useState<boolean>(false);
  const { data: soapData, isLoading: isSoapLoading } = useGetSingleRecord({
    id: soapId,
    resourceType: 'QuestionnaireResponse'
  });
  const { data: questionnaireData, isLoading: isQuestionnaireLoading } =
    useQuestionnaireSoap();

  useEffect(() => {
    if (!soapData || !authState.userInfo.fhirId) return;

    const patientId = soapData?.subject?.reference?.split('/')[1];
    const practitionerId = authState.userInfo.fhirId;
    const soapAuthorId = soapData?.author?.reference?.split('/')[1];

    setIsAuthorSame(practitionerId === soapAuthorId);
    setPatientId(patientId);
  }, [soapData, authState]);

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
    <div className='flex flex-col gap-5'>
      <SoapHeaderCards
        displayName={displayName}
        title={soapData?.questionnaire?.split('/')[1] ?? ''}
      />
      <SoapForm
        questionnaire={questionnaireData}
        patientId={patientId}
        practitionerId={authState.userInfo.fhirId}
        mode='view'
        questionnaireResponse={soapData}
        isAuthorSame={isAuthorSame}
      />
    </div>
  );
}
