'use client';

import { RendererThemeProvider } from '@aehrc/smart-forms-renderer';
import type { ReactNode } from 'react';

interface AssessmentThemeProviderProps {
  children?: ReactNode;
}

/**
 * Custom MUI theme provider wrapping the renderer's theme context.
 *
 * Drop-in replacement for `RendererThemeProvider` from `@aehrc/smart-forms-renderer`.
 * Delegates to RendererThemeProvider to avoid MUI version conflicts.
 *
 * Card-stack CSS is NOT handled here — that is managed by CardDomMapper
 * and the dynamic card-stack stylesheet.
 */
export function AssessmentThemeProvider({
  children
}: Readonly<AssessmentThemeProviderProps>) {
  return <RendererThemeProvider>{children}</RendererThemeProvider>;
}

export default AssessmentThemeProvider;
