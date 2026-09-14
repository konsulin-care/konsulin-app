'use client';

import { useFab } from '@/context/fabContext';
import type { StudyProgress } from '@/utils/fhir/research';
import { ArrowRight, Check, FlaskConical } from 'lucide-react';
import { usePathname, useSearchParams } from 'next/navigation';
import { useEffect, useRef } from 'react';
import {
  useResearchFormActions,
  type ResearchFormActions
} from './research-form-actions-context';

/** Returns form actions if inside a provider, null otherwise. */
function useResearchFormActionsOrNull(): ResearchFormActions | null {
  try {
    return useResearchFormActions();
  } catch {
    return null;
  }
}

type Page = 'title' | 'questionnaire' | 'batch';

const VALID_PAGES = new Set<Page>(['title', 'questionnaire', 'batch']);

/**
 * Sets up the FAB action for research pages.
 *
 * On research form pages (/research/register, /research/edit), the FAB
 * acts as the page CTA (Next/Submit). On the research list page, it
 * shows "Register Survey" for researchers or "Participate" for patients.
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
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // Check if on a research form page
  const isResearchFormPage =
    pathname === '/research/register' || pathname === '/research/edit';

  // Get page from URL params
  const rawPage = searchParams.get('page');
  const page: Page = VALID_PAGES.has(rawPage as Page)
    ? (rawPage as Page)
    : 'title';

  // Get form actions from context (returns null if not inside provider)
  const formActions = useResearchFormActionsOrNull();
  const canAdvance = formActions?.canAdvance ?? false;
  const onAdvance = formActions?.onAdvance;
  const onSubmit = formActions?.onSubmit;

  // Stable ref for router to avoid infinite effect loops
  const routerRef = useRef(router);
  routerRef.current = router;

  useEffect(() => {
    // Research form pages: use page-level FAB
    if (isResearchFormPage && onAdvance && onSubmit) {
      if (page === 'title' || page === 'questionnaire') {
        dispatch({
          type: 'SET_ACTION',
          config: {
            label: 'Next',
            icon: ArrowRight,
            onAction: onAdvance,
            disabled: !canAdvance
          }
        });
        return () => dispatch({ type: 'SET_ACTION', config: null });
      }

      if (page === 'batch') {
        dispatch({
          type: 'SET_ACTION',
          config: {
            label: 'Submit',
            icon: Check,
            onAction: onSubmit
          }
        });
        return () => dispatch({ type: 'SET_ACTION', config: null });
      }
    }

    // Research list page: show role-based action
    if (isResearcher) {
      dispatch({
        type: 'SET_ACTION',
        config: {
          label: 'Register Survey',
          icon: FlaskConical,
          onAction: () =>
            routerRef.current.push('/research/register?page=title')
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
  }, [
    activeStudy,
    dispatch,
    isResearcher,
    isResearchFormPage,
    page,
    canAdvance,
    onAdvance,
    onSubmit,
    participate
  ]);
}
