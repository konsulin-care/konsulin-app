import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

vi.mock('@/i18n', async () => {
  const { createUseTranslationsMock } =
    await import('@/i18n/__tests__/test-messages');
  return { useTranslations: createUseTranslationsMock() };
});

import { scanSource } from '@/styles/__tests__/raw-color-scan';
import type { ResearchBatch } from '@/utils/fhir/research';

import { ReportSaveCard } from '../report-save-card';

const NEXT_BATCH: ResearchBatch = {
  id: 'b2',
  start: '2026-09-01',
  end: '2026-09-30',
  questionnaireIds: ['phq-9']
};

const SAVE_HEADLINE_NEXT = 'Save your report to compare it in the next batch.';
const SAVE_HEADLINE_LAST =
  "Save your report to keep this record and receive the study's findings.";
const FREE_LINE =
  'Taking part in the survey and saving your report are free of charge. This is our part in supporting your contribution.';
const WINDOW_LINE =
  'Guest reports can be saved within 24 hours. After that, your answers still count toward the study but can no longer be linked to you.';

describe('ReportSaveCard', () => {
  it('renders the save_headline_next text when a next batch is passed', () => {
    render(<ReportSaveCard xp={120} nextBatch={NEXT_BATCH} />);

    expect(screen.getByTestId('report-save-headline')).toHaveTextContent(
      SAVE_HEADLINE_NEXT
    );
  });

  it('renders the save_headline_last text when nextBatch is null', () => {
    render(<ReportSaveCard xp={120} nextBatch={null} />);

    expect(screen.getByTestId('report-save-headline')).toHaveTextContent(
      SAVE_HEADLINE_LAST
    );
  });

  it("renders the 'Participant → Trailblazer' step, '+{xp} XP' with the given xp, the free-of-charge line and the 24-hour window line", () => {
    render(<ReportSaveCard xp={120} nextBatch={NEXT_BATCH} />);

    const card = screen.getByTestId('report-save-card');
    expect(card).toBeInTheDocument();
    expect(screen.getByTestId('report-save-step')).toHaveTextContent(
      'Participant → Trailblazer'
    );
    expect(screen.getByTestId('report-save-xp')).toHaveTextContent('+120 XP');
    expect(card).toHaveTextContent(FREE_LINE);
    expect(card).toHaveTextContent(WINDOW_LINE);
  });

  it('uses design tokens only', async () => {
    const fs = await import('node:fs/promises');
    const source = await fs.readFile(
      'src/app/report/report-save-card.tsx',
      'utf8'
    );

    expect(scanSource(source)).toEqual([]);
  });
});
