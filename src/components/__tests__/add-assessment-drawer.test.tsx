import AddAssessmentDrawer from '@/components/add-assessment-drawer';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { type AxiosInstance } from 'axios';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/services/api', () => ({
  getAPI: vi.fn()
}));

vi.mock('@/lib/indexeddb', () => ({
  STORES: { uiPreferences: 'ui_preferences' },
  dbGet: vi.fn()
}));

const { mockToast } = vi.hoisted(() => ({
  mockToast: { success: vi.fn(), error: vi.fn() }
}));

vi.mock('react-toastify', () => ({ toast: mockToast }));

const mockUseAuth = vi.hoisted(() =>
  vi.fn<
    () => {
      state: {
        userInfo: {
          fullname?: string;
          email?: string;
          phoneNumber?: string;
          organizationId?: string;
        };
      };
      isLoading: boolean;
    }
  >()
);
vi.mock('@/context/auth/authContext', () => ({
  useAuth: () => mockUseAuth()
}));

import { dbGet } from '@/lib/indexeddb';
import { getAPI } from '@/services/api';

const mockAxiosInstance = { get: vi.fn(), post: vi.fn() };

const USER_INFO = {
  fullname: 'Aly Lamuri',
  email: 'aly@example.com',
  phoneNumber: '+628123456789'
};

/** Build a valid FHIR Questionnaire file. */
function buildQuestionnaireFile(): File {
  const questionnaire = {
    resourceType: 'Questionnaire',
    id: 'demo-survey',
    title: 'Demo Survey',
    status: 'active',
    item: [
      { linkId: 'q1', text: 'First question', type: 'choice' },
      { linkId: 'q2', text: 'Second question', type: 'choice' }
    ]
  };
  return new File(
    [JSON.stringify(questionnaire, null, 2)],
    'questionnaire.json',
    { type: 'application/json' }
  );
}

/** Select a file on the hidden questionnaire upload input. */
function uploadFile(container: HTMLElement, file: File) {
  const input = document.querySelector('input[type="file"]');
  if (!input) throw new Error('file input not found');
  fireEvent.change(input, { target: { files: [file] } });
}

