import { LoadingSpinnerIcon } from '@/components/icons';
import { Roles } from '@/constants/roles';
import { useAuth } from '@/context/auth/authContext';
import PatientRecordSoap from './patient-record-soap';
import PractitionerRecordSoap from './practitioner-record-soap';

type Props = {
  soapId: string;
};

/**
 *
 */
export default function RecordSoap({ soapId }: Props) {
  const { state: authState, isLoading: isAuthLoading } = useAuth();

  const renderContent = (
    <>
      {authState.userInfo.role_name === Roles.Practitioner && (
        <PractitionerRecordSoap soapId={soapId} />
      )}

      {authState.userInfo.role_name === Roles.Patient && (
        <PatientRecordSoap soapId={soapId} />
      )}
    </>
  );

  return isAuthLoading ? (
    <div className='flex min-h-screen min-w-full items-center justify-center'>
      <LoadingSpinnerIcon
        width={56}
        height={56}
        className='w-full animate-spin'
      />
    </div>
  ) : (
    renderContent
  );
}
