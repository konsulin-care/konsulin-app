'use client';

import CardLoader from '@/components/general/card-loader';
import EmptyState from '@/components/general/empty-state';
import { PractitionerCard } from '@/components/practitioner/practitioner-card';
import { InputWithIcon } from '@/components/ui/input-with-icon';
import {
  type BundleEntry,
  type HealthcareService,
  type Location,
  type PractitionerRole
} from 'fhir/r4';
import { SearchIcon } from 'lucide-react';
import Image from 'next/image';
import { useCallback, useMemo, useRef, useState } from 'react';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const DAY_ORDER = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'] as const;
const DAY_LABELS: Record<string, string> = {
  mon: 'Mon',
  tue: 'Tue',
  wed: 'Wed',
  thu: 'Thu',
  fri: 'Fri',
  sat: 'Sat',
  sun: 'Sun'
};

/** Build a full address string from a FHIR Location address. */
function formatAddress(address: Location['address']): string {
  if (!address) return '';
  const parts: string[] = [];
  if (address.line) parts.push(...address.line);
  if (address.city) parts.push(address.city);
  if (address.state) {
    parts.push(
      address.postalCode
        ? `${address.state} ${address.postalCode}`
        : address.state
    );
  } else if (address.postalCode) {
    parts.push(address.postalCode);
  }
  return parts.join(', ');
}

/** Parse Location.hoursOfOperation into sorted day-hour strings. */
function buildHoursList(hours: Location['hoursOfOperation']): string[] {
  if (!hours || hours.length === 0) return [];

  const hoursMap = new Map<string, string>();

  for (const entry of hours) {
    if (!entry.daysOfWeek?.length || !entry.openingTime || !entry.closingTime)
      continue;
    const timeStr = `${entry.openingTime.slice(0, 5)}-${entry.closingTime.slice(0, 5)}`;
    for (const day of entry.daysOfWeek) {
      const label = DAY_LABELS[day.toLowerCase()];
      if (label) {
        hoursMap.set(day.toLowerCase(), `${label}: ${timeStr}`);
      }
    }
  }

  return DAY_ORDER.filter(d => hoursMap.has(d)).map(d => hoursMap.get(d) ?? '');
}

// ---------------------------------------------------------------------------
// PractitionerCard mapping
// ---------------------------------------------------------------------------

interface CardData {
  id: string;
  practitionerName: string;
  photoUrl: string | undefined;
  specialties: string[];
  healthcareServiceNames: string[];
  practitionerRoleId: string;
}

/** Extract practitioner display name from a FHIR resource. */
function getPractitionerName(resource: BundleEntry['resource']): string {
  const name = (
    resource as
      | { name?: Array<{ given?: string[]; family?: string }> }
      | undefined
  )?.name?.[0];
  return (
    [name?.given?.join(' '), name?.family].filter(Boolean).join(' ') || '-'
  );
}

/** Extract photo URL from a FHIR resource. */
function getPhotoUrl(resource: BundleEntry['resource']): string | undefined {
  return (resource as { photo?: Array<{ url?: string }> } | undefined)
    ?.photo?.[0]?.url;
}

/** Extract healthcare service names for a practitioner role. */
function getServiceNames(
  role: BundleEntry<PractitionerRole>,
  hsMap: Map<string, string>
): string[] {
  const refs = role.resource.healthcareService;
  if (!refs) return [];
  return refs
    .map(ref => {
      const id = ref.reference?.split('/')[1];
      return id ? (hsMap.get(id) ?? '') : '';
    })
    .filter(Boolean);
}

/** Map bundle entries to PractitionerCard-compatible data. */
function mapToCardData(entries: BundleEntry[]): CardData[] {
  const practitionerRoles = entries.filter(
    (e): e is BundleEntry<PractitionerRole> =>
      e.resource?.resourceType === 'PractitionerRole'
  );
  const practitioners = entries.filter(
    e => e.resource?.resourceType === 'Practitioner'
  );
  const healthcareServices = entries.filter(
    (e): e is BundleEntry<HealthcareService> =>
      e.resource?.resourceType === 'HealthcareService'
  );

  const hsMap = new Map(
    healthcareServices
      .filter(hs => hs.resource?.id)
      .map(hs => [hs.resource.id, hs.resource.name ?? ''])
  );

  return practitioners
    .map(item => {
      const practitionerId = item.resource?.id;
      if (!practitionerId) return null;

      const role = practitionerRoles.find(
        r =>
          r.resource?.practitioner?.reference?.split('/')[1] === practitionerId
      );
      if (!role?.resource?.id) return null;

      return {
        id: practitionerId,
        practitionerName: getPractitionerName(item.resource),
        photoUrl: getPhotoUrl(item.resource),
        specialties: (role.resource.specialty?.map(s => s.text) ?? []).filter(
          Boolean
        ),
        healthcareServiceNames: getServiceNames(role, hsMap),
        practitionerRoleId: role.resource.id
      };
    })
    .filter((entry): entry is CardData => entry !== null);
}

// ---------------------------------------------------------------------------
// ClinicHero sub-component
// ---------------------------------------------------------------------------

