import { FabDirtyProvider, useFabDirty } from '@/context/fabDirtyContext';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import QuickActionFab from '../quick-action-fab';

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: false } }
});

let mockRole = 'Patient';

vi.mock('@/context/auth/authContext', () => ({
  useAuth: () => ({
    state: { userInfo: { role_name: mockRole } }
  })
}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn() })
}));

vi.mock('@/lib/indexeddb', () => ({
  STORES: { uiPreferences: 'ui_preferences' },
  dbGet: vi.fn().mockResolvedValue(null)
}));

vi.mock('@/services/api', () => ({
  getAPI: vi.fn()
}));

vi.mock('react-toastify', () => ({
  toast: { success: vi.fn(), error: vi.fn() }
}));

function TestHarness() {
  const { setDirtyState } = useFabDirty();
  return (
    <QueryClientProvider client={queryClient}>
      <div>
        <QuickActionFab />
        <button
          data-testid='trigger-dirty'
          onClick={() =>
            setDirtyState({
              isDirty: true,
              label: 'Save Changes',
              onSave: vi.fn(),
              isSaving: false
            })
          }
        >
          Make Dirty
        </button>
        <button data-testid='trigger-clean' onClick={() => setDirtyState(null)}>
          Make Clean
        </button>
      </div>
    </QueryClientProvider>
  );
}

/** Get the FAB toggle button (last button in the container, the round one). */
function getFabButton(container: HTMLElement): HTMLButtonElement | undefined {
  const buttons = container.querySelectorAll<HTMLButtonElement>(
    'button[class*="rounded-full"]'
  );
  const last = buttons.length - 1;
  return buttons[last] || undefined;
}

describe('QuickActionFab', () => {
  it('renders as a circle with plus icon by default', () => {
    const { container } = render(
      <FabDirtyProvider>
        <TestHarness />
      </FabDirtyProvider>
    );

    const fabButton = getFabButton(container);
    expect(fabButton.className).toContain('h-14');
    expect(fabButton.className).toContain('w-14');

    const plusIcon = container.querySelector('.lucide-plus');
    expect(plusIcon).toBeTruthy();
  });

  it('morphs to pill with Save Changes text when dirty', () => {
    const { container } = render(
      <FabDirtyProvider>
        <TestHarness />
      </FabDirtyProvider>
    );

    fireEvent.click(screen.getByTestId('trigger-dirty'));

    const fabButton = getFabButton(container);
    expect(fabButton.textContent).toContain('Save Changes');

    const plusIcon = container.querySelector('.lucide-plus');
    expect(plusIcon).toBeFalsy();
  });

  it('reverts to circle after dirty state is cleared', () => {
    const { container } = render(
      <FabDirtyProvider>
        <TestHarness />
      </FabDirtyProvider>
    );

    fireEvent.click(screen.getByTestId('trigger-dirty'));
    expect(getFabButton(container).textContent).toContain('Save Changes');

    fireEvent.click(screen.getByTestId('trigger-clean'));

    const fabButton = getFabButton(container);
    expect(fabButton.className).toContain('h-14');
    expect(fabButton.className).toContain('w-14');

    const plusIcon = container.querySelector('.lucide-plus');
    expect(plusIcon).toBeTruthy();
  });

  it('hides pills menu when dirty', () => {
    const { container } = render(
      <FabDirtyProvider>
        <TestHarness />
      </FabDirtyProvider>
    );

    const fabButton = getFabButton(container);
    fireEvent.click(fabButton);

    const pills = screen.queryAllByText(
      /Self Checkup|Write Journal|View Schedule|Get Recommendation/
    );
    expect(pills.length).toBeGreaterThan(0);

    fireEvent.click(screen.getByTestId('trigger-dirty'));

    const pillsAfter = screen.queryAllByText(
      /Self Checkup|Write Journal|View Schedule|Get Recommendation/
    );
    expect(pillsAfter).toHaveLength(0);
  });
});

describe('QuickActionFab clinic admin', () => {
  beforeEach(() => {
    mockRole = 'Clinic Admin';
  });

  afterEach(() => {
    mockRole = 'Patient';
  });

  it('renders Register Practitioner and Add Location pills for ClinicAdmin', () => {
    const { container } = render(
      <FabDirtyProvider>
        <TestHarness />
      </FabDirtyProvider>
    );

    const fabButton = getFabButton(container);
    fireEvent.click(fabButton);

    expect(screen.getByText('Register Practitioner')).toBeDefined();
    expect(screen.getByText('Add Location')).toBeDefined();
  });

  it('does not render patient pills for ClinicAdmin', () => {
    const { container } = render(
      <FabDirtyProvider>
        <TestHarness />
      </FabDirtyProvider>
    );

    const fabButton = getFabButton(container);
    fireEvent.click(fabButton);

    expect(screen.queryByText('Self Checkup')).toBeNull();
    expect(screen.queryByText('Write Journal')).toBeNull();
    expect(screen.queryByText('View Schedule')).toBeNull();
    expect(screen.queryByText('Get Recommendation')).toBeNull();
  });

  it('opens RegisterPractitionerDrawer when Register Practitioner pill is clicked', () => {
    const { container } = render(
      <FabDirtyProvider>
        <TestHarness />
      </FabDirtyProvider>
    );

    const fabButton = getFabButton(container);
    fireEvent.click(fabButton);

    fireEvent.click(screen.getByText('Register Practitioner'));

    // The drawer form should be visible
    expect(screen.getByLabelText('Name')).toBeDefined();
    expect(screen.getByLabelText('Email')).toBeDefined();
  });

  it('opens AddLocationDrawer when Add Location pill is clicked', () => {
    const { container } = render(
      <FabDirtyProvider>
        <TestHarness />
      </FabDirtyProvider>
    );

    const fabButton = getFabButton(container);
    fireEvent.click(fabButton);

    fireEvent.click(screen.getByText('Add Location'));

    // The drawer form should be visible
    expect(screen.getByLabelText('Longitude')).toBeDefined();
    expect(screen.getByLabelText('Latitude')).toBeDefined();
  });

  it('renders patient pills for non-ClinicAdmin roles', () => {
    mockRole = 'Patient';
    const { container } = render(
      <FabDirtyProvider>
        <TestHarness />
      </FabDirtyProvider>
    );

    const fabButton = getFabButton(container);
    fireEvent.click(fabButton);

    expect(screen.getByText('Self Checkup')).toBeDefined();
    expect(screen.getByText('Write Journal')).toBeDefined();
    expect(screen.getByText('View Schedule')).toBeDefined();
    expect(screen.getByText('Get Recommendation')).toBeDefined();

    expect(screen.queryByText('Register Practitioner')).toBeNull();
    expect(screen.queryByText('Add Location')).toBeNull();
  });
});
