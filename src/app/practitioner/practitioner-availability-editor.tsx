import AvailabilityEditor from '@/components/availability/availability-editor';
import DaySelectorNavigation from '@/components/availability/day-selector-navigation';
import FloatingSaveButton from '@/components/availability/floating-save-button';
import { useUpdateAvailability } from '@/services/api/schedule';
import {
  DayOfWeek,
  OrganizationTimeRanges,
  TimeRange,
  UIOrganization,
  WeeklyAvailability
} from '@/types/availability';
import { IPractitionerRoleDetail } from '@/types/practitioner';
import {
  convertToFhirAvailableTimeForOrganization,
  generateTimeRangeId,
  getInitialSelectedDay,
  initializeWeeklyAvailabilityFromRoles
} from '@/utils/availability';
import { PractitionerRole } from 'fhir/r4';
import { useEffect, useMemo, useRef, useState } from 'react';

type Props = {
  practitionerRoles?: (PractitionerRole | IPractitionerRoleDetail)[];
  practitionerRole?: PractitionerRole | IPractitionerRoleDetail;
  onSuccess?: () => void;
  onCancel?: () => void;
  /** When true, skips rendering the internal FloatingSaveButton — used when parent manages save. */
  hideSaveButton?: boolean;
  /** Reports dirty state and save handler to parent (for external FAB management). */
  onDirtyChange?: (
    dirty: boolean,
    save: () => Promise<void>,
    saving: boolean
  ) => void;
};

/**
 * Type guard to check if a role is IPractitionerRoleDetail
 */
function isIPractitionerRoleDetail(
  role: PractitionerRole | IPractitionerRoleDetail
): role is IPractitionerRoleDetail {
  return 'organizationData' in role;
}

/**
 * PractitionerAvailabilityEditor
 *
 * A comprehensive availability editor that allows practitioners to configure
 * their weekly availability across multiple practice locations from a single view.
 *
 * Features:
 * - Day selector navigation with visual indicators for availability
 * - Automatic selection of first available day on load
 * - Per-organization time range management
 * - Single save action for entire week
 * - Floating save button fixed at bottom right
 */
