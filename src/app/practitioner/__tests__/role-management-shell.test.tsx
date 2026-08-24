import type { ActionConfig } from '@/components/fab/types';
import type { FabAction } from '@/context/fabContext';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import PractitionerRoleManagementShell from '../role-management-shell';

const { availabilitySave, servicesSave, specialtySave } = vi.hoisted(() => ({
  availabilitySave: vi.fn<() => Promise<void>>(),
  servicesSave: vi.fn<() => Promise<void>>(),
  specialtySave: vi.fn<() => Promise<void>>()
}));

const mockDispatch = vi.fn<(action: FabAction) => void>();
const mockRefetch = vi.fn<() => Promise<unknown>>();

vi.mock('@/context/fabContext', async importOriginal => {
  const actual = await importOriginal<typeof import('@/context/fabContext')>();
  return { ...actual, useFab: () => ({ dispatch: mockDispatch }) };
});

vi.mock('@/context/auth/authContext', () => ({
  useAuth: () => ({ state: { userInfo: { role_name: 'Clinic Admin' } } })
}));

vi.mock('@/services/clinic-practitioners', () => ({
  useDetailPractitioner: () => ({
    newData: { resource: { resourceType: 'PractitionerRole', id: 'pr-1' } },
    refetch: mockRefetch
  })
}));

/** Generic section stub contract shared by the mocked editor children. */
type DirtyProps = {
  onDirtyChange?: (
    dirty: boolean,
    save: () => Promise<void>,
    saving: boolean
  ) => void;
};

vi.mock('@/app/practitioner/practitioner-availability-editor', () => ({
  default: ({ onDirtyChange }: DirtyProps) => (
    <div data-testid='section-availability'>
      <button
        type='button'
        data-testid='mark-availability'
        onClick={() => onDirtyChange?.(true, () => availabilitySave(), false)}
      >
        mark availability dirty
      </button>
    </div>
  )
}));

vi.mock('@/app/practitioner/services-tab', () => ({
  default: ({ onDirtyChange }: DirtyProps) => (
    <div data-testid='section-services'>
      <button
        type='button'
        data-testid='mark-services'
        onClick={() => onDirtyChange?.(true, () => servicesSave(), false)}
      >
        mark services dirty
      </button>
    </div>
  )
}));

vi.mock('@/app/practitioner/specialty-section', () => ({
  default: ({ onDirtyChange }: DirtyProps) => (
    <div data-testid='section-specialty'>
      <button
        type='button'
        data-testid='mark-specialty'
        onClick={() => onDirtyChange?.(true, () => specialtySave(), false)}
      >
        mark specialty dirty
      </button>
    </div>
  )
}));

beforeEach(() => {
  vi.clearAllMocks();
});

/** Extract the latest "Save Changes" FAB action config from dispatch calls. */
function latestSaveAction(): ActionConfig | undefined {
  const calls = mockDispatch.mock.calls
    .map(call => call[0])
    .filter((action): action is Extract<FabAction, { type: 'SET_ACTION' }> => {
      return action.type === 'SET_ACTION';
    });
  const last = calls.at(-1)?.config;
  return last ?? undefined;
}

