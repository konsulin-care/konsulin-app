import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { type AxiosInstance } from 'axios';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import AddLocationDrawer from '../add-location-drawer';

vi.mock('@/lib/indexeddb', () => ({
  STORES: { uiPreferences: 'ui_preferences' },
  dbGet: vi.fn()
}));

vi.mock('@/services/api', () => ({
  getAPI: vi.fn()
}));

vi.mock('react-toastify', () => ({
  toast: { success: vi.fn(), error: vi.fn() }
}));

import { dbGet } from '@/lib/indexeddb';
import { getAPI } from '@/services/api';
import { toast } from 'react-toastify';

const mockAxiosInstance = { post: vi.fn() };

describe('AddLocationDrawer', () => {
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
    render(<AddLocationDrawer open onClose={onClose} />, { wrapper });

    expect(screen.getAllByText('Add Location').length).toBeGreaterThan(0);
    expect(screen.getByLabelText('Location Name')).toBeDefined();
    expect(screen.getByLabelText('Longitude')).toBeDefined();
    expect(screen.getByLabelText('Latitude')).toBeDefined();
    expect(screen.getByRole('button', { name: 'Add Location' })).toBeDefined();
  });

  it('has submit button disabled when inputs are empty', () => {
    render(<AddLocationDrawer open onClose={onClose} />, { wrapper });

    const submitBtn = screen.getByRole('button', { name: 'Add Location' });
    expect(submitBtn).toBeDisabled();
  });

  it('has submit button disabled when inputs are not valid numbers', () => {
    render(<AddLocationDrawer open onClose={onClose} />, { wrapper });

    fireEvent.change(screen.getByLabelText('Longitude'), {
      target: { value: 'abc' }
    });
    fireEvent.change(screen.getByLabelText('Latitude'), {
      target: { value: 'def' }
    });

    const submitBtn = screen.getByRole('button', { name: 'Add Location' });
    expect(submitBtn).toBeDisabled();
  });

  it('has submit button enabled when all fields are valid', () => {
    render(<AddLocationDrawer open onClose={onClose} />, { wrapper });

    fireEvent.change(screen.getByLabelText('Location Name'), {
      target: { value: 'Main Clinic' }
    });
    fireEvent.change(screen.getByLabelText('Longitude'), {
      target: { value: '106.846' }
    });
    fireEvent.change(screen.getByLabelText('Latitude'), {
      target: { value: '-6.305' }
    });

    const submitBtn = screen.getByRole('button', { name: 'Add Location' });
    expect(submitBtn).toBeEnabled();
  });

  it('has submit button disabled when name is empty but coords are valid', () => {
    render(<AddLocationDrawer open onClose={onClose} />, { wrapper });

    fireEvent.change(screen.getByLabelText('Longitude'), {
      target: { value: '106.846' }
    });
    fireEvent.change(screen.getByLabelText('Latitude'), {
      target: { value: '-6.305' }
    });

    const submitBtn = screen.getByRole('button', { name: 'Add Location' });
    expect(submitBtn).toBeDisabled();
  });

  it('has submit button disabled when name exceeds 30 characters', () => {
    render(<AddLocationDrawer open onClose={onClose} />, { wrapper });

    fireEvent.change(screen.getByLabelText('Location Name'), {
      target: { value: 'A very long location name that exceeds the limit' }
    });
    fireEvent.change(screen.getByLabelText('Longitude'), {
      target: { value: '106.846' }
    });
    fireEvent.change(screen.getByLabelText('Latitude'), {
      target: { value: '-6.305' }
    });

    const submitBtn = screen.getByRole('button', { name: 'Add Location' });
    expect(submitBtn).toBeDisabled();
  });

  it('has submit button disabled when name contains special characters', () => {
    render(<AddLocationDrawer open onClose={onClose} />, { wrapper });

    fireEvent.change(screen.getByLabelText('Location Name'), {
      target: { value: 'Clinic#1!' }
    });
    fireEvent.change(screen.getByLabelText('Longitude'), {
      target: { value: '106.846' }
    });
    fireEvent.change(screen.getByLabelText('Latitude'), {
      target: { value: '-6.305' }
    });

    const submitBtn = screen.getByRole('button', { name: 'Add Location' });
    expect(submitBtn).toBeDisabled();
  });

  it('calls onClose when Cancel is clicked', () => {
    render(<AddLocationDrawer open onClose={onClose} />, { wrapper });

    fireEvent.click(screen.getByText('Cancel'));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('posts Location resource on submit', async () => {
    mockAxiosInstance.post.mockResolvedValue({ data: { id: 'loc-1' } });

    render(<AddLocationDrawer open onClose={onClose} />, { wrapper });

    fireEvent.change(screen.getByLabelText('Location Name'), {
      target: { value: 'Main Clinic' }
    });
    fireEvent.change(screen.getByLabelText('Longitude'), {
      target: { value: '106.846' }
    });
    fireEvent.change(screen.getByLabelText('Latitude'), {
      target: { value: '-6.305' }
    });

    fireEvent.click(screen.getByRole('button', { name: 'Add Location' }));

    await waitFor(() => {
      expect(toast.success).toHaveBeenCalledWith('Location added successfully');
    });

    expect(onClose).toHaveBeenCalled();

    const postCall = mockAxiosInstance.post.mock.calls[0];
    expect(postCall[0]).toBe('/fhir/Location');

    const payload = postCall[1] as Record<string, unknown>;
    expect(payload.resourceType).toBe('Location');
    expect(payload.name).toBe('Main Clinic');

    const position = payload.position as Record<string, unknown>;
    expect(position.longitude).toBe(106.846);
    expect(position.latitude).toBe(-6.305);

    const org = payload.managingOrganization as Record<string, unknown>;
    expect(org.reference).toBe('Organization/org-1');
  });

  it('shows toast error on API failure', async () => {
    mockAxiosInstance.post.mockRejectedValue(new Error('API error'));

    render(<AddLocationDrawer open onClose={onClose} />, { wrapper });

    fireEvent.change(screen.getByLabelText('Location Name'), {
      target: { value: 'Main Clinic' }
    });
    fireEvent.change(screen.getByLabelText('Longitude'), {
      target: { value: '106.846' }
    });
    fireEvent.change(screen.getByLabelText('Latitude'), {
      target: { value: '-6.305' }
    });

    fireEvent.click(screen.getByRole('button', { name: 'Add Location' }));

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalled();
    });

    expect(onClose).not.toHaveBeenCalled();
  });
});
