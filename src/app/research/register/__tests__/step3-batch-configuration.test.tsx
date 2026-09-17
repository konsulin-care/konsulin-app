import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
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

const availableQuestionnaires = [
  { code: 'phq9', name: 'PHQ-9', duration: 5, category: 'Mental Health' },
  { code: 'gad7', name: 'GAD-7', duration: 3, category: 'Anxiety' }
];

describe('Step3 - Batch Configuration', () => {
  it('renders one combobox per batch with multi-select', () => {
    renderWithQuery(
      <Step3
        fields={[mockField]}
        errors={{}}
        batches={[mockBatch]}
        setValue={vi.fn()}
        onAddBatch={vi.fn()}
        onRemoveBatch={vi.fn()}
        availableQuestionnaires={availableQuestionnaires}
        selectedQuestionnaireIds={['phq9', 'gad7']}
      />
    );

    const comboboxes = screen.getAllByRole('combobox');
    expect(comboboxes).toHaveLength(1);
  });

  it('renders select all button', () => {
    renderWithQuery(
      <Step3
        fields={[mockField]}
        errors={{}}
        batches={[mockBatch]}
        setValue={vi.fn()}
        onAddBatch={vi.fn()}
        onRemoveBatch={vi.fn()}
        availableQuestionnaires={availableQuestionnaires}
        selectedQuestionnaireIds={['phq9', 'gad7']}
      />
    );

    expect(
      screen.getByRole('button', { name: /select all/i })
    ).toBeInTheDocument();
  });

  it('renders metadata in combobox dropdown via renderOptionLabel', async () => {
    renderWithQuery(
      <Step3
        fields={[mockField]}
        errors={{}}
        batches={[mockBatch]}
        setValue={vi.fn()}
        onAddBatch={vi.fn()}
        onRemoveBatch={vi.fn()}
        availableQuestionnaires={availableQuestionnaires}
        selectedQuestionnaireIds={['phq9', 'gad7']}
      />
    );

    // Open the combobox
    const combobox = screen.getByRole('combobox');
    combobox.click();

    // Wait for popover to open
    const { waitFor } = await import('@testing-library/react');
    const popover = await waitFor(() => screen.getByRole('listbox'));

    // Check that metadata is rendered in the dropdown
    expect(screen.getByText('5 min · Mental Health')).toBeInTheDocument();
    expect(screen.getByText('3 min · Anxiety')).toBeInTheDocument();
  });

  it('does not render QuestionnaireChip in batch view', () => {
    renderWithQuery(
      <Step3
        fields={[mockField]}
        errors={{}}
        batches={[mockBatch]}
        setValue={vi.fn()}
        onAddBatch={vi.fn()}
        onRemoveBatch={vi.fn()}
        availableQuestionnaires={availableQuestionnaires}
        selectedQuestionnaireIds={['phq9', 'gad7']}
      />
    );

    // No CircleX buttons (QuestionnaireChip remove buttons)
    const removeButtons = screen.queryAllByRole('button', { name: /remove/i });
    expect(removeButtons).toHaveLength(0);
  });

  it('renders locked batches with disabled combobox', () => {
    renderWithQuery(
      <Step3
        fields={[mockField]}
        errors={{}}
        batches={[
          {
            startDate: '2026-01-01',
            endDate: '2026-12-31',
            questionnaireIds: ['phq9']
          }
        ]}
        setValue={vi.fn()}
        onAddBatch={vi.fn()}
        onRemoveBatch={vi.fn()}
        availableQuestionnaires={availableQuestionnaires}
        selectedQuestionnaireIds={['phq9', 'gad7']}
        lockedBatchIndices={[0]}
      />
    );

    // Locked batch should show questionnaires as text, not combobox
    expect(screen.getByText('PHQ-9')).toBeInTheDocument();
    // No editable combobox for locked batch
    const comboboxes = screen.queryAllByRole('combobox');
    expect(comboboxes).toHaveLength(0);
  });

  it('renders multiple batches with separate comboboxes', () => {
    const mockField2 = {
      id: '2',
      startDate: '',
      endDate: '',
      questionnaireIds: []
    };
    renderWithQuery(
      <Step3
        fields={[mockField, mockField2]}
        errors={{}}
        batches={[mockBatch, mockBatch]}
        setValue={vi.fn()}
        onAddBatch={vi.fn()}
        onRemoveBatch={vi.fn()}
        availableQuestionnaires={availableQuestionnaires}
        selectedQuestionnaireIds={['phq9', 'gad7']}
      />
    );

    const comboboxes = screen.getAllByRole('combobox');
    expect(comboboxes).toHaveLength(2);
  });
});
