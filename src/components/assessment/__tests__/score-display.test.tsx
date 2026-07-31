import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

// Mock UI dependencies
vi.mock('@/components/ui/progress', () => ({
  Progress: ({ value, color }: { value: number; color?: string }) => (
    <div data-testid='progress-bar' data-value={value} data-color={color} />
  )
}));

vi.mock('@/components/ui/skeleton', () => ({
  Skeleton: () => <div data-testid='skeleton' />
}));

vi.mock('lucide-react', () => ({
  NotepadTextIcon: () => <div data-testid='notepad-icon' />
}));

vi.mock('react-markdown', () => ({
  default: ({ children }: { children: string }) => (
    <div data-testid='markdown'>{children}</div>
  )
}));

import type { QuestionnaireResponse } from 'fhir/r4';
import ScoreDisplay from '../score-display';

/** Build a minimal QuestionnaireResponse with score-dimension items. */
function buildMockQR(
  scores: { name: string; score: number; ref: number }[],
  questionnaire = 'Questionnaire/test-q'
): QuestionnaireResponse {
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

describe('ScoreDisplay', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders loading skeleton when loadingSkeleton is true and no QR', () => {
    render(
      <ScoreDisplay
        questionnaireResponse={null}
        isLoading={true}
        loadingSkeleton={true}
      />
    );

    const skeletons = screen.getAllByTestId('skeleton');
    expect(skeletons.length).toBeGreaterThanOrEqual(1);
  });

  it('renders questionnaire name from the QR questionnaire field', () => {
    const qr = buildMockQR(
      [{ name: 'Anxiety', score: 3, ref: 5 }],
      'Questionnaire/gad-7'
    );
    render(<ScoreDisplay questionnaireResponse={qr} isLoading={false} />);

    expect(screen.getByText('gad-7')).toBeInTheDocument();
  });

  it('extracts and renders score-dimension progress bars', () => {
    const qr = buildMockQR([
      { name: 'Anxiety', score: 3, ref: 5 },
      { name: 'Depression', score: 4, ref: 5 }
    ]);
    render(<ScoreDisplay questionnaireResponse={qr} isLoading={false} />);

    expect(screen.getByText('Anxiety')).toBeInTheDocument();
    expect(screen.getByText('Depression')).toBeInTheDocument();

    const bars = screen.getAllByTestId('progress-bar');
    expect(bars).toHaveLength(2);
  });

  it('renders "Result Tables" section heading', () => {
    const qr = buildMockQR([{ name: 'Anxiety', score: 3, ref: 5 }]);
    render(<ScoreDisplay questionnaireResponse={qr} isLoading={false} />);

    expect(screen.getByText('Result Tables')).toBeInTheDocument();
  });

  it('renders "Result Brief" section heading', () => {
    const qr = buildMockQR([{ name: 'Anxiety', score: 3, ref: 5 }]);
    render(<ScoreDisplay questionnaireResponse={qr} isLoading={false} />);

    expect(screen.getByText('Result Brief')).toBeInTheDocument();
  });

  it('shows "Claim the results to request analysis." when resultBrief is null', () => {
    const qr = buildMockQR([{ name: 'Anxiety', score: 3, ref: 5 }]);
    render(
      <ScoreDisplay
        questionnaireResponse={qr}
        isLoading={false}
        resultBrief={null}
      />
    );

    expect(
      screen.getByText('Claim the results to request analysis.')
    ).toBeInTheDocument();
  });

  it('displays the polled result brief when resultBrief is a string', () => {
    const qr = buildMockQR([{ name: 'Anxiety', score: 3, ref: 5 }]);
    render(
      <ScoreDisplay
        questionnaireResponse={qr}
        isLoading={false}
        resultBrief='Your anxiety level is moderate.'
      />
    );

    expect(
      screen.getByText('Your anxiety level is moderate.')
    ).toBeInTheDocument();
  });

  it('renders percentage values for each score dimension', () => {
    const qr = buildMockQR([
      { name: 'Anxiety', score: 3, ref: 5 },
      { name: 'Depression', score: 4, ref: 5 }
    ]);
    const { container } = render(
      <ScoreDisplay questionnaireResponse={qr} isLoading={false} />
    );

    // 3/5 = 60%, 4/5 = 80%
    expect(container.textContent).toContain('60%');
    expect(container.textContent).toContain('80%');
  });

  it('renders nothing meaningful when QR is null and not loading', () => {
    const { container } = render(
      <ScoreDisplay questionnaireResponse={null} isLoading={false} />
    );

    expect(container.textContent?.trim()).toBe('');
  });

  it('skips the reference item when computing scores', () => {
    const qr = buildMockQR([{ name: 'Stress', score: 2, ref: 4 }]);
    render(<ScoreDisplay questionnaireResponse={qr} isLoading={false} />);

    // "reference" linkId should NOT appear as a dimension name
    expect(screen.queryByText('reference')).not.toBeInTheDocument();
  });
});
