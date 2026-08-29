'use client';

import type { HealthcareService } from 'fhir/r4';
import { Clock, Coins } from 'lucide-react';
import { getFeeFromHealthcareService, formatFee } from '@/utils/fhir/fee';
import { getServiceDuration } from '@/utils/fhir/service-duration';

type Props = {
  readonly service: HealthcareService;
  readonly onClick?: () => void;
  readonly isSelected?: boolean;
  readonly onContextMenu?: (e: React.MouseEvent) => void;
  readonly onTouchStart?: (e: React.TouchEvent) => void;
  readonly onTouchMove?: (e: React.TouchEvent) => void;
  readonly onTouchEnd?: (e: React.TouchEvent) => void;
};

/**
 * Shared healthcare service card.
 *
 * Renders name, fee, duration, and extra details in a consistent layout.
 * Used by both the patient-facing detail page and the admin services tab.
 * Supports selected state and contextual event handlers for admin selection.
 * Inactive services are rendered at 50% opacity.
 */
export default function ServiceCard({
  service,
  onClick,
  isSelected = false,
  onContextMenu,
  onTouchStart,
  onTouchMove,
  onTouchEnd
}: Props) {
  const isActive = service.active !== false;
  const fee = getFeeFromHealthcareService(service);
  const duration = getServiceDuration(service);

  return (
    <button
      type='button'
      onClick={onClick}
      onContextMenu={onContextMenu}
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
      className={`w-full cursor-pointer rounded-lg border p-4 text-left ${
        isSelected
          ? 'border-primary-500 ring-2 ring-primary-500 bg-primary-50'
          : 'border-gray-200 bg-white'
      } ${isActive ? '' : 'opacity-50'}`}
    >
      <div className='text-sm font-bold text-black'>{service.name}</div>
      {fee && (
        <div className='mt-1 flex items-center gap-1 text-sm font-bold text-gray-500'>
          <Coins size={14} />
          {formatFee(fee)}
        </div>
      )}
      {duration != null && (
        <div className='mt-1 flex items-center gap-1 text-sm text-gray-500'>
          <Clock size={14} />
          {duration} min
        </div>
      )}
      {service.extraDetails && (
        <div className='mt-2 text-xs text-gray-500'>
          {service.extraDetails}
        </div>
      )}
    </button>
  );
}
