/* eslint-disable @typescript-eslint/no-explicit-any */
import { Calendar } from '@/components/ui/calendar-temp';
import { DrawerDescription, DrawerTitle } from '@/components/ui/drawer';
import { getAvailableDays } from './utils';

type Props = {
  bookingState: any;
  handleFilterChange: (label: string, value: any) => void;
  resetData: () => void;
  listAvailableDate: Date[];
  availableTime: any[];
  today: Date;
};

export default function BookingCalendar({
  bookingState,
  handleFilterChange,
  resetData,
  listAvailableDate,
  availableTime,
  today
}: Props) {
  return (
    <>
      <DrawerTitle className='mx-auto text-[20px] font-bold'>
        See Availability
      </DrawerTitle>
      <div className='mt-4 flex w-full flex-col justify-center'>
        <DrawerDescription />
        <Calendar
          defaultMonth={bookingState.date}
          mode='single'
          selected={bookingState.date}
          onSelect={date => {
            if (!date) return;
            handleFilterChange('date', date);
            handleFilterChange('hasUserChosenDate', true);
            resetData();
          }}
          onMonthChange={month => {
            if (!month) return;
            // Update available dates for the new month
            const newAvailableDays = getAvailableDays(availableTime, month);
            // Find the first available date in the new month
            const firstAvailable = newAvailableDays.find(day => day >= month);
            if (firstAvailable) {
              handleFilterChange('date', firstAvailable);
            }
            resetData();
          }}
          disabled={date =>
            date < today ||
            !listAvailableDate.some(
              availableDate => availableDate.getTime() === date.getTime()
            )
          }
        />
      </div>
    </>
  );
}
