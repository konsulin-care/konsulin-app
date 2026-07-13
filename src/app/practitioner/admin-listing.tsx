'use client';

import EmptyState from '@/components/general/empty-state';
import { LoadingSpinnerIcon } from '@/components/icons';
import { PractitionerCard } from '@/components/practitioner/practitioner-card';
import { Badge } from '@/components/ui/badge';
import { InputWithIcon } from '@/components/ui/input-with-icon';
import { STORES, dbGet, dbSet } from '@/lib/indexeddb';
import {
  useOrganizationLocations,
  usePractitionerListing
} from '@/services/clinic-practitioners';
import { SearchIcon } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import PractitionerFilter, { type FilterState } from './practitioner-filter';

/** Shared fuzzy-match logic. */
function fuzzyMatch(query: string, text: string): boolean {
  if (!query) return true;
  const lowerQuery = query.toLowerCase();
  const lowerText = text.toLowerCase();
  let queryIndex = 0;
  for (
    let textIndex = 0;
    textIndex < lowerText.length && queryIndex < lowerQuery.length;
    textIndex++
  ) {
    if (lowerQuery.charAt(queryIndex) === lowerText.charAt(textIndex))
      queryIndex++;
  }
  return queryIndex === lowerQuery.length;
}

interface FilterBarProps {
  searchQuery: string;
  setSearchQuery: (v: string) => void;
  locations: Array<{ id: string; name: string }>;
  filter: FilterState;
  handleFilterChange: (f: FilterState) => void;
  activeFilterCount: number;
  locationName: string;
  dismissStatus: () => void;
  dismissLocation: () => void;
}

/** Filter bar with search, filter dropdown, and active filter badges. */
function FilterBar({
  searchQuery,
  setSearchQuery,
  locations,
  filter,
  handleFilterChange,
  activeFilterCount,
  locationName,
  dismissStatus,
  dismissLocation
}: Readonly<FilterBarProps>) {
  return (
    <div className='flex flex-col gap-2'>
      <div className='flex items-center gap-2'>
        <InputWithIcon
          value={searchQuery}
          onChange={e => {
            setSearchQuery(e.target.value);
          }}
          placeholder='Search practitioner...'
          className='h-[50px] w-full border-0 bg-[#F9F9F9]'
          startIcon={<SearchIcon className='text-[#ABDCDB]' width={16} />}
        />
        <PractitionerFilter
          locations={locations}
          value={filter}
          onChange={handleFilterChange}
        />
      </div>
      {activeFilterCount > 0 && (
        <div className='flex flex-wrap gap-2' data-testid='filter-badges'>
          {filter.status !== 'all' && (
            <Badge
              className='cursor-pointer gap-1 px-3 py-1 text-xs whitespace-nowrap'
              onClick={dismissStatus}
            >
              {filter.status === 'active' ? 'Active' : 'Inactive'} ×
            </Badge>
          )}
          {filter.locationId && (
            <Badge
              className='cursor-pointer gap-1 px-3 py-1 text-xs whitespace-nowrap'
              onClick={dismissLocation}
            >
              {locationName} ×
            </Badge>
          )}
        </div>
      )}
    </div>
  );
}

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

/**
 * Admin listing of all practitioners in the selected clinic.
 *
 * Features search bar, status/location filter, and card grid.
 * Filter state is persisted to IndexedDB.
 */
export default function AdminListing() {
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
      .catch((err: unknown) => {
        console.warn('[IndexedDB]', err);
      });
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
      .catch((err: unknown) => {
        console.warn('[IndexedDB]', err);
      });
  }, []);

  // Persist filter to IndexedDB on changes
  const handleFilterChange = useCallback((newFilter: FilterState) => {
    setFilter(newFilter);
    dbSet(STORES.uiPreferences, {
      ownerId: '',
      prefKey: 'practitioner_filter',
      value: newFilter
    }).catch((err: unknown) => {
      console.warn('[IndexedDB]', err);
    });
  }, []);

  // Fetch locations for the current organization
  const { locations } = useOrganizationLocations(selectedClinicId);

  // Fetch practitioners with optional location filter
  const { practitioners, isLoading: isListingLoading } = usePractitionerListing(
    selectedClinicId,
    filter.locationId
  );

  const activeFilterCount =
    (filter.status === 'all' ? 0 : 1) + (filter.locationId ? 1 : 0);

  const locationName = filter.locationId
    ? (locations?.find(l => l.id === filter.locationId)?.name ??
      'Unknown location')
    : '';

  const dismissStatus = useCallback(() => {
    handleFilterChange({ ...filter, status: 'all' });
  }, [filter, handleFilterChange]);

  const dismissLocation = useCallback(() => {
    handleFilterChange({ status: filter.status });
  }, [filter, handleFilterChange]);

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
  }, [practitioners, filter.status, searchQuery]);

  if (isListingLoading) return <LoadingState />;

  const showFilter =
    practitioners.length > 0 ||
    filter.status !== 'all' ||
    Boolean(filter.locationId);

  const filterBar = showFilter ? (
    <FilterBar
      searchQuery={searchQuery}
      setSearchQuery={setSearchQuery}
      locations={locations ?? []}
      filter={filter}
      handleFilterChange={handleFilterChange}
      activeFilterCount={activeFilterCount}
      locationName={locationName}
      dismissStatus={dismissStatus}
      dismissLocation={dismissLocation}
    />
  ) : null;

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
}
