import EmptyState from '@/components/general/empty-state';
import { LoadingSpinnerIcon } from '@/components/icons';
import SoapForm from '@/components/soap-report/soap-form';
import { useAuth } from '@/context/auth/authContext';
import { useQuestionnaireSoap } from '@/services/api/assessment';
import { useGetSingleRecord } from '@/services/api/record';
import { getProfileById } from '@/services/profile';
import { formatTitle, mergeNames } from '@/utils/helper';
import { useQuery } from '@tanstack/react-query';
import { Patient } from 'fhir/r4';
import { NotepadTextIcon, UsersIcon } from 'lucide-react';
import { useEffect, useState } from 'react';

type Props = {
  soapId: string;
  title: string;
};

export default function PractitionerRecordSoap({ soapId, title }: Props) {
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

  const { data: patientProfile, isLoading: isProfileLoading } =
    useQuery<Patient>({
      queryKey: ['profile-patient', patientId],
      queryFn: () => getProfileById(patientId, 'Patient'),
      enabled: !!patientId
    });

  const fullName = mergeNames(patientProfile?.name);
  const email = patientProfile?.telecom?.find(
    item => item.system === 'email'
  ).value;
  const displayName = fullName?.trim() === '-' ? email : fullName;

  if (!patientId) {
    return <EmptyState className='py-16' title='No Data Found' />;
  }

  return (
    <>
      {isAuthLoading ||
      isSoapLoading ||
      isQuestionnaireLoading ||
      isProfileLoading ? (
        <div className='flex min-h-screen min-w-full items-center justify-center'>
          <LoadingSpinnerIcon
            width={56}
            height={56}
            className='w-full animate-spin'
          />
        </div>
      ) : (
        <div className='flex flex-col gap-5'>
          <div className='space-y-4'>
            <div className='card flex border'>
              <UsersIcon className='mr-[10px]' color='hsla(220,9%,19%,0.4)' />
              <div>{displayName}</div>
            </div>

            <div className='card flex border'>
              <NotepadTextIcon
                className='mr-[10px]'
                color='hsla(220,9%,19%,0.4)'
              />
              <div>{formatTitle(title)}</div>
            </div>
          </div>
          <SoapForm
            questionnaire={questionnaireData}
            patientId={patientId}
            practitionerId={authState.userInfo.fhirId}
            mode='view'
            questionnaireResponse={soapData}
            isAuthorSame={isAuthorSame}
          />
        </div>
      )}
    </>
  );
}
