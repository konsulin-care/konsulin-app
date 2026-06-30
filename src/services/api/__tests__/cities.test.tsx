import {
  useGetCities,
  useGetDistricts,
  useGetProvinces
} from '@/services/api/cities';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mockGet = vi.hoisted(() => vi.fn());

vi.mock('axios', () => ({
  default: {
    get: mockGet
  }
}));

const mockProvinces = [
  { id: '11', name: 'ACEH' },
  { id: '12', name: 'SUMATERA UTARA' },
  { id: '32', name: 'JAWA BARAT' }
];

const mockCities = [
  { id: '3204', name: 'KABUPATEN BANDUNG' },
  { id: '3205', name: 'KABUPATEN GARUT' }
];

const mockDistricts = [
  { id: '3204050', name: 'DAYEUHKOLOT' },
  { id: '3204060', name: 'BALEENDAH' }
];

function makeWrapper(queryClient: QueryClient) {
  // eslint-disable-next-line react/display-name
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}

describe('useGetProvinces', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } }
    });
    vi.clearAllMocks();
  });

  afterEach(() => {
    queryClient.clear();
  });

  it('maps API response id field to code when provinces load', async () => {
    mockGet.mockResolvedValue({ data: mockProvinces });

    const { result } = renderHook(() => useGetProvinces(), {
      wrapper: makeWrapper(queryClient)
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data).toHaveLength(3);
    expect(result.current.data?.[0]).toEqual({ code: '11', name: 'ACEH' });
    expect(result.current.data?.[1]).toEqual({
      code: '12',
      name: 'SUMATERA UTARA'
    });
    expect(result.current.data?.[2]).toEqual({
      code: '32',
      name: 'JAWA BARAT'
    });
  });

  it('returns empty array when API returns null', async () => {
    mockGet.mockResolvedValue({ data: null });

    const { result } = renderHook(() => useGetProvinces(), {
      wrapper: makeWrapper(queryClient)
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data).toEqual([]);
  });
});

describe('useGetCities', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } }
    });
    vi.clearAllMocks();
  });

  afterEach(() => {
    queryClient.clear();
  });

  it('maps API response id field to code when cities load', async () => {
    mockGet.mockResolvedValue({ data: mockCities });

    const { result } = renderHook(() => useGetCities(32), {
      wrapper: makeWrapper(queryClient)
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data).toHaveLength(2);
    expect(result.current.data?.[0]).toEqual({
      code: '3204',
      name: 'KABUPATEN BANDUNG'
    });
    expect(result.current.data?.[1]).toEqual({
      code: '3205',
      name: 'KABUPATEN GARUT'
    });
  });

  it('returns empty array when provinceCode is 0', async () => {
    const { result } = renderHook(() => useGetCities(0), {
      wrapper: makeWrapper(queryClient)
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data).toEqual([]);
    expect(mockGet).not.toHaveBeenCalled();
  });

  it('is disabled when provinceCode is undefined', () => {
    const { result } = renderHook(
      () => useGetCities(undefined as unknown as number),
      { wrapper: makeWrapper(queryClient) }
    );

    expect(result.current.isFetching).toBe(false);
  });
});

describe('useGetDistricts', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } }
    });
    vi.clearAllMocks();
  });

  afterEach(() => {
    queryClient.clear();
  });

  it('maps API response id field to code when districts load', async () => {
    mockGet.mockResolvedValue({ data: mockDistricts });

    const { result } = renderHook(() => useGetDistricts(3204), {
      wrapper: makeWrapper(queryClient)
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data).toHaveLength(2);
    expect(result.current.data?.[0]).toEqual({
      code: '3204050',
      name: 'DAYEUHKOLOT'
    });
    expect(result.current.data?.[1]).toEqual({
      code: '3204060',
      name: 'BALEENDAH'
    });
  });

  it('returns empty array when cityCode is 0', async () => {
    const { result } = renderHook(() => useGetDistricts(0), {
      wrapper: makeWrapper(queryClient)
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data).toEqual([]);
    expect(mockGet).not.toHaveBeenCalled();
  });
});
