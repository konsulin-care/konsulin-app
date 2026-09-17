import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { Step2 } from '../research-form-steps';

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

const libraryOptions = [
  { code: 'phq9', name: 'PHQ-9', duration: 5, category: 'Mental Health' },
  { code: 'gad7', name: 'GAD-7', duration: 3, category: 'Anxiety' },
  { code: 'whodas', name: 'WHODAS 2.0', duration: null, category: null }
];

describe('Step2 - Questionnaire Selection', () => {
  it('renders combobox for search', () => {
    renderWithQuery(
      <Step2
        libraryOptions={libraryOptions}
        selectedIds={[]}
        onSelect={vi.fn()}
        onOpenUploadDrawer={vi.fn()}
      />
    );

    expect(screen.getByRole('combobox')).toBeInTheDocument();
  });

  it('renders upload button', () => {
    renderWithQuery(
      <Step2
        libraryOptions={libraryOptions}
        selectedIds={[]}
        onSelect={vi.fn()}
        onOpenUploadDrawer={vi.fn()}
      />
    );

    expect(
      screen.getByRole('button', { name: /upload custom questionnaire/i })
    ).toBeInTheDocument();
  });

  it('calls onOpenUploadDrawer when upload button is clicked', () => {
    const onOpenUploadDrawer = vi.fn();
    renderWithQuery(
      <Step2
        libraryOptions={libraryOptions}
        selectedIds={[]}
        onSelect={vi.fn()}
        onOpenUploadDrawer={onOpenUploadDrawer}
      />
    );

    fireEvent.click(
      screen.getByRole('button', { name: /upload custom questionnaire/i })
    );

    expect(onOpenUploadDrawer).toHaveBeenCalledOnce();
  });

  it('does not show selected section when no items selected', () => {
    renderWithQuery(
      <Step2
        libraryOptions={libraryOptions}
        selectedIds={[]}
        onSelect={vi.fn()}
        onOpenUploadDrawer={vi.fn()}
      />
    );

    expect(screen.queryByText(/selected/i)).not.toBeInTheDocument();
  });

  it('shows selected section with count when items selected', () => {
    renderWithQuery(
      <Step2
        libraryOptions={libraryOptions}
        selectedIds={['phq9', 'gad7']}
        onSelect={vi.fn()}
        onOpenUploadDrawer={vi.fn()}
      />
    );

    expect(screen.getByText('Selected (2)')).toBeInTheDocument();
  });

  it('renders QuestionnaireChip for each selected item', () => {
    renderWithQuery(
      <Step2
        libraryOptions={libraryOptions}
        selectedIds={['phq9', 'gad7']}
        onSelect={vi.fn()}
        onOpenUploadDrawer={vi.fn()}
      />
    );

    expect(screen.getByText('PHQ-9')).toBeInTheDocument();
    expect(screen.getByText('GAD-7')).toBeInTheDocument();
    expect(screen.queryByText('WHODAS 2.0')).not.toBeInTheDocument();
  });

  it('renders metadata in selected chips', () => {
    renderWithQuery(
      <Step2
        libraryOptions={libraryOptions}
        selectedIds={['phq9']}
        onSelect={vi.fn()}
        onOpenUploadDrawer={vi.fn()}
      />
    );

    expect(screen.getByText('5 min · Mental Health')).toBeInTheDocument();
  });

  it('calls onSelect with item removed when chip is removed', () => {
    const onSelect = vi.fn();
    renderWithQuery(
      <Step2
        libraryOptions={libraryOptions}
        selectedIds={['phq9', 'gad7']}
        onSelect={onSelect}
        onOpenUploadDrawer={vi.fn()}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: /remove phq-9/i }));

    expect(onSelect).toHaveBeenCalledWith(['gad7']);
  });

  it('renders metadata in combobox dropdown via renderOptionLabel', async () => {
    renderWithQuery(
      <Step2
        libraryOptions={libraryOptions}
        selectedIds={[]}
        onSelect={vi.fn()}
        onOpenUploadDrawer={vi.fn()}
      />
    );

    fireEvent.click(screen.getByRole('combobox'));

    // Wait for popover to open and check metadata is rendered
    const popover = await vi.waitFor(() => screen.getByRole('listbox'));

    // Check that metadata is rendered in the dropdown
    expect(
      within(popover).getByText('5 min · Mental Health')
    ).toBeInTheDocument();
    expect(within(popover).getByText('3 min · Anxiety')).toBeInTheDocument();
  });

  it('upload button is positioned between combobox and selected list', () => {
    renderWithQuery(
      <Step2
        libraryOptions={libraryOptions}
        selectedIds={['phq9']}
        onSelect={vi.fn()}
        onOpenUploadDrawer={vi.fn()}
      />
    );

    const combobox = screen.getByRole('combobox');
    const uploadButton = screen.getByRole('button', {
      name: /upload custom questionnaire/i
    });
    const selectedHeading = screen.getByText('Selected (1)');

    // Check DOM order: combobox < upload button < selected heading
    expect(
      combobox.compareDocumentPosition(uploadButton) &
        Node.DOCUMENT_POSITION_FOLLOWING
    ).toBeTruthy();
    expect(
      uploadButton.compareDocumentPosition(selectedHeading) &
        Node.DOCUMENT_POSITION_FOLLOWING
    ).toBeTruthy();
  });
});
