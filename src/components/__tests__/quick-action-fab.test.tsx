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
  // skipcq: JS-0357 — vi.hoisted defines MockScreeningDrawer before mock factories execute
  default: MockScreeningDrawer
}));
const mockRole = 'Patient';

vi.mock('@/context/auth/authContext', () => ({
  useAuth: () => ({ state: { userInfo: { role_name: mockRole } } })
}));
const mockPush = vi.fn();
vi.mock('next/navigation', () => ({ useRouter: () => ({ push: mockPush }) }));
vi.mock('@/lib/indexeddb', () => ({
  STORES: { uiPreferences: 'ui_preferences' },
  dbGet: vi.fn().mockResolvedValue(null)
}));
vi.mock('@/services/api', () => ({ getAPI: vi.fn() }));
vi.mock('react-toastify', () => ({
  toast: { success: vi.fn(), error: vi.fn() }
}));

const { mockInvalidateQueries, MockScreeningDrawer } = vi.hoisted(() => {
  const mockInvalidate = vi.fn();
  return {
    mockInvalidateQueries: mockInvalidate,
    MockScreeningDrawer: vi.fn(
      ({
        open,
        onComplete
      }: {
        open: boolean;
        onComplete?: (result: unknown) => void;
      }) =>
        open ? (
          <div
            data-testid='mock-screening-drawer'
            onClick={() =>
              onComplete?.({
                complaintId: 'anxiety',
                specialty: 'psychiatry'
              })
            }
          />
        ) : null
    )
  };
});

vi.mock('@tanstack/react-query', async importOriginal => {
  const actual = await importOriginal<typeof import('@tanstack/react-query')>();
  return {
    ...actual,
    useQueryClient: vi.fn(() => ({
      invalidateQueries: mockInvalidateQueries
    }))
  };
});

/** Reads the recommendation context to observe FAB-driven updates. */
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
          data-testid='clear-action'
          onClick={() => dispatch({ type: 'SET_ACTION', config: null })}
        >
          Clear Action
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
        <button
          data-testid='clear-selection'
          onClick={() => dispatch({ type: 'SET_SELECTION', config: null })}
        >
          Clear Selection
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

const MENU_ITEMS =
  /Self Checkup|Write Journal|View Schedule|Get Recommendation/;

describe('QuickActionFab', () => {
  it('renders as a circle with plus icon by default', () => {
    const { container } = renderFab();
    const fabButton = getFabButton(container);
    expect(fabButton.className).toMatch(/h-14.*w-14/);
    expect(fabButton).toHaveAttribute('type', 'button');
    expect(container.querySelector('.lucide-plus')).toBeTruthy();
  });

  it('has accessible label on collapsed button', () => {
    const { container } = renderFab();
    expect(getFabButton(container)).toHaveAttribute('aria-label', 'Open menu');
  });

  it('shows action mode button with label when SET_ACTION dispatched', () => {
    const { container } = renderFab();
    fireEvent.click(screen.getByTestId('trigger-action'));
    expect(getFabButton(container).textContent).toContain('Save Changes');
    expect(container.querySelector('.lucide-plus')).toBeFalsy();
  });

  it('reverts to circle after action state is cleared', () => {
    const { container } = renderFab();
    fireEvent.click(screen.getByTestId('trigger-action'));
    expect(getFabButton(container).textContent).toContain('Save Changes');
    fireEvent.click(screen.getByTestId('clear-action'));
    const fabButton = getFabButton(container);
    expect(fabButton.className).toMatch(/h-14.*w-14/);
    expect(container.querySelector('.lucide-plus')).toBeTruthy();
  });

  it('hides pills menu when action mode is active', () => {
    renderFab();
    const fabButton = document.querySelectorAll<HTMLButtonElement>(
      'button[class*="rounded-full"]'
    );
    fireEvent.click(fabButton.item(fabButton.length - 1));
    expect(screen.queryAllByText(MENU_ITEMS).length).toBeGreaterThan(0);
    fireEvent.click(screen.getByTestId('trigger-action'));
    expect(screen.queryAllByText(MENU_ITEMS)).toHaveLength(0);
  });

  it('opens the ScreeningDrawer from the Get Recommendation pill', () => {
    renderFab();
    const fabButton = document.querySelectorAll<HTMLButtonElement>(
      'button[class*="rounded-full"]'
    );
    fireEvent.click(fabButton.item(fabButton.length - 1));
    fireEvent.click(screen.getByText('Get Recommendation'));
    expect(screen.getByTestId('mock-screening-drawer')).toBeInTheDocument();
    expect(mockPush).not.toHaveBeenCalledWith('/screening');
  });

  it('invalidates recommendation queries when screening completes via FAB', () => {
    renderFab();
    const fabButton = document.querySelectorAll<HTMLButtonElement>(
      'button[class*="rounded-full"]'
    );
    fireEvent.click(fabButton.item(fabButton.length - 1));
    fireEvent.click(screen.getByText('Get Recommendation'));
    expect(screen.getByTestId('mock-screening-drawer')).toBeInTheDocument();

    fireEvent.click(screen.getByTestId('mock-screening-drawer'));

    expect(mockInvalidateQueries).toHaveBeenCalledWith({
      queryKey: ['recommendations']
    });
  });

  it('publishes the completed screening result to the recommendation context', () => {
    renderFab();
    const fabButton = document.querySelectorAll<HTMLButtonElement>(
      'button[class*="rounded-full"]'
    );
    fireEvent.click(fabButton.item(fabButton.length - 1));
    fireEvent.click(screen.getByText('Get Recommendation'));

    expect(screen.getByTestId('observed-result').textContent).toBe('none');

    fireEvent.click(screen.getByTestId('mock-screening-drawer'));

    expect(screen.getByTestId('observed-result').textContent).toBe(
      'psychiatry'
    );
    expect(mockInvalidateQueries).toHaveBeenCalled();
  });

  describe('selection mode', () => {
    it('shows a red delete button with count when items are selected', () => {
      renderFab();
      fireEvent.click(screen.getByTestId('trigger-selection'));
      const deleteBtn = screen.getByText('Delete (2)').closest('button');
      expect(deleteBtn).toBeInTheDocument();
      expect(document.querySelector('.lucide-trash-2')).toBeTruthy();
    });

    it('takes priority over action state', () => {
      renderFab();
      fireEvent.click(screen.getByTestId('trigger-action'));
      expect(screen.getByText('Save Changes')).toBeInTheDocument();
      fireEvent.click(screen.getByTestId('trigger-selection'));
      expect(screen.getByText('Delete (2)')).toBeInTheDocument();
      expect(screen.queryByText('Save Changes')).not.toBeInTheDocument();
    });

    it('reverts to normal state after selection is cleared', () => {
      const { container } = renderFab();
      fireEvent.click(screen.getByTestId('trigger-selection'));
      expect(screen.getByText('Delete (2)')).toBeInTheDocument();
      fireEvent.click(screen.getByTestId('clear-selection'));
      expect(getFabButton(container).className).toMatch(/h-14.*w-14/);
      expect(container.querySelector('.lucide-plus')).toBeTruthy();
    });
  });
});
