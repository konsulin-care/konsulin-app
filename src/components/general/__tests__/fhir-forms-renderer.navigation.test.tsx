/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-argument, react/jsx-no-useless-fragment, @next/next/no-img-element, jsx-a11y/alt-text, max-lines */

import {
  fireEvent,
  render,
  screen,
  waitFor,
  within
} from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { mockSearchParams } = vi.hoisted(() => ({
  mockSearchParams: new URLSearchParams()
}));

vi.mock('next/navigation', () => ({
  useRouter: vi
    .fn()
    .mockReturnValue({ push: vi.fn(), replace: vi.fn(), back: vi.fn() }),
  useSearchParams: () => mockSearchParams
}));

vi.mock('@/components/general/card-dom-mapper', () => ({
  CardDomMapper: () => null
}));
vi.mock('@/hooks/useQuestionFocus', () => ({
  useQuestionFocus: () => ({
    activeCardIndex: 0,
    setActiveCardIndex: vi.fn(),
    totalFocusable: 1,
    totalAnswerable: 1,
    cardStates: { q1: 'active' },
    displayItemLinkIds: [],
    focusableLinkIds: ['q1'],
    isRequired: vi.fn().mockReturnValue(true),
    isAnswered: vi.fn().mockReturnValue(false)
  })
}));
vi.mock('@/hooks/useCardSwipe', () => ({
  useCardSwipe: () => ({
    swipeDirection: null,
    onTouchStart: vi.fn(),
    onTouchMove: vi.fn(),
    onTouchEnd: vi.fn()
  })
}));
vi.mock('@/components/general/runtime-config-provider', () => ({
  useRuntimeConfig: () => ({
    appInfo: {},
    terminologyServer: ''
  })
}));
vi.mock('@aehrc/smart-forms-renderer', () => ({
  getResponse: vi.fn(),
  RendererThemeProvider: ({ children }: any) => <>{children}</>,
  rendererThemeOptions: {},
  rendererThemeComponentOverrides: vi.fn(() => ({})),
  useBuildForm: vi.fn().mockReturnValue(false)
}));
vi.mock('@/services/api/assessment', () => ({
  useSubmitQuestionnaire: vi.fn()
}));
vi.mock('@/hooks/useDraftAutoSave', () => ({
  useDraftAutoSave: vi.fn().mockReturnValue(vi.fn())
}));
vi.mock('@/hooks/useRequiredValidation', () => ({
  useRequiredValidation: vi.fn()
}));
vi.mock('@/lib/indexeddb', () => ({
  STORES: {
    assessmentDrafts: 'assessment_drafts',
    serviceRequests: 'service_requests'
  },
  dbGet: vi.fn().mockResolvedValue(null),
  dbSet: vi.fn().mockReturnValue(Promise.resolve()),
  dbDelete: vi.fn()
}));
vi.mock('@/services/api', () => ({ getAPI: vi.fn() }));
const { mockResearchProgress } = vi.hoisted(() => ({
  mockResearchProgress: vi.fn<() => { data: unknown }>()
}));
vi.mock('@/services/api/research', () => ({
  useResearchProgress: () => mockResearchProgress()
}));

vi.mock('@/context/fabContext', () => ({
  FabProvider: ({ children }: any) => <>{children}</>,
  useFab: () => ({
    state: { action: null, selection: null, menu: null, panelOpen: false },
    dispatch: vi.fn()
  })
}));

