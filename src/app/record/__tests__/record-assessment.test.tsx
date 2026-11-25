/* eslint-disable @typescript-eslint/no-unsafe-argument */

import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { mockUseQuery } = vi.hoisted(() => ({
  mockUseQuery: vi.fn().mockReturnValue({ data: undefined, isLoading: false })
}));

// Mock heavy dependencies
vi.mock('@/context/auth/authContext', () => ({
  useAuth: vi.fn()
}));

vi.mock('@/services/api/assessment', () => ({
  useQuestionnaireResponse: vi.fn(),
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
  useQuery: mockUseQuery,
  useQueryClient: vi.fn(() => ({ setQueryData: vi.fn() }))
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

vi.mock('@/i18n', async () => {
  const { createUseTranslationsMock } =
    await import('@/i18n/__tests__/test-messages');
  return { useTranslations: createUseTranslationsMock() };
});

import { useAuth } from '@/context/auth/authContext';
import { useQuestionnaireResponse } from '@/services/api/assessment';
import { FhirExtensionUrls } from '@/utils/fhir/extensions';
import { useQueryClient } from '@tanstack/react-query';
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

/** Questionnaire carrying a Konsulin instrument coding the engine knows. */
const PHQ9_QUESTIONNAIRE = {
  resourceType: 'Questionnaire',
  id: 'phq9',
  title: 'PHQ-9',
  code: [
    {
      system: 'https://konsulin.care/fhir/CodeSystem/instrument',
      code: 'phq-9'
    }
  ]
};

/**
 * PHQ-9 response with a banded total score, optionally carrying a stored
 * legacy result brief.
 *
 * @param storedBrief - Legacy result-brief text, when one exists.
 * @returns The QuestionnaireResponse fixture.
 */
function buildPhq9Response(storedBrief?: string): Record<string, unknown> {
  const interpretationItems: Record<string, unknown>[] = [
    {
      linkId: 'score-dimension',
      item: [
        { linkId: 'total', answer: [{ valueInteger: 4 }] },
        { linkId: 'reference', answer: [{ valueInteger: 27 }] }
      ]
    },
    {
      linkId: 'signal',
      item: [{ linkId: 'self-harm', answer: [{ valueInteger: 0 }] }]
    }
  ];

  if (storedBrief) {
    interpretationItems.push({
      linkId: 'result-brief',
      answer: [{ valueString: storedBrief }]
    });
  }

  return {
    resourceType: 'QuestionnaireResponse',
    id: 'qr-1',
    questionnaire: 'Questionnaire/phq9',
    status: 'completed',
    item: [{ linkId: 'interpretation', item: interpretationItems }]
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

  it('renders the scores and no Result Brief block when there is no reading', () => {
    vi.mocked(useQuestionnaireResponse).mockReturnValue({
      data: buildMockQR([{ name: 'Stress', score: 2, ref: 4 }]),
      isLoading: false
    } as any);

    render(<RecordAssessment recordId='qr-1' />);

    expect(screen.getByText('Result Tables')).toBeInTheDocument();
    expect(screen.queryByText('Result Brief')).not.toBeInTheDocument();
  });

  it('renders a stored result brief instead of the engine reading', () => {
    mockUseQuery.mockReturnValue({
      data: PHQ9_QUESTIONNAIRE,
      isLoading: false
    });
    vi.mocked(useQuestionnaireResponse).mockReturnValue({
      data: buildPhq9Response('Stored legacy brief'),
      isLoading: false
    } as any);

    render(<RecordAssessment recordId='qr-1' />);

    expect(screen.getByTestId('markdown').textContent).toBe(
      'Stored legacy brief'
    );
    expect(screen.getByTestId('markdown').textContent).not.toContain(
      'phq-9.total.minimal.title'
    );
  });

  it('renders the engine reading for a known instrument, for guests and authenticated users', () => {
    mockUseQuery.mockReturnValue({
      data: PHQ9_QUESTIONNAIRE,
      isLoading: false
    });
    vi.mocked(useQuestionnaireResponse).mockReturnValue({
      data: buildPhq9Response(),
      isLoading: false
    } as any);

    const authenticated = render(<RecordAssessment recordId='qr-1' />);
    expect(screen.getByTestId('markdown').textContent).toContain(
      'phq-9.total.minimal.title'
    );
    authenticated.unmount();

    vi.mocked(useAuth).mockReturnValue({
      state: { isAuthenticated: false, userInfo: null },
      isLoading: false
    } as any);

    render(<RecordAssessment recordId='qr-1' />);
    expect(screen.getByTestId('markdown').textContent).toContain(
      'phq-9.total.minimal.title'
    );
  });

  it('reports the questionnaire fee via onFeeChange', () => {
    const onFeeChange = vi.fn();
    mockUseQuery.mockReturnValue({
      data: {
        resourceType: 'Questionnaire',
        id: 'test-q',
        title: 'PSS-10',
        extension: [
          {
            url: FhirExtensionUrls.fee,
            valueMoney: { value: 50_000, currency: 'IDR' }
          }
        ]
      },
      isLoading: false
    });
    vi.mocked(useQuestionnaireResponse).mockReturnValue({
      data: buildMockQR([{ name: 'Stress', score: 2, ref: 4 }]),
      isLoading: false
    } as any);

    render(<RecordAssessment recordId='qr-1' onFeeChange={onFeeChange} />);

    expect(onFeeChange).toHaveBeenCalledWith({
      value: 50_000,
      currency: 'IDR'
    });
  });

  it('reports null when the questionnaire has no fee extension', () => {
    const onFeeChange = vi.fn();
    mockUseQuery.mockReturnValue({
      data: {
        resourceType: 'Questionnaire',
        id: 'test-q',
        title: 'PSS-10'
      },
      isLoading: false
    });
    vi.mocked(useQuestionnaireResponse).mockReturnValue({
      data: buildMockQR([{ name: 'Stress', score: 2, ref: 4 }]),
      isLoading: false
    } as any);

    render(<RecordAssessment recordId='qr-1' onFeeChange={onFeeChange} />);

    expect(onFeeChange).toHaveBeenCalledWith(null);
  });

  it('passes the resolved questionnaire title and seeds the shared title cache', () => {
    const setQueryData = vi.fn();
    vi.mocked(useQueryClient).mockReturnValue({ setQueryData } as any);
    mockUseQuery.mockReturnValue({
      data: {
        resourceType: 'Questionnaire',
        id: 'test-q',
        title: 'PSS-10'
      },
      isLoading: false
    });
    vi.mocked(useQuestionnaireResponse).mockReturnValue({
      data: buildMockQR([{ name: 'Stress', score: 2, ref: 4 }]),
      isLoading: false
    } as any);

    render(<RecordAssessment recordId='qr-1' />);

    expect(screen.getByText('PSS-10')).toBeInTheDocument();
    expect(setQueryData).toHaveBeenCalledWith(
      ['questionnaire', 'test-q', 'title'],
      'PSS-10'
    );
  });
});
