import { render, screen } from '@testing-library/react';
import type { ResearchStudy } from 'fhir/r4';
import { describe, expect, it, vi } from 'vitest';
import GivenBackList from '../given-back-list';

vi.mock('@/i18n', async () => {
  const { createUseTranslationsMock } =
    await import('@/i18n/__tests__/test-messages');
  return { useTranslations: createUseTranslationsMock() };
});

/**
 * Builds a study carrying one finding note.
 *
 * @param id - Study id suffix.
 * @param title - Study title.
 * @param text - Finding text.
 * @param time - Finding time in ISO form.
 * @returns The ResearchStudy fixture.
 */
function makeStudy(
  id: string,
  title: string,
  text: string,
  time: string
): ResearchStudy {
  return {
    resourceType: 'ResearchStudy',
    id,
    status: 'active',
    title,
    note: [{ text, time }]
  };
}

describe('GivenBackList', () => {
  it('lists findings newest first with their study title', () => {
    const older = makeStudy(
      'study-1',
      'Sleep and Mood',
      'Older finding',
      '2026-01-01T00:00:00Z'
    );
    const newer = makeStudy(
      'study-2',
      'Screen Time',
      'Newer finding',
      '2026-03-01T00:00:00Z'
    );

    render(<GivenBackList studies={[older, newer]} />);

    const items = screen.getAllByTestId('given-back-item');
    expect(items).toHaveLength(2);
    expect(items[0]).toHaveTextContent('Newer finding');
    expect(items[0]).toHaveTextContent('Screen Time');
    expect(items[1]).toHaveTextContent('Older finding');
    expect(items[1]).toHaveTextContent('Sleep and Mood');
  });

  it('shows the empty state when nothing was posted', () => {
    render(<GivenBackList studies={[]} />);

    expect(screen.getByText('Nothing posted yet.')).toBeInTheDocument();
    expect(screen.queryByTestId('given-back-item')).toBeNull();
  });

  it('shows the empty state when studies carry no findings', () => {
    const study: ResearchStudy = {
      resourceType: 'ResearchStudy',
      id: 'study-1',
      status: 'active',
      title: 'Sleep and Mood'
    };

    render(<GivenBackList studies={[study]} />);

    expect(screen.getByText('Nothing posted yet.')).toBeInTheDocument();
  });
});
