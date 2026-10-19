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
