'use client';

import { useMemo } from 'react';
import { LoadingSpinnerIcon } from '@/components/icons';
import PageHeader from '@/components/page-header';
import { Roles } from '@/constants/roles';
import { useAuth } from '@/context/auth/authContext';
import { isOwnedRole } from '@/utils/practitioner-ownership';
import { getServiceDuration } from '@/utils/fhir/service-duration';
import { useSearchParams } from 'next/navigation';
import { usePractitionerRoleHealthcareServices } from '@/services/clinic';
import PractitionerAvailability from '../practitioner-availability';
import PractitionerRoleManagementShell from '../role-management-shell';

/**
 * Availability route — role-aware dispatch.
 *
 * - ClinicAdmin: availability + services management shell
 * - Practitioner: same shell, but gated by role ownership
 * - Patient: page variant of PractitionerAvailability with dynamic duration
 */
export default function AvailabilityPage() {
  const searchParams = useSearchParams();
  const id = searchParams.get('id') ?? '';
  const serviceId = searchParams.get('service') ?? '';
  const { state: authState, isLoading: isAuthLoading } = useAuth();

  const { data: services, isLoading: isServicesLoading } =
    usePractitionerRoleHealthcareServices(id);

  // Extract duration from the selected healthcare service
  const serviceDuration = useMemo(() => {
    if (!services || services.length === 0) return 60;
    const selectedService = serviceId
      ? services.find((s: { id?: string }) => s.id === serviceId)
      : services[0];
    if (!selectedService) return 60;
    return getServiceDuration(selectedService) ?? 60;
  }, [services, serviceId]);

  // Extract selected service name for display
  const selectedServiceName = useMemo(() => {
    if (!services || services.length === 0) return '';
    const selectedService = serviceId
      ? services.find((s: { id?: string }) => s.id === serviceId)
      : services[0];
    return selectedService?.name ?? '';
  }, [services, serviceId]);

  if (isAuthLoading) {
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

  /** Render patient-facing availability calendar with dynamic duration. */
  const renderPatientView = () => (
    <>
      <PageHeader pageIndicator='Availability' />
      <div className='mt-[-24px] flex grow flex-col rounded-[16px] bg-white p-4'>
        {isServicesLoading ? (
          <div className='flex min-h-[30vh] items-center justify-center'>
            <LoadingSpinnerIcon
              width={40}
              height={40}
              className='w-full animate-spin'
            />
          </div>
        ) : (
          <PractitionerAvailability
            variant='page'
            practitionerRoleId={id}
            durationMinutes={serviceDuration}
            healthcareServiceId={serviceId}
            healthcareServiceName={selectedServiceName}
          />
        )}
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
