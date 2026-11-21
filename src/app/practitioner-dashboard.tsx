'use client';

import BookingCalendar from '@/app/practitioner/booking-calendar';
import SessionCard from '@/components/schedule/session-card';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuth } from '@/context/auth/authContext';
import { useTranslations } from '@/i18n';
import { usePractitionerDashboard } from '@/services/hooks/usePractitionerDashboard';
import type { MergedSession } from '@/types/appointment';
import { format, startOfDay } from 'date-fns';
import type { ReactNode } from 'react';
import { useMemo, useState } from 'react';

/** Render appointment summary or placeholder for the selected day. */
function renderDayContent(
  selectedDate: Date | null,
  selectedSessions: MergedSession[],
  t: (key: string) => string
): ReactNode {
  if (!selectedDate) {
    return (
      <p className='text-muted-foreground text-center text-[12px]'>
        {t('select_day')}
      </p>
    );
  }

  if (selectedSessions.length === 0) {
    return (
      <p className='text-muted-foreground text-center text-[12px]'>
        {t('no_appointments')}
      </p>
    );
  }

  return (
    <div>
      <h3 className='text-charcoal-700 text-[14px] font-bold'>
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
  const t = useTranslations('home');
  const { state: authState, isLoading: isAuthLoading } = useAuth();
  const practitionerId = authState?.userInfo?.fhirId;

  const today = useMemo(() => startOfDay(new Date()), []);
  const [displayMonth, setDisplayMonth] = useState<Date>(today);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);

  const monthStart = useMemo(
    () => new Date(displayMonth.getFullYear(), displayMonth.getMonth(), 1),
    [displayMonth]
  );
  const monthEnd = useMemo(
    () =>
      new Date(
        displayMonth.getFullYear(),
        displayMonth.getMonth() + 1,
        0,
        23,
        59,
        59,
        999
      ),
    [displayMonth]
  );

  const {
    dayDots,
    colorLegend,
    listAvailableDate,
    availableTime,
    isLoading,
    isDayLoading,
    daySessions
  } = usePractitionerDashboard({
    practitionerId,
    monthStart,
    monthEnd,
    selectedDate
  });

  const loading = isAuthLoading || isLoading || isDayLoading;

  if (loading) {
    return (
      <div className='p-4'>
        <Skeleton className='mb-4 h-[300px] w-full rounded-lg bg-[hsl(210,40%,96.1%)]' />
        <Skeleton className='h-[80px] w-full rounded-lg bg-[hsl(210,40%,96.1%)]' />
      </div>
    );
  }

  const selectedSessions = selectedDate ? daySessions : [];

  /** Update selected date from calendar day picker. */
  const handleDateSelect = (date: Date | undefined) => {
    setSelectedDate(date ?? null);
  };

  /** Update the displayed month when user navigates calendar. */
  const handleMonthChange = (month: Date) => {
    setDisplayMonth(month);
  };

  return (
    <div className='p-4'>
      <h2 className='mb-4 text-[16px] font-bold'>My Schedule</h2>

      <BookingCalendar
        parentOnMonthChange={handleMonthChange}
        bookingState={{
          date: selectedDate ?? today,
          startTime: null,
          hasUserChosenDate: Boolean(selectedDate),
          isBookingSubmitted: false
        }}
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
        showAllDates
      />

      <div className='mt-6'>
        {renderDayContent(selectedDate, selectedSessions, t)}
      </div>
    </div>
  );
}
