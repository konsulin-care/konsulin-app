import type { ResearchStudyWithBatches } from '@/services/api/researcher';
import { setResearchTarget } from '@/utils/fhir/research-target';
import { formatBatchDate } from '@/utils/format-batch-date';
import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import ResearcherStudyCard from '../researcher-study-card';

const { mockUseStudyParticipantCount } = vi.hoisted(() => ({
  mockUseStudyParticipantCount: vi.fn()
}));

vi.mock('@/i18n', async () => {
  const { createUseTranslationsMock } =
    await import('@/i18n/__tests__/test-messages');
  return { useTranslations: createUseTranslationsMock() };
});

vi.mock('@/services/api/research-counts', () => ({
  useStudyParticipantCount: (studyId?: string) =>
    mockUseStudyParticipantCount(studyId)
}));

/**
 * Builds a study with two batches and a participant target.
 *
 * @returns The researcher study fixture.
 */
function makeStudy(): ResearchStudyWithBatches {
  const batchOne = {
    id: 'batch-1',
    start: '2026-01-01',
    end: '2026-01-31',
    questionnaireIds: ['phq2']
  };
  const batchTwo = {
    id: 'batch-2',
    start: '2026-02-01',
    end: '2026-02-28',
    questionnaireIds: ['phq2']
  };
  return {
    study: setResearchTarget(
      {
        resourceType: 'ResearchStudy',
        id: 'study-1',
        status: 'active',
        title: 'Sleep and Mood',
        sponsor: { reference: 'Organization/sleep-lab', display: 'Sleep Lab' }
      },
      100
    ),
    batches: [batchOne, batchTwo],
    currentBatch: batchTwo,
    daysRemaining: 12
  };
}

describe('ResearcherStudyCard', () => {
  beforeEach(() => {
    mockUseStudyParticipantCount.mockReturnValue({
      data: 12,
      isLoading: false
    });
  });

  it('shows group, kind, closing date and count against target', () => {
    const study = makeStudy();

    render(<ResearcherStudyCard study={study} />);

    expect(screen.getByText('Sleep Lab')).toBeInTheDocument();
    expect(screen.getByText('Batch 2 of 2')).toBeInTheDocument();
    expect(
      screen.getByText(`closes ${formatBatchDate('2026-02-28', 'id')}`)
    ).toBeInTheDocument();
    expect(screen.getByText('12 of 100 participants')).toBeInTheDocument();
  });

  it('shows the study link and links to the study page and Manage study', () => {
    render(<ResearcherStudyCard study={makeStudy()} />);

    expect(screen.getByText('Study link')).toBeInTheDocument();
    expect(
      screen.getByRole('link', { name: 'See the study page' })
    ).toHaveAttribute('href', '/study?id=study-1');
    expect(screen.getByRole('link', { name: 'Manage study' })).toHaveAttribute(
      'href',
      '/research/edit?id=study-1&page=title'
    );
  });

  it('calls onPostFinding with the study', () => {
    const study = makeStudy();
    const onPostFinding = vi.fn();

    render(<ResearcherStudyCard study={study} onPostFinding={onPostFinding} />);

    fireEvent.click(screen.getByRole('button', { name: 'Post a finding' }));
    expect(onPostFinding).toHaveBeenCalledWith(study.study);
  });
});
