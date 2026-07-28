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
let disabledOnSave: ReturnType<typeof vi.fn>;
let enabledOnSave: ReturnType<typeof vi.fn>;

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
        <button
          data-testid='trigger-dirty-not'
          onClick={() =>
            setDirtyState({
              isDirty: false,
              label: 'Save Changes',
              icon: vi.fn() as unknown as React.ComponentType<{
                className?: string;
              }>,
              onSave: vi.fn(),
              isSaving: false
            })
          }
        >
          Make Dirty (not really)
        </button>
        <button data-testid='trigger-clean' onClick={() => setDirtyState(null)}>
          Make Clean
        </button>
        <button
          data-testid='trigger-dirty-disabled'
          onClick={() =>
            setDirtyState({
              isDirty: true,
              label: 'Submit',
              onSave: disabledOnSave,
              isSaving: false,
              disabled: true
            })
          }
        >
          Make Dirty Disabled
        </button>
        <button
          data-testid='trigger-dirty-enabled'
          onClick={() =>
            setDirtyState({
              isDirty: true,
              label: 'Submit',
              onSave: enabledOnSave,
              isSaving: false,
              disabled: false
            })
          }
        >
          Make Dirty Enabled
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

function getFabButton(container: HTMLElement): HTMLButtonElement | undefined {
  const buttons = container.querySelectorAll<HTMLButtonElement>(
    'button[class*="rounded-full"]'
  );
  return buttons.item(buttons.length - 1) ?? undefined;
}

