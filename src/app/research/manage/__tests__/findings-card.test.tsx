import { render, screen } from '@testing-library/react';
import type { ResearchStudy } from 'fhir/r4';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import FindingsCard from '../findings-card';

vi.mock('@/i18n', async () => {
  const { createUseTranslationsMock } =
    await import('@/i18n/__tests__/test-messages');
  return { useTranslations: createUseTranslationsMock() };
});

vi.mock('@/app/research/researcher/finding-composer', () => ({
  default: ({ primary }: { primary?: boolean }) => (
    <div data-testid='finding-composer-mock' data-primary={String(primary)}>
      <textarea id='finding-text' aria-label='Finding' />
    </div>
  )
}));

/** Study fixture carrying one posted finding. */
const STUDY: ResearchStudy = {
  resourceType: 'ResearchStudy',
  id: 'study-1',
  status: 'active',
  title: 'Sleep and Mood',
  note: [{ text: 'Sleep improved for most participants.', time: '2026-01-01' }]
};

/**
 * Points jsdom's location at the manage page with the given hash.
 *
 * @param hash - Hash fragment, including the leading '#'.
 * @returns Nothing.
 */
function setLocation(hash: string): void {
  Object.defineProperty(window, 'location', {
    configurable: true,
    value: new URL(`https://konsulin.care/research/manage?id=study-1${hash}`)
  });
}

describe('FindingsCard', () => {
  beforeEach(() => {
    setLocation('');
    Element.prototype.scrollIntoView = vi.fn();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('renders the finding composer and the posted findings of its study', () => {
    render(<FindingsCard study={STUDY} primary />);

    expect(screen.getByText('What you have given back')).toBeInTheDocument();
    expect(screen.getByTestId('findings-card')).toHaveAttribute(
      'id',
      'finding'
    );
    expect(screen.getByTestId('finding-composer-mock')).toHaveAttribute(
      'data-primary',
      'true'
    );
    const items = screen.getAllByTestId('given-back-item');
    expect(items).toHaveLength(1);
    expect(items[0]).toHaveTextContent('Sleep improved for most participants.');
  });

  it('focuses the finding textarea on mount when the location hash is #finding', () => {
    setLocation('#finding');

    render(<FindingsCard study={STUDY} primary />);

    expect(document.activeElement).toBe(screen.getByLabelText('Finding'));
  });

  it('does not scroll or focus when the location hash is different', () => {
    setLocation('#other');

    render(<FindingsCard study={STUDY} />);

    expect(Element.prototype.scrollIntoView).not.toHaveBeenCalled();
    expect(document.activeElement).not.toBe(screen.getByLabelText('Finding'));
  });
});
