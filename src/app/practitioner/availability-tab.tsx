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
import { useCallback, useMemo, useState } from 'react';

type Props = {
  practitionerRoleId: string;
};

/** Initialize full 7-day empty weekly structure, optionally from PractitionerRole. */
function initAvailability(
  availableTime?: {
    daysOfWeek?: string[];
    availableStartTime?: string;
    availableEndTime?: string;
  }[]
): WeeklyAvailability {
  const DAYS = [0, 1, 2, 3, 4, 5, 6] as DayOfWeek[];
  const weekly = {} as WeeklyAvailability;
  DAYS.forEach(day => {
    weekly[day] = {};
  });
  if (!availableTime) return weekly;
  for (const slot of availableTime) {
    for (const dayStr of slot.daysOfWeek ?? []) {
      const dayMap: Record<string, DayOfWeek> = {
        mon: 0,
        tue: 1,
        wed: 2,
        thu: 3,
        fri: 4,
        sat: 5,
        sun: 6
      };
      const d = dayMap[dayStr.toLowerCase()];
      if (d === undefined) continue;
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

/** Convert WeeklyAvailability to FHIR availableTime. */
function weeklyToAvailableTime(weekly: WeeklyAvailability): {
  daysOfWeek: string[];
  availableStartTime: string;
  availableEndTime: string;
}[] {
  const DAY_NAMES = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];
  const result: {
    daysOfWeek: string[];
    availableStartTime: string;
    availableEndTime: string;
  }[] = [];
  for (const [dayIdx, orgRanges] of Object.entries(weekly)) {
    for (const ranges of Object.values(orgRanges)) {
      for (const range of ranges) {
        result.push({
          daysOfWeek: [DAY_NAMES[Number(dayIdx)]],
          availableStartTime: `${range.from}:00`,
          availableEndTime: `${range.to}:00`
        });
      }
    }
  }
  return result;
}

/**
 * Availability management tab.
 *
 * Uses DaySelectorNavigation, AvailabilityEditor, FloatingSaveButton.
 * Saves via a single FHIR transaction bundle (PUT PractitionerRole).
 * Dirty tracking uses a local override (dirtyAvailability) to avoid
 * stale-state race conditions between data fetch and render.
 */
export default function AvailabilityTab({ practitionerRoleId }: Props) {
  const { newData: detail, isLoading } =
    useDetailPractitioner(practitionerRoleId);

  // Base availability derived from fetched data — always in sync
  const baseAvailability = useMemo(
    () => initAvailability(detail?.resource?.availableTime),
    [detail]
  );

  // Dirty override: when user edits, switches to dirty state
  const [dirtyAvailability, setDirtyAvailability] =
    useState<WeeklyAvailability | null>(null);
  const [dirtySelectedDay, setDirtySelectedDay] = useState<DayOfWeek | null>(
    null
  );
  const [isSaving, setIsSaving] = useState(false);

  // weeklyAvailability is always a full 7-day structure (initAvailability guarantees it)
  const weeklyAvailability = dirtyAvailability ?? baseAvailability;
  const defaultDay = getInitialSelectedDay(baseAvailability);
  const selectedDay = dirtySelectedDay ?? defaultDay;
  const isDirty = dirtyAvailability !== null;

  const markDirty = useCallback(
    (update: (prev: WeeklyAvailability) => WeeklyAvailability) => {
      setDirtyAvailability(prev => {
        const base = prev ?? baseAvailability;
        return update(structuredClone(base));
      });
      setDirtySelectedDay(prev => prev ?? defaultDay);
    },
    [baseAvailability, defaultDay]
  );

  const handleResetDirty = useCallback(() => {
    setDirtyAvailability(null);
    setDirtySelectedDay(null);
  }, []);

  const organizations: UIOrganization[] = useMemo(
    () => [{ id: 'current', name: 'Current Practice' }],
    []
  );

  const handleAddTimeRange = useCallback(
    (organizationId: string, day: DayOfWeek) => {
      markDirty(prev => {
        if (!prev[day]) prev[day] = {};
        const orgRanges = prev[day][organizationId] || [];
        prev[day][organizationId] = [
          ...orgRanges,
          { id: generateTimeRangeId(), from: '09:00', to: '17:00' }
        ];
        return prev;
      });
    },
    [markDirty]
  );

  const handleUpdateTimeRange = useCallback(
    (
      organizationId: string,
      day: DayOfWeek,
      timeRangeId: string,
      field: 'from' | 'to',
      value: string
    ) => {
      markDirty(prev => {
        const orgRanges = (prev[day]?.[organizationId] ?? []).map(r =>
          r.id === timeRangeId ? { ...r, [field]: value } : r
        );
        prev[day] = { ...prev[day], [organizationId]: orgRanges };
        return prev;
      });
    },
    [markDirty]
  );

  const handleDeleteTimeRange = useCallback(
    (organizationId: string, day: DayOfWeek, timeRangeId: string) => {
      markDirty(prev => {
        const orgRanges = (prev[day]?.[organizationId] ?? []).filter(
          r => r.id !== timeRangeId
        );
        prev[day] = { ...prev[day], [organizationId]: orgRanges };
        return prev;
      });
    },
    [markDirty]
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
      handleResetDirty();
    } catch (error) {
      console.error('Failed to save availability:', error);
    } finally {
      setIsSaving(false);
    }
  }, [weeklyAvailability, detail, handleResetDirty]);

  if (isLoading) {
    return (
      <div className='flex items-center justify-center py-12 text-sm text-gray-500'>
        Loading availability...
      </div>
    );
  }

  return (
    <div className='flex h-full flex-col pb-24 sm:pb-28 md:pb-32'>
      <div className='border-b border-gray-200 px-6 py-4'>
        <DaySelectorNavigation
          selectedDay={selectedDay}
          weeklyAvailability={weeklyAvailability}
          onSelectDay={setDirtySelectedDay}
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
