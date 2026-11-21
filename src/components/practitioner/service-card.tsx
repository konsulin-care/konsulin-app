'use client';

import { formatFee, getFeeFromHealthcareService } from '@/utils/fhir/fee';
import { getServiceDuration } from '@/utils/fhir/service-duration';
import type { HealthcareService } from 'fhir/r4';
import { Clock, Coins } from 'lucide-react';

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
          ? 'border-primary-500 ring-primary-500 bg-primary-50 ring-2'
          : 'border-border bg-card'
      } ${isActive ? '' : 'opacity-50'}`}
    >
      <div className='text-foreground text-sm font-bold'>{service.name}</div>
      {fee && (
        <div className='text-muted-foreground mt-1 flex items-center gap-1 text-sm font-bold'>
          <Coins size={14} />
          {formatFee(fee)}
        </div>
      )}
      {duration != null && (
        <div className='text-muted-foreground mt-1 flex items-center gap-1 text-sm'>
          <Clock size={14} />
          {duration} min
        </div>
      )}
      {service.extraDetails && (
        <div className='text-muted-foreground mt-2 text-xs'>
          {service.extraDetails}
        </div>
      )}
    </button>
  );
}
