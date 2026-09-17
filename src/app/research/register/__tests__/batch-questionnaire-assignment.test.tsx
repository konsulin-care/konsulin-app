import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { QuestionnaireOption } from '../../shared';
import { Step3 } from '../research-form-steps';

vi.mock('@/context/auth/authContext', () => ({
  useAuth: () => ({
    state: {
      userInfo: {
        fhirId: 'test-practitioner-id',
        role_name: 'Researcher'
      }
    },
    isLoading: false
  })
}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn() })
}));

function createQueryClient() {
  return new QueryClient({
    defaultOptions: { queries: { retry: false } }
  });
}

function renderWithQuery(ui: React.ReactElement) {
  return render(
    <QueryClientProvider client={createQueryClient()}>{ui}</QueryClientProvider>
  );
}

const mockBatch = { startDate: '', endDate: '', questionnaireIds: [] };
const mockField = {
  id: '1',
  name: 'batches.0' as const,
  ...mockBatch
};

const availableQuestionnaires: QuestionnaireOption[] = [
  { code: 'phq2', name: 'PHQ-2', duration: null, category: null },
  { code: 'gad7', name: 'GAD-7', duration: null, category: null }
];

describe('Step3 - Questionnaire per batch assignment', () => {
  it('renders combobox for questionnaire selection in each batch', () => {
    renderWithQuery(
      <Step3
        fields={[mockField]}
        errors={{}}
        batches={[mockBatch]}
        setValue={vi.fn()}
        onAddBatch={vi.fn()}
        onRemoveBatch={vi.fn()}
        availableQuestionnaires={availableQuestionnaires}
        selectedQuestionnaireIds={['phq2', 'gad7']}
      />
    );

    // Each batch should have a combobox for questionnaire selection
    const comboboxes = screen.getAllByRole('combobox');
    expect(comboboxes.length).toBeGreaterThanOrEqual(1);
  });

  it('renders "Select all" button when availableQuestionnaires is provided', () => {
    renderWithQuery(
      <Step3
        fields={[mockField]}
        errors={{}}
        batches={[mockBatch]}
        setValue={vi.fn()}
        onAddBatch={vi.fn()}
        onRemoveBatch={vi.fn()}
        availableQuestionnaires={availableQuestionnaires}
        selectedQuestionnaireIds={['phq2', 'gad7']}
      />
    );

    expect(
      screen.getByRole('button', { name: /select all/i })
    ).toBeInTheDocument();
  });

  it('does not render combobox for questionnaire when availableQuestionnaires is empty', () => {
    renderWithQuery(
      <Step3
        fields={[mockField]}
        errors={{}}
        batches={[mockBatch]}
        setValue={vi.fn()}
        onAddBatch={vi.fn()}
        onRemoveBatch={vi.fn()}
        availableQuestionnaires={[]}
        selectedQuestionnaireIds={[]}
      />
    );

    // No comboboxes for questionnaire selection
    const comboboxes = screen.queryAllByRole('combobox');
    expect(comboboxes).toHaveLength(0);
  });

  it('shows read-only questionnaires for locked batches', () => {
    renderWithQuery(
      <Step3
        fields={[mockField]}
        errors={{}}
        batches={[
          {
            startDate: '2026-01-01',
            endDate: '2026-12-31',
            questionnaireIds: ['phq2']
          }
        ]}
        setValue={vi.fn()}
        onAddBatch={vi.fn()}
        onRemoveBatch={vi.fn()}
        availableQuestionnaires={availableQuestionnaires}
        selectedQuestionnaireIds={['phq2', 'gad7']}
        lockedBatchIndices={[0]}
      />
    );

    // Locked batch should show questionnaires as text, not combobox
    expect(screen.getByText('PHQ-2')).toBeInTheDocument();
    // No editable combobox for locked batch
    const comboboxes = screen.queryAllByRole('combobox');
    expect(comboboxes).toHaveLength(0);
  });
});
