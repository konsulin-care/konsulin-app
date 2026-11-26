import type { FindingsFeedItem } from '@/utils/fhir/findings-feed';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import FindingsSection from '../findings-section';

vi.mock('@/i18n', async () => {
  const { createUseTranslationsMock } =
    await import('@/i18n/__tests__/test-messages');
  return { useTranslations: createUseTranslationsMock() };
});

/**
 * Builds a feed item with a deterministic time slot.
 *
 * @param index - Position used for ids and time.
 * @param participantCount - Optional participant count on the note.
 * @returns The feed item.
 */
function item(index: number, participantCount?: number): FindingsFeedItem {
  return {
    studyId: `study-${index}`,
    studyTitle: `Study ${index}`,
    groupName: 'Konsulin Research',
    text: `Finding number ${index}`,
    time: `2024-03-0${index + 1}T00:00:00Z`,
    participantCount
  };
}

describe('FindingsSection', () => {
  it('shows three findings first and Show more reveals the rest', async () => {
    const user = userEvent.setup();
    render(
      <FindingsSection items={[item(0), item(1), item(2), item(3), item(4)]} />
    );

    expect(screen.getAllByTestId('findings-item')).toHaveLength(3);
    expect(screen.queryByText('Finding number 4')).toBeNull();

    await user.click(screen.getByRole('button', { name: 'Show more' }));

    expect(screen.getAllByTestId('findings-item')).toHaveLength(5);
    expect(screen.getByText('Finding number 4')).toBeInTheDocument();
    expect(screen.queryByTestId('findings-show-more')).toBeNull();
  });

  it('shows the participant count in the source line when the feed has one', () => {
    render(<FindingsSection items={[item(0, 42)]} />);

    expect(
      screen.getByText('Study 0 · Konsulin Research · based on 42 participants')
    ).toBeInTheDocument();
  });

  it('omits the count in the source line when the feed has none', () => {
    render(<FindingsSection items={[item(0)]} />);

    expect(screen.getByText('Study 0 · Konsulin Research')).toBeInTheDocument();
  });

  it('shows the honest empty state text without findings', () => {
    render(<FindingsSection items={[]} />);

    expect(
      screen.getByText(
        'No findings yet. Studies are still collecting answers. When a batch closes, the research team posts what they learned here in everyday language, with the number of people it is based on.'
      )
    ).toBeInTheDocument();
    expect(screen.queryByTestId('findings-item')).toBeNull();
  });
});
