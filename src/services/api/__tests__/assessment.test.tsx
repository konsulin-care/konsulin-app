import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useOngoingResearch } from '../assessment';

// Mock the API module
vi.mock('@/services/api', async () => {
  const actual = await vi.importActual<any>('@/services/api');
  return {
    ...actual,
    getAPI: vi.fn()
  };
});

// Type assertion for mock API
const mockAxiosInstance = {
  get: vi.fn(),
  post: vi.fn(),
  put: vi.fn(),
  delete: vi.fn(),
  patch: vi.fn(),
  request: vi.fn(),
  defaults: {},
  interceptors: {
    request: { use: vi.fn(), eject: vi.fn(), clear: vi.fn() },
    response: { use: vi.fn(), eject: vi.fn(), clear: vi.fn() }
  },
  getUri: vi.fn(),
  create: vi.fn()
} as any;

describe('useOngoingResearch', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: {
          retry: false
        }
      }
    });
    vi.clearAllMocks();
  });

  afterEach(() => {
    queryClient.clear();
  });

  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );

  it('should return ongoing research studies when they exist', async () => {
    const { getAPI } = await import('@/services/api');

    vi.mocked(getAPI).mockResolvedValue(mockAxiosInstance);

    // Mock response with ongoing research (start date >= today)
    const today = new Date().toISOString().split('T')[0];
    mockAxiosInstance.get.mockResolvedValue({
      data: {
        entry: [
          {
            resource: {
              resourceType: 'ResearchStudy',
              id: 'study-1',
              title: 'Ongoing Study',
              description: 'A study that is currently ongoing',
              status: 'active',
              period: {
                start: today,
                end: new Date(
                  Date.now() + 30 * 24 * 60 * 60 * 1000
                ).toISOString()
              },
              protocol: [
                {
                  reference: 'PlanDefinition/plan-1'
                }
              ]
            }
          },
          {
            resource: {
              resourceType: 'PlanDefinition',
              id: 'plan-1',
              action: [
                {
                  definitionCanonical: 'Questionnaire/questionnaire-1'
                }
              ]
            }
          }
        ]
      }
    });

    const { result } = renderHook(() => useOngoingResearch(), { wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data).toEqual([
      {
        resource: {
          resourceType: 'ResearchStudy',
          id: 'study-1',
          title: 'Ongoing Study',
          description: 'A study that is currently ongoing',
          status: 'active',
          period: {
            start: today,
            end: expect.any(String)
          },
          protocol: [
            {
              reference: 'PlanDefinition/plan-1'
            }
          ]
        },
        questionnaireIds: ['questionnaire-1']
      }
    ]);

    // Should only make one API call (no fallback)
    expect(mockAxiosInstance.get).toHaveBeenCalledTimes(1);
    expect(mockAxiosInstance.get).toHaveBeenCalledWith(
      expect.stringContaining('date=ge')
    );
  });

  it('should return upcoming research studies when no ongoing studies exist', async () => {
    const { getAPI } = await import('@/services/api');

    vi.mocked(getAPI).mockResolvedValue(mockAxiosInstance);

    // Mock response with upcoming research (start date in the future)
    const futureDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
      .toISOString()
      .split('T')[0];
    mockAxiosInstance.get.mockResolvedValue({
      data: {
        entry: [
          {
            resource: {
              resourceType: 'ResearchStudy',
              id: 'study-2',
              title: 'Upcoming Study',
              description: 'A study that will start soon',
              status: 'active',
              period: {
                start: futureDate,
                end: new Date(
                  Date.now() + 37 * 24 * 60 * 60 * 1000
                ).toISOString()
              }
            }
          }
        ]
      }
    });

    const { result } = renderHook(() => useOngoingResearch(), { wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data).toHaveLength(1);
    expect(result.current.data[0].resource.title).toBe('Upcoming Study');

    // Should only make one API call (no fallback)
    expect(mockAxiosInstance.get).toHaveBeenCalledTimes(1);
  });

  it('should return empty array when no research studies exist', async () => {
    const { getAPI } = await import('@/services/api');

    vi.mocked(getAPI).mockResolvedValue(mockAxiosInstance);

    // Mock response with no research studies
    mockAxiosInstance.get.mockResolvedValue({
      data: {
        entry: []
      }
    });

    const { result } = renderHook(() => useOngoingResearch(), { wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data).toEqual([]);

    // Should only make one API call (no fallback)
    expect(mockAxiosInstance.get).toHaveBeenCalledTimes(1);
  });

  it('should not fall back to previous survey periods', async () => {
    const { getAPI } = await import('@/services/api');

    vi.mocked(getAPI).mockResolvedValue(mockAxiosInstance);

    // Mock response with no ongoing studies
    mockAxiosInstance.get.mockResolvedValue({
      data: {
        entry: []
      }
    });

    const { result } = renderHook(() => useOngoingResearch(), { wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data).toEqual([]);

    // Should only make one API call to get current studies
    // Should NOT make a second call without date filter
    expect(mockAxiosInstance.get).toHaveBeenCalledTimes(1);
    expect(mockAxiosInstance.get).toHaveBeenCalledWith(
      expect.stringContaining('date=ge')
    );
  });

  it('should handle multiple research studies correctly', async () => {
    const { getAPI } = await import('@/services/api');

    vi.mocked(getAPI).mockResolvedValue(mockAxiosInstance);

    // Mock response with multiple research studies
    const today = new Date().toISOString().split('T')[0];
    mockAxiosInstance.get.mockResolvedValue({
      data: {
        entry: [
          {
            resource: {
              resourceType: 'ResearchStudy',
              id: 'study-1',
              title: 'Study 1',
              status: 'active',
              period: { start: today },
              protocol: [{ reference: 'PlanDefinition/plan-1' }]
            }
          },
          {
            resource: {
              resourceType: 'PlanDefinition',
              id: 'plan-1',
              action: [
                {
                  definitionCanonical: 'Questionnaire/q1'
                }
              ]
            }
          },
          {
            resource: {
              resourceType: 'ResearchStudy',
              id: 'study-2',
              title: 'Study 2',
              status: 'active',
              period: { start: today },
              protocol: [{ reference: 'PlanDefinition/plan-2' }]
            }
          },
          {
            resource: {
              resourceType: 'PlanDefinition',
              id: 'plan-2',
              action: [
                {
                  definitionCanonical: 'Questionnaire/q2'
                }
              ]
            }
          }
        ]
      }
    });

    const { result } = renderHook(() => useOngoingResearch(), { wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data).toHaveLength(2);
    expect(result.current.data[0].resource.title).toBe('Study 1');
    expect(result.current.data[1].resource.title).toBe('Study 2');
  });

  it('should handle research studies with no questionnaires', async () => {
    const { getAPI } = await import('@/services/api');

    vi.mocked(getAPI).mockResolvedValue(mockAxiosInstance);

    // Mock response with research study but no questionnaires
    const today = new Date().toISOString().split('T')[0];
    mockAxiosInstance.get.mockResolvedValue({
      data: {
        entry: [
          {
            resource: {
              resourceType: 'ResearchStudy',
              id: 'study-1',
              title: 'Study Without Questionnaire',
              status: 'active',
              period: { start: today }
            }
          }
        ]
      }
    });

    const { result } = renderHook(() => useOngoingResearch(), { wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data).toHaveLength(1);
    expect(result.current.data[0].questionnaireIds).toEqual([]);
  });
});
