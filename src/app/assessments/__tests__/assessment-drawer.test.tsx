import type { ResearchProgress } from '@/utils/fhir/research';
import { fireEvent, render, screen } from '@testing-library/react';
import type { Questionnaire, ResearchStudy } from 'fhir/r4';
import { describe, expect, it, vi } from 'vitest';
import AssessmentDrawerContent, {
  deriveResearchNavigation
} from '../assessment-drawer';

vi.mock('react-markdown', () => ({
  default: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  )
}));

vi.mock('react-qr-code', () => ({
  default: () => <div data-testid='qr-code' />
}));

vi.mock('@/components/ui/drawer', () => ({
  DrawerHeader: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
  DrawerTitle: ({ children }: { children: React.ReactNode }) => (
    <h2>{children}</h2>
  ),
  DrawerDescription: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
  DrawerFooter: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
  DrawerClose: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  )
}));

const STUDY: ResearchStudy = {
  resourceType: 'ResearchStudy',
  id: 'research',
  status: 'active',
  title: 'Konsulin Mental Health Survey',
  description: 'A longitudinal survey.'
};

const QUESTIONNAIRE: Questionnaire = {
  resourceType: 'Questionnaire',
  id: 'phq2',
  title: 'PHQ-2',
  status: 'active'
};

const BATCH_1 = {
  id: 'batch-1',
  start: '2026-08-01',
  end: '2026-08-31',
  questionnaireIds: ['phq2', 'big-five-inventory']
};

function makeProgress(firstUncompleted: string | null): ResearchProgress {
  return {
    studies: [
      {
        study: {
          resourceType: 'ResearchStudy',
          id: 'research',
          status: 'active'
        },
        batches: [BATCH_1],
        currentBatch: BATCH_1,
        completedCount: firstUncompleted ? 1 : 2,
        totalCount: 2,
        isComplete: firstUncompleted === null,
        firstUncompletedQuestionnaireId: firstUncompleted,
        completedQuestionnaireIds: firstUncompleted
          ? ['phq2']
          : ['phq2', 'big-five-inventory'],
        history: [
          {
            batchId: 'batch-1',
            start: '2026-08-01',
            end: '2026-08-31',
            participated: true
          }
        ],
        consecutiveBatches: 1
      }
    ],
    cumulativeResponses: 2,
    currentLevel: { threshold: 1, label: 'Participant', reward: 'brief' },
    nextLevel: { threshold: 5, label: 'Contributor', reward: 'report' },
    levelProgress: {
      current: { threshold: 1, label: 'Participant', reward: 'brief' },
      next: { threshold: 5, label: 'Contributor', reward: 'report' },
      currentThreshold: 1,
      nextThreshold: 5,
      intoNext: 1,
      toNext: 3
    },
    completedQuestionnaireIds: firstUncompleted
      ? ['phq2']
      : ['phq2', 'big-five-inventory'],
    consentedStudyIds: []
  };
}

function renderDrawer({
  researchUrl = '',
  researchComplete = false,
  selectedAssessment = STUDY
}: {
  researchUrl?: string;
  researchComplete?: boolean;
  selectedAssessment?: Questionnaire | ResearchStudy;
}) {
  const router = { push: vi.fn() };
  render(
    <AssessmentDrawerContent
      selectedAssessment={selectedAssessment}
      researchUrl={researchUrl}
      researchComplete={researchComplete}
      currentLocation='http://localhost/assessments'
      isPending={false}
      isPractitioner={false}
      onClose={vi.fn()}
      startTransition={(fn: () => void) => {
        fn();
      }}
      router={router}
    />
  );
  return router;
}

describe('deriveResearchNavigation', () => {
  it('returns the first uncompleted questionnaire for an in-progress study', () => {
    expect(
      deriveResearchNavigation(STUDY, makeProgress('big-five-inventory'))
    ).toEqual({
      researchUrl: 'big-five-inventory',
      researchComplete: false
    });
  });

  it('marks a study complete when its batch has no uncompleted questionnaires', () => {
    expect(deriveResearchNavigation(STUDY, makeProgress(null))).toEqual({
      researchUrl: '',
      researchComplete: true
    });
  });

  it('returns empty state for non-research selections', () => {
    expect(deriveResearchNavigation(QUESTIONNAIRE, makeProgress(null))).toEqual(
      {
        researchUrl: '',
        researchComplete: false
      }
    );
  });

  it('returns empty state when the study is not in the progress data', () => {
    const noProgress: ResearchProgress | undefined = undefined;
    expect(deriveResearchNavigation(STUDY, noProgress)).toEqual({
      researchUrl: '',
      researchComplete: false
    });
  });
});

describe('AssessmentDrawerContent research navigation', () => {
  it('deep-links to the first uncompleted batch questionnaire via Mulai', () => {
    const router = renderDrawer({ researchUrl: 'big-five-inventory' });

    fireEvent.click(screen.getByRole('button', { name: /mulai/i }));

    expect(router.push).toHaveBeenCalledWith(
      '/assessments?id=big-five-inventory'
    );
  });

  it('navigates to /research from a completed study instead of a stale CTA', () => {
    const router = renderDrawer({ researchComplete: true });

    fireEvent.click(screen.getByRole('button', { name: /view research/i }));

    expect(router.push).toHaveBeenCalledWith('/research');
  });

  it('disables the CTA when the study has no current batch navigation', () => {
    renderDrawer({ researchUrl: '', researchComplete: false });

    expect(screen.getByRole('button', { name: /mulai/i })).toBeDisabled();
  });
});
