import type { ResearchBatch } from '@/utils/fhir/research';
import type { ResearcherStudy } from '@/utils/fhir/researcher-next-step';
import { formatBatchDate } from '@/utils/format-batch-date';
import { fireEvent, render, screen } from '@testing-library/react';
import type { ResearchStudy } from 'fhir/r4';
import { describe, expect, it, vi } from 'vitest';
import NextStepCard from '../next-step-card';

vi.mock('@/i18n', async () => {
  const { createUseTranslationsMock } =
    await import('@/i18n/__tests__/test-messages');
  return { useTranslations: createUseTranslationsMock() };
});

const BATCH: ResearchBatch = {
  id: 'batch-1',
  start: '2026-02-01',
  end: '2026-02-28',
  questionnaireIds: ['phq2']
};

/**
 * Builds a researcher study with a single batch.
 *
 * @param title - Study title.
 * @param start - Batch start date.
 * @param end - Batch end date.
 * @returns The researcher study fixture.
 */
function makeStudy(title: string, start: string, end: string): ResearcherStudy {
  const study: ResearchStudy = {
    resourceType: 'ResearchStudy',
    status: 'active',
    title
  };
  return {
    study,
    batches: [{ ...BATCH, start, end }]
  };
}

describe('NextStepCard', () => {
  it('names the closed batch and study and offers Post a finding', () => {
    const closed = makeStudy('Sleep and Mood', '2026-01-01', '2026-01-31');
    const onPostFinding = vi.fn();

    render(
      <NextStepCard
        studies={[closed]}
        today='2026-02-10'
        onPostFinding={onPostFinding}
      />
    );

    expect(
      screen.getByText(
        'Share what you found in batch 1 of Sleep and Mood. The batch has closed. Participants are waiting to hear what their answers showed.'
      )
    ).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Post a finding' }));
    expect(onPostFinding).toHaveBeenCalledWith(closed.study, 0);
  });

  it('shows the closing date of the open batch and says nothing is due', () => {
    const open = makeStudy('Sleep and Mood', '2026-02-01', '2026-02-28');

    render(<NextStepCard studies={[open]} today='2026-02-10' />);

    const date = formatBatchDate('2026-02-28', 'id');
    expect(
      screen.getByText(
        `Batch 1 of Sleep and Mood closes ${date}. When it closes, tell participants what you found. Until then, nothing is due from you.`
      )
    ).toBeInTheDocument();
  });

  it('offers Register study when there are no studies', () => {
    render(<NextStepCard studies={[]} today='2026-02-10' />);

    expect(
      screen.getByText(
        'Register your first study. Describe it once. The same words become the page people read before taking part.'
      )
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Register study' })
    ).toBeInTheDocument();
  });
});
