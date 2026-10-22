import type { InterviewResult } from '@/types/recommendation-interview';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import {
  RecommendationProvider,
  useRecommendationResult
} from '../recommendationContext';

const RESULT: InterviewResult = {
  complaintId: 'anxiety',
  complaintLabel: 'Anxiety',
  specialty: 'psychiatry',
  serviceTypeCode: 'anxiety-care',
  icfDomain: 'mental-emotional-health',
  redFlag: { isEmergency: false, label: 'Are you safe?', resources: [] }
};

/** Consumer bound to the real provider so we can verify updates propagate. */
function ContextConsumer() {
  const { result, setResult } = useRecommendationResult();
  return (
    <div>
      <span data-testid='result'>{result?.specialty ?? 'none'}</span>
      <button data-testid='set-result' onClick={() => setResult(RESULT)}>
        Set Result
      </button>
      <button data-testid='clear-result' onClick={() => setResult(null)}>
        Clear Result
      </button>
    </div>
  );
}

describe('RecommendationContext', () => {
  it('starts with no result', () => {
    render(
      <RecommendationProvider>
        <ContextConsumer />
      </RecommendationProvider>
    );
    expect(screen.getByTestId('result').textContent).toBe('none');
  });

  it('propagates a result set outside the consumer', () => {
    function Setter() {
      const { setResult } = useRecommendationResult();
      return (
        <button data-testid='external-set' onClick={() => setResult(RESULT)}>
          External
        </button>
      );
    }
    render(
      <RecommendationProvider>
        <ContextConsumer />
        <Setter />
      </RecommendationProvider>
    );
    fireEvent.click(screen.getByTestId('external-set'));
    expect(screen.getByTestId('result').textContent).toBe('psychiatry');
  });

  it('re-renders consumers when the value updates via its own setter', () => {
    render(
      <RecommendationProvider>
        <ContextConsumer />
      </RecommendationProvider>
    );
    fireEvent.click(screen.getByTestId('set-result'));
    expect(screen.getByTestId('result').textContent).toBe('psychiatry');
    fireEvent.click(screen.getByTestId('clear-result'));
    expect(screen.getByTestId('result').textContent).toBe('none');
  });

  it('throws when the hook is used outside the provider', () => {
    const originalError = console.error;
    console.error = () => {
      /* suppress expected error */
    };
    expect(() => render(<ContextConsumer />)).toThrow(
      /must be used within RecommendationProvider/
    );
    console.error = originalError;
  });
});
