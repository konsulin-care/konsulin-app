import { Calendar } from '@/components/ui/calendar-temp';
import { DrawerDescription, DrawerTitle } from '@/components/ui/drawer';
import type { IStateBooking } from '@/context/booking/bookingTypes';
import type { PractitionerRoleAvailableTime } from 'fhir/r4';
import { getAvailableDays } from './utils';

type Props = {
  bookingState: IStateBooking;
  handleFilterChange: (
    label: string,
    value: string | Date | boolean | undefined
  ) => void;
  resetData: () => void;
  listAvailableDate: Date[];
  availableTime: PractitionerRoleAvailableTime[];
  today: Date;
};

/** Calendar-based date picker showing practitioner availability. */
export default function BookingCalendar({
  bookingState,
  handleFilterChange,
  resetData,
  listAvailableDate,
  availableTime,
  today
}: Readonly<Props>) {
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
