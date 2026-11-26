import type {
  StudyFormPreviewBatch,
  StudyFormPreviewProps
} from '@/app/research/study-form-preview';
import StudyFormPreview from '@/app/research/study-form-preview';
import { formatBatchDate } from '@/utils/format-batch-date';
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

vi.mock('@/i18n', async () => {
  const { createUseTranslationsMock } =
    await import('@/i18n/__tests__/test-messages');
  return { useTranslations: createUseTranslationsMock() };
});

const BATCH_1: StudyFormPreviewBatch = {
  startDate: '2026-01-01',
  endDate: '2026-01-31',
  questionnaireIds: ['phq2']
};

const BATCH_2: StudyFormPreviewBatch = {
  startDate: '2026-02-01',
  endDate: '2026-02-28',
  questionnaireIds: ['big-five-inventory']
};

/** Base preview props with an empty draft. */
const BASE_PROPS: StudyFormPreviewProps = {
  title: '',
  question: '',
  description: '',
  group: 'Klinik Sehat Jiwa',
  lead: 'Dr. Sari',
  whoCanJoin: 'Adults 18+',
  ethicsStatus: 'applying',
  sharesFindings: false,
  batches: [],
  durations: {}
};

/**
 * Renders the preview with defaults overridden by the given props.
 * @param overrides - props to replace on the base draft
 */
function renderPreview(overrides: Partial<StudyFormPreviewProps> = {}) {
  render(<StudyFormPreview {...BASE_PROPS} {...overrides} />);
}

describe('StudyFormPreview', () => {
  it('shows the section heading and the exact placeholders for an empty draft', () => {
    renderPreview();

    expect(
      screen.getByRole('heading', { name: 'What people will see' })
    ).toBeTruthy();
    expect(
      screen.getByRole('heading', { name: 'Your study title' })
    ).toBeTruthy();
    expect(
      screen.getByText('Your research question appears here.')
    ).toBeTruthy();
  });

  it('shows the typed title, question and description', () => {
    renderPreview({
      title: 'Sleep and mood',
      question: 'How does sleep affect your mood?',
      description: 'A short study about sleep.'
    });

    expect(
      screen.getByRole('heading', { name: 'Sleep and mood' })
    ).toBeTruthy();
    expect(screen.getByText('How does sleep affect your mood?')).toBeTruthy();
    expect(screen.getByText('A short study about sleep.')).toBeTruthy();
    expect(screen.queryByText('Your study title')).toBeNull();
  });

  it('follows the form values for dates, kind, time, get-back and ethics', () => {
    renderPreview({
      title: 'Sleep and mood',
      question: 'How does sleep affect your mood?',
      batches: [BATCH_1, BATCH_2],
      durations: { phq2: 8, 'big-five-inventory': 15 },
      ethicsStatus: 'approved',
      sharesFindings: true
    });

    expect(screen.getByText('Batch 1 of 2')).toBeTruthy();
    expect(screen.getByText('About 8 minutes')).toBeTruthy();
    expect(
      screen.getByText('Your own result right after each questionnaire')
    ).toBeTruthy();
    expect(
      screen.getByText('A comparison of your scores across batches')
    ).toBeTruthy();
    expect(
      screen.getByText("The study's findings, in everyday language")
    ).toBeTruthy();
    expect(screen.getByText('Approved by an ethics committee')).toBeTruthy();

    const first = screen.getByTestId('preview-batch-0');
    expect(first).toHaveTextContent(formatBatchDate(BATCH_1.startDate, 'id'));
    expect(first).toHaveTextContent(formatBatchDate(BATCH_1.endDate, 'id'));
    const second = screen.getByTestId('preview-batch-1');
    expect(second).toHaveTextContent(formatBatchDate(BATCH_2.startDate, 'id'));
    expect(second).toHaveTextContent(formatBatchDate(BATCH_2.endDate, 'id'));
  });
});
