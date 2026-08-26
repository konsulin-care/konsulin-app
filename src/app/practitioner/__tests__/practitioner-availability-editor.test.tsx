import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import type { PractitionerRole } from 'fhir/r4';
import { afterEach, describe, expect, it, vi } from 'vitest';
import PractitionerAvailabilityEditor from '../practitioner-availability-editor';

const mockMutateAsync = vi.fn();

vi.mock('@/services/api/schedule', () => ({
  useUpdateAvailability: () => ({ mutateAsync: mockMutateAsync })
}));

vi.mock('@/components/availability/availability-editor', () => ({
  default: ({
    onAddTimeRange,
    weeklyAvailability
  }: {
    onAddTimeRange: (orgId: string, day: number) => void;
    weeklyAvailability: Record<string, Record<string, unknown[]>>;
  }) => (
    <div data-testid='availability-editor'>
      <div data-testid='days-with-data'>
        {Object.entries(weeklyAvailability)
          .filter(([, orgs]) => orgs['org-1']?.length > 0)
          .map(([day]) => day)
          .join(',')}
      </div>
      <button data-testid='add-mon' onClick={() => onAddTimeRange('org-1', 0)}>
        Add Mon
      </button>
      <button data-testid='add-tue' onClick={() => onAddTimeRange('org-1', 1)}>
        Add Tue
      </button>
    </div>
  )
}));

vi.mock('@/components/availability/day-selector-navigation', () => ({
  default: () => <div data-testid='day-selector' />
}));

vi.mock('@/components/availability/floating-save-button', () => ({
  default: () => <div data-testid='floating-save' />
}));

vi.mock('@/utils/availability', async () => {
  const actual = await vi.importActual('@/utils/availability');
  return {
    ...actual,
    initializeWeeklyAvailabilityFromRoles: () => ({
      0: { 'org-1': [] },
      1: { 'org-1': [] },
      2: { 'org-1': [] },
      3: { 'org-1': [] },
      4: { 'org-1': [] },
      5: { 'org-1': [] },
      6: { 'org-1': [] }
    }),
    getInitialSelectedDay: () => 0,
    convertToFhirAvailableTimeForOrganization: (
      weeklyAvailability: Record<string, Record<string, unknown[]>>
    ) => {
      const daysWithData: string[] = [];
      for (const day of Object.keys(weeklyAvailability)) {
        const orgEntry = weeklyAvailability[day]?.['org-1'];
        if (Array.isArray(orgEntry) && orgEntry.length > 0) {
          daysWithData.push(day);
        }
      }
      return daysWithData;
    }
  };
});

const mockRole: Partial<PractitionerRole> = {
  resourceType: 'PractitionerRole',
  id: 'role-1',
  availableTime: []
};

