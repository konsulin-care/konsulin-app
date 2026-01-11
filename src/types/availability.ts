import { PractitionerRole } from 'fhir/r4';

// Day of week enum (0 = Monday, 6 = Sunday)
export type DayOfWeek = 0 | 1 | 2 | 3 | 4 | 5 | 6;

// Time range for a single availability slot
export type TimeRange = {
  id: string;
  from: string; // HH:mm format
  to: string; // HH:mm format
};

export type OrganizationTimeRanges = {
  [organizationId: string]: TimeRange[];
};

// Weekly availability structure (day-indexed)
export type WeeklyAvailability = {
  [day in DayOfWeek]: OrganizationTimeRanges;
};

// Simple organization type for UI
export type UIOrganization = {
  id: string;
  name: string;
};

// Component state
export interface AvailabilityEditorState {
  selectedDay: DayOfWeek;
  weeklyAvailability: WeeklyAvailability;
  organizations: UIOrganization[];
  isDirty: boolean;
  isSaving: boolean;
}

// Day selector props
export interface DaySelectorNavigationProps {
  selectedDay: DayOfWeek;
  weeklyAvailability: WeeklyAvailability;
  onSelectDay: (day: DayOfWeek) => void;
}

// Availability editor props
export interface AvailabilityEditorProps {
  selectedDay: DayOfWeek;
  weeklyAvailability: WeeklyAvailability;
  organizations: UIOrganization[];
  onAddTimeRange: (organizationId: string, day: DayOfWeek) => void;
  onUpdateTimeRange: (
    organizationId: string,
    day: DayOfWeek,
    timeRangeId: string,
    field: 'from' | 'to',
    value: string
  ) => void;
  onDeleteTimeRange: (
    organizationId: string,
    day: DayOfWeek,
    timeRangeId: string
  ) => void;
}

// Organization card props
export interface OrganizationCardProps {
  organization: UIOrganization;
  timeRanges: TimeRange[];
  onTimeRangeAdd: () => void;
  onTimeRangeRemove: (timeRangeId: string) => void;
  onTimeRangeChange: (
    timeRangeId: string,
    field: 'from' | 'to',
    value: string
  ) => void;
}

// Floating save button props
export interface FloatingSaveButtonProps {
  isSaving: boolean;
  hasChanges: boolean;
  onSave: () => void;
  onCancel?: () => void;
}

// Main component props
export interface PractitionerAvailabilityEditorProps {
  practitionerRole: PractitionerRole;
  onSuccess?: () => void;
  onCancel?: () => void;
}
