import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import QuestionnaireUploadDrawer from '../questionnaire-upload-drawer';

vi.mock('@/context/auth/authContext', () => ({
  useAuth: () => ({
    state: {
      userInfo: {
        fhirId: 'test-user-id',
        fullname: 'Test User',
        email: 'test@example.com',
        phoneNumber: '+1234567890'
      }
    }
  })
}));

vi.mock('@/services/api', () => ({
  getAPI: () =>
    Promise.resolve({
      get: vi.fn().mockResolvedValue({ data: { name: 'Test Org' } }),
      post: vi.fn().mockResolvedValue({ data: { id: 'new-q-id' } })
    })
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

describe('QuestionnaireUploadDrawer', () => {
  it('renders upload field and duration input', () => {
    renderWithQuery(
      <QuestionnaireUploadDrawer
        open={true}
        onClose={vi.fn()}
        onUploaded={vi.fn()}
        resolvePublisher={vi.fn().mockResolvedValue('Test Publisher')}
      />
    );

    // Drawer title and label both contain 'Upload Questionnaire', use getAllByText
    expect(
      screen.getAllByText(/upload questionnaire/i).length
    ).toBeGreaterThanOrEqual(1);
    expect(screen.getByLabelText(/estimated duration/i)).toBeInTheDocument();
  });

  it('shows fee field when showFee is true', () => {
    renderWithQuery(
      <QuestionnaireUploadDrawer
        open={true}
        onClose={vi.fn()}
        onUploaded={vi.fn()}
        showFee={true}
        resolvePublisher={vi.fn().mockResolvedValue('Test Publisher')}
      />
    );

    expect(screen.getByLabelText(/fee/i)).toBeInTheDocument();
  });

  it('hides fee field when showFee is false', () => {
    renderWithQuery(
      <QuestionnaireUploadDrawer
        open={true}
        onClose={vi.fn()}
        onUploaded={vi.fn()}
        showFee={false}
        resolvePublisher={vi.fn().mockResolvedValue('Test Publisher')}
      />
    );

    expect(screen.queryByLabelText(/fee/i)).not.toBeInTheDocument();
  });

  it('shows image field when showImage is true', () => {
    renderWithQuery(
      <QuestionnaireUploadDrawer
        open={true}
        onClose={vi.fn()}
        onUploaded={vi.fn()}
        showImage={true}
        resolvePublisher={vi.fn().mockResolvedValue('Test Publisher')}
      />
    );

    expect(screen.getByLabelText(/image url/i)).toBeInTheDocument();
  });

  it('hides image field when showImage is false', () => {
    renderWithQuery(
      <QuestionnaireUploadDrawer
        open={true}
        onClose={vi.fn()}
        onUploaded={vi.fn()}
        showImage={false}
        resolvePublisher={vi.fn().mockResolvedValue('Test Publisher')}
      />
    );

    expect(screen.queryByLabelText(/image url/i)).not.toBeInTheDocument();
  });

  it('renders category selector', () => {
    renderWithQuery(
      <QuestionnaireUploadDrawer
        open={true}
        onClose={vi.fn()}
        onUploaded={vi.fn()}
        resolvePublisher={vi.fn().mockResolvedValue('Test Publisher')}
      />
    );

    expect(screen.getByLabelText(/category/i)).toBeInTheDocument();
  });
});
