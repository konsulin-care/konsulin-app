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
import { getTodayHours, useClinicLocations } from '@/services/clinic-locations';

import { type Location } from 'fhir/r4';
import { Clock, MapPin, SearchIcon } from 'lucide-react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useCallback, useMemo, useState } from 'react';
import ClinicFilter from './clinic-filter';

// ---------------------------------------------------------------------------
// LocationCard
// ---------------------------------------------------------------------------

function LocationCard({
  location,
  onClick
}: Readonly<{ location: Location; onClick: () => void }>) {
  const name = location.name ?? 'Clinic';
  const city = location.address?.city ?? '';
  const state = location.address?.state ?? '';
  const cityProvince = [city, state].filter(Boolean).join(', ') || '-';
  const hours = getTodayHours(location);

  return (
    <div
      className='group relative aspect-[4/3] w-full cursor-pointer overflow-hidden rounded-2xl shadow-lg'
      role='button'
      tabIndex={0}
      onClick={onClick}
      onKeyDown={e => {
        if (e.key === 'Enter' || e.key === ' ') onClick();
      }}
      data-testid={`location-card-${location.id}`}
    >
      {/* Default image */}
      <Image
        src='/images/clinic.jpg'
        alt={name}
        fill
        className='object-cover'
        sizes='(max-width: 640px) 100vw, 400px'
      />

      {/* Frosted overlay at bottom */}
      <div className='pointer-events-none absolute right-0 bottom-0 left-0 bg-black/50 backdrop-blur-md'>
        <div className='px-3 py-2'>
          <div className='truncate text-sm font-bold text-white'>{name}</div>
          <div className='flex items-center gap-1 truncate text-xs text-white/80'>
            <MapPin size={12} />
            <span className='truncate'>{cityProvince}</span>
          </div>
          <div className='flex items-center gap-1 truncate text-xs text-white/80'>
            <Clock size={12} />
            <span className='truncate'>{hours}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

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
  const { state: authState } = useAuth();
  const role = authState.userInfo.role_name ?? 'Patient';
  const fhirId = authState.userInfo.fhirId;
  const orgId = authState.userInfo.organizationId;

  const [clinicFilter, setClinicFilter] = useState<IUseClinicParams>({});
  const [searchTerm, setSearchTerm] = useState<string>('');

  const { data: locations, isLoading } = useClinicLocations({
    role,
    fhirId,
    orgId: orgId || undefined,
    city: clinicFilter.city
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
    const isAdmin = role === 'Clinic Admin';

    if (isAdmin) {
      // Admin opens drawer — handled by parent clinic-detail
      router.push(`/clinic?id=${locationId}`);
      return;
    }

    router.push(`/clinic?id=${locationId}`);
  };

  /** Renders filter, search, and location grid. */
  const renderContent = () => {
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
            {clinicFilter.city && (
              <Badge className='bg-secondary mt-4 rounded-md px-4 py-[3px] font-normal text-white'>
                {clinicFilter.city}
              </Badge>
            )}
          </div>

          {renderContent()}
        </div>
      </ContentWraper>
    </>
  );
}
