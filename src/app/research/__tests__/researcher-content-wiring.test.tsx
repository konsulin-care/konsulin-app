import { wrapper } from '@/__tests__/react-test-utils';
import type { ResearchStudyWithBatches } from '@/services/api/researcher';
import { fireEvent, render, screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import ResearcherContent from '../researcher-content';

vi.mock('@/i18n', async () => {
  const { createUseTranslationsMock } =
    await import('@/i18n/__tests__/test-messages');
  return { useTranslations: createUseTranslationsMock() };
});

vi.mock('@/services/api/research-counts', () => ({
  useStudyParticipantCount: () => ({ data: 12, isLoading: false })
}));

vi.mock('@/services/api/research-findings', () => {
  class StudyConflictError extends Error {}
  return {
    StudyConflictError,
    usePostFinding: () => ({
      mutate: vi.fn(),
      isPending: false,
      isSuccess: false,
      error: null
    })
  };
});

/**
 * Builds a researcher study with one far-future batch.
 *
 * @param id - Study id.
 * @param title - Study title.
 * @returns The researcher study fixture.
 */
function makeStudy(id: string, title: string): ResearchStudyWithBatches {
  const batch = {
    id: `${id}-batch`,
    start: '2099-01-01',
    end: '2099-12-31',
    questionnaireIds: ['phq2']
  };
  return {
    study: {
      resourceType: 'ResearchStudy',
      id,
      status: 'active',
      title
    },
    batches: [batch],
    currentBatch: batch,
    daysRemaining: 100
  };
}

describe('ResearcherContent', () => {
  it('renders one h1 and the next-step, studies and given-back sections in order', () => {
    render(
      <ResearcherContent
        isLoading={false}
        studies={[makeStudy('study-1', 'Sleep and Mood')]}
      />,
      { wrapper }
    );

    expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1);
    expect(screen.getByText('Your next step')).toBeInTheDocument();
    expect(screen.getByText('Your studies · 1')).toBeInTheDocument();
    expect(screen.getByText('What you have given back')).toBeInTheDocument();

    const sections = [
      screen.getByTestId('researcher-next-step'),
      screen.getByTestId('researcher-studies'),
      screen.getByTestId('researcher-given-back')
    ];
    expect(
      sections[0].compareDocumentPosition(sections[1]) &
        Node.DOCUMENT_POSITION_FOLLOWING
    ).toBeTruthy();
    expect(
      sections[1].compareDocumentPosition(sections[2]) &
        Node.DOCUMENT_POSITION_FOLLOWING
    ).toBeTruthy();
  });

  it('shows the skeleton while loading', () => {
    render(<ResearcherContent isLoading studies={[]} />, { wrapper });

    expect(screen.getByTestId('research-skeleton')).toBeInTheDocument();
    expect(screen.queryByTestId('researcher-home')).toBeNull();
  });

  it('shows the empty states when the researcher has no studies', () => {
    render(<ResearcherContent isLoading={false} studies={[]} />, { wrapper });

    expect(
      screen.getByText('Register your first study to get started.')
    ).toBeInTheDocument();
    expect(screen.getByText('Nothing posted yet.')).toBeInTheDocument();
  });

  it('opens the finding composer for the study whose card was clicked', () => {
    render(
      <ResearcherContent
        isLoading={false}
        studies={[
          makeStudy('study-1', 'Sleep and Mood'),
          makeStudy('study-2', 'Screen Time')
        ]}
      />,
      { wrapper }
    );

    const card = screen
      .getAllByTestId('researcher-study-card')
      .find(entry => entry.textContent?.includes('Screen Time'));
    expect(card).toBeDefined();
    fireEvent.click(
      within(card as HTMLElement).getByRole('button', {
        name: 'Post a finding'
      })
    );

    const composer = within(
      screen.getByTestId('researcher-given-back')
    ).getByTestId('finding-composer');
    expect(composer).toHaveTextContent('A finding from Screen Time.');
  });
});
