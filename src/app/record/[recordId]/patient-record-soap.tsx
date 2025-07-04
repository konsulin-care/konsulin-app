import { LoadingSpinnerIcon } from '@/components/icons';
import { useAuth } from '@/context/auth/authContext';
import { useGetSingleRecord } from '@/services/api/record';
import { NotepadTextIcon, UsersIcon } from 'lucide-react';

type Props = {
  soapId: string;
  title: string;
};

export default function PatientRecordSoap({ soapId, title }: Props) {
  const { state: authState, isLoading: isAuthLoading } = useAuth();
  const { data: soapData, isLoading: isSoapLoading } = useGetSingleRecord({
    id: soapId,
    resourceType: 'Observation'
  });

  const displayName =
    !authState.userInfo.fullname || authState.userInfo.fullname.trim() === '-'
      ? authState.userInfo.email
      : authState.userInfo.fullname;

  return (
    <>
      {isAuthLoading || isSoapLoading ? (
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
              <div>{title}</div>
            </div>
          </div>

          <div>
            <div className='mb-2 text-[12px] text-muted'>Plan Note</div>
            <div className='card flex text-[14px]'>
              <div>{soapData.valueString}</div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
