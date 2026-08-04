import { FabProvider, useFab } from '@/context/fabContext';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import QuickActionFab from '../quick-action-fab';

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: false } }
});
let mockRole = 'Patient';

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

function TestHarness() {
  const { dispatch } = useFab();
  return (
    <QueryClientProvider client={queryClient}>
      <div>
        <QuickActionFab />
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
      <TestHarness />
    </FabProvider>
  );
}

function getFabButton(container: HTMLElement): HTMLButtonElement | undefined {
  const buttons = container.querySelectorAll<HTMLButtonElement>(
    'button[class*="rounded-full"]'
  );
  return buttons.item(buttons.length - 1) ?? undefined;
}

/** Open the speed-dial pill menu and return the toggle button. */
function openPillMenu(): void {
  fireEvent.click(getFabButton(document.body));
}

describe('QuickActionFab clinic admin', () => {
  beforeEach(() => {
    mockRole = 'Clinic Admin';
  });
  afterEach(() => {
    mockRole = 'Patient';
  });

  it('renders Register Practitioner, Add Location, and Add Assessments pills', () => {
    renderFab();
    openPillMenu();
    expect(screen.getByText('Register Practitioner')).toBeDefined();
    expect(screen.getByText('Add Location')).toBeDefined();
    expect(screen.getByText('Add Assessments')).toBeDefined();
  });

  it('does not render patient pills for ClinicAdmin', () => {
    renderFab();
    openPillMenu();
    expect(screen.queryByText('Self Checkup')).toBeNull();
  });

  it('opens RegisterPractitionerDrawer when clicked', () => {
    renderFab();
    openPillMenu();
    fireEvent.click(screen.getByText('Register Practitioner'));
    expect(screen.getByLabelText('Name')).toBeDefined();
    expect(screen.getByLabelText('Email')).toBeDefined();
  });

  it('opens AddLocationDrawer when clicked', () => {
    renderFab();
    openPillMenu();
    fireEvent.click(screen.getByText('Add Location'));
    expect(screen.getByLabelText('Longitude')).toBeDefined();
    expect(screen.getByLabelText('Latitude')).toBeDefined();
  });

  it('opens AddAssessmentDrawer when clicked', () => {
    renderFab();
    openPillMenu();
    fireEvent.click(screen.getByText('Add Assessments'));
    expect(screen.getByText('Add Assessment')).toBeDefined();
    expect(screen.getByLabelText('Category')).toBeDefined();
  });

  it('renders patient pills for Patient role', () => {
    mockRole = 'Patient';
    renderFab();
    openPillMenu();
    expect(screen.getByText('Self Checkup')).toBeDefined();
    expect(screen.queryByText('Register Practitioner')).toBeNull();
  });

  it('calls router.push when a navigation pill is clicked without throwing', () => {
    mockRole = 'Patient';
    renderFab();
    fireEvent.click(getFabButton(document.body));
    expect(() =>
      fireEvent.click(screen.getByText('Self Checkup'))
    ).not.toThrow();
  });

  it('applies scroll visibility classes to idle mode container', () => {
    const { container } = renderFab();
    const containers = container.querySelectorAll(
      '[class*="fixed"][class*="transition-all"]'
    );
    expect(containers.length).toBeGreaterThan(0);
    const hasVisible = [...containers].some(
      c =>
        c.className.includes('translate-y-0') &&
        c.className.includes('opacity-100')
    );
    expect(hasVisible).toBe(true);
  });

  it('applies scroll visibility classes to action mode container', () => {
    const { container } = renderFab();
    fireEvent.click(screen.getByTestId('trigger-action'));
    const actionContainer = container.querySelector(
      '[class*="fixed"][class*="z-50"]'
    );
    expect(actionContainer?.className).toContain('translate-y-0');
    expect(actionContainer?.className).toContain('opacity-100');
  });

  it('applies scroll visibility classes to selection mode container', () => {
    const { container } = renderFab();
    fireEvent.click(screen.getByTestId('trigger-selection'));
    const selectionContainer = container.querySelector(
      '[class*="fixed"][class*="z-50"]'
    );
    expect(selectionContainer?.className).toContain('translate-y-0');
    expect(selectionContainer?.className).toContain('opacity-100');
  });

  it('renders practitioner pills for Practitioner role', () => {
    mockRole = 'Practitioner';
    renderFab();
    openPillMenu();
    expect(screen.getByText('Set Availability')).toBeDefined();
    expect(screen.getByText('Health Screening')).toBeDefined();
    expect(screen.queryByText('Self Checkup')).toBeNull();
    expect(screen.queryByText('Register Practitioner')).toBeNull();
  });
});
