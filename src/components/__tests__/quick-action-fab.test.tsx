import { FabDirtyProvider, useFabDirty } from '@/context/fabDirtyContext';
import {
  FabSelectionProvider,
  useFabSelection
} from '@/context/fabSelectionContext';
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
  const { setSelectionState } = useFabSelection();
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
        <button
          data-testid='trigger-selection'
          onClick={() =>
            setSelectionState({
              count: 2,
              onDelete: vi.fn(),
              onCancel: vi.fn()
            })
          }
        >
          Select 2 Items
        </button>
        <button
          data-testid='clear-selection'
          onClick={() => setSelectionState(null)}
        >
          Clear Selection
        </button>
      </div>
    </QueryClientProvider>
  );
}

function renderFab() {
  return render(
    <FabDirtyProvider>
      <FabSelectionProvider>
        <TestHarness />
      </FabSelectionProvider>
    </FabDirtyProvider>
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
    const { container } = renderFab();

    const fabButton = getFabButton(container);
    expect(fabButton.className).toContain('h-14');
    expect(fabButton.className).toContain('w-14');
    expect(fabButton).toHaveAttribute('type', 'button');

    const plusIcon = container.querySelector('.lucide-plus');
    expect(plusIcon).toBeTruthy();
  });

  it('morphs to pill with Save Changes text when dirty', () => {
    const { container } = renderFab();

    fireEvent.click(screen.getByTestId('trigger-dirty'));

    const fabButton = getFabButton(container);
    expect(fabButton.textContent).toContain('Save Changes');

    const plusIcon = container.querySelector('.lucide-plus');
    expect(plusIcon).toBeFalsy();
  });

  it('reverts to circle after dirty state is cleared', () => {
    const { container } = renderFab();

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
    renderFab();

    const fabButton = [
      ...document.querySelectorAll<HTMLButtonElement>(
        'button[class*="rounded-full"]'
      )
    ].at(-1);
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

  describe('selection mode', () => {
    it('shows a red delete button with count when items are selected', () => {
      renderFab();
      fireEvent.click(screen.getByTestId('trigger-selection'));

      const deleteBtn = screen.getByText('Delete (2)').closest('button');
      expect(deleteBtn).toBeInTheDocument();
      expect(deleteBtn).toHaveAttribute('type', 'button');

      const trashIcon = document.querySelector('.lucide-trash-2');
      expect(trashIcon).toBeTruthy();
    });

    it('takes priority over dirty state', () => {
      renderFab();

      fireEvent.click(screen.getByTestId('trigger-dirty'));
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

      const fabButton = getFabButton(container);
      expect(fabButton.className).toContain('h-14');
      expect(fabButton.className).toContain('w-14');

      const plusIcon = container.querySelector('.lucide-plus');
      expect(plusIcon).toBeTruthy();
    });
  });
});

describe('QuickActionFab clinic admin', () => {
  beforeEach(() => {
    mockRole = 'Clinic Admin';
  });

  afterEach(() => {
    mockRole = 'Patient';
  });

  function renderClinicAdminFab() {
    return render(
      <FabDirtyProvider>
        <FabSelectionProvider>
          <TestHarness />
        </FabSelectionProvider>
      </FabDirtyProvider>
    );
  }

  it('renders Register Practitioner and Add Location pills for ClinicAdmin', () => {
    const { container } = renderClinicAdminFab();

    const fabButton = getFabButton(container);
    fireEvent.click(fabButton);

    expect(screen.getByText('Register Practitioner')).toBeDefined();
    expect(screen.getByText('Add Location')).toBeDefined();
  });

  it('does not render patient pills for ClinicAdmin', () => {
    const { container } = renderClinicAdminFab();

    const fabButton = getFabButton(container);
    fireEvent.click(fabButton);

    expect(screen.queryByText('Self Checkup')).toBeNull();
    expect(screen.queryByText('Write Journal')).toBeNull();
    expect(screen.queryByText('View Schedule')).toBeNull();
    expect(screen.queryByText('Get Recommendation')).toBeNull();
  });

  it('opens RegisterPractitionerDrawer when Register Practitioner pill is clicked', () => {
    const { container } = renderClinicAdminFab();

    const fabButton = getFabButton(container);
    fireEvent.click(fabButton);

    fireEvent.click(screen.getByText('Register Practitioner'));

    expect(screen.getByLabelText('Name')).toBeDefined();
    expect(screen.getByLabelText('Email')).toBeDefined();
  });

  it('opens AddLocationDrawer when Add Location pill is clicked', () => {
    const { container } = renderClinicAdminFab();

    const fabButton = getFabButton(container);
    fireEvent.click(fabButton);

    fireEvent.click(screen.getByText('Add Location'));

    expect(screen.getByLabelText('Longitude')).toBeDefined();
    expect(screen.getByLabelText('Latitude')).toBeDefined();
  });

  it('renders patient pills for non-ClinicAdmin roles', () => {
    mockRole = 'Patient';
    const { container } = renderClinicAdminFab();

    const fabButton = getFabButton(container);
    fireEvent.click(fabButton);

    expect(screen.getByText('Self Checkup')).toBeDefined();
    expect(screen.getByText('Write Journal')).toBeDefined();
    expect(screen.getByText('View Schedule')).toBeDefined();
    expect(screen.getByText('Get Recommendation')).toBeDefined();

    expect(screen.queryByText('Register Practitioner')).toBeNull();
    expect(screen.queryByText('Add Location')).toBeNull();
  });

  it('renders practitioner pills for Practitioner role', () => {
    mockRole = 'Practitioner';
    const { container } = renderClinicAdminFab();

    const fabButton = getFabButton(container);
    fireEvent.click(fabButton);

    expect(screen.getByText('Set Availability')).toBeDefined();
    expect(screen.getByText('View Schedule')).toBeDefined();
    expect(screen.getByText('Health Screening')).toBeDefined();
    expect(screen.getByText('S.O.A.P.')).toBeDefined();

    expect(screen.queryByText('Self Checkup')).toBeNull();
    expect(screen.queryByText('Write Journal')).toBeNull();
    expect(screen.queryByText('Get Recommendation')).toBeNull();
    expect(screen.queryByText('Register Practitioner')).toBeNull();
    expect(screen.queryByText('Add Location')).toBeNull();
  });
});
