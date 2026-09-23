import {
  MOCK_BATCH,
  MOCK_FIELD,
  MOCK_QUESTIONNAIRES,
  renderWithQuery
} from '@/app/research/__tests__/research-test-utils';
import { screen } from '@testing-library/react';
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
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() })
}));

describe('Step3 - Batch Configuration', () => {
  it('renders one combobox per batch with multi-select', () => {
    renderWithQuery(
      <Step3
        fields={[MOCK_FIELD]}
        errors={{}}
        batches={[MOCK_BATCH]}
        setValue={vi.fn()}
        onAddBatch={vi.fn()}
        onRemoveBatch={vi.fn()}
        availableQuestionnaires={MOCK_QUESTIONNAIRES}
        selectedQuestionnaireIds={['phq9', 'gad7']}
      />
    );

    const comboboxes = screen.getAllByRole('combobox');
    expect(comboboxes).toHaveLength(1);
  });

  it('renders select all button', () => {
    renderWithQuery(
      <Step3
        fields={[MOCK_FIELD]}
        errors={{}}
        batches={[MOCK_BATCH]}
        setValue={vi.fn()}
        onAddBatch={vi.fn()}
        onRemoveBatch={vi.fn()}
        availableQuestionnaires={MOCK_QUESTIONNAIRES}
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
        fields={[MOCK_FIELD]}
        errors={{}}
        batches={[MOCK_BATCH]}
        setValue={vi.fn()}
        onAddBatch={vi.fn()}
        onRemoveBatch={vi.fn()}
        availableQuestionnaires={MOCK_QUESTIONNAIRES}
        selectedQuestionnaireIds={['phq9', 'gad7']}
      />
    );

    const combobox = screen.getByRole('combobox');
    combobox.click();

    const { waitFor } = await import('@testing-library/react');
    await waitFor(() => screen.getByRole('listbox'));

    expect(screen.getByText('5 min · Mental Health')).toBeInTheDocument();
    expect(screen.getByText('3 min · Anxiety')).toBeInTheDocument();
  });

  it('does not render QuestionnaireChip in batch view', () => {
    renderWithQuery(
      <Step3
        fields={[MOCK_FIELD]}
        errors={{}}
        batches={[MOCK_BATCH]}
        setValue={vi.fn()}
        onAddBatch={vi.fn()}
        onRemoveBatch={vi.fn()}
        availableQuestionnaires={MOCK_QUESTIONNAIRES}
        selectedQuestionnaireIds={['phq9', 'gad7']}
      />
    );

    const removeButtons = screen.queryAllByRole('button', { name: /remove/i });
    expect(removeButtons).toHaveLength(0);
  });

  it('renders locked batches with disabled combobox', () => {
    renderWithQuery(
      <Step3
        fields={[MOCK_FIELD]}
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
        availableQuestionnaires={MOCK_QUESTIONNAIRES}
        selectedQuestionnaireIds={['phq9', 'gad7']}
        lockedBatchIndices={[0]}
      />
    );

    expect(screen.getByText('PHQ-9')).toBeInTheDocument();
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
        fields={[MOCK_FIELD, mockField2]}
        errors={{}}
        batches={[MOCK_BATCH, MOCK_BATCH]}
        setValue={vi.fn()}
        onAddBatch={vi.fn()}
        onRemoveBatch={vi.fn()}
        availableQuestionnaires={MOCK_QUESTIONNAIRES}
        selectedQuestionnaireIds={['phq9', 'gad7']}
      />
    );

    const comboboxes = screen.getAllByRole('combobox');
    expect(comboboxes).toHaveLength(2);
  });
});
