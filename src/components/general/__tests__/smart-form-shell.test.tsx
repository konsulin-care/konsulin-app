import {
  QueryClient,
  QueryClientProvider,
  useQueryClient
} from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

/**
 * Consumer that throws if no QueryClient context is found.
 * Mirrors what renderer internals (OpenChoiceAutocompleteItem) do via useQueryClient().
 */
function QueryContextConsumer() {
  useQueryClient();
  return <div data-testid='context-ok'>context available</div>;
}

describe('QueryClientProvider context', () => {
  it('provides a valid context without throwing', () => {
    const client = new QueryClient({
      defaultOptions: { queries: { refetchOnWindowFocus: false } }
    });

    expect(() =>
      render(
        <QueryClientProvider client={client}>
          <QueryContextConsumer />
        </QueryClientProvider>
      )
    ).not.toThrow();

    expect(screen.getByTestId('context-ok')).toHaveTextContent(
      'context available'
    );
  });
});
