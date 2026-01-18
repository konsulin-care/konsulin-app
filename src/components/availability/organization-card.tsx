'use client';

import { Button } from '@/components/ui/button';
import { OrganizationCardProps } from '@/types/availability';
import { validateTimeRange } from '@/utils/availability';
import { Plus } from 'lucide-react';
import TimeRangeInput from './time-range-input';

export default function OrganizationCard({
  organization,
  timeRanges,
  onTimeRangeAdd,
  onTimeRangeRemove,
  onTimeRangeChange
}: OrganizationCardProps) {
  return (
    <div className='rounded-lg border border-gray-200 bg-white p-4'>
      <div className='mb-3 flex flex-col gap-2'>
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
              Add Time
            </Button>
          </div>
        </div>
      </div>

      <div className='space-y-3'>
        {timeRanges.length === 0 ? (
          <p className='text-xs text-gray-500'>
            No availability configured for this location
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
                showRemoveButton={true}
                error={validation.valid ? undefined : validation.error}
              />
            );
          })
        )}
      </div>
    </div>
  );
}
