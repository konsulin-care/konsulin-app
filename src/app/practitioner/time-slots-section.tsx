/* eslint-disable @typescript-eslint/no-explicit-any */
import EmptyState from '@/components/general/empty-state';
import { LoadingSpinnerIcon } from '@/components/icons';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';

type SlotPill = {
  id: string;
  displayLabel: string;
  value: string;
  start: Date;
  end: Date;
  disabled: boolean;
  status: string;
};

type Props = {
  bookingState: any;
  isLoading: boolean;
  isError: boolean;
  slotPills: SlotPill[];
  scheduleId: string;
  handleFilterChange: (label: string, value: any) => void;
  setSelectedSlotId: (id: string | null) => void;
};

/** Time slot pills grid showing available appointment times. */
export default function TimeSlotsSection({
  bookingState,
  isLoading,
  isError,
  slotPills,
  scheduleId,
  handleFilterChange,
  setSelectedSlotId
}: Readonly<Props>) {
  return (
    <div className='card my-4 border-0 bg-[#F9F9F9]'>
      <div className='mb-4 font-bold'>
        {bookingState.date && format(bookingState.date, 'dd MMMM yyyy')}
      </div>
      {isLoading ? (
        <div className='flex h-[120px] items-center justify-center'>
          <LoadingSpinnerIcon
            width={50}
            height={50}
            className='w-full animate-spin'
          />
        </div>
      ) : isError ? (
        <div className='flex w-full justify-center'>
          <EmptyState
            size={42}
            title='Unable to load available slots'
            subtitle='Please try again later'
          />
        </div>
      ) : slotPills.length === 0 ? (
        <div className='flex w-full justify-center'>
          <EmptyState
            size={42}
            title='No available time slots'
            subtitle='Try another date'
          />
        </div>
      ) : (
        <div className='grid grid-cols-[repeat(auto-fill,minmax(70px,1fr))] justify-center gap-x-1 gap-y-2'>
          {slotPills.map(pill => {
            const isSelected = pill.value === bookingState.startTime;
            const pillClassName = isSelected
              ? 'bg-secondary hover:bg-secondary font-bold text-white'
              : 'bg-white font-normal';
            return (
              <Button
                variant='outline'
                key={pill.id}
                disabled={pill.disabled || !scheduleId}
                onClick={() => {
                  handleFilterChange('startTime', pill.value);
                  setSelectedSlotId(pill.id);
                }}
                className={cn(
                  'w-full items-center justify-center rounded-md border-0 px-4 py-2 text-[12px]',
                  pillClassName
                )}
                aria-disabled={pill.disabled}
              >
                {pill.displayLabel}
              </Button>
            );
          })}
        </div>
      )}
    </div>
  );
}
