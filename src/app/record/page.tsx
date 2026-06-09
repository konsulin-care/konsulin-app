'use client';

import { useSearchParams } from 'next/navigation';
import RecordDetail from './record-detail';
import RecordList from './record-list';

/**
 *
 */
export default function RecordPage() {
  const searchParams = useSearchParams();
  const recordId = searchParams.get('recordId');

  if (recordId) {
    return <RecordDetail />;
  }

  return <RecordList />;
}
