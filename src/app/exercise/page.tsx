'use client';

import { useSearchParams } from 'next/navigation';
import ExerciseDetail from './exercise-detail';
import ExerciseList from './exercise-list';

export default function ExercisePage() {
  const searchParams = useSearchParams();
  const exerciseId = searchParams.get('exerciseId');

  if (exerciseId) {
    return <ExerciseDetail />;
  }

  return <ExerciseList />;
}
