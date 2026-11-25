'use client';

import { useFab } from '@/context/fabContext';
import { useTranslations } from '@/i18n';
import type { StudyProgress } from '@/utils/fhir/research';
import { Check, ChevronRight, FlaskConical } from 'lucide-react';
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
  const t = useTranslations('research');
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

  // Stable refs so changing callback identities do not re-run the effect
  const routerRef = useRef(router);
  routerRef.current = router;
  const participateRef = useRef(participate);
  participateRef.current = participate;
  const activeStudyRef = useRef(activeStudy);
  activeStudyRef.current = activeStudy;
  // Translation lookups are stable enough not to re-run the effect when the
  // identity of t changes between renders.
  const tRef = useRef(t);
  tRef.current = t;

  const firstUncompleted = activeStudy?.firstUncompletedQuestionnaireId;

  useEffect(() => {
    // Research form pages: use page-level FAB
    if (isResearchFormPage && onAdvance && onSubmit) {
      if (page === 'title' || page === 'questionnaire') {
        dispatch({
          type: 'SET_ACTION',
          config: {
            label: tRef.current('next_step'),
            icon: ChevronRight,
            onAction: onAdvance,
            disabled: !canAdvance
          }
        });
        return () => dispatch({ type: 'SET_ACTION', config: null });
      }

      dispatch({
        type: 'SET_ACTION',
        config: {
          label: tRef.current('submit'),
          icon: Check,
          onAction: onSubmit
        }
      });
      return () => dispatch({ type: 'SET_ACTION', config: null });
    }

    // Research list page: show role-based action
    if (isResearcher) {
      dispatch({
        type: 'SET_ACTION',
        config: {
          label: tRef.current('register_survey'),
          icon: FlaskConical,
          onAction: () => {
            routerRef.current.push('/research/register?page=title');
          }
        }
      });
      return () => dispatch({ type: 'SET_ACTION', config: null });
    }

    if (firstUncompleted) {
      dispatch({
        type: 'SET_ACTION',
        config: {
          label: tRef.current('participate'),
          icon: FlaskConical,
          onAction: () => {
            const study = activeStudyRef.current;
            if (study) participateRef.current(study);
          }
        }
      });
    } else {
      dispatch({ type: 'SET_ACTION', config: null });
    }

    return () => dispatch({ type: 'SET_ACTION', config: null });
  }, [
    dispatch,
    isResearcher,
    isResearchFormPage,
    page,
    canAdvance,
    onAdvance,
    onSubmit,
    firstUncompleted
  ]);
}
