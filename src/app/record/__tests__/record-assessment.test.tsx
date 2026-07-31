/* eslint-disable @typescript-eslint/no-unsafe-argument */

import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

// Mock heavy dependencies
vi.mock('@/context/auth/authContext', () => ({
  useAuth: vi.fn()
}));

vi.mock('@/services/api/assessment', () => ({
  useQuestionnaireResponse: vi.fn(),
  RESULT_BRIEF_LOGIN_REQUIRED: 'Login required',
  RESULT_BRIEF_PLACEHOLDER: 'Waiting...'
}));

vi.mock('@/services/api', () => ({
  getAPI: vi.fn()
}));

vi.mock('@/lib/indexeddb', () => ({
  STORES: {
    uiPreferences: 'uiPreferences',
    serviceRequests: 'serviceRequests'
  },
  // eslint-disable-next-line unicorn/no-useless-undefined
  dbGet: vi.fn().mockResolvedValue(undefined),
  dbSet: vi.fn(),
  dbDelete: vi.fn()
}));

vi.mock('@tanstack/react-query', () => ({
  useQuery: vi.fn().mockReturnValue({ data: undefined, isLoading: false })
}));

vi.mock('@/components/ui/progress', () => ({
  Progress: () => <div />
}));

vi.mock('@/components/ui/skeleton', () => ({
  Skeleton: () => <div />
}));

vi.mock('lucide-react', () => ({
  NotepadTextIcon: () => <div data-testid='notepad-icon' />
}));

vi.mock('react-markdown', () => ({
  default: ({ children }: { children: string }) => (
    <div data-testid='markdown'>{children}</div>
  )
}));

import { useAuth } from '@/context/auth/authContext';
import { useQuestionnaireResponse } from '@/services/api/assessment';
import RecordAssessment from '../record-assessment';

/** Build a minimal QuestionnaireResponse with score-dimension items. */
function buildMockQR(
  scores: { name: string; score: number; ref: number }[],
  questionnaire = 'Questionnaire/test-q'
): Record<string, unknown> {
  const scoreItems = scores.map(({ name, score }) => ({
    linkId: `score-${name}`,
    text: name,
    answer: [{ valueInteger: score }]
  }));

  return {
    resourceType: 'QuestionnaireResponse',
    id: 'qr-1',
    questionnaire,
    status: 'completed',
    item: [
      {
        linkId: 'interpretation',
        item: [
          {
            linkId: 'score-dimension',
            item: [
              {
                linkId: 'reference',
                answer: [{ valueInteger: scores[0]?.ref ?? 1 }]
              },
              ...scoreItems
            ]
          }
        ]
      }
    ]
  };
}

describe('RecordAssessment', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    vi.mocked(useAuth).mockReturnValue({
      state: {
        isAuthenticated: true,
        userInfo: { role_name: 'Patient', userId: 'patient-1' }
      },
      isLoading: false
    } as any);

    vi.mocked(useQuestionnaireResponse).mockReturnValue({
      data: null,
      isLoading: false
    } as any);
  });

  it('shows nothing when no QR data and not loading', () => {
    const { container } = render(<RecordAssessment recordId='qr-1' />);
    expect(container.textContent?.trim()).toBe('');
  });

  it('passes loading state to ScoreDisplay', () => {
    vi.mocked(useQuestionnaireResponse).mockReturnValue({
      data: null,
      isLoading: true
    } as any);

    const { container } = render(<RecordAssessment recordId='qr-1' />);
    // Shows a loading container with skeleton
    expect(container.querySelector('.flex')).toBeInTheDocument();
  });

  it('renders score dimensions from QR data', () => {
    const qrData = buildMockQR([
      { name: 'Anxiety', score: 3, ref: 5 },
      { name: 'Depression', score: 4, ref: 5 }
    ]);

    vi.mocked(useQuestionnaireResponse).mockReturnValue({
      data: qrData,
      isLoading: false
    } as any);

    render(<RecordAssessment recordId='qr-1' />);

    expect(screen.getByText('Anxiety')).toBeInTheDocument();
    expect(screen.getByText('Depression')).toBeInTheDocument();
  });

  it('renders result brief section', () => {
    vi.mocked(useQuestionnaireResponse).mockReturnValue({
      data: buildMockQR([{ name: 'Stress', score: 2, ref: 4 }]),
      isLoading: false
    } as any);

    render(<RecordAssessment recordId='qr-1' />);

    expect(screen.getByText('Result Brief')).toBeInTheDocument();
    expect(screen.getByText('Result Tables')).toBeInTheDocument();
  });
});
