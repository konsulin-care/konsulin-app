'use client';

import { useSearchParams } from 'next/navigation';
import { useEffect } from 'react';
import ClinicDetail from './clinic-detail';
import ClinicList from './clinic-list';

/** Clinic root: route to list or detail view based on clinicId param. */
export default function ClinicPage() {
  const searchParams = useSearchParams();
  const clinicId = searchParams.get('clinicId');

  useEffect(() => {
    if (!clinicId) {
      globalThis.window.scrollTo(0, 0);
    }
  }, [clinicId]);

  if (clinicId) {
    return <ClinicDetail />;
  }

  return <ClinicList />;
}
