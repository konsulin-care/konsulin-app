'use client';

import EmptyState from '@/components/general/empty-state';
import { LoadingSpinnerIcon } from '@/components/icons';
import PageHeader from '@/components/page-header';
import { PractitionerCard } from '@/components/practitioner/practitioner-card';
import { STORES, dbGet, dbSet } from '@/lib/indexeddb';
import {
  useOrganizationLocations,
  usePractitionerListing
} from '@/services/clinic';
import { useSearchParams } from 'next/navigation';
import { useCallback, useEffect, useMemo, useState } from 'react';
import PractitionerFilter, { type FilterState } from './practitioner-filter';
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
  const [filter, setFilter] = useState<FilterState>({ status: 'all' });

  // Load clinic selection from IndexedDB
  useEffect(() => {
    dbGet<{ value: string }>(STORES.uiPreferences, ['', 'clinic_organization'])
      .then(saved => {
        if (saved?.value) setSelectedClinicId(saved.value);
        return null;
      })
      .catch((err: unknown) => console.warn('[IndexedDB]', err));
  }, []);

  // Load persisted filter from IndexedDB
  useEffect(() => {
    dbGet<{ value: FilterState }>(STORES.uiPreferences, [
      '',
      'practitioner_filter'
    ])
      .then(saved => {
        if (saved?.value) setFilter(saved.value);
        return null;
      })
      .catch(() => {
        /* ignore */
      });
  }, []);

  // Persist filter to IndexedDB on changes
  const handleFilterChange = useCallback((newFilter: FilterState) => {
    setFilter(newFilter);
    dbSet(STORES.uiPreferences, {
      ownerId: '',
      prefKey: 'practitioner_filter',
      value: newFilter
    }).catch(() => {
      /* ignore */
    });
  }, []);

  // Fetch locations for the current organization
  const { locations } = useOrganizationLocations(selectedClinicId);

  // Fetch practitioners with optional location filter
  const { practitioners, isLoading: isListingLoading } = usePractitionerListing(
    selectedClinicId,
    filter.locationId
  );

  // Client-side status filter
  const filteredPractitioners = useMemo(() => {
    if (filter.status === 'all') return practitioners;
    return practitioners.filter(p =>
      filter.status === 'active' ? p.active : !p.active
    );
  }, [practitioners, filter.status]);

  /** Renders listing of practitioner cards (admin view). */
  const renderListingContent = () => {
    if (isListingLoading) return <LoadingState />;

    const hasActiveFilters =
      filter.status !== 'all' || Boolean(filter.locationId);
    const showFilter = practitioners.length > 0 || hasActiveFilters;

    // Shared filter component (only rendered when needed)
    const filterElement = showFilter ? (
      <PractitionerFilter
        locations={locations ?? []}
        value={filter}
        onChange={handleFilterChange}
      />
    ) : null;

    // Clinic has zero practitioners
    if (practitioners.length === 0) {
      return (
        <>
          {filterElement}
          <EmptyState
            className='py-16'
            title='No Practitioners Found'
            subtitle='Try another clinic.'
          />
        </>
      );
    }

    // Practitioners exist but filters yield zero results
    if (filteredPractitioners.length === 0) {
      return (
        <>
          {filterElement}
          <EmptyState
            className='py-16'
            title='No Practitioners Match Your Filters'
            subtitle='Try adjusting your filter criteria.'
          />
        </>
      );
    }

    return (
      <>
        {filterElement}
        <div className='mt-4 flex flex-col gap-4'>
          {filteredPractitioners.map(p => (
            <PractitionerCard key={p.id} {...p} />
          ))}
        </div>
      </>
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
