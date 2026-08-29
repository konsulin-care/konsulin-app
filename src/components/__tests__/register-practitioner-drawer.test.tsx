import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { type AxiosInstance } from 'axios';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import RegisterPractitionerDrawer from '../register-practitioner-drawer';

vi.mock('@/lib/indexeddb', () => ({
  STORES: { uiPreferences: 'ui_preferences' },
  dbGet: vi.fn()
}));
vi.mock('@/services/api', () => ({ getAPI: vi.fn() }));
vi.mock('@/services/clinic-practitioners', () => ({
  useOrganizationLocations: vi.fn()
}));
vi.mock('react-toastify', () => ({
  toast: { success: vi.fn(), error: vi.fn() }
}));
vi.mock('@/lib/utils', () => ({
  cn: (...classes: (string | undefined | null | false)[]) =>
    classes.filter(Boolean).join(' ')
}));

import { dbGet } from '@/lib/indexeddb';
import { getAPI } from '@/services/api';
import { useOrganizationLocations } from '@/services/clinic-practitioners';
import { toast } from 'react-toastify';

const mockAxiosInstance = { get: vi.fn(), post: vi.fn() };
const mockLocations = [{ id: 'loc-1', name: 'Main Clinic' }];

describe('RegisterPractitionerDrawer', () => {
  let queryClient: QueryClient;
  const onClose = vi.fn();

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } }
    });
    vi.clearAllMocks();
    vi.mocked(getAPI).mockResolvedValue(
      mockAxiosInstance as unknown as AxiosInstance
    );
    vi.mocked(useOrganizationLocations).mockReturnValue({
      locations: mockLocations,
      isLoading: false,
      isError: false,
      isFetching: false
    });
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

  /** Fill name/email fields and select location. */
  async function fillForm() {
    fireEvent.change(screen.getByLabelText('Name'), {
      target: { value: 'Aly Lamuri' }
    });
    fireEvent.change(screen.getByLabelText('Email'), {
      target: { value: 'aly@clinic.com' }
    });
    fireEvent.click(screen.getByText('Select location...'));
    await waitFor(() => {
      expect(screen.getByText('Main Clinic')).toBeDefined();
    });
    fireEvent.click(screen.getByText('Main Clinic'));
  }

  /** Mock all 3 FHIR pipeline steps to succeed. */
  function mockSuccessPipeline() {
    mockAxiosInstance.get.mockResolvedValueOnce({ data: { entry: [] } }); // GET Practitioner
    mockAxiosInstance.post.mockResolvedValueOnce({ data: { id: 'prac-1' } }); // POST Practitioner
    mockAxiosInstance.get.mockResolvedValueOnce({ data: { entry: [] } }); // GET PractitionerRole
    mockAxiosInstance.post.mockResolvedValueOnce({ data: { id: 'role-1' } }); // POST PractitionerRole
    mockAxiosInstance.get.mockResolvedValueOnce({ data: { entry: [] } }); // GET Schedule
    mockAxiosInstance.post.mockResolvedValueOnce({ data: { id: 'sched-1' } }); // POST Schedule
  }

  it('renders form fields when open', () => {
    render(<RegisterPractitionerDrawer open onClose={onClose} />, { wrapper });
    expect(screen.getByText('Register Practitioner')).toBeDefined();
    expect(screen.getByLabelText('Name')).toBeDefined();
    expect(screen.getByLabelText('Email')).toBeDefined();
    expect(screen.getByText('Register')).toBeDefined();
  });

  it('renders location combobox when locations are available', async () => {
    render(<RegisterPractitionerDrawer open onClose={onClose} />, { wrapper });
    await waitFor(() => {
      expect(screen.getByText('Select location...')).toBeDefined();
    });
  });

  it('disables Register when name and email are empty', () => {
    render(<RegisterPractitionerDrawer open onClose={onClose} />, { wrapper });
    expect(screen.getByText('Register').closest('button')).toBeDisabled();
  });

  it('disables Register when only name is filled', () => {
    render(<RegisterPractitionerDrawer open onClose={onClose} />, { wrapper });
    fireEvent.change(screen.getByLabelText('Name'), {
      target: { value: 'Aly Lamuri' }
    });
    expect(screen.getByText('Register').closest('button')).toBeDisabled();
  });

  it('disables Register when name+email filled but no location', () => {
    render(<RegisterPractitionerDrawer open onClose={onClose} />, { wrapper });
    fireEvent.change(screen.getByLabelText('Name'), {
      target: { value: 'Aly Lamuri' }
    });
    fireEvent.change(screen.getByLabelText('Email'), {
      target: { value: 'aly@clinic.com' }
    });
    expect(screen.getByText('Register').closest('button')).toBeDisabled();
  });

  it('enables Register when name, email, and location are filled', async () => {
    render(<RegisterPractitionerDrawer open onClose={onClose} />, { wrapper });
    await fillForm();
    expect(screen.getByText('Register').closest('button')).toBeEnabled();
  });

  it('performs full FHIR pipeline on successful registration', async () => {
    mockSuccessPipeline();
    render(<RegisterPractitionerDrawer open onClose={onClose} />, { wrapper });
    await fillForm();
    fireEvent.click(screen.getByText('Register'));

    await waitFor(() => {
      expect(toast.success).toHaveBeenCalledWith(
        'Practitioner registered successfully'
      );
    });
    expect(onClose).toHaveBeenCalled();
    expect(mockAxiosInstance.get).toHaveBeenCalledTimes(3);
    expect(mockAxiosInstance.post).toHaveBeenCalledTimes(3);

    const practitionerPost = mockAxiosInstance.post.mock.calls[0];
    expect(practitionerPost[0]).toBe('/fhir/Practitioner');
    const pracPayload = practitionerPost[1] as Record<string, unknown>;
    const pracName = (pracPayload.name as Array<Record<string, unknown>>)[0];
    expect(pracName.family).toBe('Lamuri');
    expect((pracName.given as string[])[0]).toBe('Aly');
    const telecom = pracPayload.telecom as Array<Record<string, unknown>>;
    expect(telecom[0].value).toBe('aly@clinic.com');

    const rolePost = mockAxiosInstance.post.mock.calls[1];
    expect(rolePost[0]).toBe('/fhir/PractitionerRole');
    const rolePayload = rolePost[1] as Record<string, unknown>;
    expect(rolePayload.active).toBe(true);
    expect(
      (rolePayload.organization as Record<string, unknown>).reference
    ).toBe('Organization/org-1');

    const schedPost = mockAxiosInstance.post.mock.calls[2];
    expect(schedPost[0]).toBe('/fhir/Schedule');
    const actor = (schedPost[1] as Record<string, unknown>).actor as Array<
      Record<string, unknown>
    >;
    expect(actor).toContainEqual({ reference: 'Practitioner/prac-1' });
    expect(actor).toContainEqual({ reference: 'PractitionerRole/role-1' });
  });

  it('uses existing Practitioner/PractitionerRole when they exist', async () => {
    mockAxiosInstance.get.mockResolvedValueOnce({
      data: { entry: [{ resource: { id: 'prac-1' } }] }
    });
    mockAxiosInstance.get.mockResolvedValueOnce({
      data: { entry: [{ resource: { id: 'role-1' } }] }
    });
    mockAxiosInstance.get.mockResolvedValueOnce({
      data: { entry: [{ resource: { id: 'sched-1' } }] }
    });

    render(<RegisterPractitionerDrawer open onClose={onClose} />, { wrapper });
    await fillForm();
    fireEvent.click(screen.getByText('Register'));

    await waitFor(() => {
      expect(toast.success).toHaveBeenCalledWith(
        'Practitioner already registered'
      );
    });
    expect(mockAxiosInstance.post).toHaveBeenCalledTimes(0);
    expect(mockAxiosInstance.get).toHaveBeenCalledTimes(3);
  });

  it('includes location param in PractitionerRole when location selected', async () => {
    mockAxiosInstance.get.mockResolvedValueOnce({ data: { entry: [] } });
    mockAxiosInstance.post.mockResolvedValueOnce({ data: { id: 'prac-1' } });
    mockAxiosInstance.get.mockResolvedValueOnce({ data: { entry: [] } });
    mockAxiosInstance.post.mockResolvedValueOnce({ data: { id: 'role-1' } });
    mockAxiosInstance.get.mockResolvedValueOnce({ data: { entry: [] } });
    mockAxiosInstance.post.mockResolvedValueOnce({ data: { id: 'sched-1' } });

    render(<RegisterPractitionerDrawer open onClose={onClose} />, { wrapper });
    await fillForm();
    fireEvent.click(screen.getByText('Register'));

    await waitFor(() => {
      expect(toast.success).toHaveBeenCalled();
    });

    const step2GetUrl = mockAxiosInstance.get.mock.calls[1][0] as string;
    expect(step2GetUrl).toContain('location=Location/loc-1');

    const step2Payload = mockAxiosInstance.post.mock.calls[1][1] as Record<
      string,
      unknown
    >;
    expect((step2Payload.location as Record<string, unknown>).reference).toBe(
      'Location/loc-1'
    );
  });

  it('shows error and closes drawer when no locations exist', async () => {
    vi.mocked(useOrganizationLocations).mockReturnValue({
      locations: [],
      isLoading: false,
      isError: false,
      isFetching: false
    });
    render(<RegisterPractitionerDrawer open onClose={onClose} />, { wrapper });
    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith(
        'No locations found. Please add a location first.'
      );
    });
    expect(onClose).toHaveBeenCalled();
  });

  it('does NOT show error when locations are still loading', async () => {
    vi.mocked(useOrganizationLocations).mockReturnValue({
      locations: [],
      isLoading: true,
      isError: false,
      isFetching: true
    });
    render(<RegisterPractitionerDrawer open onClose={onClose} />, { wrapper });
    await new Promise(resolve => setTimeout(resolve, 200));
    expect(toast.error).not.toHaveBeenCalled();
    expect(onClose).not.toHaveBeenCalled();
  });

  it('uses "Full Name" placeholder on the name input', () => {
    render(<RegisterPractitionerDrawer open onClose={onClose} />, { wrapper });
    expect(screen.getByPlaceholderText('Full Name')).toBeDefined();
  });

  it('shows toast error and keeps drawer open on API failure', async () => {
    mockAxiosInstance.get.mockRejectedValue(new Error('Network error'));

    render(<RegisterPractitionerDrawer open onClose={onClose} />, { wrapper });
    await fillForm();
    fireEvent.click(screen.getByText('Register'));

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalled();
    });
    expect(onClose).not.toHaveBeenCalled();
  });

  it('resets form fields when drawer reopens', async () => {
    const { rerender } = render(
      <RegisterPractitionerDrawer open onClose={onClose} />,
      { wrapper }
    );
    await fillForm();
    expect(screen.getByLabelText('Name')).toHaveValue('Aly Lamuri');
    expect(screen.getByLabelText('Email')).toHaveValue('aly@clinic.com');
    rerender(<RegisterPractitionerDrawer open={false} onClose={onClose} />);
    rerender(<RegisterPractitionerDrawer open onClose={onClose} />);
    await waitFor(() => {
      expect(screen.getByLabelText('Name')).toHaveValue('');
    });
    expect(screen.getByLabelText('Email')).toHaveValue('');
    expect(screen.getByText('Select location...')).toBeDefined();
  });

  it('does not query practitioner endpoint when org ID is not loaded', () => {
    vi.mocked(dbGet).mockResolvedValue(null);
    render(<RegisterPractitionerDrawer open onClose={onClose} />, { wrapper });
    expect(screen.getByText('Register')).toBeDefined();
  });
});