describe('PractitionerAvailabilityEditor save behaviors', () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it('save function uses latest weeklyAvailability across multiple day edits', async () => {
    let currentSave: (() => Promise<void>) | null = null;
    let onDirtyChangeCallCount = 0;

    const onDirtyChange = vi.fn((dirty: boolean, save: () => Promise<void>) => {
      onDirtyChangeCallCount++;
      if (dirty) {
        currentSave = save;
      }
    });

    render(
      <PractitionerAvailabilityEditor
        practitionerRole={mockRole as PractitionerRole}
        hideSaveButton
        onDirtyChange={onDirtyChange}
      />
    );

    // Step 1: Add Mon time range -> dirty becomes true -> onDirtyChange called with save
    fireEvent.click(screen.getByTestId('add-mon'));
    await waitFor(() => expect(onDirtyChange).toHaveBeenCalled());

    const saveAfterMon = currentSave;
    const callsAfterMon = onDirtyChangeCallCount;

    // Step 2: Add Tue time range -> dirty stays true -> onDirtyChange NOT called again
    fireEvent.click(screen.getByTestId('add-tue'));

    // Wait for React effects to settle
    await waitFor(() => Promise.resolve());
    // The onDirtyChange should not have been called again for dirty=true
    // because weeklyAvailabilityDirty is already true
    expect(onDirtyChangeCallCount).toBe(callsAfterMon);
    // The save function should be the same reference (stale!)
    expect(currentSave).toBe(saveAfterMon);

    // Step 3: Call the save function — with stale closure it only has Mon data
    // eslint-disable-next-line unicorn/no-useless-undefined -- required by vitest mock types, cannot omit
    mockMutateAsync.mockResolvedValueOnce(undefined);
    await (currentSave as () => Promise<void>)();

    // Step 4: Verify what was sent to updateAvailability
    // Expecting data for BOTH Mon (0) and Tue (1) if the save function
    // reads the latest weeklyAvailability at call time
    expect(mockMutateAsync).toHaveBeenCalledTimes(1);
    const sentData = mockMutateAsync.mock.calls[0][0] as {
      availableTime: string[];
    };
    expect(sentData.availableTime).toContain('0'); // Mon
    expect(sentData.availableTime).toContain('1'); // Tue
  });

  it('calls onDirtyChange with false after successful save', async () => {
    let currentSave: (() => Promise<void>) | null = null;

    const onDirtyChange = vi.fn((dirty: boolean, save: () => Promise<void>) => {
      if (dirty) {
        currentSave = save;
      }
    });

    render(
      <PractitionerAvailabilityEditor
        practitionerRole={mockRole as PractitionerRole}
        hideSaveButton
        onDirtyChange={onDirtyChange}
      />
    );

    // Trigger dirty state
    fireEvent.click(screen.getByTestId('add-mon'));
    await waitFor(() =>
      expect(onDirtyChange).toHaveBeenCalledWith(
        true,
        expect.any(Function),
        false
      )
    );

    // Perform save
    // eslint-disable-next-line unicorn/no-useless-undefined -- required by vitest mock types, cannot omit
    mockMutateAsync.mockResolvedValueOnce(undefined);
    await (currentSave as () => Promise<void>)();
    // Wait for the effect to call onDirtyChange(false) after save
    await waitFor(() => {
      const falseCalls = onDirtyChange.mock.calls.filter(
        (call: unknown[]) => call[0] === false
      );
      expect(falseCalls.length).toBeGreaterThanOrEqual(1);
    });
  });

  it('preserves availability data visually after save', async () => {
    let currentSave: (() => Promise<void>) | null = null;

    const onDirtyChange = vi.fn((dirty: boolean, save: () => Promise<void>) => {
      if (dirty) {
        currentSave = save;
      }
    });

    render(
      <PractitionerAvailabilityEditor
        practitionerRole={mockRole as PractitionerRole}
        hideSaveButton
        onDirtyChange={onDirtyChange}
      />
    );

    // Add Mon and Tue availability
    fireEvent.click(screen.getByTestId('add-mon'));
    fireEvent.click(screen.getByTestId('add-tue'));
    await waitFor(() =>
      expect(onDirtyChange).toHaveBeenCalledWith(
        true,
        expect.any(Function),
        false
      )
    );

    // Before save: both days visible
    expect(screen.getByTestId('days-with-data').textContent).toBe('0,1');

    // Save
    // eslint-disable-next-line unicorn/no-useless-undefined -- required by vitest mock types, cannot omit
    mockMutateAsync.mockResolvedValueOnce(undefined);
    await (currentSave as () => Promise<void>)();
    await waitFor(() => Promise.resolve());

    // After save: both days should still be visible
    // (the reset effect must not wipe weeklyAvailability back to empty initial state)
    expect(screen.getByTestId('days-with-data').textContent).toBe('0,1');
  });

  it('preserves availability when parent passes new practitionerRole reference after save', async () => {
    let currentSave: (() => Promise<void>) | null = null;

    const onDirtyChange = vi.fn((dirty: boolean, save: () => Promise<void>) => {
      if (dirty) {
        currentSave = save;
      }
    });

    const { rerender } = render(
      <PractitionerAvailabilityEditor
        practitionerRole={mockRole as PractitionerRole}
        hideSaveButton
        onDirtyChange={onDirtyChange}
      />
    );

    // Add Mon and Tue
    fireEvent.click(screen.getByTestId('add-mon'));
    fireEvent.click(screen.getByTestId('add-tue'));
    await waitFor(() =>
      expect(onDirtyChange).toHaveBeenCalledWith(
        true,
        expect.any(Function),
        false
      )
    );
    expect(screen.getByTestId('days-with-data').textContent).toBe('0,1');

    // Save
    // eslint-disable-next-line unicorn/no-useless-undefined -- required by vitest mock types, cannot omit
    mockMutateAsync.mockResolvedValueOnce(undefined);
    await (currentSave as () => Promise<void>)();
    await waitFor(() => Promise.resolve());

    // After save: data still visible
    expect(screen.getByTestId('days-with-data').textContent).toBe('0,1');

    // Simulate parent re-render passing a new practitionerRole reference
    // (same data, new object — exactly what happens when the shell
    //  re-renders due to FabDirtyContext update after save)
    const freshMockRole: Partial<PractitionerRole> = {
      resourceType: 'PractitionerRole',
      id: 'role-1',
      availableTime: []
    };
    rerender(
      <PractitionerAvailabilityEditor
        practitionerRole={freshMockRole as PractitionerRole}
        hideSaveButton
        onDirtyChange={onDirtyChange}
      />
    );
    await waitFor(() => Promise.resolve());

    // Data must survive — the reset effect must not treat
    // identical-data-but-new-reference as "new practitioner"
    expect(screen.getByTestId('days-with-data').textContent).toBe('0,1');
  });
});