vi.mock('@/components/general/smart-form-shell', () => ({
  SmartFormShell: ({ className, onChange }: any) => (
    <div data-testid='mock-smart-form' className={className}>
      <input data-testid='mock-form-input' onChange={onChange} />
      Smart Form
    </div>
  )
}));
vi.mock('@/components/general/page-loader', () => ({
  default: () => <div data-testid='mock-page-loader'>Loading...</div>
}));
vi.mock('@/components/icons', () => ({
  LoadingSpinnerIcon: (props: any) => (
    <svg data-testid='mock-loading-spinner' {...props} />
  )
}));
vi.mock('@/components/ui/button', () => ({
  Button: ({ children, onClick, disabled }: any) => (
    <button data-testid='mock-button' onClick={onClick} disabled={disabled}>
      {children}
    </button>
  )
}));
vi.mock('@/components/ui/drawer', () => ({
  Drawer: ({ children }: any) => (
    <div data-testid='mock-drawer'>{children}</div>
  ),
  DrawerContent: ({ children }: any) => (
    <div data-testid='mock-drawer-content'>{children}</div>
  ),
  DrawerDescription: ({ children }: any) => (
    <div data-testid='mock-drawer-description'>{children}</div>
  ),
  DrawerFooter: ({ children }: any) => (
    <div data-testid='mock-drawer-footer'>{children}</div>
  ),
  DrawerHeader: ({ children }: any) => (
    <div data-testid='mock-drawer-header'>{children}</div>
  ),
  DrawerTitle: ({ children }: any) => (
    <div data-testid='mock-drawer-title'>{children}</div>
  )
}));
vi.mock('react-toastify', () => ({ toast: { error: vi.fn() } }));
vi.mock('next/image', () => ({
  default: (props: any) => <img data-testid='mock-image' {...props} />
}));
vi.mock('@/constants/roles', () => ({
  Roles: {
    Patient: 'Patient',
    Practitioner: 'Practitioner',
    ClinicAdmin: 'ClinicAdmin'
  }
}));

import { useRequiredValidation } from '@/hooks/useRequiredValidation';
import { dbSet } from '@/lib/indexeddb';
import { getAPI } from '@/services/api';
import { useSubmitQuestionnaire } from '@/services/api/assessment';
import { getResponse } from '@aehrc/smart-forms-renderer';
import type { Questionnaire } from 'fhir/r4';
import { useRouter } from 'next/navigation';
import FhirFormsRenderer from '../fhir-forms-renderer';

const mockQuestionnaire: Questionnaire = {
  resourceType: 'Questionnaire',
  id: 'q-123',
  title: 'PHQ-9',
  status: 'active',
  item: [{ linkId: 'q1', text: 'Question 1', type: 'string' }]
};

/** ResearchProgress fixture: one study whose current batch matches the given ids. */
function researchProgressWith(
  questionnaireIds: string[],
  completed: string[] = []
) {
  const batch = {
    id: 'batch-1',
    start: '2026-08-01',
    end: '2026-08-31',
    questionnaireIds
  };
  return {
    studies: [
      {
        study: {
          resourceType: 'ResearchStudy',
          id: 'study-a',
          status: 'active',
          title: 'Study A'
        },
        batches: [batch],
        currentBatch: batch,
        completedCount: completed.length,
        totalCount: questionnaireIds.length,
        isComplete: completed.length >= questionnaireIds.length,
        firstUncompletedQuestionnaireId:
          questionnaireIds.find(id => !completed.includes(id)) ?? null,
        completedQuestionnaireIds: completed,
        history: [],
        consecutiveBatches: 0
      }
    ],
    cumulativeResponses: 0,
    questionnaireResponses: [],
    questionnaireXp: 0,
    completedQuestionnaireIds: completed,
    consentedStudyIds: []
  };
}

