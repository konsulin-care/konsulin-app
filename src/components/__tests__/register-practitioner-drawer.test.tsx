import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { type AxiosInstance } from 'axios';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import RegisterPractitionerDrawer from '../register-practitioner-drawer';

vi.mock('@/lib/indexeddb', () => ({
  STORES: { uiPreferences: 'ui_preferences' },
  dbGet: vi.fn()
}));

vi.mock('@/services/api', () => ({
  getAPI: vi.fn()
}));

vi.mock('@/services/clinic', () => ({
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
import { useOrganizationLocations } from '@/services/clinic';
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
    // Default: clinic org set
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

  it('renders form fields when open', () => {
    render(<RegisterPractitionerDrawer open onClose={onClose} />, { wrapper });

    expect(screen.getByText('Register Practitioner')).toBeDefined();
    expect(screen.getByLabelText('Name')).toBeDefined();
    expect(screen.getByLabelText('Email')).toBeDefined();
    expect(screen.getByText('Register')).toBeDefined();
    expect(screen.getByText('Cancel')).toBeDefined();
  });

  it('renders location combobox when locations are available', async () => {
    render(<RegisterPractitionerDrawer open onClose={onClose} />, { wrapper });

    await waitFor(() => {
      expect(screen.getByText('Select location...')).toBeDefined();
    });
  });

  it('has Register button disabled when name and email are empty', () => {
    render(<RegisterPractitionerDrawer open onClose={onClose} />, { wrapper });

    const registerBtn = screen.getByText('Register').closest('button');
    expect(registerBtn).toBeDisabled();
  });

  it('has Register button disabled when only name is filled', () => {
    render(<RegisterPractitionerDrawer open onClose={onClose} />, { wrapper });

    fireEvent.change(screen.getByLabelText('Name'), {
      target: { value: 'Aly Lamuri' }
    });

    const registerBtn = screen.getByText('Register').closest('button');
    expect(registerBtn).toBeDisabled();
  });

  it('has Register button disabled when name and email are filled but no location selected', () => {
    render(<RegisterPractitionerDrawer open onClose={onClose} />, { wrapper });

    fireEvent.change(screen.getByLabelText('Name'), {
      target: { value: 'Aly Lamuri' }
    });
    fireEvent.change(screen.getByLabelText('Email'), {
      target: { value: 'aly@clinic.com' }
    });

    const registerBtn = screen.getByText('Register').closest('button');
    expect(registerBtn).toBeDisabled();
  });

  it('has Register button enabled when name, email, and location are filled', async () => {
    render(<RegisterPractitionerDrawer open onClose={onClose} />, { wrapper });

    fireEvent.change(screen.getByLabelText('Name'), {
      target: { value: 'Aly Lamuri' }
    });
    fireEvent.change(screen.getByLabelText('Email'), {
      target: { value: 'aly@clinic.com' }
    });

    // Open location combobox and select first option
    fireEvent.click(screen.getByText('Select location...'));
    await waitFor(() => {
      expect(screen.getByText('Main Clinic')).toBeDefined();
    });
    fireEvent.click(screen.getByText('Main Clinic'));

    const registerBtn = screen.getByText('Register').closest('button');
    expect(registerBtn).toBeEnabled();
  });

  it('calls onClose when Cancel is clicked', () => {
    render(<RegisterPractitionerDrawer open onClose={onClose} />, { wrapper });

    fireEvent.click(screen.getByText('Cancel'));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('performs full FHIR pipeline on successful registration', async () => {
    // Step 1: GET Practitioner by email → no existing
    mockAxiosInstance.get.mockResolvedValueOnce({
      data: { entry: [] }
    });
    // Step 1: POST Practitioner → returns ID
    mockAxiosInstance.post.mockResolvedValueOnce({
      data: { id: 'prac-1' }
    });
    // Step 2: GET PractitionerRole → no existing
    mockAxiosInstance.get.mockResolvedValueOnce({
      data: { entry: [] }
    });
    // Step 2: POST PractitionerRole → returns ID
    mockAxiosInstance.post.mockResolvedValueOnce({
      data: { id: 'role-1' }
    });
    // Step 3: GET Schedule → no existing
    mockAxiosInstance.get.mockResolvedValueOnce({
      data: { entry: [] }
    });
    // Step 3: POST Schedule → returns ID
    mockAxiosInstance.post.mockResolvedValueOnce({
      data: { id: 'sched-1' }
    });
    // Step 4: POST magic link
    mockAxiosInstance.post.mockResolvedValueOnce({ data: { ok: true } });

    render(<RegisterPractitionerDrawer open onClose={onClose} />, { wrapper });

    fireEvent.change(screen.getByLabelText('Name'), {
      target: { value: 'Aly Lamuri' }
    });
    fireEvent.change(screen.getByLabelText('Email'), {
      target: { value: 'aly@clinic.com' }
    });

    // Select location
    fireEvent.click(screen.getByText('Select location...'));
    await waitFor(() => {
      expect(screen.getByText('Main Clinic')).toBeDefined();
    });
    fireEvent.click(screen.getByText('Main Clinic'));

    fireEvent.click(screen.getByText('Register'));

    await waitFor(() => {
      expect(toast.success).toHaveBeenCalledWith(
        'Practitioner registered successfully'
      );
    });

    expect(onClose).toHaveBeenCalled();
    expect(mockAxiosInstance.get).toHaveBeenCalledTimes(3);
    expect(mockAxiosInstance.post).toHaveBeenCalledTimes(4);

    // Verify POST to Practitioner included name and email
    const practitionerPost = mockAxiosInstance.post.mock.calls[0];
    expect(practitionerPost[0]).toBe('/fhir/Practitioner');

    const pracPayload = practitionerPost[1] as Record<string, unknown>;
    expect(pracPayload.active).toBe(true);

    const pracName = (pracPayload.name as Array<Record<string, unknown>>)[0];
    expect(pracName.family).toBe('Lamuri');

    const given = pracName.given as string[];
    expect(given[0]).toBe('Aly');

    const telecom = pracPayload.telecom as Array<Record<string, unknown>>;
    expect(telecom[0].value).toBe('aly@clinic.com');

    // Verify POST to PractitionerRole included organization and active:false
    const rolePost = mockAxiosInstance.post.mock.calls[1];
    expect(rolePost[0]).toBe('/fhir/PractitionerRole');

    const rolePayload = rolePost[1] as Record<string, unknown>;
    expect(rolePayload.active).toBe(false);

    const rolePrac = rolePayload.practitioner as Record<string, unknown>;
    expect(rolePrac.reference).toBe('Practitioner/prac-1');

    const roleOrg = rolePayload.organization as Record<string, unknown>;
    expect(roleOrg.reference).toBe('Organization/org-1');

    // Verify POST to Schedule included both actors
    const schedPost = mockAxiosInstance.post.mock.calls[2];
    expect(schedPost[0]).toBe('/fhir/Schedule');

    const schedPayload = schedPost[1] as Record<string, unknown>;
    const actor = schedPayload.actor as Array<Record<string, unknown>>;
    expect(actor).toContainEqual({ reference: 'Practitioner/prac-1' });
    expect(actor).toContainEqual({ reference: 'PractitionerRole/role-1' });

    // Verify POST to magic link
    const magicLinkPost = mockAxiosInstance.post.mock.calls[3];
    expect(magicLinkPost[0]).toBe('/api/v1/auth/magiclink');
    expect(magicLinkPost[1]).toEqual({
      email: 'aly@clinic.com',
      roles: ['Practitioner', 'Patient']
    });
  });

  it('uses existing Practitioner and PractitionerRole when they exist', async () => {
    // Step 1: GET Practitioner → found existing
    mockAxiosInstance.get.mockResolvedValueOnce({
      data: { entry: [{ resource: { id: 'prac-1' } }] }
    });
    // Step 2: GET PractitionerRole → found existing
    mockAxiosInstance.get.mockResolvedValueOnce({
      data: { entry: [{ resource: { id: 'role-1' } }] }
    });
    // Step 3: GET Schedule → found existing (skip)
    mockAxiosInstance.get.mockResolvedValueOnce({
      data: { entry: [{ resource: { id: 'sched-1' } }] }
    });
    // Step 4: POST magic link
    mockAxiosInstance.post.mockResolvedValueOnce({ data: { ok: true } });

    render(<RegisterPractitionerDrawer open onClose={onClose} />, { wrapper });

    fireEvent.change(screen.getByLabelText('Name'), {
      target: { value: 'Aly Lamuri' }
    });
    fireEvent.change(screen.getByLabelText('Email'), {
      target: { value: 'aly@clinic.com' }
    });

    // Select location
    fireEvent.click(screen.getByText('Select location...'));
    await waitFor(() => {
      expect(screen.getByText('Main Clinic')).toBeDefined();
    });
    fireEvent.click(screen.getByText('Main Clinic'));

    fireEvent.click(screen.getByText('Register'));

    await waitFor(() => {
      expect(toast.success).toHaveBeenCalledWith('Magic link sent');
    });

    // Should have made only the magic link POST
    expect(mockAxiosInstance.post).toHaveBeenCalledTimes(1);
    // Should have made 3 GET calls
    expect(mockAxiosInstance.get).toHaveBeenCalledTimes(3);

    // Verify POST to magic link
    const magicLinkPost = mockAxiosInstance.post.mock.calls[0];
    expect(magicLinkPost[0]).toBe('/api/v1/auth/magiclink');
    expect(magicLinkPost[1]).toEqual({
      email: 'aly@clinic.com',
      roles: ['Practitioner', 'Patient']
    });
  });

  it('includes location param in PractitionerRole when a location is selected', async () => {
    // Step 1: GET Practitioner → no existing
    mockAxiosInstance.get.mockResolvedValueOnce({ data: { entry: [] } });
    // Step 1: POST Practitioner
    mockAxiosInstance.post.mockResolvedValueOnce({ data: { id: 'prac-1' } });
    // Step 2: GET PractitionerRole with location → no existing
    mockAxiosInstance.get.mockResolvedValueOnce({ data: { entry: [] } });
    // Step 2: POST PractitionerRole with location
    mockAxiosInstance.post.mockResolvedValueOnce({ data: { id: 'role-1' } });
    // Step 3: GET Schedule → no existing
    mockAxiosInstance.get.mockResolvedValueOnce({ data: { entry: [] } });
    // Step 3: POST Schedule
    mockAxiosInstance.post.mockResolvedValueOnce({ data: { id: 'sched-1' } });
    // Step 4: POST magic link
    mockAxiosInstance.post.mockResolvedValueOnce({ data: { ok: true } });

    render(<RegisterPractitionerDrawer open onClose={onClose} />, { wrapper });

    fireEvent.change(screen.getByLabelText('Name'), {
      target: { value: 'Aly Lamuri' }
    });
    fireEvent.change(screen.getByLabelText('Email'), {
      target: { value: 'aly@clinic.com' }
    });

    // Select location
    fireEvent.click(screen.getByText('Select location...'));
    await waitFor(() => {
      expect(screen.getByText('Main Clinic')).toBeDefined();
    });
    fireEvent.click(screen.getByText('Main Clinic'));

    fireEvent.click(screen.getByText('Register'));

    await waitFor(() => {
      expect(toast.success).toHaveBeenCalled();
    });

    // Step 2 GET should include location parameter
    const step2GetUrl = mockAxiosInstance.get.mock.calls[1][0] as string;
    expect(step2GetUrl).toContain('location=Location/loc-1');

    // Step 2 POST should include location
    const step2Post = mockAxiosInstance.post.mock.calls[1];
    const step2Payload = step2Post[1] as Record<string, unknown>;
    const locRef = (step2Payload.location as Record<string, unknown>).reference;
    expect(locRef).toBe('Location/loc-1');
  });

  it('shows toast error and closes drawer when no locations exist', async () => {
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

  it('uses "Full Name" placeholder on the name input', () => {
    render(<RegisterPractitionerDrawer open onClose={onClose} />, { wrapper });

    expect(screen.getByPlaceholderText('Full Name')).toBeDefined();
  });

  it('shows toast error and keeps drawer open on API failure', async () => {
    mockAxiosInstance.get.mockRejectedValue(new Error('Network error'));

    render(<RegisterPractitionerDrawer open onClose={onClose} />, { wrapper });

    fireEvent.change(screen.getByLabelText('Name'), {
      target: { value: 'Aly Lamuri' }
    });
    fireEvent.change(screen.getByLabelText('Email'), {
      target: { value: 'aly@clinic.com' }
    });

    // Select location
    fireEvent.click(screen.getByText('Select location...'));
    await waitFor(() => {
      expect(screen.getByText('Main Clinic')).toBeDefined();
    });
    fireEvent.click(screen.getByText('Main Clinic'));

    fireEvent.click(screen.getByText('Register'));

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalled();
    });

    // Drawer should remain open
    expect(onClose).not.toHaveBeenCalled();
  });

  it('does not query practitioner endpoint when org ID is not loaded', () => {
    vi.mocked(dbGet).mockResolvedValue(null);

    render(<RegisterPractitionerDrawer open onClose={onClose} />, { wrapper });

    // Should not call useOrganizationLocations or make API calls
    expect(screen.getByText('Register')).toBeDefined();
  });
});
