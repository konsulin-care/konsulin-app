'use client';

import { Skeleton } from '@/components/ui/skeleton';
import { useAuth } from '@/context/auth/authContext';
import { useGetTodaySessions } from '@/services/api/appointments';
import { mergeNames, parseMergedSessions } from '@/utils/helper';
import { format, parseISO } from 'date-fns';
import { Calendar, Dumbbell, FileText } from 'lucide-react';
import Link from 'next/link';
import { useMemo } from 'react';

/** Clinician home page showing today's schedule and quick actions. */
export default function HomeContentClinician() {
  const { state: authState, isLoading: isAuthLoading } = useAuth();
  const practitionerId = authState?.userInfo?.fhirId;

  const {
    data: sessionData,
    isLoading: isSessionsLoading,
    isError: isSessionsError,
    refetch: refetchSessions
  } = useGetTodaySessions({
    practitionerId,
    dateReference: format(new Date(), 'yyyy-MM-dd'),
    enabled: !isAuthLoading && Boolean(practitionerId)
  });

  const sessions = useMemo(() => {
    if (!sessionData || sessionData.total === 0) return [];

    const parsed = parseMergedSessions(sessionData);

    const enriched = parsed
      .filter(session => session.slotStart && session.slotEnd)
      .map(session => {
        const patientName = mergeNames(session.patientName);
        return {
          ...session,
          displayPatientName:
            patientName.trim() === '-' ? session.patientEmail : patientName
        };
      });

    enriched.sort((a, b) => {
      return parseISO(a.slotStart).getTime() - parseISO(b.slotStart).getTime();
    });

    return enriched;
  }, [sessionData]);

  const isLoading = isAuthLoading || isSessionsLoading;

  if (isLoading) {
    return (
      <div className='p-4'>
        <Skeleton className='mb-4 h-[200px] w-full rounded-lg bg-[hsl(210,40%,96.1%)]' />
        <div className='flex gap-4'>
          <Skeleton className='h-[80px] w-full rounded-lg bg-[hsl(210,40%,96.1%)]' />
          <Skeleton className='h-[80px] w-full rounded-lg bg-[hsl(210,40%,96.1%)]' />
        </div>
      </div>
    );
  }

  type SessionRowData = {
    slotStart?: string;
    slotEnd?: string;
    appointmentId?: string;
    displayPatientName: string;
  };

  function SessionRow({ session }: Readonly<{ session: SessionRowData }>) {
    if (!session.slotStart || !session.slotEnd) return null;
    const startTime = format(parseISO(session.slotStart), 'HH:mm');
    const endTime = format(parseISO(session.slotEnd), 'HH:mm');
    const isPast = parseISO(session.slotEnd).getTime() < Date.now();

    return (
      <div className='flex items-center gap-3 px-4 py-3'>
        <div className='min-w-[60px] text-center'>
          <div className='text-[13px] font-bold text-gray-800'>{startTime}</div>
          <div className='text-[10px] text-gray-400'>{endTime}</div>
        </div>
        <div
          className={`h-8 w-[3px] rounded-full ${isPast ? 'bg-gray-200' : 'bg-[#13C2C2]'}`}
        />
        <div className='flex-1'>
          <div className='text-[12px] font-bold text-gray-800'>
            {session.displayPatientName}
          </div>
        </div>
        <div
          className={`rounded-full px-2 py-0.5 text-[10px] ${isPast ? 'bg-gray-100 text-gray-400' : 'bg-[#E6F7F7] text-[#13C2C2]'}`}
        >
          {isPast ? 'Completed' : 'Upcoming'}
        </div>
      </div>
    );
  }

  const renderScheduleContent = () => {
    if (isSessionsError) {
      return (
        <div className='p-6 text-center'>
          <p className='mb-2 text-[12px] text-gray-500'>
            Failed to load schedule
          </p>
          <button
            onClick={() => refetchSessions()}
            className='text-secondary text-[12px] underline'
          >
            Tap to retry
          </button>
        </div>
      );
    }
    if (sessions.length === 0) {
      return (
        <div className='p-6 text-center'>
          <Calendar className='mx-auto mb-2 h-8 w-8 text-gray-300' />
          <p className='text-[12px] text-gray-500'>
            No sessions scheduled for today
          </p>
        </div>
      );
    }
    return (
      <div className='divide-y divide-gray-100'>
        {sessions.map((session, idx) => (
          <SessionRow
            key={session.appointmentId || idx}
            session={session as SessionRowData}
          />
        ))}
      </div>
    );
  };

  return (
    <>
      {/* PRIMARY: Today's Schedule Calendar Stub */}
      <div className='p-4'>
        <div className='mb-2 flex items-center gap-2'>
          <Calendar className='h-4 w-4 text-[#13C2C2]' />
          <span className='text-[14px] font-bold text-[#2C2F3599]'>
            Today&apos;s Schedule
          </span>
        </div>

        <div className='overflow-hidden rounded-lg bg-[#F9F9F9]'>
          {renderScheduleContent()}
        </div>

        <div className='mt-1 text-right text-[10px] text-gray-400'>
          Full calendar view coming soon
        </div>
      </div>

      {/* SECONDARY: Quick Actions */}
      <div className='p-4 pt-0'>
        <div className='mb-2 text-[14px] font-bold text-[#2C2F3599]'>
          Quick Actions
        </div>
        <div className='flex flex-col gap-4'>
          <Link
            href='/assessments/soap'
            className='card flex w-full items-center gap-3 p-4'
          >
            <div className='flex h-[40px] w-[40px] shrink-0 items-center justify-center rounded-full bg-[#F8F8F8]'>
              <FileText className='h-5 w-5 text-gray-600' />
            </div>
            <div className='flex flex-col'>
              <span className='text-primary text-[12px] font-bold'>
                SOAP Report
              </span>
              <span className='text-primary text-[10px]'>
                Record your session notes
              </span>
            </div>
          </Link>

          <Link
            href='/exercise'
            className='card flex w-full items-center gap-3 p-4'
          >
            <div className='flex h-[40px] w-[40px] shrink-0 items-center justify-center rounded-full bg-[#F8F8F8]'>
              <Dumbbell className='h-5 w-5 text-gray-600' />
            </div>
            <div className='flex flex-col'>
              <span className='text-primary text-[12px] font-bold'>
                Health Exercise Resources
              </span>
              <span className='text-primary text-[10px]'>
                Help your patient with curated exercises
              </span>
            </div>
          </Link>
        </div>
      </div>
    </>
  );
}
