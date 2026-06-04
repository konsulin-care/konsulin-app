'use client';

import { useSearchParams } from 'next/navigation';
import AssessmentsDetail from './assessments-detail';
import AssessmentsList from './assessments-list';

export default function AssessmentsPage() {
  const searchParams = useSearchParams();
  const assessmentsId = searchParams.get('assessmentsId');

  if (assessmentsId) {
    return <AssessmentsDetail />;
  }

  return <AssessmentsList />;
}
