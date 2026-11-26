import type { QuestionnaireInfo } from '@/services/api/research';
import type { StudyProgress } from '@/utils/fhir/research';
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import OpenToJoin, { type OpenToJoinProps } from '../open-to-join';

vi.mock('@/i18n', async () => {
  const { createUseTranslationsMock } =
    await import('@/i18n/__tests__/test-messages');
  return { useTranslations: createUseTranslationsMock() };
});

const KONSULIN_ORG = 'konsulin-org';

const TITLE_MAP: ReadonlyMap<string, QuestionnaireInfo> = new Map([
  ['phq2', { title: 'PHQ-2', durationMinutes: 8 }]
]);

/**
 * Builds a catalogue study fixture with one open batch.
 *
 * @param id - Study id.
 * @param title - Study title.
 * @param sponsor - Sponsor display and reference, when any.
 * @returns The study progress fixture.
 */
function makeProgress(
  id: string,
  title: string,
  sponsor?: { display: string; reference: string }
): StudyProgress {
  const batch = {
    id: `${id}-batch-1`,
    start: '2026-08-01',
    end: '2026-08-31',
    questionnaireIds: ['phq2']
  };
  return {
    study: {
      resourceType: 'ResearchStudy',
      id,
      status: 'active',
      title,
      principalInvestigator: { display: `Lead ${id}` },
      ...(sponsor ? { sponsor } : {})
    },
    batches: [batch],
    currentBatch: batch,
    completedCount: 0,
    totalCount: 1,
    isComplete: false,
    firstUncompletedQuestionnaireId: 'phq2',
    completedQuestionnaireIds: [],
    history: []
  };
}

const KONSULIN_STUDY = (index: number) =>
  makeProgress(`konsulin-${index}`, `Konsulin study ${index}`, {
    display: 'Konsulin',
    reference: `Organization/${KONSULIN_ORG}`
  });

const OTHER_STUDY = (index: number) =>
  makeProgress(`other-${index}`, `Other study ${index}`, {
    display: 'University Lab',
    reference: 'Organization/university'
  });

/**
 * Renders the open-to-join shelves with defaults for the option under test.
 *
 * @param overrides - Prop overrides.
 * @returns The render result.
 */
function renderSection(overrides: Partial<OpenToJoinProps> = {}) {
  return render(
    <OpenToJoin
      studies={[]}
      joinedIds={[]}
      konsulinOrganizationId={KONSULIN_ORG}
      titleMap={TITLE_MAP}
      {...overrides}
    />
  );
}

describe('OpenToJoin', () => {
  it('shows at most three unjoined studies per shelf', () => {
    renderSection({
      studies: [
        KONSULIN_STUDY(1),
        KONSULIN_STUDY(2),
        KONSULIN_STUDY(3),
        KONSULIN_STUDY(4),
        OTHER_STUDY(1),
        OTHER_STUDY(2),
        OTHER_STUDY(3),
        OTHER_STUDY(4)
      ]
    });

    expect(
      screen.getByRole('heading', { name: 'By Konsulin' })
    ).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { name: 'From other research groups' })
    ).toBeInTheDocument();
    expect(screen.getByText('Konsulin study 1')).toBeInTheDocument();
    expect(screen.getByText('Konsulin study 3')).toBeInTheDocument();
    expect(screen.queryByText('Konsulin study 4')).toBeNull();
    expect(screen.getByText('Other study 1')).toBeInTheDocument();
    expect(screen.getByText('Other study 3')).toBeInTheDocument();
    expect(screen.queryByText('Other study 4')).toBeNull();
  });

  it('skips studies the participant has already joined', () => {
    renderSection({
      studies: [
        KONSULIN_STUDY(1),
        makeProgress('joined', 'Joined study', {
          display: 'University Lab',
          reference: 'Organization/university'
        })
      ],
      joinedIds: ['joined']
    });

    expect(screen.getByText('Konsulin study 1')).toBeInTheDocument();
    expect(screen.queryByText('Joined study')).toBeNull();
  });

  it('shows the total count on the browse-all link to every study', () => {
    renderSection({
      studies: [
        KONSULIN_STUDY(1),
        KONSULIN_STUDY(2),
        KONSULIN_STUDY(3),
        KONSULIN_STUDY(4),
        OTHER_STUDY(1),
        OTHER_STUDY(2)
      ]
    });

    expect(
      screen.getByRole('link', { name: 'Browse all 6 studies' })
    ).toHaveAttribute('href', '/studies');
  });

  it('links each card to its study', () => {
    renderSection({ studies: [KONSULIN_STUDY(1)] });

    expect(screen.getByRole('link', { name: 'View study' })).toHaveAttribute(
      'href',
      '/study?id=konsulin-1'
    );
    expect(screen.getByText('About 8 minutes')).toBeInTheDocument();
  });

  it('does not render a shelf without studies', () => {
    renderSection({ studies: [KONSULIN_STUDY(1)] });

    expect(
      screen.getByRole('heading', { name: 'By Konsulin' })
    ).toBeInTheDocument();
    expect(
      screen.queryByRole('heading', { name: 'From other research groups' })
    ).toBeNull();
  });
});
