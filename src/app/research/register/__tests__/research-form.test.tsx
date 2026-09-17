import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { Step1, Step2, Step3 } from '../research-form-steps';

afterEach(() => {
  localStorage.clear();
});

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

/** Minimal mock for UseFormRegister — returns an empty handler object. */
function mockRegister() {
  // register('fieldName') returns { onChange, onBlur, ref, name }
  // Using type assertion to bypass strict generic matching in tests
  return vi.fn((name: string) => ({
    onChange: vi.fn(),
    onBlur: vi.fn(),
    ref: vi.fn(),
    name: name as never
  }));
}

const mockBatch = { startDate: '', endDate: '', questionnaireIds: [] };
const mockField = {
  id: '1',
  name: 'batches.0' as const,
  ...mockBatch
};

describe('Step1 - Title & Description', () => {
  it('renders title input and description textarea', () => {
    renderWithQuery(<Step1 register={mockRegister()} errors={{}} />);

    expect(screen.getByLabelText(/title/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/description/i)).toBeInTheDocument();
  });

  it('has no Back, Next, or Submit buttons', () => {
    renderWithQuery(<Step1 register={mockRegister()} errors={{}} />);

    expect(
      screen.queryByRole('button', { name: /back/i })
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: /next/i })
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: /submit/i })
    ).not.toBeInTheDocument();
  });

  it('is not a form element', () => {
    renderWithQuery(<Step1 register={mockRegister()} errors={{}} />);

    expect(screen.queryByRole('form')).not.toBeInTheDocument();
  });
});

describe('Step2 - Questionnaire Selection', () => {
  it('renders From Library section and Upload Custom button', () => {
    renderWithQuery(
      <Step2
        libraryOptions={[]}
        selectedIds={[]}
        onSelect={vi.fn()}
        onOpenUploadDrawer={vi.fn()}
      />
    );

    expect(screen.getByText('Questionnaire Selection')).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /upload custom questionnaire/i })
    ).toBeInTheDocument();
  });

  it('calls onOpenUploadDrawer when button is clicked', async () => {
    const onOpenUploadDrawer = vi.fn();
    renderWithQuery(
      <Step2
        libraryOptions={[]}
        selectedIds={[]}
        onSelect={vi.fn()}
        onOpenUploadDrawer={onOpenUploadDrawer}
      />
    );

    const button = screen.getByRole('button', {
      name: /upload custom questionnaire/i
    });
    button.click();

    expect(onOpenUploadDrawer).toHaveBeenCalledTimes(1);
  });

  it('shows selected count when questionnaires are selected', () => {
    renderWithQuery(
      <Step2
        libraryOptions={[
          { code: 'phq2', name: 'PHQ-2', duration: null, category: null }
        ]}
        selectedIds={['phq2']}
        onSelect={vi.fn()}
        onOpenUploadDrawer={vi.fn()}
      />
    );

    expect(screen.getByText('Selected (1)')).toBeInTheDocument();
  });
});

describe('Step3 - Batch Configuration', () => {
  it('renders batch configuration heading and Add Batch button', () => {
    renderWithQuery(
      <Step3
        fields={[mockField]}
        errors={{}}
        batches={[mockBatch]}
        setValue={vi.fn()}
        onAddBatch={vi.fn()}
        onRemoveBatch={vi.fn()}
      />
    );

    expect(screen.getByText(/batch configuration/i)).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /add batch/i })
    ).toBeInTheDocument();
  });

  it('has no Back or Submit buttons', () => {
    renderWithQuery(
      <Step3
        fields={[mockField]}
        errors={{}}
        batches={[mockBatch]}
        setValue={vi.fn()}
        onAddBatch={vi.fn()}
        onRemoveBatch={vi.fn()}
      />
    );

    expect(
      screen.queryByRole('button', { name: /back/i })
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: /submit/i })
    ).not.toBeInTheDocument();
  });

  it('renders date picker buttons for each batch', () => {
    renderWithQuery(
      <Step3
        fields={[mockField]}
        errors={{}}
        batches={[mockBatch]}
        setValue={vi.fn()}
        onAddBatch={vi.fn()}
        onRemoveBatch={vi.fn()}
      />
    );

    expect(
      screen.getByRole('button', { name: /select start date/i })
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /select end date/i })
    ).toBeInTheDocument();
  });
});
