import { fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import AssessmentsErrorPage from '../app/assessments/error';

function createChunkError(msg?: string): Error {
  const err = new Error(
    msg ?? 'Loading chunk test.js failed.\n(missing: http://localhost/test.js)'
  );
  err.name = 'ChunkLoadError';
  return err;
}

describe('Assessments Error Boundary', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('fetch mock')));
    vi.stubGlobal('location', { reload: vi.fn() });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('renders error message with retry button', () => {
    const reset = vi.fn();
    render(
      <AssessmentsErrorPage
        error={new Error('Something broke')}
        reset={reset}
      />
    );

    expect(screen.getByText('Something went wrong')).toBeDefined();
    expect(
      screen.getByText(
        'The page failed to load. This can happen on unstable connections.'
      )
    ).toBeDefined();
  });

  it('calls reset when retry button is clicked and error is not chunk error', () => {
    const reset = vi.fn();
    render(<AssessmentsErrorPage error={new Error('Generic')} reset={reset} />);

    fireEvent.click(screen.getByText('Try again'));
    expect(reset).toHaveBeenCalledTimes(1);
  });

  it('attempts cache revalidation before reset on ChunkLoadError', async () => {
    const reset = vi.fn();
    render(<AssessmentsErrorPage error={createChunkError()} reset={reset} />);

    fireEvent.click(screen.getByText('Try again'));

    // Should attempt cache revalidation via fetch
    await vi.waitFor(() => {
      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining('localhost/test.js'),
        expect.objectContaining({ cache: 'reload' })
      );
    });

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

    expect(screen.queryByText(/ChunkLoadError/)).toBeNull();
  });

  it('shows reload page button for ChunkLoadError', () => {
    const reset = vi.fn();
    render(<AssessmentsErrorPage error={createChunkError()} reset={reset} />);

    expect(screen.getByText('Reload page')).toBeDefined();
  });

  it('reloads page on reload button click', () => {
    const reset = vi.fn();
    const reload = vi.fn();
    vi.stubGlobal('location', { reload });

    render(<AssessmentsErrorPage error={createChunkError()} reset={reset} />);

    fireEvent.click(screen.getByText('Reload page'));
    expect(reload).toHaveBeenCalledTimes(1);
  });
});
