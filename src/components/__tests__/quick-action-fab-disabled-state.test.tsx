import { FabProvider, useFab } from '@/context/fabContext';
import {
  RecommendationProvider,
  useRecommendationResult
} from '@/context/recommendationContext';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import QuickActionFab from '../quick-action-fab';

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: false } }
});

vi.mock('../screening-drawer', () => ({
  // skipcq: JS-0357 — vi.hoisted defines MockScreeningDrawer before mock factories execute
  default: MockScreeningDrawer
}));
const mockRole = 'Patient';
let disabledOnSave: () => void;
let enabledOnSave: () => void;

vi.mock('@/context/auth/authContext', () => ({
  useAuth: () => ({ state: { userInfo: { role_name: mockRole } } })
}));
vi.mock('next/navigation', () => ({ useRouter: () => ({ push: vi.fn() }) }));
vi.mock('@/lib/indexeddb', () => ({
  STORES: { uiPreferences: 'ui_preferences' },
  dbGet: vi.fn().mockResolvedValue(null)
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
          data-testid='trigger-action-disabled'
          onClick={() =>
            dispatch({
              type: 'SET_ACTION',
              config: {
                label: 'Submit',
                onAction: disabledOnSave,
                disabled: true,
                variant: 'primary'
              }
            })
          }
        >
          Make Action Disabled
        </button>
        <button
          data-testid='trigger-action-enabled'
          onClick={() =>
            dispatch({
              type: 'SET_ACTION',
              config: {
                label: 'Submit',
                onAction: enabledOnSave,
                disabled: false,
                variant: 'primary'
              }
            })
          }
        >
          Make Action Enabled
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

function getFabButton(container: HTMLElement): HTMLButtonElement | undefined {
  const buttons = container.querySelectorAll<HTMLButtonElement>(
    'button[class*="rounded-full"]'
  );
  return buttons.item(buttons.length - 1) ?? undefined;
}

describe('QuickActionFab disabled action state', () => {
  beforeEach(() => {
    disabledOnSave = vi.fn();
    enabledOnSave = vi.fn();
  });

  it('applies greyed-out styling to action pill when disabled=true', () => {
    const { container } = renderFab();
    fireEvent.click(screen.getByTestId('trigger-action-disabled'));
    const fabButton = getFabButton(container);
    expect(fabButton.className).toContain('bg-gray-300');
    expect(fabButton.className).toContain('text-gray-500');
    expect(fabButton.className).toContain('cursor-not-allowed');
    expect(fabButton.disabled).toBe(true);
  });

  it('does not call onAction when action pill is disabled and clicked', () => {
    const { container } = renderFab();
    fireEvent.click(screen.getByTestId('trigger-action-disabled'));
    fireEvent.click(getFabButton(container));
    expect(disabledOnSave).not.toHaveBeenCalled();
  });

  it('calls onAction when action pill is enabled and clicked', () => {
    const { container } = renderFab();
    fireEvent.click(screen.getByTestId('trigger-action-enabled'));
    fireEvent.click(getFabButton(container));
    expect(enabledOnSave).toHaveBeenCalledTimes(1);
  });
});
