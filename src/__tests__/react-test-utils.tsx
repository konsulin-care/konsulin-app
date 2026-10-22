import { QueryClientProvider } from '@tanstack/react-query';
import { render } from '@testing-library/react';
import {
  awaitEvent,
  createMockCache,
  createMockCaches,
  createMockEvent,
  createMockFetch,
  createMockSelf,
  createQueryClient,
  fireActivate,
  fireFetch,
  fireInstall,
  fireSync,
  MOCK_BATCH,
  MOCK_FIELD,
  MOCK_QUESTIONNAIRES,
  mockAuth,
  type MockCache,
  type MockCaches,
  type MockSelf
} from './test-utils';

export {
  awaitEvent,
  createMockCache,
  createMockCaches,
  createMockEvent,
  createMockFetch,
  createMockSelf,
  createQueryClient,
  fireActivate,
  fireFetch,
  fireInstall,
  fireSync,
  MOCK_BATCH,
  MOCK_FIELD,
  MOCK_QUESTIONNAIRES,
  mockAuth,
  type MockCache,
  type MockCaches,
  type MockSelf
};

/**
 * Render with QueryClientProvider wrapper.
 * @param ui - React element to render
 */
export function renderWithQuery(ui: React.ReactElement) {
  return render(
    <QueryClientProvider client={createQueryClient()}>{ui}</QueryClientProvider>
  );
}

/**
 * Wrapper function for screen-level tests.
 * @param props - Component props with children
 */
export function wrapper({ children }: { children: React.ReactNode }) {
  return (
    <QueryClientProvider client={createQueryClient()}>
      {children}
    </QueryClientProvider>
  );
}
