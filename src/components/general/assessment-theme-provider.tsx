'use client';

import {
  rendererThemeComponentOverrides,
  rendererThemeOptions,
  useQuestionnaireStore
} from '@aehrc/smart-forms-renderer';
import { GlobalStyles, ScopedCssBaseline } from '@mui/material';
import {
  createTheme,
  StyledEngineProvider,
  ThemeProvider
} from '@mui/material/styles';
import type { ReactNode } from 'react';
import { useEffect, useMemo } from 'react';

import { useQuestionFocus } from '@/hooks/useQuestionFocus';

/** Find the .MuiGrid-container that wraps a question+answer card from a label ID. */
export function getCardContainer(labelId: string): HTMLElement | null {
  const label = document.querySelector<HTMLLabelElement>(
    '#' + CSS.escape(labelId)
  );
  if (label?.tagName !== 'LABEL') return null;
  let el = label.parentElement;
  while (el) {
    if (el.classList.contains('MuiGrid-container')) return el;
    el = el.parentElement;
  }
  return null;
}

function QuestionFocusTracker() {
  const { activeLinkId } = useQuestionFocus();
  const currentPageIndex = useQuestionnaireStore.use.currentPageIndex();

  useEffect(() => {
    // Add base class to question containers not yet marked
    const labels = document.querySelectorAll<HTMLElement>('[id^="label-"]');
    labels.forEach(label => {
      if (label.tagName !== 'LABEL') return;
      const container = getCardContainer(label.id);
      if (container && !container.classList.contains('question-card')) {
        container.classList.add('question-card');
      }
    });

    // Reset active class
    document.querySelectorAll('.question-card--active').forEach(el => {
      el.classList.remove('question-card--active');
    });

    // Apply active class to the focus question
    if (activeLinkId) {
      const container = getCardContainer('label-' + activeLinkId);
      container?.classList.add('question-card--active');
    }

    return () => {
      document.querySelectorAll('.question-card').forEach(el => {
        el.classList.remove('question-card', 'question-card--active');
      });
    };
  }, [activeLinkId, currentPageIndex]);

  return null;
}

interface AssessmentThemeProviderProps {
  children: ReactNode;
}

/** Custom MUI theme provider that replaces smart-forms' RendererThemeProvider
 *  and adds a question-focus zoom effect. */
export default function AssessmentThemeProvider({
  children
}: AssessmentThemeProviderProps) {
  // The renderer bundles MUI v7, but the host project uses MUI v5.
  // Type casts are needed because their ThemeOptions types are incompatible.
  const theme = useMemo(() => {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
    const base = createTheme(rendererThemeOptions as any);
    // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
    base.components = rendererThemeComponentOverrides(base as any) as Record<
      string,
      object
    >;
    return base;
  }, []);

  return (
    <StyledEngineProvider injectFirst>
      <ThemeProvider theme={theme}>
        <ScopedCssBaseline enableColorScheme>
          <GlobalStyles
            styles={{
              '.question-card': {
                transition:
                  'transform 0.35s cubic-bezier(0.4, 0, 0.2, 1), box-shadow 0.35s cubic-bezier(0.4, 0, 0.2, 1)'
              },
              '.question-card--active': {
                transform: 'scale(1.04)',
                zIndex: 10,
                position: 'relative' as const
              }
            }}
          />
          <QuestionFocusTracker />
          {children}
        </ScopedCssBaseline>
      </ThemeProvider>
    </StyledEngineProvider>
  );
}
