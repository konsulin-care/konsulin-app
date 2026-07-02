'use client';

import { LoadingSpinnerIcon } from '@/components/icons';
import { Badge } from '@/components/ui/badge';
import {
  useDetailPractitioner,
  usePractitionerRoleHealthcareServices
} from '@/services/clinic';

type Props = {
  readonly practitionerRoleId: string;
};

/**
 * Patient-facing practitioner detail page.
 *
 * Shows name, specialty badges, clinic location, and a list of
 * healthcare services with fees (from Invoice).
 */
export default function PatientDetail({ practitionerRoleId }: Props) {
  const { newData: detail, isLoading } =
    useDetailPractitioner(practitionerRoleId);
  const { data: services } =
    usePractitionerRoleHealthcareServices(practitionerRoleId);

  if (isLoading) {
    return (
      <div className='flex min-h-[40vh] items-center justify-center'>
        <LoadingSpinnerIcon
          width={56}
          height={56}
          className='w-full animate-spin'
        />
      </div>
    );
  }

  if (!detail) return null;

  const practitionerName =
    detail.resource.practitioner?.display ?? 'Practitioner';
  const specialties = detail.resource.specialty?.map(s => s.text) ?? [];
  const orgName = detail.organization?.name ?? '';

  return (
    <div className='flex flex-col gap-4'>
      {/* Header: name + specialties */}
      <div>
        <h2 className='text-lg font-bold text-black'>{practitionerName}</h2>
        <div className='mt-2 flex flex-wrap gap-1'>
          {specialties.map(s => (
            <Badge key={s} className='bg-[#E1E1E1] text-[11px] text-black'>
              {s}
            </Badge>
          ))}
        </div>
      </div>

      {/* Clinic location */}
      {orgName && (
        <div>
          <div className='text-sm text-gray-500'>Location</div>
          <div className='text-sm font-medium text-black'>{orgName}</div>
        </div>
      )}

      {/* Healthcare services with fees */}
      <div>
        <div className='mb-2 text-sm font-bold text-black'>
          Healthcare Services
        </div>
        {services && services.length > 0 ? (
          <div className='flex flex-col gap-2'>
            {services.map(svc => (
              <div
                key={svc.id}
                className='flex items-center justify-between rounded-lg bg-[#F9F9F9] p-3'
              >
                <span className='text-sm text-black'>{svc.name}</span>
                {svc.extraDetails && (
                  <span className='text-sm font-bold text-[#13C2C2]'>
                    {svc.extraDetails}
                  </span>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className='text-sm text-gray-500'>No services listed</div>
        )}
      </div>
    </div>
  );
}
