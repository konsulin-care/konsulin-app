'use client';

import { useSearchParams } from 'next/navigation';
import ExerciseDetail from './exercise-detail';
import ExerciseList from './exercise-list';

/** Exercise root: route to list or detail view based on id param. */
export default function ExercisePage() {
  const searchParams = useSearchParams();
  const id = searchParams.get('id');

  if (id) {
    return <ExerciseDetail />;
  }

  return <ExerciseList />;
}
