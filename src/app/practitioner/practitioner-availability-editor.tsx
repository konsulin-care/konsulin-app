import AvailabilityEditor from '@/components/availability/availability-editor';
import DaySelectorNavigation from '@/components/availability/day-selector-navigation';
import FloatingSaveButton from '@/components/availability/floating-save-button';
import { useAuth } from '@/context/auth/authContext';
import { useUpdateAvailability } from '@/services/api/schedule';
import {
  DayOfWeek,
  TimeRange,
  UIOrganization,
  WeeklyAvailability
} from '@/types/availability';
import {
  convertToFhirAvailableTimeForOrganization,
  generateTimeRangeId,
  getInitialSelectedDay,
  initializeWeeklyAvailabilityFromRoles
} from '@/utils/availability';
import { PractitionerRole } from 'fhir/r4';
import { useMemo, useState } from 'react';

type Props = {
  practitionerRoles?: PractitionerRole[];
  practitionerRole?: PractitionerRole;
  onSuccess?: () => void;
  onCancel?: () => void;
};

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
  onCancel
}: Props) {
  const { state: authState } = useAuth();
  const practitionerId = authState?.userInfo?.fhirId;

  // Convert single practitionerRole to array for backward compatibility
  const rolesToUse =
    practitionerRoles || (practitionerRole ? [practitionerRole] : []);

  // State for weekly availability across all organizations
  const [weeklyAvailability, setWeeklyAvailability] =
    useState<WeeklyAvailability>(
      initializeWeeklyAvailabilityFromRoles(rolesToUse)
    );

  // Currently selected day (0 = Sunday, 1 = Monday, ..., 6 = Saturday)
  const [selectedDay, setSelectedDay] = useState<DayOfWeek>(
    getInitialSelectedDay(weeklyAvailability)
  );

  // Loading state for save operation
  const [isSaving, setIsSaving] = useState(false);

  // Mutation for updating availability
  const { mutateAsync: updateAvailability } = useUpdateAvailability();

  /**
   * Handle adding a time range for a specific organization and day
   */
  const handleAddTimeRange = (organizationId: string, day: DayOfWeek) => {
    setWeeklyAvailability(prev => {
      const newAvailability = { ...prev };
      const dayAvailability = newAvailability[day];

      if (dayAvailability) {
        const orgRanges = dayAvailability[organizationId] || [];
        const newTimeRange: TimeRange = {
          id: generateTimeRangeId(),
          from: '09:00',
          to: '17:00'
        };

        dayAvailability[organizationId] = [...orgRanges, newTimeRange];
      }

      return newAvailability;
    });
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
      const dayAvailability = newAvailability[day];

      if (dayAvailability && dayAvailability[organizationId]) {
        dayAvailability[organizationId] = dayAvailability[organizationId].map(
          range =>
            range.id === timeRangeId ? { ...range, [field]: value } : range
        );
      }

      return newAvailability;
    });
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
      const dayAvailability = newAvailability[day];

      if (dayAvailability && dayAvailability[organizationId]) {
        dayAvailability[organizationId] = dayAvailability[
          organizationId
        ].filter(range => range.id !== timeRangeId);
      }

      return newAvailability;
    });
  };

  /**
   * Handle saving all availability changes
   */
  const handleSave = async () => {
    if (!rolesToUse || rolesToUse.length === 0) {
      console.error('At least one PractitionerRole is required');
      return;
    }

    setIsSaving(true);

    try {
      // Update each practitioner role with its organization-specific availability
      for (const role of rolesToUse) {
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
    } catch (error) {
      console.error('Failed to update availability:', error);
    } finally {
      setIsSaving(false);
    }
  };

  // Get organizations from practitioner roles
  const organizations: UIOrganization[] = useMemo(() => {
    const orgs: UIOrganization[] = [];

    // Use the practitioner roles from props (with backward compatibility)
    if (rolesToUse && rolesToUse.length > 0) {
      rolesToUse.forEach(role => {
        // Use organizationData.name if available (IPractitionerRoleDetail)
        if ((role as any).organizationData?.name) {
          orgs.push({
            id: role.organization?.reference || role.id,
            name: (role as any).organizationData.name
          });
        } else if (role.organization) {
          // Fallback to organization.display for regular PractitionerRole
          orgs.push({
            id: role.organization.reference || role.id,
            name: role.organization.display || 'Unknown Organization'
          });
        } else {
          // If no organization reference, use role ID as fallback
          orgs.push({
            id: role.id,
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
  }, [rolesToUse]);

  // Check if there are any changes to save
  const hasChanges = useMemo(() => {
    // Compare current state with initial state
    const initialAvailability =
      initializeWeeklyAvailabilityFromRoles(rolesToUse);
    return (
      JSON.stringify(weeklyAvailability) !== JSON.stringify(initialAvailability)
    );
  }, [weeklyAvailability, rolesToUse]);

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

      {/* Floating Save Button */}
      <FloatingSaveButton
        onSave={handleSave}
        onCancel={onCancel}
        isSaving={isSaving}
        hasChanges={hasChanges}
      />
    </div>
  );
}
