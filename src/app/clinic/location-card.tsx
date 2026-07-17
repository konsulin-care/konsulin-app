'use client';

import { getTodayHours } from '@/services/clinic-locations';
import { getLocationImageUrl } from '@/utils/fhir/location-image';
import { type Location } from 'fhir/r4';
import { Clock, MapPin } from 'lucide-react';
import Image from 'next/image';

interface LocationCardProps {
  readonly location: Location;
  readonly onClick: () => void;
}

/** Individual clinic location card with image, name, address, and hours. */
export default function LocationCard({ location, onClick }: LocationCardProps) {
  const name = location.name ?? 'Clinic';
  const city = location.address?.city ?? '';
  const state = location.address?.state ?? '';
  const cityProvince = [city, state].filter(Boolean).join(', ') || '-';
  const hours = getTodayHours(location);
  const imageUrl = getLocationImageUrl(location) ?? '/images/clinic.jpg';

  return (
    <button
      type='button'
      className='group relative aspect-[4/3] w-full cursor-pointer overflow-hidden rounded-2xl shadow-lg'
      onClick={onClick}
      data-testid={`location-card-${location.id}`}
    >
      <LocationCardImage imageUrl={imageUrl} name={name} />
      <LocationCardOverlay
        name={name}
        cityProvince={cityProvince}
        hours={hours}
      />
    </button>
  );
}

interface LocationCardImageProps {
  readonly imageUrl: string;
  readonly name: string;
}

/** Renders the clinic location image. */
function LocationCardImage({ imageUrl, name }: LocationCardImageProps) {
  return (
    <Image
      src={imageUrl}
      alt={name}
      fill
      className='object-cover'
      sizes='(max-width: 640px) 100vw, 400px'
    />
  );
}

interface LocationCardOverlayProps {
  readonly name: string;
  readonly cityProvince: string;
  readonly hours: string;
}

/** Renders location name, address, and hours overlay on the card image. */
function LocationCardOverlay({
  name,
  cityProvince,
  hours
}: LocationCardOverlayProps) {
  return (
    <div className='pointer-events-none absolute right-0 bottom-0 left-0 bg-black/50 backdrop-blur-md'>
      <div className='px-3 py-2 text-left'>
        <div className='truncate text-sm font-bold text-white'>{name}</div>
        <div className='flex items-center gap-1 truncate text-xs text-white/80'>
          <MapPin size={12} />
          <span className='min-w-0 truncate'>{cityProvince}</span>
        </div>
        <div className='flex items-center gap-1 truncate text-xs text-white/80'>
          <Clock size={12} />
          <span className='truncate'>{hours}</span>
        </div>
      </div>
    </div>
  );
}
