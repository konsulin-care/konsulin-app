'use client';

import { LoadingSpinnerIcon } from '@/components/icons';
import dynamic from 'next/dynamic';
import PageHeader from '@/components/page-header';
import { Roles } from '@/constants/roles';
import { useAuth } from '@/context/auth/authContext';
import { useGetPractitionerRolesDetail } from '@/services/clinicians';
import type { IPractitionerRoleDetail } from '@/types/practitioner';
import { storeOwnedRoleIds } from '@/utils/practitioner-ownership';
import { useSearchParams } from 'next/navigation';
import { useEffect, useMemo } from 'react';
import AdminListing from './admin-listing';
import PatientDetail from './patient-detail';
import PractitionerRoleManagementShell from './role-management-shell';
import PractitionerWorkingLocationCard from './practitioner-working-location-card';

const RecommendationCardStack = dynamic(
  () => import('@/components/general/home/recommendation-card-stack'),
  { ssr: false }
);

/** Practitioner page — role-aware listing and detail dispatch. */
export default function Practitioner() {
  const searchParams = useSearchParams();
  const id = searchParams.get('id') ?? '';
  const { state: authState, isLoading: isAuthLoading } = useAuth();
  const role = authState?.userInfo?.role_name;
  const fhirId = authState?.userInfo?.fhirId ?? '';

  // Fetch practitioner's own roles. Empty for Patient — the hook has
  // enabled: Boolean(practitionerId), so it won't fire when empty.
  const queryFhirId = role === Roles.Patient ? '' : fhirId;
  const { data: ownRoles, isLoading: isRolesLoading } =
    useGetPractitionerRolesDetail(queryFhirId);

  // Store owned PractitionerRole IDs on successful fetch
  useEffect(() => {
    if (ownRoles?.length > 0) {
      const ids = ownRoles.map(r => r.resource?.id).filter(Boolean);
      storeOwnedRoleIds(ids);
    }
  }, [ownRoles]);

  // Build working location cards data for Practitioner role
  const workingLocations = useMemo(() => {
    if (!ownRoles) return [];
    return ownRoles
      .map(entry => {
        const role = entry.resource as IPractitionerRoleDetail | undefined;
        if (!role || !role.id) return null;

        // Use enriched organizationData.name if available
        const orgName = role.organizationData?.name ??
          role.organization?.display ??
          'Clinic';

        // Extract unique day labels from availableTime
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

        // Try to get service display names from references
        const healthcareServiceNames =
          role.healthcareService
            ?.map(h => h.display)
            .filter((n): n is string => Boolean(n)) ?? [];

        return {
          practitionerRoleId: role.id,
          locationName: orgName,
          workingDays,
          healthcareServiceNames
        };
      })
      .filter(Boolean);
  }, [ownRoles]);

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
    globalThis.location.href = `/practitioner?id=${practitionerId}`;
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
            <PractitionerWorkingLocationCard key={loc.practitionerRoleId} {...loc} />
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