describe('FhirFormsRenderer - navigation (router.replace vs push)', () => {
  const mockPush = vi.fn();
  const mockReplace = vi.fn();
  let mockSubmitQuestionnaire: any;

  beforeEach(() => {
    vi.clearAllMocks();
    mockSearchParams.delete('study');
    mockSearchParams.delete('done');
    mockResearchProgress.mockReturnValue({ data: undefined });
    vi.mocked(useRouter).mockReturnValue({
      push: mockPush,
      replace: mockReplace,
      back: vi.fn()
    } as any);

    mockSubmitQuestionnaire = vi.fn().mockResolvedValue({ id: 'resp-789' });
    vi.mocked(useSubmitQuestionnaire).mockReturnValue({
      mutateAsync: mockSubmitQuestionnaire,
      isLoading: false
    } as any);
    vi.mocked(useRequiredValidation).mockReturnValue({
      requiredItemEmpty: 0,
      checkRequiredIsEmpty: vi.fn(),
      invalidItems: {}
    });
    vi.mocked(getResponse).mockReturnValue({
      resourceType: 'QuestionnaireResponse',
      questionnaire: 'Questionnaire/q-123',
      status: 'completed',
      item: [{ linkId: 'q1', text: 'Answer 1' }]
    } as any);
  });

  const clickCta = (label: string) => {
    const button = screen
      .getAllByTestId('mock-button')
      .find(btn => btn.textContent === label);
    if (!button) throw new Error(`${label} CTA not found`);
    fireEvent.click(button);
  };

  const clickFooterSeeResults = () => {
    const link = screen.getByText('See Results');
    fireEvent.click(link);
  };

  it('standalone: CTA "See Results" replaces to the record view for authenticated patients', async () => {
    render(
      <FhirFormsRenderer
        questionnaire={mockQuestionnaire}
        isAuthenticated
        patientId='pat-1'
      />
    );

    clickCta('See Results');
    await waitFor(() => expect(mockSubmitQuestionnaire).toHaveBeenCalled());
    await waitFor(() => {
      expect(mockReplace).toHaveBeenCalled();
      expect(mockPush).not.toHaveBeenCalled();
    });
    expect(mockReplace.mock.calls[0][0]).toBe(
      '/record?id=pat-1&view=QuestionnaireResponse/resp-789'
    );
  });

  it('standalone: CTA "See Results" replaces to /result for guests', async () => {
    render(
      <FhirFormsRenderer
        questionnaire={mockQuestionnaire}
        isAuthenticated={false}
      />
    );

    clickCta('See Results');
    await waitFor(() => expect(mockSubmitQuestionnaire).toHaveBeenCalled());
    await waitFor(() => expect(mockReplace).toHaveBeenCalled());
    expect(mockReplace.mock.calls[0][0]).toBe('/result?id=resp-789');
  });

  it('mid-batch: CTA "Continue" submits then pushes to the next questionnaire in the same study', async () => {
    mockSearchParams.set('study', 'study-a');
    mockResearchProgress.mockReturnValue({
      data: researchProgressWith(['q-123', 'yyy', 'zzz'])
    });
    render(
      <FhirFormsRenderer
        questionnaire={mockQuestionnaire}
        isAuthenticated
        patientId='pat-1'
      />
    );

    // Mid-batch: circular progress ring with the batch percentage drives the
    // drawer instead of a celebration image or share CTA.
    expect(screen.queryByTestId('mock-image')).toBeNull();
    expect(screen.getByText(/1 of 3/)).toBeTruthy();
    const midBatchRing = screen.getByRole('progressbar');
    expect(midBatchRing).toHaveAttribute('value', '33');
    expect(midBatchRing).toHaveAttribute('max', '100');
    expect(screen.getByText('33%')).toBeInTheDocument();

    clickCta('Continue');
    await waitFor(() => expect(mockSubmitQuestionnaire).toHaveBeenCalled());
    await waitFor(() =>
      expect(mockPush).toHaveBeenCalledWith(
        '/assessments?id=yyy&study=study-a&done=q-123'
      )
    );
    expect(mockReplace).not.toHaveBeenCalled();
  });

  it('mid-batch: footer "See Results" submits then replaces to the record view', async () => {
    mockSearchParams.set('study', 'study-a');
    mockResearchProgress.mockReturnValue({
      data: researchProgressWith(['q-123', 'yyy'])
    });
    render(
      <FhirFormsRenderer
        questionnaire={mockQuestionnaire}
        isAuthenticated
        patientId='pat-1'
      />
    );

    clickFooterSeeResults();
    await waitFor(() => expect(mockSubmitQuestionnaire).toHaveBeenCalled());
    await waitFor(() => expect(mockReplace).toHaveBeenCalled());
    expect(mockReplace.mock.calls[0][0]).toBe(
      '/record?id=pat-1&view=QuestionnaireResponse/resp-789'
    );
  });

  it('final-in-batch: CTA "See Results" replaces to the study report for authenticated patients', async () => {
    mockSearchParams.set('study', 'study-a');
    mockResearchProgress.mockReturnValue({
      data: researchProgressWith(['q-123'])
    });
    render(
      <FhirFormsRenderer
        questionnaire={mockQuestionnaire}
        isAuthenticated
        patientId='pat-1'
      />
    );

    // Final drawer: completion title, celebration image, and share footer.
    expect(screen.getByText("You've completed this batch!")).toBeTruthy();
    expect(screen.getByTestId('mock-image')).toBeTruthy();
    expect(screen.queryByRole('progressbar')).toBeNull();
    expect(screen.getByTestId('share-research-footer')).toBeTruthy();
    expect(screen.getByTestId('share-research-footer')).toHaveTextContent(
      'Tap to share this survey'
    );

    clickCta('See Results');
    await waitFor(() => expect(mockSubmitQuestionnaire).toHaveBeenCalled());
    await waitFor(() => expect(mockReplace).toHaveBeenCalled());
    expect(mockReplace.mock.calls[0][0]).toBe('/report?id=study-a');
  });

  it('final-in-batch: CTA "See Results" replaces to the study report for guests', async () => {
    mockSearchParams.set('study', 'study-a');
    mockResearchProgress.mockReturnValue({
      data: researchProgressWith(['q-123'])
    });
    render(
      <FhirFormsRenderer
        questionnaire={mockQuestionnaire}
        isAuthenticated={false}
      />
    );

    clickCta('See Results');
    await waitFor(() => expect(mockSubmitQuestionnaire).toHaveBeenCalled());
    await waitFor(() => expect(mockReplace).toHaveBeenCalled());
    expect(mockReplace.mock.calls[0][0]).toBe('/report?id=study-a');
  });

  it('navigates immediately after QR save without waiting for the interpret webhook', async () => {
    let resolveHook: ((value: unknown) => void) | undefined;
    const hookPromise = new Promise(resolve => {
      resolveHook = resolve;
    });
    const post = vi.fn().mockReturnValue(hookPromise);
    vi.mocked(getAPI).mockResolvedValue({ post } as any);

    vi.mocked(getResponse).mockReturnValue({
      resourceType: 'QuestionnaireResponse',
      questionnaire: 'Questionnaire/q-123',
      status: 'completed',
      item: [
        {
          linkId: 'interpretation',
          item: [{ linkId: 'score-dimension', item: [] }]
        }
      ]
    } as any);

    render(
      <FhirFormsRenderer
        questionnaire={mockQuestionnaire}
        isAuthenticated
        patientId='pat-1'
      />
    );

    clickCta('See Results');
    await waitFor(() => expect(mockSubmitQuestionnaire).toHaveBeenCalled());
    await waitFor(() => expect(mockReplace).toHaveBeenCalled());

    // The interpret webhook is still pending — navigation was not blocked.
    expect(post).toHaveBeenCalled();

    resolveHook?.({ data: { data: { asyncServiceResultId: 'sr-1' } } });

    await waitFor(() => {
      expect(dbSet).toHaveBeenCalledWith('service_requests', {
        id: 'resp-789',
        ownerId: 'pat-1',
        serviceRequestId: 'sr-1',
        updatedAt: expect.any(Number)
      });
    });
  });

  it('mid-batch without study: CTA "See Results", no footer, replaces to the record view', async () => {
    mockResearchProgress.mockReturnValue({
      data: researchProgressWith(['q-123', 'yyy'])
    });
    render(
      <FhirFormsRenderer
        questionnaire={mockQuestionnaire}
        isAuthenticated
        patientId='pat-1'
      />
    );

    // Standalone: only the CTA renders — no secondary footer link.
    // Count buttons inside the drawer so the card-stack viewport
    // (role="button") is excluded while still catching any footer CTA.
    const drawer = screen.getByTestId('mock-drawer-content');
    expect(within(drawer).getAllByRole('button')).toHaveLength(1);
    expect(screen.getByTestId('mock-image')).toBeTruthy();
    expect(screen.queryByRole('progressbar')).toBeNull();

    clickCta('See Results');
    await waitFor(() => expect(mockSubmitQuestionnaire).toHaveBeenCalled());
    await waitFor(() => expect(mockReplace).toHaveBeenCalled());
    expect(mockReplace.mock.calls[0][0]).toBe(
      '/record?id=pat-1&view=QuestionnaireResponse/resp-789'
    );
    expect(mockPush).not.toHaveBeenCalled();
  });
});
