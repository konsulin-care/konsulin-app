'use client';

/* eslint-disable @typescript-eslint/no-misused-promises */

import ActionCard from '@/components/general/action-card';
import { Skeleton } from '@/components/ui/skeleton';
import { format, parseISO } from 'date-fns';
import { Calendar, FileText } from 'lucide-react';
import {
  type SessionRowData,
  useTodaySchedule
} from './hooks/useTodaySchedule';

/** Skeleton placeholder shown during loading. */
function ScheduleSkeleton() {
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

/** Row displaying a single session with time and status. */
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

/** Renders schedule content with error, empty, or list states. */
function ScheduleSection({
  sessions,
  isError,
  onRetry
}: {
  readonly sessions: readonly SessionRowData[];
  readonly isError: boolean;
  readonly onRetry: () => void;
}) {
  /** Renders schedule content based on error, empty, or list state. */
  const renderContent = () => {
    if (isError) {
      return (
        <div className='p-6 text-center'>
          <p className='mb-2 text-[12px] text-gray-500'>
            Failed to load schedule
          </p>
          <button
            type='button'
            onClick={onRetry}
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
          <SessionRow key={session.appointmentId || idx} session={session} />
        ))}
      </div>
    );
  };

  return (
    <div className='p-4'>
      <div className='mb-2 flex items-center gap-2'>
        <Calendar className='h-4 w-4 text-[#13C2C2]' />
        <span className='text-[14px] font-bold text-[#2C2F3599]'>
          Today&apos;s Schedule
        </span>
      </div>
      <div className='overflow-hidden rounded-lg bg-[#F9F9F9]'>
        {renderContent()}
      </div>
      <div className='mt-1 text-right text-[10px] text-gray-400'>
        Full calendar view coming soon
      </div>
    </div>
  );
}

/** Quick actions section with SOAP report link. */
function QuickActionsSection() {
  const soapReportLink = (
    <ActionCard
      icon={<FileText className='h-5 w-5 text-gray-600' />}
      title='SOAP Report'
      description='Record your session notes'
      href='/assessments/soap'
    />
  );

  return (
    <div className='p-4 pt-0'>
      <div className='mb-2 text-[14px] font-bold text-[#2C2F3599]'>
        Quick Actions
      </div>
      <div className='flex flex-col gap-4'>{soapReportLink}</div>
    </div>
  );
}

/** Clinician home page showing today's schedule and quick actions. */
export default function HomeContentClinician() {
  const { sessions, isLoading, isError, refetch } = useTodaySchedule();

  if (isLoading) return <ScheduleSkeleton />;

  return (
    <>
      <ScheduleSection
        sessions={sessions}
        isError={isError}
        onRetry={refetch}
      />
      <QuickActionsSection />
    </>
  );
}
