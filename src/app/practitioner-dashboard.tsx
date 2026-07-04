'use client';

import BookingCalendar from '@/app/practitioner/booking-calendar';
import SessionCard from '@/components/schedule/session-card';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuth } from '@/context/auth/authContext';
import type { IStateBooking } from '@/context/booking/bookingTypes';
import { usePractitionerDashboard } from '@/services/hooks/usePractitionerDashboard';
import { format } from 'date-fns';
import type { ReactNode } from 'react';
import { useState } from 'react';

function renderDayContent(
  selectedDate: Date | null,
  selectedSessions: { appointmentId: string; slotStart: string | null }[]
): ReactNode {
  if (!selectedDate) {
    return (
      <p className='text-center text-[12px] text-gray-400'>
        Select a day to view appointments
      </p>
    );
  }

  if (selectedSessions.length === 0) {
    return (
      <p className='text-center text-[12px] text-gray-400'>
        No appointments for this day
      </p>
    );
  }

  return (
    <div>
      <h3 className='text-[14px] font-bold text-gray-700'>
        {format(selectedDate, 'EEEE, dd MMMM yyyy')}
      </h3>
      {selectedSessions.map(session => (
        <SessionCard key={session.appointmentId} session={session} />
      ))}
    </div>
  );
}

const noop = () => {
  /* noop */
};

/** Practitioner home dashboard showing monthly calendar with availability dots. */
export default function PractitionerDashboard() {
  const { state: authState, isLoading: isAuthLoading } = useAuth();
  const practitionerId = authState?.userInfo?.fhirId;

  const today = new Date();
  const monthStart = today;
  const monthEnd = new Date(
    today.getFullYear(),
    today.getMonth() + 1,
    0,
    23,
    59,
    59,
    999
  );

  const {
    sessions,
    dayDots,
    colorLegend,
    listAvailableDate,
    availableTime,
    isLoading
  } = usePractitionerDashboard({
    practitionerId,
    monthStart,
    monthEnd
  });

  const [selectedDate, setSelectedDate] = useState<Date | null>(null);

  const loading = isAuthLoading || isLoading;

  if (loading) {
    return (
      <div className='p-4'>
        <Skeleton className='mb-4 h-[300px] w-full rounded-lg bg-[hsl(210,40%,96.1%)]' />
        <Skeleton className='h-[80px] w-full rounded-lg bg-[hsl(210,40%,96.1%)]' />
      </div>
    );
  }

  const selectedSessions = selectedDate
    ? sessions.filter(s => {
        if (!s.slotStart) return false;
        return (
          format(new Date(s.slotStart), 'yyyy-MM-dd') ===
          format(selectedDate, 'yyyy-MM-dd')
        );
      })
    : [];

  const handleDateSelect = (date: Date | undefined) => {
    setSelectedDate(date ?? null);
  };

  return (
    <div className='p-4'>
      <h2 className='mb-4 text-[16px] font-bold'>My Schedule</h2>

      <BookingCalendar
        bookingState={
          {
            date: selectedDate ?? today,
            startTime: null,
            hasUserChosenDate: Boolean(selectedDate),
            isBookingSubmitted: false
          } as IStateBooking
        }
        handleFilterChange={(_label, value) => {
          if (value instanceof Date) handleDateSelect(value);
        }}
        resetData={noop}
        listAvailableDate={listAvailableDate}
        availableTime={availableTime}
        today={today}
        hideHeader
        dayDots={dayDots}
        colorLegend={colorLegend}
      />

      <div className='mt-6'>
        {renderDayContent(selectedDate, selectedSessions)}
      </div>
    </div>
  );
}
