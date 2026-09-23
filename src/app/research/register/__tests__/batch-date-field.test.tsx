import {
  MOCK_BATCH,
  MOCK_FIELD,
  renderWithQuery
} from '@/app/research/__tests__/research-test-utils';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
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

describe('BatchDateField - date picker button', () => {
  it('renders date picker buttons instead of native date inputs', () => {
    renderWithQuery(
      <Step3
        fields={[MOCK_FIELD]}
        errors={{}}
        batches={[MOCK_BATCH]}
        setValue={vi.fn()}
        onAddBatch={vi.fn()}
        onRemoveBatch={vi.fn()}
      />
    );

    const startDateButtons = screen.getAllByRole('button', {
      name: /select start date/i
    });
    const endDateButtons = screen.getAllByRole('button', {
      name: /select end date/i
    });
    expect(startDateButtons.length).toBeGreaterThanOrEqual(1);
    expect(endDateButtons.length).toBeGreaterThanOrEqual(1);
  });

  it('does not render native date inputs', () => {
    renderWithQuery(
      <Step3
        fields={[MOCK_FIELD]}
        errors={{}}
        batches={[MOCK_BATCH]}
        setValue={vi.fn()}
        onAddBatch={vi.fn()}
        onRemoveBatch={vi.fn()}
      />
    );

    const dateInputs = screen.queryAllByRole('spinbutton');
    expect(dateInputs).toHaveLength(0);
  });

  it('opens drawer with calendar when date picker button is clicked', async () => {
    const user = userEvent.setup();
    renderWithQuery(
      <Step3
        fields={[MOCK_FIELD]}
        errors={{}}
        batches={[MOCK_BATCH]}
        setValue={vi.fn()}
        onAddBatch={vi.fn()}
        onRemoveBatch={vi.fn()}
      />
    );

    const startDateButton = screen.getByRole('button', {
      name: /select start date/i
    });
    await user.click(startDateButton);

    await waitFor(() => {
      expect(screen.getByText('Select Date')).toBeInTheDocument();
    });
  });
});
