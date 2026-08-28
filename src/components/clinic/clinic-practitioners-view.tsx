'use client';

import CardLoader from '@/components/general/card-loader';
import EmptyState from '@/components/general/empty-state';
import { PractitionerCard } from '@/components/practitioner/practitioner-card';
import { InputWithIcon } from '@/components/ui/input-with-icon';
import { buildHoursList, formatAddress } from '@/utils/fhir/location-format';
import { getLocationImageUrl } from '@/utils/fhir/location-image';
import { mapToCardData } from '@/utils/fhir/practitioner-format';
import { type BundleEntry, type Location } from 'fhir/r4';
import { SearchIcon } from 'lucide-react';
import Image from 'next/image';
import { useCallback, useMemo, useRef, useState } from 'react';
import { HeroHours, HeroInfo } from './clinic-hero';

/**
 * Hero banner component for clinic detail view.
 * Displays clinic image, name, address, hours, and org name.
 * Handles click (copy address), long-press/context menu (share URL).
 * @param clinicName - Name of the clinic
 * @param fullAddress - Formatted full address string
 * @param hoursList - Array of formatted hours strings
 * @param orgName - Organization name
 * @param imageUrl - Clinic image URL
 * @returns JSX element for the hero section
 */
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
  // skipcq: JS-W1042 — explicit undefined for readability
  const longPressTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
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
    navigator.clipboard.writeText(window.location.href).catch(() => {
      /* clipboard write failed — ignore */
    });
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
      shareUrl().catch(() => {
        /* share failed — ignore */
      });
    },
    [shareUrl]
  );
  const handleTouchStart = useCallback(() => {
    isLongPress.current = false;
    longPressTimer.current = setTimeout(() => {
      isLongPress.current = true;
      shareUrl().catch(() => {
        /* share failed — ignore */
      });
    }, 500);
  }, [shareUrl]);
  const clearTimer = useCallback(() => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = undefined;
    }
  }, []);
  return (
    <button
      type='button'
      className='relative h-[200px] w-full cursor-pointer overflow-hidden rounded-2xl'
      onClick={handleClick}
      onContextMenu={handleContextMenu}
      onTouchStart={handleTouchStart}
      onTouchEnd={clearTimer}
      onTouchMove={clearTimer}
      onKeyDown={(e: React.KeyboardEvent) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          copyAddress();
        }
      }}
      tabIndex={0}
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
    </button>
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
