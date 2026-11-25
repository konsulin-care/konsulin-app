import { FabProvider, useFab } from '@/context/fabContext';
import {
  RecommendationProvider,
  useRecommendationResult
} from '@/context/recommendationContext';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import QuickActionFab from '../quick-action-fab';

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: false } }
});

vi.mock('../screening-drawer', () => ({
  default: MockScreeningDrawer
}));
const mockRole = 'Patient';

vi.mock('@/context/auth/authContext', () => ({
  useAuth: () => ({ state: { userInfo: { role_name: mockRole } } })
}));
vi.mock('next/navigation', () => ({ useRouter: () => ({ push: vi.fn() }) }));
vi.mock('@/lib/indexeddb', () => ({
  STORES: { uiPreferences: 'ui_preferences' },
  dbGet: vi.fn().mockResolvedValue(null)
}));
vi.mock('@/i18n', () => ({
  useTranslations: vi.fn(
    () => (key: string, values?: Record<string, unknown>) => {
      const translations: Record<string, string> = {
        open_menu: 'Open menu',
        close_menu: 'Close menu',
        delete_count: 'Delete ({count})'
      };
      return (translations[key] ?? key).replace(
        '{count}',
        String(values?.count ?? '')
      );
    }
  )
}));
vi.mock('@/services/api', () => ({ getAPI: vi.fn() }));
vi.mock('react-toastify', () => ({
  toast: { success: vi.fn(), error: vi.fn() }
}));

const { MockScreeningDrawer } = vi.hoisted(() => ({
  MockScreeningDrawer: vi.fn(
    ({ open }: { open: boolean; onComplete?: (result: unknown) => void }) =>
      open ? <div data-testid='mock-screening-drawer' /> : null
  )
}));

vi.mock('@tanstack/react-query', async importOriginal => {
  const actual = await importOriginal<typeof import('@tanstack/react-query')>();
  return {
    ...actual,
    useQueryClient: vi.fn(() => ({
      invalidateQueries: vi.fn()
    }))
  };
});

/** Reads the recommendation context to keep the provider tree exercised. */
function RecommendationObserver() {
  const { result } = useRecommendationResult();
  return (
    <span data-testid='observed-result'>{result?.specialty ?? 'none'}</span>
  );
}

function TestHarness() {
  const { dispatch } = useFab();
  return (
    <QueryClientProvider client={queryClient}>
      <div>
        <QuickActionFab />
        <RecommendationObserver />
        <button
          data-testid='trigger-action'
          onClick={() =>
            dispatch({
              type: 'SET_ACTION',
              config: {
                label: 'Save Changes',
                onAction: vi.fn(),
                isSaving: false,
                variant: 'primary'
              }
            })
          }
        >
          Make Action
        </button>
        <button
          data-testid='trigger-selection'
          onClick={() =>
            dispatch({
              type: 'SET_SELECTION',
              config: {
                count: 2,
                onDelete: vi.fn(),
                onCancel: vi.fn()
              }
            })
          }
        >
          Select 2 Items
        </button>
      </div>
    </QueryClientProvider>
  );
}

function renderFab() {
  return render(
    <FabProvider>
      <RecommendationProvider>
        <TestHarness />
      </RecommendationProvider>
    </FabProvider>
  );
}

function getFixedContainers(container: HTMLElement): HTMLElement[] {
  return Array.from(container.querySelectorAll<HTMLElement>('div.fixed'));
}

describe('QuickActionFab responsive visibility', () => {
  it('keeps the idle toggle container mounted with md:hidden', () => {
    const { container } = renderFab();
    const fixedContainers = getFixedContainers(container);
    expect(fixedContainers.length).toBeGreaterThan(0);
    expect(
      fixedContainers.some(node => node.className.includes('md:hidden'))
    ).toBe(true);
  });

  it('adds md:hidden to the action mode container', () => {
    const { container } = renderFab();
    fireEvent.click(screen.getByTestId('trigger-action'));
    const fixedContainers = getFixedContainers(container);
    expect(fixedContainers.length).toBeGreaterThan(0);
    expect(
      fixedContainers.every(node => node.className.includes('md:hidden'))
    ).toBe(true);
  });

  it('adds md:hidden to the selection mode container', () => {
    const { container } = renderFab();
    fireEvent.click(screen.getByTestId('trigger-selection'));
    const fixedContainers = getFixedContainers(container);
    expect(fixedContainers.length).toBeGreaterThan(0);
    expect(
      fixedContainers.every(node => node.className.includes('md:hidden'))
    ).toBe(true);
  });
});
