'use client';

import { useSearchParams } from 'next/navigation';
import { useEffect } from 'react';
import ClinicDetail from './clinic-detail';
import ClinicList from './clinic-list';

/** Clinic root: route to list or detail view based on id param. */
export default function ClinicPage() {
  const searchParams = useSearchParams();
  const id = searchParams.get('id');

  useEffect(() => {
    if (!id) {
      globalThis.window.scrollTo(0, 0);
    }
  }, [id]);

  if (id) {
    return <ClinicDetail />;
  }

  return <ClinicList />;
}
