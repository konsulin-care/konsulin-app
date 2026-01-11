import AvailabilityEditor from '@/components/availability/availability-editor';
import DaySelectorNavigation from '@/components/availability/day-selector-navigation';
import FloatingSaveButton from '@/components/availability/floating-save-button';
import { LoadingSpinnerIcon } from '@/components/icons';
import { useAuth } from '@/context/auth/authContext';
import { useUpdateAvailability } from '@/services/api/schedule';
import {
  DayOfWeek,
  TimeRange,
  UIOrganization,
  WeeklyAvailability
} from '@/types/availability';
import {
  convertToFhirAvailableTime,
  generateTimeRangeId,
  getInitialSelectedDay,
  initializeWeeklyAvailability
} from '@/utils/availability';
import { useQuery } from '@tanstack/react-query';
import { PractitionerRole } from 'fhir/r4';
import { useMemo, useState } from 'react';

type Props = {
  practitionerRole: PractitionerRole;
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
  practitionerRole,
  onSuccess,
  onCancel
}: Props) {
  const { state: authState } = useAuth();
  const practitionerId = authState?.userInfo?.fhirId;

  // State for weekly availability across all organizations
  const [weeklyAvailability, setWeeklyAvailability] =
    useState<WeeklyAvailability>(
      initializeWeeklyAvailability(practitionerRole)
    );

  // Currently selected day (0 = Sunday, 1 = Monday, ..., 6 = Saturday)
  const [selectedDay, setSelectedDay] = useState<DayOfWeek>(
    getInitialSelectedDay(weeklyAvailability)
  );

  // Loading state for save operation
  const [isSaving, setIsSaving] = useState(false);

  // Mutation for updating availability
  const { mutateAsync: updateAvailability } = useUpdateAvailability();

  // Fetch practitioner role data to get organization references
  const { data: practitionerRoleData, isLoading: isLoadingRole } = useQuery({
    queryKey: ['practitioner-role', practitionerRole.id],
    queryFn: async () => {
      const response = await fetch(
        `/fhir/PractitionerRole/${practitionerRole.id}`
      );
      return response.json() as Promise<PractitionerRole>;
    },
    enabled: !!practitionerRole.id,
    staleTime: 5 * 60 * 1000
  });

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
    if (!practitionerRole.id) {
      console.error('PractitionerRole ID is required');
      return;
    }

    setIsSaving(true);

    try {
      // Convert weekly availability to FHIR availableTime format
      const availableTime = convertToFhirAvailableTime(weeklyAvailability);

      // Update the practitioner role
      await updateAvailability({
        practitionerRoleId: practitionerRole.id,
        availableTime
      });

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

  // Get organizations from practitioner role
  const organizations: UIOrganization[] = useMemo(() => {
    const orgs: UIOrganization[] = [];

    if (practitionerRoleData?.organization) {
      orgs.push({
        id: practitionerRoleData.organization.reference || 'default',
        name:
          practitionerRoleData.organization.display || 'Default Organization'
      });
    } else if (practitionerRole.organization) {
      orgs.push({
        id: practitionerRole.organization.reference || 'default',
        name: practitionerRole.organization.display || 'Default Organization'
      });
    } else {
      // Fallback if no organization is found
      orgs.push({
        id: 'default',
        name: 'Default Organization'
      });
    }

    return orgs;
  }, [practitionerRole, practitionerRoleData]);

  // Check if there are any changes to save
  const hasChanges = useMemo(() => {
    // Compare current state with initial state
    const initialAvailability = initializeWeeklyAvailability(practitionerRole);
    return (
      JSON.stringify(weeklyAvailability) !== JSON.stringify(initialAvailability)
    );
  }, [weeklyAvailability, practitionerRole]);

  if (isLoadingRole) {
    return (
      <div className='flex h-[400px] items-center justify-center'>
        <LoadingSpinnerIcon width={50} height={50} className='animate-spin' />
      </div>
    );
  }

  return (
    <div className='flex h-full flex-col'>
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
      <div className='flex-1 overflow-y-auto px-6 py-4'>
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
