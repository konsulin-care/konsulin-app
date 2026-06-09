'use client';

import { useSearchParams } from 'next/navigation';
import ScheduleDetail from './schedule-detail';
import ScheduleList from './schedule-list';

/**
 *
 */
export default function SchedulePage() {
  const searchParams = useSearchParams();
  const appointmentId = searchParams.get('appointmentId');

  if (appointmentId) {
    return <ScheduleDetail />;
  }

  return <ScheduleList />;
}