describe('PractitionerRoleManagementShell', () => {
  it('renders all three sections as accordion items', () => {
    render(<PractitionerRoleManagementShell practitionerRoleId='pr-1' />);

    // Availability is open by default
    expect(screen.getByTestId('section-availability')).toBeInTheDocument();

    // Open services
    fireEvent.click(screen.getByText('Services'));
    expect(screen.getByTestId('section-services')).toBeInTheDocument();

    // Open specialty
    fireEvent.click(screen.getByText('Specialty'));
    expect(screen.getByTestId('section-specialty')).toBeInTheDocument();
  });

  it('aggregates dirty sections into a single Save Changes FAB action', async () => {
    render(<PractitionerRoleManagementShell practitionerRoleId='pr-1' />);

    expect(latestSaveAction()).toBeUndefined();

    // Mark availability dirty (open by default)
    fireEvent.click(screen.getByTestId('mark-availability'));

    // Open services and mark it dirty
    fireEvent.click(screen.getByText('Services'));
    fireEvent.click(screen.getByTestId('mark-services'));

    await waitFor(() => {
      const config = latestSaveAction();
      expect(config?.label).toBe('Save Changes');
      expect(config?.isSaving).toBe(false);
    });

    // Dirty dots appear on both affected triggers
    expect(screen.getByTestId('dirty-dot-availability')).toBeInTheDocument();
    expect(screen.getByTestId('dirty-dot-services')).toBeInTheDocument();
  });

  it('runs every dirty section save then refetches on FAB save', async () => {
    render(<PractitionerRoleManagementShell practitionerRoleId='pr-1' />);

    // Mark availability dirty (open by default)
    fireEvent.click(screen.getByTestId('mark-availability'));

    // Open specialty and mark it dirty
    fireEvent.click(screen.getByText('Specialty'));
    fireEvent.click(screen.getByTestId('mark-specialty'));

    await waitFor(() => {
      expect(latestSaveAction()?.label).toBe('Save Changes');
    });

    const onAction = latestSaveAction()?.onAction;
    if (!onAction) throw new Error('expected a FAB onAction handler');

    await onAction();

    expect(availabilitySave).toHaveBeenCalledTimes(1);
    expect(specialtySave).toHaveBeenCalledTimes(1);
    expect(servicesSave).not.toHaveBeenCalled();
    expect(mockRefetch).toHaveBeenCalledTimes(1);
  });

  it('unmounts closed sections so content is not visible when collapsed', () => {
    render(<PractitionerRoleManagementShell practitionerRoleId='pr-1' />);

    // Availability is open by default — its content is mounted
    expect(screen.getByTestId('section-availability')).toBeInTheDocument();

    // Open the services accordion item
    fireEvent.click(screen.getByText('Services'));

    // Availability content should be unmounted (Radix default behavior)
    expect(
      screen.queryByTestId('section-availability')
    ).not.toBeInTheDocument();

    // Services content should be mounted
    expect(screen.getByTestId('section-services')).toBeInTheDocument();

    // Specialty (never opened) should not be in the DOM
    expect(screen.queryByTestId('section-specialty')).not.toBeInTheDocument();
  });

  it('does not render AccordionContent with forceMount or className', () => {
    const { container } = render(
      <PractitionerRoleManagementShell practitionerRoleId='pr-1' />
    );

    // No element should have the CSS workaround class
    const hiddenWorkaround = container.querySelectorAll(
      '[class*="[&[data-state=closed]]:hidden"]'
    );
    expect(hiddenWorkaround).toHaveLength(0);
  });

  describe('single-open accordion', () => {
    it('opens availability by default and keeps others closed', () => {
      render(<PractitionerRoleManagementShell practitionerRoleId='pr-1' />);

      const availabilityItem = screen
        .getByText('Availability')
        .closest('[data-state]');
      const servicesItem = screen.getByText('Services').closest('[data-state]');
      const specialtyItem = screen
        .getByText('Specialty')
        .closest('[data-state]');

      expect(availabilityItem).toHaveAttribute('data-state', 'open');
      expect(servicesItem).toHaveAttribute('data-state', 'closed');
      expect(specialtyItem).toHaveAttribute('data-state', 'closed');
    });

    it('closes availability when services is opened', () => {
      render(<PractitionerRoleManagementShell practitionerRoleId='pr-1' />);

      fireEvent.click(screen.getByText('Services'));

      const availabilityItem = screen
        .getByText('Availability')
        .closest('[data-state]');
      const servicesItem = screen.getByText('Services').closest('[data-state]');

      expect(availabilityItem).toHaveAttribute('data-state', 'closed');
      expect(servicesItem).toHaveAttribute('data-state', 'open');
    });
  });

  describe('stale closure prevention', () => {
    it('saves all dirty sections even when marked sequentially', async () => {
      render(<PractitionerRoleManagementShell practitionerRoleId='pr-1' />);

      // Mark availability dirty first
      fireEvent.click(screen.getByTestId('mark-availability'));
      await waitFor(() => {
        expect(latestSaveAction()?.label).toBe('Save Changes');
      });

      // Switch to services accordion and mark it dirty
      fireEvent.click(screen.getByText('Services'));
      fireEvent.click(screen.getByTestId('mark-services'));
      await waitFor(() => {
        expect(screen.getByTestId('dirty-dot-services')).toBeInTheDocument();
      });

      // Click the FAB save - should save both availability and services
      const onAction = latestSaveAction()?.onAction;
      if (!onAction) throw new Error('expected a FAB onAction handler');

      await onAction();

      expect(availabilitySave).toHaveBeenCalledTimes(1);
      expect(servicesSave).toHaveBeenCalledTimes(1);
      expect(mockRefetch).toHaveBeenCalledTimes(1);
    });

    it('captures sections at call time, not at effect dispatch time', async () => {
      render(<PractitionerRoleManagementShell practitionerRoleId='pr-1' />);

      // Mark only availability dirty -- FAB config is dispatched
      fireEvent.click(screen.getByTestId('mark-availability'));
      await waitFor(() => {
        expect(latestSaveAction()?.label).toBe('Save Changes');
      });

      // Grab the onAction handler that was dispatched at this point
      const onAction = latestSaveAction()?.onAction;
      if (!onAction) throw new Error('expected a FAB onAction handler');

      // Now mark services dirty (simulates editing after FAB was configured)
      fireEvent.click(screen.getByText('Services'));
      fireEvent.click(screen.getByTestId('mark-services'));
      await waitFor(() => {
        expect(screen.getByTestId('dirty-dot-services')).toBeInTheDocument();
      });

      // The captured onAction must still see both dirty sections
      // This validates the ref-based read prevents stale closures
      await onAction();

      expect(availabilitySave).toHaveBeenCalledTimes(1);
      expect(servicesSave).toHaveBeenCalledTimes(1);
    });
  });
});