describe('AddAssessmentDrawer', () => {
  let queryClient: QueryClient;
  const onClose = vi.fn();

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } }
    });
    vi.clearAllMocks();
    mockUseAuth.mockReturnValue({
      state: { userInfo: USER_INFO },
      isLoading: false
    });
    vi.mocked(getAPI).mockResolvedValue(
      mockAxiosInstance as unknown as AxiosInstance
    );
    mockAxiosInstance.get.mockResolvedValue({ data: { name: 'Konsulin' } });
    mockAxiosInstance.post.mockResolvedValue({ data: {} });
    vi.mocked(dbGet).mockImplementation((_store, args) => {
      if (args?.[1] === 'clinic_organization')
        return Promise.resolve({ value: 'org-1' });
      return Promise.resolve(null);
    });
  });

  afterEach(() => {
    queryClient.clear();
  });

  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );

  it('renders all fields with the submit button disabled', () => {
    render(<AddAssessmentDrawer open onClose={onClose} />, { wrapper });

    expect(screen.getByText('Add Assessment')).toBeInTheDocument();
    expect(screen.getByText('Upload Questionnaire')).toBeInTheDocument();
    expect(screen.getByLabelText('Image URL (optional)')).toBeInTheDocument();
    expect(
      screen.getByLabelText('Estimated Duration (minutes)')
    ).toBeInTheDocument();
    expect(screen.getByLabelText('Fee')).toBeInTheDocument();
    expect(screen.getByLabelText('Category')).toBeInTheDocument();

    const submit = screen.getByRole('button', { name: 'Submit' });
    expect(submit).toBeDisabled();
  });

  it('keeps submit disabled until questionnaire, duration, and category are set', async () => {
    const { container } = render(
      <AddAssessmentDrawer open onClose={onClose} />,
      {
        wrapper
      }
    );

    const submit = screen.getByRole('button', { name: 'Submit' });

    fireEvent.change(screen.getByLabelText('Estimated Duration (minutes)'), {
      target: { value: '10' }
    });
    fireEvent.change(screen.getByLabelText('Category'), {
      target: { value: 'physical-health' }
    });
    expect(submit).toBeDisabled();

    uploadFile(container, buildQuestionnaireFile());
    await waitFor(() =>
      expect(screen.getByTestId('questionnaire-snippet')).toBeInTheDocument()
    );
    expect(submit).not.toBeDisabled();
  });

  it('posts a draft questionnaire with publisher, date, contact, and extensions', async () => {
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');
    const { container } = render(
      <AddAssessmentDrawer open onClose={onClose} />,
      {
        wrapper
      }
    );

    uploadFile(container, buildQuestionnaireFile());
    await waitFor(() =>
      expect(screen.getByTestId('questionnaire-snippet')).toBeInTheDocument()
    );

    fireEvent.change(screen.getByLabelText('Image URL (optional)'), {
      target: { value: 'https://example.com/image.webp' }
    });
    fireEvent.change(screen.getByLabelText('Estimated Duration (minutes)'), {
      target: { value: '10' }
    });
    fireEvent.change(screen.getByLabelText('Category'), {
      target: { value: 'physical-health' }
    });

    fireEvent.click(screen.getByRole('button', { name: 'Submit' }));

    await waitFor(() =>
      expect(mockAxiosInstance.post).toHaveBeenCalledWith(
        '/fhir/Questionnaire',
        expect.anything()
      )
    );

    const payload = mockAxiosInstance.post.mock.calls[0]?.[1] as {
      resourceType?: string;
      status?: string;
      publisher?: string;
      date?: string;
      contact?: Array<{
        name?: string;
        telecom?: Array<{ system: string; value: string }>;
      }>;
      extension?: Array<{
        url: string;
        valueUrl?: string;
        valueDuration?: { value?: number };
      }>;
      useContext?: unknown[];
    };

    expect(payload.resourceType).toBe('Questionnaire');
    expect(payload.status).toBe('draft');
    expect(payload.publisher).toBe('Konsulin');
    expect(payload.date).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    expect(payload.contact).toEqual([
      {
        name: 'Aly Lamuri',
        telecom: [
          { system: 'email', value: 'aly@example.com' },
          { system: 'phone', value: '+628123456789' }
        ]
      }
    ]);

    const imageExt = payload.extension?.find(e =>
      e.url.endsWith('questionnaireImage')
    );
    expect(imageExt?.valueUrl).toBe('https://example.com/image.webp');

    const durationExt = payload.extension?.find(e =>
      e.url.endsWith('questionnaireEstimatedDuration')
    );
    expect(durationExt?.valueDuration?.value).toBe(10);

    const feeExt = payload.extension?.find(e => e.url.endsWith('/fee'));
    expect(feeExt).toBeUndefined();

    const useContextJson = JSON.stringify(payload.useContext);
    expect(useContextJson).toContain('assessment-domain');
    expect(useContextJson).toContain('physical-health');
    expect(useContextJson).toContain('"code":"regular"');

    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: ['curated-assessments']
    });
    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: ['featured-assessments']
    });

    expect(mockToast.success).toHaveBeenCalled();
    expect(onClose).toHaveBeenCalled();
  });

  it('posts the fee extension when a fee is entered', async () => {
    const { container } = render(
      <AddAssessmentDrawer open onClose={onClose} />,
      {
        wrapper
      }
    );

    uploadFile(container, buildQuestionnaireFile());
    await waitFor(() =>
      expect(screen.getByTestId('questionnaire-snippet')).toBeInTheDocument()
    );

    fireEvent.change(screen.getByLabelText('Estimated Duration (minutes)'), {
      target: { value: '10' }
    });
    fireEvent.change(screen.getByLabelText('Category'), {
      target: { value: 'physical-health' }
    });
    fireEvent.change(screen.getByLabelText('Fee'), {
      target: { value: '150000' }
    });

    fireEvent.click(screen.getByRole('button', { name: 'Submit' }));

    await waitFor(() =>
      expect(mockAxiosInstance.post).toHaveBeenCalledWith(
        '/fhir/Questionnaire',
        expect.anything()
      )
    );

    const payload = mockAxiosInstance.post.mock.calls[0]?.[1] as {
      extension?: Array<{
        url: string;
        valueMoney?: { value: number; currency: string };
      }>;
    };
    const feeExt = payload.extension?.find(e => e.url.endsWith('/fee'));
    expect(feeExt?.valueMoney).toEqual({ value: 150_000, currency: 'IDR' });
  });

  it('shows an error toast and keeps the drawer open when the POST fails', async () => {
    mockAxiosInstance.post.mockRejectedValue(new Error('boom'));
    const { container } = render(
      <AddAssessmentDrawer open onClose={onClose} />,
      {
        wrapper
      }
    );

    uploadFile(container, buildQuestionnaireFile());
    await waitFor(() =>
      expect(screen.getByTestId('questionnaire-snippet')).toBeInTheDocument()
    );

    fireEvent.change(screen.getByLabelText('Estimated Duration (minutes)'), {
      target: { value: '10' }
    });
    fireEvent.change(screen.getByLabelText('Category'), {
      target: { value: 'physical-health' }
    });

    fireEvent.click(screen.getByRole('button', { name: 'Submit' }));

    await waitFor(() => expect(mockToast.error).toHaveBeenCalled());
    expect(onClose).not.toHaveBeenCalled();
  });
});
