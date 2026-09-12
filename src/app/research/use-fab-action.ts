'use client';

import { useFab } from '@/context/fabContext';
import type { StudyProgress } from '@/utils/fhir/research';
import { FlaskConical } from 'lucide-react';
import { useEffect } from 'react';

/**
 * Sets up the FAB action for the research page.
 * Researchers see "Register Survey", patients see "Participate".
 */
export function useResearchFabAction({
  isResearcher,
  activeStudy,
  participate,
  router
}: {
  isResearcher: boolean;
  activeStudy: StudyProgress | null;
  participate: (study: StudyProgress) => void;
  router: { push: (url: string) => void };
}) {
  const { dispatch } = useFab();

  useEffect(() => {
    if (isResearcher) {
      dispatch({
        type: 'SET_ACTION',
        config: {
          label: 'Register Survey',
          icon: FlaskConical,
          onAction: () => router.push('/research/register')
        }
      });
      return () => dispatch({ type: 'SET_ACTION', config: null });
    }

    const firstUncompleted = activeStudy?.firstUncompletedQuestionnaireId;

    if (firstUncompleted) {
      dispatch({
        type: 'SET_ACTION',
        config: {
          label: 'Participate',
          icon: FlaskConical,
          onAction: () => participate(activeStudy)
        }
      });
    } else {
      dispatch({ type: 'SET_ACTION', config: null });
    }

    return () => dispatch({ type: 'SET_ACTION', config: null });
  }, [activeStudy, dispatch, isResearcher, participate, router]);
}
