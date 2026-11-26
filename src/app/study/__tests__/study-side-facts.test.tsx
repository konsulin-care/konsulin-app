import { render, screen } from '@testing-library/react';
import type { ResearchStudy } from 'fhir/r4';
import { describe, expect, it, vi } from 'vitest';
import { StudySideFacts } from '../study-side-facts';

vi.mock('@/i18n', async () => {
  const { createUseTranslationsMock } =
    await import('@/i18n/__tests__/test-messages');
  return { useTranslations: createUseTranslationsMock() };
});

vi.mock('@/app/research/collective-goal', () => ({
  CollectiveGoal: () => <div data-testid='goal' />
}));

const STUDY: ResearchStudy = {
  resourceType: 'ResearchStudy',
  id: 's1',
  status: 'active'
};

describe('StudySideFacts', () => {
  it('shows the exact ethics label for its code and Not stated when absent', () => {
    const { rerender } = render(
      <StudySideFacts study={STUDY} isPatient ethics='approved' />
    );
    expect(
      screen.getByText('Approved by an ethics committee')
    ).toBeInTheDocument();
    rerender(<StudySideFacts study={STUDY} isPatient />);
    expect(screen.getByText('Not stated')).toBeInTheDocument();
  });

  it('renders the collective count only for patients', () => {
    const { rerender } = render(<StudySideFacts study={STUDY} isPatient />);
    expect(screen.getByTestId('goal')).toBeInTheDocument();
    rerender(<StudySideFacts study={STUDY} isPatient={false} />);
    expect(screen.queryByTestId('goal')).toBeNull();
  });

  it('falls back to Konsulin and always shows the platform line', () => {
    render(<StudySideFacts study={STUDY} isPatient={false} />);
    expect(screen.getByText('Konsulin')).toBeInTheDocument();
    expect(
      screen.getByText(
        'Hosted on Konsulin. Answers travel under a random ID, never your name.'
      )
    ).toBeInTheDocument();
  });
});
