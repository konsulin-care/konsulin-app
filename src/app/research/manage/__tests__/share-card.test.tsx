import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import ShareCard from '../share-card';

vi.mock('@/i18n', async () => {
  const { createUseTranslationsMock } =
    await import('@/i18n/__tests__/test-messages');
  return { useTranslations: createUseTranslationsMock() };
});

const ORIGIN = 'https://konsulin.care';
const STUDY_ID = 'study-x';
const SHARE_URL = `${ORIGIN}/study?id=${STUDY_ID}`;

/** Points jsdom's location at the canonical test origin. */
function setOrigin(): void {
  Object.defineProperty(window, 'location', {
    configurable: true,
    value: new URL(`${ORIGIN}/research/manage?id=${STUDY_ID}`)
  });
}

describe('ShareCard', () => {
  beforeEach(() => {
    setOrigin();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('shows a link to the absolute study url', () => {
    render(<ShareCard studyId={STUDY_ID} />);

    expect(screen.getByText('Share')).toBeInTheDocument();
    const link = screen.getByTestId('share-link');
    expect(link).toHaveAttribute('href', SHARE_URL);
    expect(link).toHaveAttribute('target', '_blank');
    expect(link).toHaveAttribute('rel', 'noopener');
    expect(link).toHaveTextContent(
      `${ORIGIN.replace('https://', '')}/study?id=${STUDY_ID}`
    );
    expect(link).toHaveClass('truncate');
  });

  it('copies the absolute url and confirms the copy', async () => {
    const clipboardMock = vi.fn(() => Promise.resolve());
    Object.assign(navigator, { clipboard: { writeText: clipboardMock } });

    render(<ShareCard studyId={STUDY_ID} />);

    fireEvent.click(screen.getByRole('button', { name: 'Copy link' }));

    await waitFor(() => {
      expect(clipboardMock).toHaveBeenCalledWith(SHARE_URL);
    });
    expect(await screen.findByRole('status')).toHaveTextContent('Link copied.');
  });

  it('reports a failed copy', async () => {
    const clipboardMock = vi.fn(() => Promise.reject(new Error('denied')));
    Object.assign(navigator, { clipboard: { writeText: clipboardMock } });

    render(<ShareCard studyId={STUDY_ID} />);

    fireEvent.click(screen.getByRole('button', { name: 'Copy link' }));

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Could not copy. Copy the link above.'
    );
  });

  it('uses the action variant when primary and the default variant otherwise', () => {
    const { rerender } = render(<ShareCard studyId={STUDY_ID} primary />);

    const button = screen.getByRole('button', { name: 'Copy link' });
    expect(button).toHaveClass('bg-secondary', 'w-full', 'min-h-11');

    rerender(<ShareCard studyId={STUDY_ID} />);

    expect(screen.getByRole('button', { name: 'Copy link' })).toHaveClass(
      'bg-primary'
    );
  });
});
