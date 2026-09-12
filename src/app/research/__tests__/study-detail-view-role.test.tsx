import type { StudyProgress } from '@/utils/fhir/research';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import StudyDetailView from '../study-detail-view';

vi.mock('@/components/ui/app-drawer', () => ({
  default: ({
    children,
    open,
    ctaLabel,
    ctaDisabled,
    onCtaClick
  }: {
    children: React.ReactNode;
    open: boolean;
    ctaLabel?: string;
    ctaDisabled?: boolean;
    onCtaClick?: () => void;
  }) =>
    open ? (
      <div data-testid='drawer'>
        {children}
        {ctaLabel && (
          <button disabled={ctaDisabled} onClick={onCtaClick}>
            {ctaLabel}
          </button>
        )}
      </div>
    ) : null
}));

vi.mock('@/components/research/share-research-button', () => ({
  default: () => <div data-testid='share-button'>Share</div>
}));

const mockProgress: StudyProgress = {
  study: {
    resourceType: 'ResearchStudy',
    id: 'study-1',
    title: 'Test Study',
    description: 'A test study',
    status: 'active'
  },
  batches: [
    {
      id: 'batch-1',
      start: '2026-01-01',
      end: '2026-12-31',
      questionnaireIds: ['phq2']
    }
  ],
  currentBatch: {
    id: 'batch-1',
    start: '2026-01-01',
    end: '2026-12-31',
    questionnaireIds: ['phq2']
  },
  completedCount: 1,
  totalCount: 1,
  isComplete: true,
  firstUncompletedQuestionnaireId: null,
  completedQuestionnaireIds: ['phq2'],
  history: [],
  consecutiveBatches: 1
};

function createQueryClient() {
  return new QueryClient({
    defaultOptions: { queries: { retry: false } }
  });
}

function renderWithQuery(ui: React.ReactElement) {
  const queryClient = createQueryClient();
  return render(
    <QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>
  );
}

describe('StudyDetailView - Role Prop', () => {
  it('renders without crashing with default props', () => {
    renderWithQuery(
      <StudyDetailView
        progress={mockProgress}
        overlapMap={new Map()}
        open={true}
        onClose={vi.fn()}
        onParticipate={vi.fn()}
        onSeeReport={vi.fn()}
        onQuestionnaireClick={vi.fn()}
        isPatient={true}
      />
    );
    expect(screen.getByTestId('drawer')).toBeInTheDocument();
  });

  it('accepts roleName prop without errors', () => {
    renderWithQuery(
      <StudyDetailView
        progress={mockProgress}
        overlapMap={new Map()}
        open={true}
        onClose={vi.fn()}
        onParticipate={vi.fn()}
        onSeeReport={vi.fn()}
        onQuestionnaireClick={vi.fn()}
        isPatient={false}
        roleName='Researcher'
      />
    );
    expect(screen.getByTestId('drawer')).toBeInTheDocument();
  });

  it('shows Manage Study CTA for researcher role', () => {
    renderWithQuery(
      <StudyDetailView
        progress={mockProgress}
        overlapMap={new Map()}
        open={true}
        onClose={vi.fn()}
        onParticipate={vi.fn()}
        onSeeReport={vi.fn()}
        onQuestionnaireClick={vi.fn()}
        isPatient={false}
        roleName='Researcher'
      />
    );
    expect(screen.getByText('Manage Study')).toBeInTheDocument();
  });

  it('shows See Report CTA for patient when study is complete', () => {
    renderWithQuery(
      <StudyDetailView
        progress={mockProgress}
        overlapMap={new Map()}
        open={true}
        onClose={vi.fn()}
        onParticipate={vi.fn()}
        onSeeReport={vi.fn()}
        onQuestionnaireClick={vi.fn()}
        isPatient={true}
      />
    );
    expect(screen.getByText('See Report')).toBeInTheDocument();
  });

  it('shows anonymization note for researcher', () => {
    renderWithQuery(
      <StudyDetailView
        progress={mockProgress}
        overlapMap={new Map()}
        open={true}
        onClose={vi.fn()}
        onParticipate={vi.fn()}
        onSeeReport={vi.fn()}
        onQuestionnaireClick={vi.fn()}
        isPatient={false}
        roleName='Researcher'
      />
    );
    expect(
      screen.getByText(/individual participant data/i)
    ).toBeInTheDocument();
  });

  it('passes completionCounts to QuestionnaireList for researcher', () => {
    const completionCounts = new Map([['phq2', 10]]);
    renderWithQuery(
      <StudyDetailView
        progress={mockProgress}
        overlapMap={new Map()}
        open={true}
        onClose={vi.fn()}
        onParticipate={vi.fn()}
        onSeeReport={vi.fn()}
        onQuestionnaireClick={vi.fn()}
        isPatient={false}
        roleName='Researcher'
        completionCounts={completionCounts}
      />
    );
    expect(screen.getByText('10 completions')).toBeInTheDocument();
  });

  it('enables Manage Study button for researcher', () => {
    renderWithQuery(
      <StudyDetailView
        progress={mockProgress}
        overlapMap={new Map()}
        open={true}
        onClose={vi.fn()}
        onParticipate={vi.fn()}
        onSeeReport={vi.fn()}
        onQuestionnaireClick={vi.fn()}
        isPatient={false}
        roleName='Researcher'
      />
    );
    const button = screen.getByText('Manage Study');
    expect(button).not.toBeDisabled();
  });

  it('calls onManageStudy when researcher clicks Manage Study', () => {
    const onManageStudy = vi.fn();
    renderWithQuery(
      <StudyDetailView
        progress={mockProgress}
        overlapMap={new Map()}
        open={true}
        onClose={vi.fn()}
        onParticipate={vi.fn()}
        onSeeReport={vi.fn()}
        onQuestionnaireClick={vi.fn()}
        isPatient={false}
        roleName='Researcher'
        onManageStudy={onManageStudy}
      />
    );
    fireEvent.click(screen.getByText('Manage Study'));
    expect(onManageStudy).toHaveBeenCalledWith('study-1');
  });
});
