import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import AssessmentsErrorPage from '../app/assessments/error';

describe('Assessments Error Boundary', () => {
  it('renders error message with retry button', () => {
    const reset = vi.fn();
    render(
      <AssessmentsErrorPage error={new Error('ChunkLoadError')} reset={reset} />
    );

    expect(screen.getByText('Something went wrong')).toBeDefined();
    expect(
      screen.getByText(
        'The page failed to load. This can happen on unstable connections.'
      )
    ).toBeDefined();
  });

  it('calls reset when retry button is clicked', () => {
    const reset = vi.fn();
    render(
      <AssessmentsErrorPage error={new Error('ChunkLoadError')} reset={reset} />
    );

    fireEvent.click(screen.getByText('Try again'));
    expect(reset).toHaveBeenCalledTimes(1);
  });

  it('does not show error details in test mode', () => {
    const reset = vi.fn();
    render(
      <AssessmentsErrorPage
        error={new Error('ChunkLoadError: failed to load chunk')}
        reset={reset}
      />
    );

    // Error details are only rendered in development mode
    expect(screen.queryByText(/ChunkLoadError/)).toBeNull();
  });
});
