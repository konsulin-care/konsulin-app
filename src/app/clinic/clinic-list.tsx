'use client';

import CardLoader from '@/components/general/card-loader';
import ContentWraper from '@/components/general/content-wraper';
import EmptyState from '@/components/general/empty-state';
import PageHeader from '@/components/page-header';
import { Badge } from '@/components/ui/badge';
import { InputWithIcon } from '@/components/ui/input-with-icon';
import { useAuth } from '@/context/auth/authContext';
import { useSearchWithFallback } from '@/hooks/useSearchWithFallback';
import { IUseClinicParams } from '@/services/clinic';
import { useClinicLocations } from '@/services/clinic-locations';
import ClinicFilter from './clinic-filter';
import LocationCard from './location-card';

import { type Location } from 'fhir/r4';
import { SearchIcon } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useCallback, useMemo, useState } from 'react';

// ---------------------------------------------------------------------------
// LocationGrid
// ---------------------------------------------------------------------------

function LocationGrid({
  locations,
  onSelect
}: Readonly<{ locations: Location[]; onSelect: (id: string) => void }>) {
  return (
    <div className='mt-4 grid grid-cols-1 gap-4 md:grid-cols-2'>
      {locations.map(loc => (
        <LocationCard
          key={loc.id}
          location={loc}
          onClick={() => onSelect(loc.id ?? '')}
        />
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// ClinicList
// ---------------------------------------------------------------------------

/**
 * Role-based clinic listing page.
 *
 * Patient/Guest: all locations (GET /fhir/Location)
 * Admin:         locations for managed org (GET /fhir/Location?organization=<orgId>)
 * Practitioner:  assigned locations (via PractitionerRole _include)
 */
export default function ClinicList() {
  const router = useRouter();
  const { state: authState, isLoading: authLoading } = useAuth();
  const role = authLoading ? '' : (authState.userInfo.role_name ?? 'Patient');
  const fhirId = authLoading ? undefined : authState.userInfo.fhirId;
  const orgId = authLoading ? undefined : authState.userInfo.organizationId;

  const [clinicFilter, setClinicFilter] = useState<IUseClinicParams>({});
  const [searchTerm, setSearchTerm] = useState<string>('');

  const { data: locations, isLoading } = useClinicLocations({
    role,
    fhirId,
    orgId: orgId || undefined,
    city: clinicFilter.city,
    organization: clinicFilter.organization,
    province: clinicFilter.province
  });

  // Client-side search/filter on locations
  const serverSearchFunction = useCallback(
    () => Promise.resolve([] as Location[]),
    []
  );

  const searchableLocations = useMemo(() => locations ?? [], [locations]);

  const { filteredData: filteredLocations, isServerSearching } =
    useSearchWithFallback({
      data: searchableLocations,
      searchFields: [{ path: 'name' }, { path: 'address.city' }],
      serverSearchFunction,
      searchTerm,
      debounceDelay: 1000
    });

  /** Handle card click — navigate for patient/practitioner, notify parent for admin. */
  const handleSelectLocation = (locationId: string) => {
    router.push(`/clinic?id=${locationId}`);
  };

  /** Renders filter, search, and location grid. */
  const renderContent = () => {
    if (authLoading) return <CardLoader />;
    if (isLoading) return <CardLoader />;

    const list = searchTerm ? filteredLocations : searchableLocations;

    if (list.length === 0) {
      if (searchTerm && isServerSearching) {
        return null; // Let useSearchWithFallback handle the UI
      }
      return (
        <EmptyState
          className='py-16'
          title='No clinics found'
          subtitle='Try a different location or search term.'
        />
      );
    }

    return <LocationGrid locations={list} onSelect={handleSelectLocation} />;
  };

  return (
    <>
      <PageHeader />
      <ContentWraper>
        <div className='w-full p-4'>
          <div className='flex gap-4'>
            <InputWithIcon
              value={searchTerm}
              onChange={event => setSearchTerm(event.target.value)}
              placeholder='Search'
              className='text-primary mr-4 h-[50px] w-full border-0 bg-[#F9F9F9]'
              startIcon={<SearchIcon className='text-[#ABDCDB]' width={16} />}
            />
            <ClinicFilter
              role={role}
              onChange={(filter: IUseClinicParams) => {
                setClinicFilter(prevState => ({
                  ...prevState,
                  ...filter
                }));
              }}
              type='clinic'
            />
          </div>

          <div className='flex gap-4'>
            {clinicFilter.province && (
              <Badge
                className='bg-secondary mt-4 cursor-pointer rounded-md px-4 py-[3px] font-normal text-white'
                onClick={() => {
                  setClinicFilter(prev => ({
                    ...prev,
                    province: undefined,
                    province_code: undefined,
                    city: undefined
                  }));
                }}
              >
                {clinicFilter.province}
              </Badge>
            )}
            {clinicFilter.city && (
              <Badge
                className='bg-secondary mt-4 cursor-pointer rounded-md px-4 py-[3px] font-normal text-white'
                onClick={() => {
                  setClinicFilter(prev => ({
                    ...prev,
                    city: undefined
                  }));
                }}
              >
                {clinicFilter.city}
              </Badge>
            )}
            {clinicFilter.organization && (
              <Badge
                className='bg-secondary mt-4 cursor-pointer rounded-md px-4 py-[3px] font-normal text-white'
                onClick={() => {
                  setClinicFilter(prev => ({
                    ...prev,
                    organization: undefined
                  }));
                }}
              >
                {clinicFilter.organization}
              </Badge>
            )}
          </div>

          {renderContent()}
        </div>
      </ContentWraper>
    </>
  );
}