describe('QuickActionFab', () => {
  it('renders as a circle with plus icon by default', () => {
    const { container } = renderFab();
    const fabButton = getFabButton(container);
    expect(fabButton.className).toContain('h-14');
    expect(fabButton.className).toContain('w-14');
    expect(fabButton).toHaveAttribute('type', 'button');
    expect(container.querySelector('.lucide-plus')).toBeTruthy();
  });

  it('has accessible label on collapsed button', () => {
    const { container } = renderFab();
    expect(getFabButton(container)).toHaveAttribute('aria-label', 'Open menu');
  });

  it('morphs to pill with Save Changes text when dirty', () => {
    const { container } = renderFab();
    fireEvent.click(screen.getByTestId('trigger-dirty'));
    expect(getFabButton(container).textContent).toContain('Save Changes');
    expect(container.querySelector('.lucide-plus')).toBeFalsy();
  });

  it('reverts to circle after dirty state is cleared', () => {
    const { container } = renderFab();
    fireEvent.click(screen.getByTestId('trigger-dirty'));
    expect(getFabButton(container).textContent).toContain('Save Changes');
    fireEvent.click(screen.getByTestId('trigger-clean'));
    const fabButton = getFabButton(container);
    expect(fabButton.className).toContain('h-14');
    expect(fabButton.className).toContain('w-14');
    expect(container.querySelector('.lucide-plus')).toBeTruthy();
  });

  it('hides pills menu when dirty', () => {
    renderFab();
    const buttons = document.querySelectorAll<HTMLButtonElement>(
      'button[class*="rounded-full"]'
    );
    const fabButton = buttons.item(buttons.length - 1);
    fireEvent.click(fabButton);
    expect(
      screen.queryAllByText(
        /Self Checkup|Write Journal|View Schedule|Get Recommendation/
      ).length
    ).toBeGreaterThan(0);
    fireEvent.click(screen.getByTestId('trigger-dirty'));
    expect(
      screen.queryAllByText(
        /Self Checkup|Write Journal|View Schedule|Get Recommendation/
      )
    ).toHaveLength(0);
  });

  it('shows speed-dial and Plus icon when dirtyState exists but isDirty is false', () => {
    const { container } = renderFab();
    fireEvent.click(screen.getByTestId('trigger-dirty-not'));
    expect(container.querySelector('.lucide-plus')).toBeTruthy();
    fireEvent.click(getFabButton(container));
    expect(
      screen.queryAllByText(
        /Self Checkup|Write Journal|View Schedule|Get Recommendation/
      ).length
    ).toBeGreaterThan(0);
  });

  it('shows dirty icon in dirty mode', () => {
    const { container } = renderFab();
    fireEvent.click(screen.getByTestId('trigger-dirty'));
    expect(getFabButton(container).textContent).toContain('Save Changes');
    expect(container.querySelector('.lucide-plus')).toBeFalsy();
  });

  describe('selection mode', () => {
    it('shows a red delete button with count when items are selected', () => {
      renderFab();
      fireEvent.click(screen.getByTestId('trigger-selection'));
      const deleteBtn = screen.getByText('Delete (2)').closest('button');
      expect(deleteBtn).toBeInTheDocument();
      expect(document.querySelector('.lucide-trash-2')).toBeTruthy();
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
      expect(getFabButton(container).className).toContain('h-14');
      expect(getFabButton(container).className).toContain('w-14');
      expect(container.querySelector('.lucide-plus')).toBeTruthy();
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

  it('renders Register Practitioner and Add Location pills', () => {
    const { container } = renderClinicAdminFab();
    fireEvent.click(getFabButton(container));
    expect(screen.getByText('Register Practitioner')).toBeDefined();
    expect(screen.getByText('Add Location')).toBeDefined();
  });

  it('does not render patient pills for ClinicAdmin', () => {
    const { container } = renderClinicAdminFab();
    fireEvent.click(getFabButton(container));
    expect(screen.queryByText('Self Checkup')).toBeNull();
  });

  it('opens RegisterPractitionerDrawer when clicked', () => {
    const { container } = renderClinicAdminFab();
    fireEvent.click(getFabButton(container));
    fireEvent.click(screen.getByText('Register Practitioner'));
    expect(screen.getByLabelText('Name')).toBeDefined();
    expect(screen.getByLabelText('Email')).toBeDefined();
  });

  it('opens AddLocationDrawer when clicked', () => {
    const { container } = renderClinicAdminFab();
    fireEvent.click(getFabButton(container));
    fireEvent.click(screen.getByText('Add Location'));
    expect(screen.getByLabelText('Longitude')).toBeDefined();
    expect(screen.getByLabelText('Latitude')).toBeDefined();
  });

  it('renders patient pills for Patient role', () => {
    mockRole = 'Patient';
    const { container } = renderClinicAdminFab();
    fireEvent.click(getFabButton(container));
    expect(screen.getByText('Self Checkup')).toBeDefined();
    expect(screen.queryByText('Register Practitioner')).toBeNull();
  });

  it('renders practitioner pills for Practitioner role', () => {
    mockRole = 'Practitioner';
    const { container } = renderClinicAdminFab();
    fireEvent.click(getFabButton(container));
    expect(screen.getByText('Set Availability')).toBeDefined();
    expect(screen.getByText('Health Screening')).toBeDefined();
    expect(screen.queryByText('Self Checkup')).toBeNull();
    expect(screen.queryByText('Register Practitioner')).toBeNull();
  });
});

describe('QuickActionFab disabled dirty state', () => {
  beforeEach(() => {
    disabledOnSave = vi.fn();
    enabledOnSave = vi.fn();
  });

  it('applies greyed-out styling to dirty pill when disabled=true', () => {
    const { container } = renderFab();
    fireEvent.click(screen.getByTestId('trigger-dirty-disabled'));
    const fabButton = getFabButton(container);
    expect(fabButton.className).toContain('opacity-50');
    expect(fabButton.className).toContain('cursor-not-allowed');
    expect(fabButton.disabled).toBe(true);
  });

  it('does not call onSave when dirty pill is disabled and clicked', () => {
    const { container } = renderFab();
    fireEvent.click(screen.getByTestId('trigger-dirty-disabled'));
    fireEvent.click(getFabButton(container));
    expect(disabledOnSave).not.toHaveBeenCalled();
  });

  it('calls onSave when dirty pill is enabled and clicked', () => {
    const { container } = renderFab();
    fireEvent.click(screen.getByTestId('trigger-dirty-enabled'));
    fireEvent.click(getFabButton(container));
    expect(enabledOnSave).toHaveBeenCalledTimes(1);
  });
});
