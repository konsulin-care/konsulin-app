import { createQueryClient } from '@/__tests__/test-utils';
import { QueryClientProvider } from '@tanstack/react-query';
import { render } from '@testing-library/react';
import { createElement, type ReactNode } from 'react';
import { beforeEach, vi } from 'vitest';

/** Render with QueryClientProvider wrapper */
export function renderWithQuery(ui: React.ReactElement) {
  return render(
    <QueryClientProvider client={createQueryClient()}>{ui}</QueryClientProvider>
  );
}

/** Wrapper function for screen-level tests */
export function wrapper({ children }: { children: ReactNode }) {
  return createElement(
    QueryClientProvider,
    { client: createQueryClient() },
    children
  );
}

/** Call before each test to reset state */
export function setupResearchTestDefaults() {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });
}

/** Shared batch constants */
export const MOCK_BATCH = {
  startDate: '',
  endDate: '',
  questionnaireIds: [] as string[]
};

export const MOCK_FIELD = {
  id: '1',
  name: 'batches.0' as const,
  ...MOCK_BATCH
};

export const MOCK_QUESTIONNAIRES = [
  { code: 'phq9', name: 'PHQ-9', duration: 5, category: 'Mental Health' },
  { code: 'gad7', name: 'GAD-7', duration: 3, category: 'Anxiety' }
];
