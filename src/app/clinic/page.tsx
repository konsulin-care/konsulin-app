'use client';

import { useSearchParams } from 'next/navigation';
import ClinicDetail from './clinic-detail';
import ClinicList from './clinic-list';

export default function ClinicPage() {
  const searchParams = useSearchParams();
  const clinicId = searchParams.get('clinicId');

  if (clinicId) {
    return <ClinicDetail />;
  }

  return <ClinicList />;
}
