'use client';

import { useSearchParams } from 'next/navigation';
import ScheduleDetail from './schedule-detail';
import ScheduleList from './schedule-list';

/**
 *
 */
export default function SchedulePage() {
  const searchParams = useSearchParams();
  const id = searchParams.get('id');

  if (id) {
    return <ScheduleDetail />;
  }

  return <ScheduleList />;
}
