'use client';

import { LoadingSpinnerIcon } from '@/components/icons';
import PageHeader from '@/components/page-header';
import { Roles } from '@/constants/roles';
import { useAuth } from '@/context/auth/authContext';
import { isOwnedRole } from '@/utils/practitioner-ownership';
import { useSearchParams } from 'next/navigation';
import PatientAvailability from '../patient-availability';
import PractitionerRoleManagementShell from '../role-management-shell';

/**
 * Availability route — role-aware dispatch.
 *
 * - ClinicAdmin: availability + services management shell
 * - Practitioner: same shell, but gated by role ownership
 * - Patient: calendar-based free-slot display
 */
export default function AvailabilityPage() {
  const searchParams = useSearchParams();
  const id = searchParams.get('id') ?? '';
  const { state: authState, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className='flex min-h-[40vh] items-center justify-center'>
        <LoadingSpinnerIcon
          width={56}
          height={56}
          className='w-full animate-spin'
        />
      </div>
    );
  }

  const role = authState?.userInfo?.role_name;

  if (!id) {
    return (
      <>
        <PageHeader pageIndicator='Availability' />
        <div className='mt-[-24px] flex grow flex-col rounded-[16px] bg-white p-4'>
          <div className='flex min-h-[30vh] items-center justify-center text-sm text-gray-500'>
            No practitioner selected
          </div>
        </div>
      </>
    );
  }

  /** Render availability + services management shell (admin / practitioner). */
  const renderManagementShell = () => (
    <>
      <PageHeader pageIndicator='Manage Availability' />
      <div className='mt-[-24px] flex grow flex-col rounded-[16px] bg-white p-4'>
        <PractitionerRoleManagementShell practitionerRoleId={id} />
      </div>
    </>
  );

  /** Render patient-facing availability calendar. */
  const renderPatientView = () => (
    <>
      <PageHeader pageIndicator='Availability' />
      <div className='mt-[-24px] flex grow flex-col rounded-[16px] bg-white p-4'>
        <PatientAvailability practitionerRoleId={id} />
      </div>
    </>
  );

  if (role === Roles.ClinicAdmin) {
    return renderManagementShell();
  }

  if (role === Roles.Practitioner) {
    if (!isOwnedRole(id)) {
      return (
        <>
          <PageHeader pageIndicator='Availability' />
          <div className='mt-[-24px] flex grow flex-col rounded-[16px] bg-white p-4'>
            <div className='flex min-h-[30vh] items-center justify-center text-sm text-red-500'>
              Not authorized to access this practitioner
            </div>
          </div>
        </>
      );
    }
    return renderManagementShell();
  }

  // Patient
  return renderPatientView();
}
