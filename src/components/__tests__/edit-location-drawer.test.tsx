import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { type AxiosInstance } from 'axios';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import EditLocationDrawer from '../clinic/edit-location-drawer';

vi.mock('@/services/api', () => ({
  getAPI: vi.fn()
}));

vi.mock('@/services/api/cities', () => ({
  useGetProvinces: () => ({ data: [], isLoading: false }),
  useGetCities: () => ({ data: [], isLoading: false }),
  useGetDistricts: () => ({ data: [], isLoading: false })
}));

vi.mock('react-toastify', () => ({
  toast: { success: vi.fn(), error: vi.fn() }
}));

import { getAPI } from '@/services/api';

const mockAxiosInstance = { get: vi.fn(), put: vi.fn() };

const baseLocation = {
  resourceType: 'Location' as const,
  id: 'loc-1',
  status: 'active' as const,
  name: 'Cabang Klinik 1',
  address: {
    line: ['Jl. Simpang Lima No. 3'],
    city: 'Kabupaten Simeulue',
    district: 'Simeulue Timur',
    state: 'Aceh'
  },
  position: {
    longitude: 105,
    latitude: -6.3
  },
  managingOrganization: {
    reference: 'Organization/org-1'
  },
  hoursOfOperation: [
    {
      daysOfWeek: ['mon' as const, 'tue' as const],
      openingTime: '08:00:00',
      closingTime: '18:00:00'
    }
  ]
};

