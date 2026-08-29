'use client';

import { useSearchParams } from 'next/navigation';
import AssessmentsDetail from './assessments-detail';
import AssessmentsList from './assessments-list';

/** Assessments root: routes to list or detail view based on query params. */
export default function AssessmentsPage() {
  const searchParams = useSearchParams();
  const id = searchParams.get('id');

  if (id) {
    return <AssessmentsDetail />;
  }

  return <AssessmentsList />;
}
