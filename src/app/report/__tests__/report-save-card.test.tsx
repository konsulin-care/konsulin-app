import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

vi.mock('@/i18n', async () => {
  const { createUseTranslationsMock } =
    await import('@/i18n/__tests__/test-messages');
  return { useTranslations: createUseTranslationsMock() };
});

const claim = vi.fn();
const claimParams = vi.fn();
vi.mock('@/hooks/useClaimReport', () => ({
  useClaimReport: (params: unknown) => {
    claimParams(params);
    return claim;
  }
}));

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

describe('ReportSaveCard', () => {
  it('renders the next headline when a next batch is passed', () => {
    render(<ReportSaveCard studyId='s1' nextBatch={NEXT_BATCH} />);
    expect(screen.getByTestId('report-save-headline')).toHaveTextContent(
      SAVE_HEADLINE_NEXT
    );
  });

  it('renders the last headline when nextBatch is null', () => {
    render(<ReportSaveCard studyId='s1' nextBatch={null} />);
    expect(screen.getByTestId('report-save-headline')).toHaveTextContent(
      SAVE_HEADLINE_LAST
    );
  });

  it('shows no level step and no XP', () => {
    render(<ReportSaveCard studyId='s1' nextBatch={NEXT_BATCH} />);
    expect(screen.queryByTestId('report-save-step')).toBeNull();
    expect(screen.queryByTestId('report-save-xp')).toBeNull();
  });

  it('runs the shared claim action from the Save report button', () => {
    render(<ReportSaveCard studyId='s1' nextBatch={NEXT_BATCH} />);
    fireEvent.click(screen.getByRole('button', { name: 'Save report' }));
    expect(claimParams).toHaveBeenCalledWith({ path: '/report?id=s1' });
    expect(claim).toHaveBeenCalledTimes(1);
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
