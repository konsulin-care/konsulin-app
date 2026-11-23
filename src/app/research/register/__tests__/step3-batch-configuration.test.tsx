import {
  MOCK_BATCH,
  MOCK_FIELD,
  MOCK_QUESTIONNAIRES,
  renderWithQuery
} from '@/__tests__/react-test-utils';
import { screen } from '@testing-library/react';
import type { UseFormReturn } from 'react-hook-form';
import { describe, expect, it, vi } from 'vitest';
import type { FormData } from '../research-form';
import { Step1, Step3 } from '../research-form-steps';

vi.mock('@/i18n', async () =>
  (await import('@/__tests__/mocks/i18n-mock')).i18nMockFactory()
);

vi.mock('@/context/auth/authContext', async () => ({
  ...(await import('@/__tests__/mocks/research-form')).researcherAuthMock
}));

vi.mock('next/navigation', async () => ({
  ...(await import('@/__tests__/mocks/research-form')).researchRouterMock
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

  it('renders the batch card with border-border and muted labels', () => {
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
        lockedBatchIndices={[0]}
      />
    );

    const card = screen.getByText(/batch 1/i).closest('.rounded-lg');
    expect(card).toHaveClass('border-border');
    expect(screen.getByText('(locked)')).toHaveClass(
      'text-xs',
      'text-muted-foreground'
    );
  });

  it('renders step 1 inputs with border-input and text-foreground', () => {
    const register = vi.fn() as unknown as UseFormReturn<FormData>['register']; // NOSONAR: test double for react-hook-form register
    renderWithQuery(<Step1 register={register} errors={{}} />);

    expect(screen.getByLabelText(/^title$/i)).toHaveClass(
      'border-input',
      'text-foreground'
    );
    expect(screen.getByLabelText(/target participants/i)).toHaveClass(
      'border-input',
      'text-foreground'
    );
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