export default function PractitionerAvailabilityEditor({
  practitionerRoles,
  practitionerRole,
  onSuccess,
  onCancel,
  hideSaveButton = false,
  onDirtyChange
}: Props) {
  // Convert single practitionerRole to array for backward compatibility
  const memoizedRolesToUse = useMemo(
    () => practitionerRoles || (practitionerRole ? [practitionerRole] : []),
    [practitionerRoles, practitionerRole]
  );

  // Compute stable initial weekly availability once
  const stableInitialWeeklyAvailability = useMemo(
    () => initializeWeeklyAvailabilityFromRoles(memoizedRolesToUse),
    [memoizedRolesToUse]
  );

  // State for weekly availability across all organizations
  const [weeklyAvailability, setWeeklyAvailability] =
    useState<WeeklyAvailability>(stableInitialWeeklyAvailability);

  // Track if there are unsaved local edits
  const [weeklyAvailabilityDirty, setWeeklyAvailabilityDirty] = useState(false);

  // Currently selected day (0 = Monday, 1 = Tuesday, ..., 6 = Sunday)
  const [selectedDay, setSelectedDay] = useState<DayOfWeek>(
    getInitialSelectedDay(stableInitialWeeklyAvailability)
  );

  // Update state when stableInitialWeeklyAvailability changes
  useEffect(() => {
    if (!weeklyAvailabilityDirty) {
      setWeeklyAvailability(stableInitialWeeklyAvailability);
      setSelectedDay(getInitialSelectedDay(stableInitialWeeklyAvailability));
    }
  }, [stableInitialWeeklyAvailability, weeklyAvailabilityDirty]);

  // Reset dirty flag after accepting external changes
  useEffect(() => {
    if (weeklyAvailability === stableInitialWeeklyAvailability) {
      setWeeklyAvailabilityDirty(false);
    }
  }, [weeklyAvailability, stableInitialWeeklyAvailability]);

  // Loading state for save operation
  const [isSaving, setIsSaving] = useState(false);

  // Mutation for updating availability
  const { mutateAsync: updateAvailability } = useUpdateAvailability();

  /**
   * Handle saving all availability changes
   */
  const handleSave = async () => {
    if (!memoizedRolesToUse || memoizedRolesToUse.length === 0) {
      console.error('At least one PractitionerRole is required');
      return;
    }

    setIsSaving(true);

    try {
      // Update each practitioner role with its organization-specific availability
      for (const role of memoizedRolesToUse) {
        // Get the organization ID for this role
        const orgId = role.organization?.reference || role.id;

        // Convert weekly availability to FHIR availableTime format for this specific organization
        const availableTime = convertToFhirAvailableTimeForOrganization(
          weeklyAvailability,
          orgId
        );

        await updateAvailability({
          practitionerRoleId: role.id,
          availableTime
        });
      }

      // Call success callback if provided
      if (onSuccess) {
        onSuccess();
      }

      // Mark dirty as cleared and update baseline so subsequent edits
      // are correctly detected as new unsaved changes.
      setWeeklyAvailabilityDirty(false);
      savedBaselineRef.current = structuredClone(weeklyAvailability);
    } catch (error) {
      console.error('Failed to update availability:', error);
    } finally {
      setIsSaving(false);
    }
  };

  // Stable ref to avoid effect loops from inline handleSave
  const saveRef = useRef(handleSave);
  saveRef.current = handleSave;

  // Track the last-saved availability so dirty detection works correctly after save.
  const savedBaselineRef = useRef<WeeklyAvailability>(
    stableInitialWeeklyAvailability
  );

  // Report dirty state to parent via onDirtyChange callback.
  // Pass a wrapper that reads saveRef.current at call time to avoid stale closures
  // when the user modifies multiple days before saving (the effect deps don't include
  // weeklyAvailability, so it won't re-fire when dirty is already true).
  useEffect(() => {
    if (onDirtyChange) {
      onDirtyChange(weeklyAvailabilityDirty, () => saveRef.current(), isSaving);
    }
  }, [weeklyAvailabilityDirty, isSaving, onDirtyChange]);

  /**
   * Handle adding a time range for a specific organization and day
   */
  const handleAddTimeRange = (organizationId: string, day: DayOfWeek) => {
    setWeeklyAvailability(prev => {
      const newAvailability = { ...prev };
      newAvailability[day] = { ...newAvailability[day] };
      const orgRanges = newAvailability[day][organizationId] || [];
      const newTimeRange: TimeRange = {
        id: generateTimeRangeId(),
        from: '09:00',
        to: '17:00'
      };

      newAvailability[day][organizationId] = [...orgRanges, newTimeRange];

      return newAvailability;
    });
    setWeeklyAvailabilityDirty(true);
  };

  /**
   * Handle updating a time range
   */
  const handleUpdateTimeRange = (
    organizationId: string,
    day: DayOfWeek,
    timeRangeId: string,
    field: 'from' | 'to',
    value: string
  ) => {
    setWeeklyAvailability(prev => {
      const newAvailability = { ...prev };
      newAvailability[day] = { ...newAvailability[day] };
      const orgRanges = newAvailability[day][organizationId] || [];

      newAvailability[day][organizationId] = orgRanges.map(range =>
        range.id === timeRangeId ? { ...range, [field]: value } : range
      );

      return newAvailability;
    });
    setWeeklyAvailabilityDirty(true);
  };

  /**
   * Handle deleting a time range
   */
  const handleDeleteTimeRange = (
    organizationId: string,
    day: DayOfWeek,
    timeRangeId: string
  ) => {
    setWeeklyAvailability(prev => {
      const newAvailability = { ...prev };
      newAvailability[day] = { ...newAvailability[day] };
      const orgRanges = newAvailability[day][organizationId] || [];

      newAvailability[day][organizationId] = orgRanges.filter(
        range => range.id !== timeRangeId
      );

      return newAvailability;
    });
    setWeeklyAvailabilityDirty(true);
  };

  // Get organizations from practitioner roles
  const organizations: UIOrganization[] = useMemo(() => {
    const orgs: UIOrganization[] = [];

    // Use the practitioner roles from props (with backward compatibility)
    if (memoizedRolesToUse && memoizedRolesToUse.length > 0) {
      memoizedRolesToUse.forEach((role, index) => {
        // Use organizationData.name if available (IPractitionerRoleDetail)
        if (isIPractitionerRoleDetail(role) && role.organizationData?.name) {
          orgs.push({
            id: role.organization?.reference || role.id || `unknown-${index}`,
            name: role.organizationData.name
          });
        } else if (role.organization) {
          // Fallback to organization.display for regular PractitionerRole
          orgs.push({
            id: role.organization.reference || role.id || `unknown-${index}`,
            name: role.organization.display || 'Unknown Organization'
          });
        } else {
          // If no organization reference, use role ID as fallback with deterministic fallback
          orgs.push({
            id: role.id || `unknown-${index}`,
            name: `Practice ${orgs.length + 1}`
          });
        }
      });
    }

    // Ensure we have at least one organization
    if (orgs.length === 0) {
      orgs.push({
        id: 'default',
        name: 'Default Organization'
      });
    }

    return orgs;
  }, [memoizedRolesToUse]);

  // Function to normalize availability for comparison (ignoring IDs)
  const normalizeAvailability = (avail: WeeklyAvailability) => {
    const obj = avail as Record<string, OrganizationTimeRanges>;
    const normalized: Record<
      string,
      Record<string, { from: string; to: string }[]>
    > = {};
    for (const day in avail) {
      if (!Object.hasOwn(obj, day)) continue;
      normalized[day] = {};
      for (const org in obj[day]) {
        if (!Object.hasOwn(obj[day], org)) continue;
        normalized[day][org] = obj[day][org]
          .map(({ from, to }) => ({ from, to }))
          .toSorted(
            (a, b) => a.from.localeCompare(b.from) || a.to.localeCompare(b.to)
          );
      }
    }
    return normalized;
  };

  // Check if there are any changes to save (against the last-saved baseline)
  const hasChanges = useMemo(() => {
    // Compare current state with last-saved baseline, ignoring generated IDs
    const normalizedCurrent = normalizeAvailability(weeklyAvailability);
    const normalizedInitial = normalizeAvailability(savedBaselineRef.current);
    return (
      JSON.stringify(normalizedCurrent) !== JSON.stringify(normalizedInitial)
    );
  }, [weeklyAvailability]);

  return (
    <div className='flex h-full flex-col pb-24 sm:pb-28 md:pb-32'>
      {/* Header */}
      <div className='border-b border-gray-200 px-6 py-4'>
        <h2 className='text-xl font-bold text-gray-900'>Edit Availability</h2>
        <p className='mt-1 text-sm text-gray-600'>
          Configure your weekly availability across all practice locations
        </p>
      </div>

      {/* Day Selector Navigation */}
      <div className='border-b border-gray-200 px-6 py-4'>
        <DaySelectorNavigation
          selectedDay={selectedDay}
          weeklyAvailability={weeklyAvailability}
          onSelectDay={setSelectedDay}
        />
      </div>

      {/* Availability Editor */}
      <div className='flex-1 overflow-y-auto px-6 py-4 pb-8 sm:pb-12 md:pb-16'>
        <AvailabilityEditor
          selectedDay={selectedDay}
          weeklyAvailability={weeklyAvailability}
          organizations={organizations}
          onAddTimeRange={handleAddTimeRange}
          onUpdateTimeRange={handleUpdateTimeRange}
          onDeleteTimeRange={handleDeleteTimeRange}
        />
      </div>

      {/* Floating Save Button — hidden when parent manages its own FAB (admin shell) */}
      {!hideSaveButton && (
        <FloatingSaveButton
          onSave={() => {
            handleSave().catch(console.error);
          }}
          onCancel={onCancel}
          isSaving={isSaving}
          hasChanges={hasChanges}
        />
      )}
    </div>
  );
}
