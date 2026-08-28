'use client';

import { LoadingSpinnerIcon } from '@/components/icons';
import PageHeader from '@/components/page-header';
import { Roles } from '@/constants/roles';
import { useAuth } from '@/context/auth/authContext';
import { useGetPractitionerRoleWorkingLocations } from '@/services/clinicians';
import { storeOwnedRoleIds } from '@/utils/practitioner-ownership';
import dynamic from 'next/dynamic';
import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useMemo } from 'react';
import AdminListing from './admin-listing';
import PatientDetail from './patient-detail';
import PractitionerWorkingLocationCard from './practitioner-working-location-card';
import PractitionerRoleManagementShell from './role-management-shell';

const RecommendationCardStack = dynamic(
  () => import('@/components/general/home/recommendation-card-stack'),
  { ssr: false }
);

/** Practitioner page — role-aware listing and detail dispatch. */
export default function Practitioner() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const id = searchParams.get('id') ?? '';
  const { state: authState, isLoading: isAuthLoading } = useAuth();
  const role = authState?.userInfo?.role_name;
  const fhirId = authState?.userInfo?.fhirId ?? '';

  // Fetch practitioner's own roles. Empty for Patient — the hook has
  // enabled: Boolean(practitionerId), so it won't fire when empty.
  const queryFhirId = role === Roles.Patient ? '' : fhirId;
  const { data: workingLocationsData, isLoading: isRolesLoading } =
    useGetPractitionerRoleWorkingLocations(queryFhirId);

  // Store owned PractitionerRole IDs on successful fetch
  useEffect(() => {
    if (workingLocationsData?.length > 0) {
      const ids = workingLocationsData
        .map(item => item.practitionerRole.id)
        .filter(Boolean);
      storeOwnedRoleIds(ids);
    }
  }, [workingLocationsData]);

  // Build working location cards data for Practitioner role
  const workingLocations = useMemo(() => {
    if (!workingLocationsData) return [];
    return workingLocationsData.map(item => {
      const role = item.practitionerRole;
      const locationName = item.location?.name ?? 'Clinic';

      const dayLabels = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
      const shortDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
      const daySet = new Set<string>();
      for (const at of role.availableTime ?? []) {
        for (const d of at.daysOfWeek ?? []) {
          const idx = dayLabels.indexOf(d);
          if (idx !== -1) daySet.add(shortDays[idx]);
        }
      }
      const workingDays =
        daySet.size > 0 ? [...daySet] : ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'];

      const healthcareServiceNames = item.healthcareServices
        .map(hs => hs.name)
        .filter(Boolean);

      return {
        practitionerRoleId: role.id,
        locationName,
        workingDays,
        healthcareServiceNames
      };
    });
  }, [workingLocationsData]);

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

  /** Handle click on recommendation card (patient booking). */
  const handleBook = (practitionerId: string) => {
    // Placeholder: plan 017 will integrate booking flow
    router.push(`/practitioner?id=${practitionerId}`);
  };

  /** Render content for the listing mode (no id param). */
  const renderListing = () => {
    if (role === Roles.ClinicAdmin) {
      return <AdminListing />;
    }

    if (role === Roles.Practitioner) {
      if (isRolesLoading) {
        return (
          <div className='flex min-h-[30vh] items-center justify-center'>
            <LoadingSpinnerIcon
              width={40}
              height={40}
              className='w-full animate-spin'
            />
          </div>
        );
      }

      if (workingLocations.length === 0) {
        return (
          <div className='flex min-h-[30vh] items-center justify-center text-sm text-gray-500'>
            No working locations found
          </div>
        );
      }

      return (
        <div className='flex flex-col gap-4'>
          {workingLocations.map(loc => (
            <PractitionerWorkingLocationCard
              key={loc.practitionerRoleId}
              {...loc}
            />
          ))}
        </div>
      );
    }

    // Patient — show recommended practitioners (placeholder)
    return <RecommendationCardStack onBook={handleBook} />;
  };

  /** Render content for detail mode (id param present). */
  const renderDetail = () => {
    if (role === Roles.Patient) {
      return <PatientDetail practitionerRoleId={id} />;
    }

    // Admin or Practitioner
    return <PractitionerRoleManagementShell practitionerRoleId={id} />;
  };

  let pageTitle: string | undefined;
  if (role === Roles.Patient && id) {
    pageTitle = 'View Provided Services';
  } else if (id) {
    pageTitle = 'Manage Practitioner';
  } else {
    pageTitle = 'Manage Practitioners';
  }

  return (
    <>
      <PageHeader pageIndicator={pageTitle} />
      <div className='mt-[-24px] flex grow flex-col rounded-[16px] bg-white p-4'>
        {id ? renderDetail() : renderListing()}
      </div>
    </>
  );
}
