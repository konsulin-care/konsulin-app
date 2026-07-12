'use client';

import CardLoader from '@/components/general/card-loader';
import EmptyState from '@/components/general/empty-state';
import { PractitionerCard } from '@/components/practitioner/practitioner-card';
import { InputWithIcon } from '@/components/ui/input-with-icon';
import { getLocationImageUrl } from '@/utils/fhir/location-image';
import {
  type BundleEntry,
  type HealthcareService,
  type Location,
  type PractitionerRole
} from 'fhir/r4';
import { SearchIcon } from 'lucide-react';
import Image from 'next/image';
import { useCallback, useMemo, useRef, useState } from 'react';
import { HeroHours, HeroInfo } from './clinic-hero';
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
function formatAddress(addr: Location['address']): string {
  if (!addr) return '';
  const parts: string[] = [];
  if (addr.line) parts.push(...addr.line);
  if (addr.city) parts.push(addr.city);
  if (addr.state)
    parts.push(
      addr.postalCode ? `${addr.state} ${addr.postalCode}` : addr.state
    );
  else if (addr.postalCode) parts.push(addr.postalCode);
  return parts.join(', ');
}

function buildHoursList(hours: Location['hoursOfOperation']): string[] {
  if (!hours || hours.length === 0) return [];
  const hoursMap = new Map<string, string>();
  for (const entry of hours) {
    if (!entry.daysOfWeek?.length || !entry.openingTime || !entry.closingTime)
      continue;
    const timeStr = `${entry.openingTime.slice(0, 5)}-${entry.closingTime.slice(0, 5)}`;
    for (const day of entry.daysOfWeek) {
      const label = DAY_LABELS[day.toLowerCase()];
      if (label) hoursMap.set(day.toLowerCase(), `${label}: ${timeStr}`);
    }
  }
  return DAY_ORDER.filter(d => hoursMap.has(d)).map(d => hoursMap.get(d) ?? '');
}

interface CardData {
  id: string;
  practitionerName: string;
  photoUrl: string | undefined;
  specialties: string[];
  healthcareServiceNames: string[];
  practitionerRoleId: string;
}

function getPractitionerName(r: BundleEntry['resource']): string {
  const n = (
    r as { name?: Array<{ given?: string[]; family?: string }> } | undefined
  )?.name?.[0];
  return [n?.given?.join(' '), n?.family].filter(Boolean).join(' ') || '-';
}

function getPhotoUrl(r: BundleEntry['resource']): string | undefined {
  return (r as { photo?: Array<{ url?: string }> } | undefined)?.photo?.[0]
    ?.url;
}

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

function ClinicHero({
  clinicName,
  fullAddress,
  hoursList,
  orgName,
  imageUrl
}: Readonly<{
  clinicName: string;
  fullAddress: string;
  hoursList: string[];
  orgName: string;
  imageUrl: string;
}>) {
  const isLongPress = useRef(false);
  const longPressTimer = useRef<ReturnType<typeof setTimeout>>();
  const copyAddress = useCallback(() => {
    if (fullAddress)
      navigator.clipboard.writeText(fullAddress).catch((e: unknown) => {
        console.warn('Clipboard write failed', e);
      });
  }, [fullAddress]);
  const shareUrl = useCallback(async () => {
    if (typeof navigator.share === 'function') {
      try {
        await navigator.share({ url: window.location.href });
        return;
      } catch {
        // share failed or user cancelled — fall through to clipboard
      }
    }
    void navigator.clipboard.writeText(window.location.href);
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
      void shareUrl();
    },
    [shareUrl]
  );
  const handleTouchStart = useCallback(() => {
    isLongPress.current = false;
    longPressTimer.current = setTimeout(() => {
      isLongPress.current = true;
      void shareUrl();
    }, 500);
  }, [shareUrl]);
  const clearTimer = useCallback(() => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = undefined;
    }
  }, []);
  return (
    <div
      className='relative h-[200px] w-full cursor-pointer overflow-hidden rounded-2xl'
      role='button'
      tabIndex={0}
      onClick={handleClick}
      onKeyDown={e => {
        if (e.key === 'Enter' || e.key === ' ') handleClick();
      }}
      onContextMenu={handleContextMenu}
      onTouchStart={handleTouchStart}
      onTouchEnd={clearTimer}
      onTouchMove={clearTimer}
    >
      <Image
        src={imageUrl}
        alt={clinicName}
        fill
        className='object-cover'
        sizes='(max-width: 640px) 100vw, 400px'
      />
      <div className='absolute inset-0 flex bg-black/50 p-4 backdrop-blur-md'>
        <div className='flex h-full w-full items-center gap-4'>
          <HeroInfo
            clinicName={clinicName}
            fullAddress={fullAddress}
            orgName={orgName}
          />
          <HeroHours hoursList={hoursList} />
        </div>
      </div>
    </div>
  );
}

/** Non-admin clinic detail view with hero banner and practitioner listing. */
export default function ClinicPractitionersView({
  entries,
  isFetching,
  isLoading
}: Readonly<{
  entries: BundleEntry[] | undefined;
  isFetching: boolean;
  isLoading: boolean;
}>) {
  const [keyword, setKeyword] = useState('');
  const location = useMemo((): Location | undefined => {
    if (!entries) return undefined;
    return entries.find(e => e.resource?.resourceType === 'Location')
      ?.resource as Location | undefined;
  }, [entries]);
  const imageUrl = useMemo(
    () =>
      location
        ? (getLocationImageUrl(location) ?? '/images/clinic.jpg')
        : '/images/clinic.jpg',
    [location]
  );
  const orgName = (
    entries?.find(e => e.resource?.resourceType === 'Organization')
      ?.resource as { name?: string } | undefined
  )?.name;
  const clinicName = location?.name ?? orgName ?? '-';
  const fullAddress = formatAddress(location?.address);
  const hoursList = useMemo(
    () => buildHoursList(location?.hoursOfOperation),
    [location?.hoursOfOperation]
  );

  const cards = useMemo(
    () => (entries ? mapToCardData(entries) : []),
    [entries]
  );
  const filteredCards = useMemo(() => {
    if (!keyword.trim()) return cards;
    const lower = keyword.toLowerCase();
    return cards.filter(c => c.practitionerName.toLowerCase().includes(lower));
  }, [cards, keyword]);
  if (isLoading || isFetching) return <CardLoader />;
  return (
    <div className='mt-[-24px] rounded-[16px] bg-white p-4'>
      <ClinicHero
        clinicName={clinicName}
        fullAddress={fullAddress}
        orgName={orgName}
        hoursList={hoursList}
        imageUrl={imageUrl}
      />

      <div className='mt-4 flex gap-4'>
        <InputWithIcon
          value={keyword}
          onChange={e => {
            setKeyword(e.target.value);
          }}
          placeholder='Search'
          className='text-primary mr-4 h-[50px] w-full border-0 bg-[#F9F9F9]'
          startIcon={<SearchIcon className='text-[#ABDCDB]' width={16} />}
        />
      </div>

      {filteredCards.length === 0 ? (
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
