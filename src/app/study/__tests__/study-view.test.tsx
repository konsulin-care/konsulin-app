import { act, fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import StudyView from '../study-view';

const push = vi.fn();
const dispatch = vi.fn();
let search = 'id=s1';
let studyResult: { data: unknown; isLoading: boolean; isError: boolean };

vi.mock('@/i18n', async () => {
  const { createUseTranslationsMock } =
    await import('@/i18n/__tests__/test-messages');
  return { useTranslations: createUseTranslationsMock() };
});
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push }),
  useSearchParams: () => new URLSearchParams(search)
}));
vi.mock('@/context/auth/authContext', () => ({
  useAuth: () => ({ state: { userInfo: {} }, dispatch })
}));
vi.mock('@/components/general/runtime-config-provider', () => ({
  useRuntimeConfig: () => ({ konsulinOrganizationId: '' })
}));
vi.mock('@/hooks/useReferralWrite', () => ({ useReferralWrite: vi.fn() }));
vi.mock('@/services/api/research', () => ({
  useResearchProgress: () => ({ data: undefined }),
  useConsentToStudy: () => ({ mutate: vi.fn() })
}));
vi.mock('@/services/api/research-study', () => ({
  useStudyById: () => studyResult
}));
vi.mock('@/components/research/share-research-button', () => ({
  default: () => <button type='button'>share</button>
}));
vi.mock('../study-side-facts', () => ({ StudySideFacts: () => null }));
vi.mock('../../research/consent-drawer', () => ({
  default: ({ open, onAgree }: { open: boolean; onAgree: () => void }) =>
    open ? (
      <button type='button' onClick={onAgree}>
        agree-drawer
      </button>
    ) : null
}));

/** Builds a minimal study progress fixture. */
function makeProgress() {
  return {
    study: { resourceType: 'ResearchStudy', id: 's1', status: 'active' },
    batches: [],
    currentBatch: null,
    completedCount: 0,
    totalCount: 1,
    isComplete: false,
    firstUncompletedQuestionnaireId: 'q1',
    completedQuestionnaireIds: [],
    history: []
  };
}

describe('StudyView', () => {
  beforeEach(() => {
    push.mockClear();
    dispatch.mockClear();
    search = 'id=s1';
    window.localStorage.clear();
    window.history.pushState({}, '', '/study?id=s1');
    studyResult = { data: makeProgress(), isLoading: false, isError: false };
  });

  it('renders the not-found state for an unknown id', () => {
    studyResult = { data: null, isLoading: false, isError: false };
    render(<StudyView />);
    expect(screen.getByText('See open studies')).toBeInTheDocument();
  });

  it('opens consent on Take part and navigates on agree', () => {
    render(<StudyView />);
    fireEvent.click(screen.getByRole('button', { name: 'Take part' }));
    fireEvent.click(screen.getByText('agree-drawer'));
    expect(push).toHaveBeenCalledWith('/assessments?id=q1&study=s1');
  });

  it('dispatches no SET_ACTION and shows the referral notice', async () => {
    search = 'id=s1&ref=p_abc';
    window.history.pushState({}, '', '/study?id=s1&ref=p_abc');
    await act(async () => {
      render(<StudyView />);
    });
    expect(screen.getByTestId('referral-notice')).toBeInTheDocument();
    expect(dispatch).not.toHaveBeenCalled();
  });
});