/**
 * Hero banner with clinic photo, full frost overlay, and interaction handlers.
 *
 * Left click copies address, right-click/long-press shares URL.
 */
function ClinicHero({
  clinicName,
  fullAddress,
  hoursList
}: {
  clinicName: string;
  fullAddress: string;
  hoursList: string[];
}) {
  const isLongPress = useRef(false);
  const longPressTimer = useRef<ReturnType<typeof setTimeout>>();

  const copyAddress = useCallback(() => {
    if (fullAddress) {
      navigator.clipboard.writeText(fullAddress).catch((e: unknown) => {
        console.warn('Clipboard write failed', e);
      });
    }
  }, [fullAddress]);

  const shareUrl = useCallback(() => {
    const url = window.location.href;
    if (navigator.share) {
      navigator.share({ url }).catch((e: unknown) => {
        console.warn('Share failed', e);
      });
    } else {
      navigator.clipboard.writeText(url).catch((e: unknown) => {
        console.warn('Clipboard write failed', e);
      });
    }
  }, []);

  const handleClick = useCallback(() => {
    if (isLongPress.current) {
      isLongPress.current = false;
      return;
    }
    copyAddress();
  }, [copyAddress]);

  const handleContextMenu = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      shareUrl();
    },
    [shareUrl]
  );

  const handleTouchStart = useCallback(() => {
    isLongPress.current = false;
    longPressTimer.current = setTimeout(() => {
      isLongPress.current = true;
      shareUrl();
    }, 500);
  }, [shareUrl]);

  const handleTouchEnd = useCallback(() => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = undefined;
    }
  }, []);

  const handleTouchMove = useCallback(() => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = undefined;
    }
  }, []);

  return (
    <div
      className='relative h-[200px] w-full cursor-pointer overflow-hidden rounded-2xl'
      onClick={handleClick}
      onContextMenu={handleContextMenu}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      onTouchMove={handleTouchMove}
    >
      <Image
        src='/images/clinic.jpg'
        alt={clinicName}
        fill
        className='object-cover'
        sizes='(max-width: 640px) 100vw, 400px'
      />
      <div className='absolute inset-0 flex bg-black/50 p-4 backdrop-blur-md'>
        <div className='flex h-full w-full items-center gap-4'>
          <div className='flex w-[60%] flex-col justify-center'>
            <div className='truncate text-lg font-bold text-white'>
              {clinicName}
            </div>
            <div className='mt-1 truncate text-sm text-white/80'>
              {fullAddress}
            </div>
          </div>
          <div className='flex w-[40%] flex-col justify-center gap-0.5'>
            {hoursList.map(h => (
              <div key={h} className='truncate text-xs text-white/80'>
                {h}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

/**
 * Non-admin clinic detail view.
 *
 * Shows a hero banner with clinic photo, full frost overlay (name, address,
 * per-day hours), and a practitioner listing below using PractitionerCard.
 */
export default function ClinicPractitionersView({
  entries,
  isFetching,
  isLoading
}: {
  entries: BundleEntry[] | undefined;
  isFetching: boolean;
  isLoading: boolean;
}) {
  const [keyword, setKeyword] = useState('');

  const location = useMemo((): Location | undefined => {
    if (!entries) return undefined;
    const entry = entries.find(e => e.resource?.resourceType === 'Location');
    return entry?.resource as Location | undefined;
  }, [entries]);

  const orgEntry = entries?.find(
    e => e.resource?.resourceType === 'Organization'
  );
  const orgName = (orgEntry?.resource as unknown as { name?: string })?.name;

  const clinicName = location?.name ?? orgName ?? '-';
  const fullAddress = formatAddress(location?.address);

  const hoursList = useMemo(
    () => buildHoursList(location?.hoursOfOperation),
    [location?.hoursOfOperation]
  );

  const cards = useMemo(() => {
    if (!entries) return [];
    return mapToCardData(entries);
  }, [entries]);

  const filteredCards = useMemo(() => {
    if (!keyword.trim()) return cards;
    const lower = keyword.toLowerCase();
    return cards.filter(c => c.practitionerName.toLowerCase().includes(lower));
  }, [cards, keyword]);

  if (isLoading || isFetching) return <CardLoader />;

  const showEmptyState = filteredCards.length === 0;

  return (
    <div className='mt-[-24px] rounded-[16px] bg-white p-4'>
      <ClinicHero
        clinicName={clinicName}
        fullAddress={fullAddress}
        hoursList={hoursList}
      />

      <div className='mt-4 flex gap-4'>
        <InputWithIcon
          value={keyword}
          onChange={e => setKeyword(e.target.value)}
          placeholder='Search'
          className='text-primary mr-4 h-[50px] w-full border-0 bg-[#F9F9F9]'
          startIcon={<SearchIcon className='text-[#ABDCDB]' width={16} />}
        />
      </div>

      {showEmptyState ? (
        <EmptyState
          className='py-16'
          title='No Practitioners Found'
          subtitle='Try Another Clinic.'
        />
      ) : (
        <div className='mt-4 flex flex-col gap-4'>
          {filteredCards.map(card => (
            <PractitionerCard key={card.id} {...card} />
          ))}
        </div>
      )}
    </div>
  );
}
