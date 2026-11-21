'use client';

import ScopedCssBaseline from '@mui/material/ScopedCssBaseline';
import { StyledEngineProvider, ThemeProvider } from '@mui/material/styles';
import { useMemo, type ReactNode } from 'react';

import { createAssessmentTheme } from './assessment-theme';

interface AssessmentThemeProviderProps {
  children?: ReactNode;
}

/**
 * Provides the assessment MUI theme to the smart-forms renderer tree.
 *
 * Mirrors the renderer's own provider stack (StyledEngineProvider with
 * `injectFirst`, ThemeProvider, ScopedCssBaseline) but supplies the theme built
 * by {@link createAssessmentTheme}. `injectFirst` keeps the app's SCSS
 * overrides winning over MUI's runtime styles. Replaces `RendererThemeProvider`
 * so our token-driven theme is applied; see
 * `@docs/ADR/027-mui-renderer-theme.md`.
 *
 * Card-stack CSS is NOT handled here — that is managed by CardDomMapper
 * and the dynamic card-stack stylesheet.
 *
 * @param props - Provider props containing the renderer subtree.
 * @returns The themed renderer subtree.
 */
export function AssessmentThemeProvider({
  children
}: Readonly<AssessmentThemeProviderProps>) {
  const theme = useMemo(() => createAssessmentTheme(), []);

  return (
    <StyledEngineProvider injectFirst>
      <ThemeProvider theme={theme}>
        <ScopedCssBaseline enableColorScheme>{children}</ScopedCssBaseline>
      </ThemeProvider>
    </StyledEngineProvider>
  );
}

export default AssessmentThemeProvider;