describe('EditLocationDrawer', () => {
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
  });

  afterEach(() => {
    queryClient.clear();
  });

  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );

  it('shows loading state initially', () => {
    mockAxiosInstance.get.mockReturnValue(
      new Promise(() => {
        /* never resolves */
      })
    );

    render(<EditLocationDrawer locationId='loc-1' onClose={onClose} />, {
      wrapper
    });

    expect(screen.getByText('Loading...')).toBeInTheDocument();
  });

  it('renders form fields after data loads', async () => {
    mockAxiosInstance.get.mockResolvedValue({ data: baseLocation });

    render(<EditLocationDrawer locationId='loc-1' onClose={onClose} />, {
      wrapper
    });

    await waitFor(() => {
      expect(screen.getByText('Edit Location')).toBeInTheDocument();
    });

    expect(screen.getByLabelText('Location Name')).toBeInTheDocument();
    expect(screen.getByLabelText('Address')).toBeInTheDocument();
    expect(screen.getByLabelText('Longitude')).toBeInTheDocument();
    expect(screen.getByLabelText('Latitude')).toBeInTheDocument();
    expect(screen.getByText('Open')).toBeInTheDocument();
    expect(screen.getByText('Closed')).toBeInTheDocument();
  });

  it('pre-fills form fields from fetched location', async () => {
    mockAxiosInstance.get.mockResolvedValue({ data: baseLocation });

    render(<EditLocationDrawer locationId='loc-1' onClose={onClose} />, {
      wrapper
    });

    await waitFor(() => {
      const nameInput = screen.getByLabelText('Location Name');
      expect(nameInput.value).toBe('Cabang Klinik 1');
    });

    expect(screen.getByLabelText('Address').value).toBe(
      'Jl. Simpang Lima No. 3'
    );

    expect(screen.getByLabelText('Longitude').value).toBe('105');
    expect(screen.getByLabelText('Latitude').value).toBe('-6.3');

    // Status should match
    expect(screen.getByText('Open')).toHaveClass('bg-secondary');
  });

  it('pre-fills hours of operation', async () => {
    mockAxiosInstance.get.mockResolvedValue({ data: baseLocation });

    render(<EditLocationDrawer locationId='loc-1' onClose={onClose} />, {
      wrapper
    });

    await waitFor(() => {
      // Monday and Tuesday have hours set
      expect(screen.getByDisplayValue('08:00')).toBeInTheDocument();
      expect(screen.getByDisplayValue('18:00')).toBeInTheDocument();
    });
  });

  it('fetches full Location resource (no _elements filter)', async () => {
    mockAxiosInstance.get.mockResolvedValue({ data: baseLocation });

    render(<EditLocationDrawer locationId='loc-1' onClose={onClose} />, {
      wrapper
    });

    await waitFor(() => {
      expect(mockAxiosInstance.get).toHaveBeenCalled();
    });

    const getUrl = mockAxiosInstance.get.mock.calls[0][0] as string;
    // Should NOT contain _elements filter
    expect(getUrl).not.toContain('_elements');
    expect(getUrl).toBe('/fhir/Location/loc-1');
  });

  it('has save button disabled when required fields are empty', async () => {
    // Return a location with empty fields for edge case
    const emptyLocation = {
      ...baseLocation,
      name: '',
      position: { longitude: 0, latitude: 0 }
    };
    mockAxiosInstance.get.mockResolvedValue({ data: emptyLocation });

    render(<EditLocationDrawer locationId='loc-1' onClose={onClose} />, {
      wrapper
    });

    await waitFor(() => {
      expect(screen.getByText('Edit Location')).toBeInTheDocument();
    });

    const saveBtn = screen.getByRole('button', { name: 'Save' });
    expect(saveBtn).toBeDisabled();
  });

  it('has save button enabled when required fields are filled', async () => {
    mockAxiosInstance.get.mockResolvedValue({ data: baseLocation });

    render(<EditLocationDrawer locationId='loc-1' onClose={onClose} />, {
      wrapper
    });

    await waitFor(() => {
      expect(screen.getByText('Edit Location')).toBeInTheDocument();
    });

    const saveBtn = screen.getByRole('button', { name: 'Save' });
    expect(saveBtn).toBeEnabled();
  });

  it('submits PUT with full Location resource', async () => {
    mockAxiosInstance.get.mockResolvedValue({ data: baseLocation });
    mockAxiosInstance.put.mockResolvedValue({ data: {} });

    render(<EditLocationDrawer locationId='loc-1' onClose={onClose} />, {
      wrapper
    });

    await waitFor(() => {
      expect(screen.getByText('Edit Location')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: 'Save' }));

    await waitFor(() => {
      expect(mockAxiosInstance.put).toHaveBeenCalled();
    });

    const putUrl = mockAxiosInstance.put.mock.calls[0][0] as string;
    expect(putUrl).toBe('/fhir/Location/loc-1');

    const payload = mockAxiosInstance.put.mock.calls[0][1] as Record<
      string,
      unknown
    >;
    expect(payload.resourceType).toBe('Location');
    expect(payload.id).toBe('loc-1');
    expect(payload.name).toBe('Cabang Klinik 1');
    expect(payload.status).toBe('active');

    const address = payload.address as Record<string, unknown>;
    expect(address.line).toEqual(['Jl. Simpang Lima No. 3']);
    expect(address.city).toBe('Kabupaten Simeulue');

    const position = payload.position as Record<string, unknown>;
    expect(position.longitude).toBe(105);
    expect(position.latitude).toBe(-6.3);
  });

  it('calls onClose after successful submit', async () => {
    mockAxiosInstance.get.mockResolvedValue({ data: baseLocation });
    mockAxiosInstance.put.mockResolvedValue({ data: {} });

    render(<EditLocationDrawer locationId='loc-1' onClose={onClose} />, {
      wrapper
    });

    await waitFor(() => {
      expect(screen.getByText('Edit Location')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: 'Save' }));

    await waitFor(() => {
      expect(onClose).toHaveBeenCalled();
    });
  });

  it('calls onClose when cancel is clicked', async () => {
    mockAxiosInstance.get.mockResolvedValue({ data: baseLocation });

    render(<EditLocationDrawer locationId='loc-1' onClose={onClose} />, {
      wrapper
    });

    await waitFor(() => {
      expect(screen.getByText('Edit Location')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Cancel'));
    expect(onClose).toHaveBeenCalled();
  });
});
