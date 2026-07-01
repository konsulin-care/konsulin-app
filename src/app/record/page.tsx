'use client';

import { useSearchParams } from 'next/navigation';
import RecordDetail from './record-detail';
import RecordList from './record-list';

/**
 *
 */
export default function RecordPage() {
  const searchParams = useSearchParams();
  const id = searchParams.get('id');

  if (id) {
    return <RecordDetail />;
  }

  return <RecordList />;
}
