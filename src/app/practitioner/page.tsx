'use client';

import EmptyState from '@/components/general/empty-state';
import { LoadingSpinnerIcon } from '@/components/icons';
import PageHeader from '@/components/page-header';
import { PractitionerCard } from '@/components/practitioner/practitioner-card';
import { STORES, dbGet } from '@/lib/indexeddb';
import { usePractitionerListing } from '@/services/clinic';
import { useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import PractitionerRoleManagementShell from './role-management-shell';

/** Full-screen loading spinner. */
function LoadingState() {
  return (
    <div className='flex min-h-screen min-w-full items-center justify-center'>
      <LoadingSpinnerIcon
        width={56}
        height={56}
        className='w-full animate-spin'
      />
    </div>
  );
}

/** Practitioner page — listing mode (admin) for all practitioners in a clinic. */
export default function Practitioner() {
  const searchParams = useSearchParams();
  const practitionerRoleId = searchParams.get('practitionerRoleId') ?? '';
  const [selectedClinicId, setSelectedClinicId] = useState<string>('');
  const [selectedLocationId, setSelectedLocationId] = useState<
    string | undefined
  >();
  useEffect(() => {
    dbGet<{ value: string }>(STORES.uiPreferences, ['', 'selected_clinic'])
      .then(saved => {
        if (saved?.value) setSelectedClinicId(saved.value);
        return null;
      })
      .catch((err: unknown) => console.warn('[IndexedDB]', err));
  }, []);

  useEffect(() => {
    dbGet<{ value: string }>(STORES.uiPreferences, ['', 'selected_location'])
      .then(saved => {
        if (saved?.value) setSelectedLocationId(saved.value);
        return null;
      })
      .catch(() => {
        /* ignore */
      });
  }, []);

  const { practitioners, isLoading: isListingLoading } = usePractitionerListing(
    selectedClinicId,
    selectedLocationId
  );

  /** Renders listing of practitioner cards (admin view). */
  const renderListingContent = () => {
    if (isListingLoading) return <LoadingState />;

    if (practitioners.length === 0) {
      return (
        <EmptyState
          className='py-16'
          title='No Practitioners Found'
          subtitle='Try another clinic.'
        />
      );
    }

    return (
      <div className='flex flex-col gap-4'>
        {practitioners.map(p => (
          <PractitionerCard key={p.id} {...p} />
        ))}
      </div>
    );
  };

  /** Renders main practitioner content, loading, or empty states. */
  const renderMainContent = () => {
    // Listing mode (admin view)
    if (!practitionerRoleId) return renderListingContent();

    // Detail mode — admin management tabs
    return (
      <PractitionerRoleManagementShell
        practitionerRoleId={practitionerRoleId}
      />
    );
  };

  return (
    <>
      <PageHeader
        pageIndicator={
          practitionerRoleId ? 'Manage Practitioner' : 'Manage Practitioners'
        }
      />

      <div className='mt-[-24px] flex grow flex-col rounded-[16px] bg-white p-4'>
        {renderMainContent()}
      </div>
    </>
  );
}
