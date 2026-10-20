'use client';

import { Button } from '@/components/ui/button';
import { useTranslations } from '@/i18n';
import { OrganizationCardProps } from '@/types/availability';
import { validateTimeRange } from '@/utils/availability';
import { Plus } from 'lucide-react';
import TimeRangeInput from './time-range-input';

type OrganizationCardHeaderProps = Pick<
  OrganizationCardProps,
  'organization' | 'onTimeRangeAdd'
>;

/**
 * Card header row with the organization name and the add-time action button.
 */
function OrganizationCardHeader({
  organization,
  onTimeRangeAdd
}: OrganizationCardHeaderProps) {
  const t = useTranslations('common');
  return (
    <div className='flex flex-col sm:flex-row sm:items-center sm:justify-between'>
      <h3 className='max-w-[200px] truncate text-sm font-semibold text-gray-900'>
        {organization.name}
      </h3>
      <div className='mt-2 sm:mt-0'>
        <Button
          type='button'
          variant='outline'
          size='sm'
          onClick={onTimeRangeAdd}
          className='h-7 gap-1 text-xs whitespace-nowrap'
        >
          <Plus className='h-3 w-3' />
          {t('location.add_time')}
        </Button>
      </div>
    </div>
  );
}

/**
 *
 */
export default function OrganizationCard({
  organization,
  timeRanges,
  onTimeRangeAdd,
  onTimeRangeRemove,
  onTimeRangeChange
}: OrganizationCardProps) {
  const t = useTranslations('common');
  return (
    <div className='rounded-lg border border-gray-200 bg-white p-4'>
      <div className='mb-3 flex flex-col gap-2'>
        <OrganizationCardHeader
          organization={organization}
          onTimeRangeAdd={onTimeRangeAdd}
        />
      </div>

      <div className='space-y-3'>
        {timeRanges.length === 0 ? (
          <p className='text-xs text-gray-500'>
            {t('location.no_availability')}
          </p>
        ) : (
          timeRanges.map(timeRange => {
            const validation = validateTimeRange(timeRange);
            return (
              <TimeRangeInput
                key={timeRange.id}
                timeRange={timeRange}
                onFromChange={value =>
                  onTimeRangeChange(timeRange.id, 'from', value)
                }
                onToChange={value =>
                  onTimeRangeChange(timeRange.id, 'to', value)
                }
                onRemove={() => onTimeRangeRemove(timeRange.id)}
                showRemoveButton
                error={validation.valid ? undefined : validation.error}
              />
            );
          })
        )}
      </div>
    </div>
  );
}
