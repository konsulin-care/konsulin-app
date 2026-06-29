'use client';

import EmptyState from '@/components/general/empty-state';
import { LoadingSpinnerIcon } from '@/components/icons';
import PageHeader from '@/components/page-header';
import { PractitionerCard } from '@/components/practitioner/practitioner-card';
import { InputWithIcon } from '@/components/ui/input-with-icon';
import { STORES, dbGet, dbSet } from '@/lib/indexeddb';
import {
  useOrganizationLocations,
  usePractitionerListing
} from '@/services/clinic';
import { SearchIcon } from 'lucide-react';
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
  const [searchQuery, setSearchQuery] = useState('');

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

  // Fuzzy match: checks if all chars of query appear in order in text
  const fuzzyMatch = useCallback((query: string, text: string): boolean => {
    if (!query) return true;
    const q = query.toLowerCase();
    const t = text.toLowerCase();
    let qi = 0;
    for (let ti = 0; ti < t.length && qi < q.length; ti++) {
      if (q[qi] === t[ti]) qi++;
    }
    return qi === q.length;
  }, []);

  // Client-side status filter + fuzzy name search
  const filteredPractitioners = useMemo(() => {
    let result = practitioners;
    if (filter.status !== 'all') {
      result = result.filter(p =>
        filter.status === 'active' ? p.active : !p.active
      );
    }
    if (searchQuery) {
      result = result.filter(p => fuzzyMatch(searchQuery, p.practitionerName));
    }
    return result;
  }, [practitioners, filter.status, searchQuery, fuzzyMatch]);

  /** Renders listing of practitioner cards (admin view). */
  const renderListingContent = () => {
    if (isListingLoading) return <LoadingState />;

    const hasActiveFilters =
      filter.status !== 'all' || Boolean(filter.locationId);
    const showFilter = practitioners.length > 0 || hasActiveFilters;

    // Shared search + filter bar (only rendered when needed)
    const filterBar = showFilter ? (
      <div className='flex items-center gap-2'>
        <InputWithIcon
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          placeholder='Search practitioner...'
          className='h-[50px] w-full border-0 bg-[#F9F9F9]'
          startIcon={<SearchIcon className='text-[#ABDCDB]' width={16} />}
        />
        <PractitionerFilter
          locations={locations ?? []}
          value={filter}
          onChange={handleFilterChange}
        />
      </div>
    ) : null;

    // Clinic has zero practitioners
    if (practitioners.length === 0) {
      return (
        <>
          {filterBar}
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
          {filterBar}
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
        {filterBar}
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
