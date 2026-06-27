'use client';

import AvailabilityEditor from '@/components/availability/availability-editor';
import DaySelectorNavigation from '@/components/availability/day-selector-navigation';
import FloatingSaveButton from '@/components/availability/floating-save-button';
import { submitFhirBundle } from '@/services/api/fhir-bundle';
import { useDetailPractitioner } from '@/services/clinic';
import {
  DayOfWeek,
  UIOrganization,
  WeeklyAvailability
} from '@/types/availability';
import {
  generateTimeRangeId,
  getInitialSelectedDay
} from '@/utils/availability';
import type { Bundle } from 'fhir/r4';
import { useCallback, useEffect, useMemo, useState } from 'react';

type Props = {
  practitionerRoleId: string;
};

/**
 * Initialize WeeklyAvailability from a single PractitionerRole's availableTime.
 */
function initAvailability(
  availableTime:
    | {
        daysOfWeek?: string[];
        availableStartTime?: string;
        availableEndTime?: string;
      }[]
    | undefined
): WeeklyAvailability {
  const weekly: WeeklyAvailability = {} as WeeklyAvailability;
  (
    ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'] as unknown as DayOfWeek[]
  ).forEach(day => {
    weekly[day] = {};
  });

  if (!availableTime) return weekly;

  for (const slot of availableTime) {
    const days = slot.daysOfWeek ?? [];
    for (const day of days) {
      const d = day.toLowerCase() as unknown as DayOfWeek;
      if (!weekly[d]) weekly[d] = {};
      const orgId = 'current';
      if (!weekly[d][orgId]) weekly[d][orgId] = [];
      weekly[d][orgId].push({
        id: generateTimeRangeId(),
        from: slot.availableStartTime?.slice(0, 5) ?? '09:00',
        to: slot.availableEndTime?.slice(0, 5) ?? '17:00'
      });
    }
  }

  return weekly;
}

/**
 * Convert WeeklyAvailability back to FHIR availableTime format for the bundle.
 */
function weeklyToAvailableTime(
  weekly: WeeklyAvailability
): {
  daysOfWeek: string[];
  availableStartTime: string;
  availableEndTime: string;
}[] {
  const result: {
    daysOfWeek: string[];
    availableStartTime: string;
    availableEndTime: string;
  }[] = [];

  for (const [day, orgRanges] of Object.entries(weekly)) {
    for (const ranges of Object.values(orgRanges)) {
      for (const range of ranges) {
        result.push({
          daysOfWeek: [day],
          availableStartTime: `${range.from}:00`,
          availableEndTime: `${range.to}:00`
        });
      }
    }
  }

  return result;
}

/**
 * Availability management tab for the practitioner role shell.
 *
 * Uses the same reusable UI components as PractitionerAvailabilityEditor
 * (DaySelectorNavigation, AvailabilityEditor, FloatingSaveButton) but
 * saves via a single FHIR transaction bundle instead of direct PUTs.
 */
export default function AvailabilityTab({ practitionerRoleId }: Props) {
  const { newData: detail, isLoading } =
    useDetailPractitioner(practitionerRoleId);

  const initialWeekly = useMemo(
    () =>
      detail?.resource
        ? initAvailability(detail.resource.availableTime)
        : ({} as WeeklyAvailability),
    [detail]
  );

  const [weeklyAvailability, setWeeklyAvailability] =
    useState<WeeklyAvailability>(initialWeekly);
  const [selectedDay, setSelectedDay] = useState<DayOfWeek>(
    getInitialSelectedDay(initialWeekly)
  );
  const [isSaving, setIsSaving] = useState(false);
  const [isDirty, setIsDirty] = useState(false);

  // Sync initial state when detail data loads
  useEffect(() => {
    if (detail?.resource && !isDirty) {
      const fresh = initAvailability(detail.resource.availableTime);
      setWeeklyAvailability(fresh);
      setSelectedDay(getInitialSelectedDay(fresh));
    }
  }, [detail?.resource, isDirty]);

  const organizations: UIOrganization[] = useMemo(
    () => [{ id: 'current', name: 'Current Practice' }],
    []
  );

  const handleAddTimeRange = useCallback(
    (organizationId: string, day: DayOfWeek) => {
      setWeeklyAvailability(prev => {
        const next = { ...prev };
        if (!next[day]) next[day] = {};
        const orgRanges = next[day][organizationId] || [];
        next[day] = {
          ...next[day],
          [organizationId]: [
            ...orgRanges,
            { id: generateTimeRangeId(), from: '09:00', to: '17:00' }
          ]
        };
        return next;
      });
      setIsDirty(true);
    },
    []
  );

  const handleUpdateTimeRange = useCallback(
    (
      organizationId: string,
      day: DayOfWeek,
      timeRangeId: string,
      field: 'from' | 'to',
      value: string
    ) => {
      setWeeklyAvailability(prev => {
        const next = { ...prev };
        const orgRanges = (next[day]?.[organizationId] ?? []).map(r =>
          r.id === timeRangeId ? { ...r, [field]: value } : r
        );
        next[day] = { ...next[day], [organizationId]: orgRanges };
        return next;
      });
      setIsDirty(true);
    },
    []
  );

  const handleDeleteTimeRange = useCallback(
    (organizationId: string, day: DayOfWeek, timeRangeId: string) => {
      setWeeklyAvailability(prev => {
        const next = { ...prev };
        const orgRanges = (next[day]?.[organizationId] ?? []).filter(
          r => r.id !== timeRangeId
        );
        next[day] = { ...next[day], [organizationId]: orgRanges };
        return next;
      });
      setIsDirty(true);
    },
    []
  );

  const handleSave = useCallback(async () => {
    if (!detail?.resource?.id) return;
    setIsSaving(true);

    try {
      const availableTime = weeklyToAvailableTime(weeklyAvailability);
      const bundle: Bundle = {
        resourceType: 'Bundle',
        type: 'transaction',
        entry: [
          {
            resource: {
              ...detail.resource,
              resourceType: 'PractitionerRole',
              availableTime
            } as unknown as import('fhir/r4').BundleEntry['resource'],
            request: {
              method: 'PUT' as const,
              url: `PractitionerRole/${detail.resource.id}`
            }
          }
        ]
      };

      await submitFhirBundle(bundle);
      setIsDirty(false);
    } catch (error) {
      console.error('Failed to save availability:', error);
    } finally {
      setIsSaving(false);
    }
  }, [weeklyAvailability, detail]);

  if (isLoading) {
    return (
      <div className='flex items-center justify-center py-12 text-sm text-gray-500'>
        Loading availability...
      </div>
    );
  }

  if (!detail?.resource) {
    return (
      <div className='py-8 text-center text-sm text-gray-500'>
        No schedule data available.
      </div>
    );
  }

  return (
    <div className='flex h-full flex-col pb-24 sm:pb-28 md:pb-32'>
      <div className='border-b border-gray-200 px-6 py-4'>
        <DaySelectorNavigation
          selectedDay={selectedDay}
          weeklyAvailability={weeklyAvailability}
          onSelectDay={setSelectedDay}
        />
      </div>

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

      <FloatingSaveButton
        onSave={() => {
          handleSave().catch(console.error);
        }}
        isSaving={isSaving}
        hasChanges={isDirty}
      />
    </div>
  );
}
