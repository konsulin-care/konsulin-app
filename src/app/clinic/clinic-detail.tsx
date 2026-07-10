'use client';

import ClinicPractitionersView from '@/components/clinic/clinic-practitioners-view';
import EditLocationDrawer from '@/components/clinic/edit-location-drawer';
import CardLoader from '@/components/general/card-loader';
import PageHeader from '@/components/page-header';
import { useAuth } from '@/context/auth/authContext';
import { useClinicLocationPractitioners } from '@/services/clinic-locations';
import { useRouter, useSearchParams } from 'next/navigation';

/** Clinic detail page — shows practitioners or admin edit drawer. */
export default function ClinicDetail() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const id = searchParams.get('id') ?? '';
  const { state: authState } = useAuth();
  const role = authState.userInfo.role_name ?? '';
  const isAdmin = role === 'Clinic Admin';

  // Always call hook at top level
  const {
    data: entries,
    isLoading,
    isFetching
  } = useClinicLocationPractitioners(id);

  if (isAdmin && id) {
    return (
      <>
        <PageHeader backRoute='/clinic' />
        <EditLocationDrawer
          locationId={id}
          onClose={() => router.push('/clinic')}
        />
      </>
    );
  }

  if (isLoading || isFetching) {
    return (
      <>
        <PageHeader pageIndicator='Check Out Clinic' backRoute='/clinic' />
        <CardLoader />
      </>
    );
  }

  return (
    <>
      <PageHeader pageIndicator='Check Out Clinic' backRoute='/clinic' />
      <ClinicPractitionersView
        entries={entries}
        isLoading={isLoading}
        isFetching={isFetching}
      />
    </>
  );
}
