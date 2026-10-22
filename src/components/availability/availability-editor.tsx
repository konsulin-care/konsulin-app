'use client';

import { useTranslations } from '@/i18n';
import { AvailabilityEditorProps } from '@/types/availability';
import { getDayName } from '@/utils/availability';
import OrganizationCard from './organization-card';

/**
 *
 */
export default function AvailabilityEditor({
  selectedDay,
  weeklyAvailability,
  organizations,
  onAddTimeRange,
  onDeleteTimeRange,
  onUpdateTimeRange
}: AvailabilityEditorProps) {
  const t = useTranslations('common');
  const dayAvailability = weeklyAvailability[selectedDay];

  return (
    <div className='space-y-4'>
      <h2 className='text-lg font-semibold text-gray-900'>
        {t('location.day_availability', { day: getDayName(selectedDay) })}
      </h2>

      {organizations.length === 0 ? (
        <div className='rounded-lg border border-dashed border-gray-300 bg-gray-50 p-8 text-center'>
          <p className='text-sm text-gray-500'>{t('location.no_locations')}</p>
        </div>
      ) : (
        <div className='space-y-4'>
          {organizations.map(organization => (
            <OrganizationCard
              key={organization.id}
              organization={organization}
              timeRanges={dayAvailability[organization.id] || []}
              onTimeRangeAdd={() =>
                onAddTimeRange(organization.id, selectedDay)
              }
              onTimeRangeRemove={timeRangeId =>
                onDeleteTimeRange(organization.id, selectedDay, timeRangeId)
              }
              onTimeRangeChange={(timeRangeId, field, value) =>
                onUpdateTimeRange(
                  organization.id,
                  selectedDay,
                  timeRangeId,
                  field,
                  value
                )
              }
            />
          ))}
        </div>
      )}
    </div>
  );
}
