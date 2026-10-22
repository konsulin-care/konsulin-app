import { vi } from 'vitest';

/**
 * Auth context mock for research form tests: researcher user with a stable
 * fhirId used as the localStorage key prefix. Consume via
 * `vi.mock('@/context/auth/authContext', async () => (await import('@/__tests__/mocks/research-form')).researcherAuthMock)`.
 */
export const researcherAuthMock = {
  useAuth: () => ({
    state: {
      userInfo: {
        fhirId: 'test-practitioner-id',
        role_name: 'Researcher'
      }
    },
    isLoading: false
  })
};

/**
 * Router mock for research form tests: `useRouter` returning fresh
 * push/replace spies. Consume via
 * `vi.mock('next/navigation', async () => (await import('@/__tests__/mocks/research-form')).researchRouterMock)` —
 * spread it and add page-specific `usePathname`/`useSearchParams` when needed.
 */
export const researchRouterMock = {
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() })
};

/** Module shape returned by the PHQ-2 API mock factory. */
interface ResearchApiMockModule {
  getAPI: () => Promise<{
    get: ReturnType<typeof vi.fn>;
    post: ReturnType<typeof vi.fn>;
  }>;
}

/**
 * Shared vi.mock factory for the `@/services/api` module in research form
 * tests: `get` resolves the PHQ-2 questionnaire entry, `post` resolves a
 * new-id payload. Consume via
 * `vi.mock('@/services/api', async () => (await import('@/__tests__/mocks/research-form')).researchApiMockFactory())`.
 *
 * @returns Mocked API module exposing `getAPI`.
 */
export function researchApiMockFactory(): ResearchApiMockModule {
  return {
    getAPI: () =>
      Promise.resolve({
        get: vi.fn().mockResolvedValue({
          data: {
            entry: [
              { resource: { id: 'phq2', title: 'PHQ-2', status: 'active' } }
            ]
          }
        }),
        post: vi.fn().mockResolvedValue({ data: { id: 'new-id' } })
      })
  };
}
