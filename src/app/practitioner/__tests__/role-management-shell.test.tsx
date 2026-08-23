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

    expect(screen.getByTestId('section-availability')).toBeInTheDocument();
    expect(screen.getByTestId('section-services')).toBeInTheDocument();
    expect(screen.getByTestId('section-specialty')).toBeInTheDocument();
  });

  it('aggregates dirty sections into a single Save Changes FAB action', async () => {
    render(<PractitionerRoleManagementShell practitionerRoleId='pr-1' />);

    expect(latestSaveAction()).toBeUndefined();

    fireEvent.click(screen.getByTestId('mark-availability'));
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

    fireEvent.click(screen.getByTestId('mark-availability'));
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

  it('keeps sections mounted so unsaved edits survive switching', () => {
    render(<PractitionerRoleManagementShell practitionerRoleId='pr-1' />);

    const markAvailability = screen.getByTestId('mark-availability');
    fireEvent.click(markAvailability);

    // Open the services accordion item
    fireEvent.click(screen.getByText('Services'));

    // Availability is still mounted (state preserved), not unmounted
    expect(screen.getByTestId('section-availability')).toBeInTheDocument();
    expect(screen.getByTestId('mark-availability')).toBeInTheDocument();

    // Specialty item (never opened) is also mounted via forceMount
    expect(screen.getByTestId('section-specialty')).toBeInTheDocument();
  });
});
