'use client';

import { usePractitionerRoleHealthcareServices } from '@/services/clinic';
import type { HealthcareService } from 'fhir/r4';

type Props = {
  practitionerRoleId?: string;
};

/**
 * Tab content for managing HealthcareService resources.
 *
 * Shows a list of services with add/edit/delete capabilities.
 * Changes are saved collectively via Save All → FHIR transaction bundle.
 */
export default function ServicesTab({ practitionerRoleId }: Props) {
  const { data: services } = usePractitionerRoleHealthcareServices(
    practitionerRoleId ?? ''
  );

  if (!services || services.length === 0) {
    return (
      <div className='py-8 text-center text-sm text-gray-500'>
        No healthcare services configured.
      </div>
    );
  }

  return (
    <div className='space-y-3 py-4'>
      {services.map((svc: HealthcareService) => (
        <div
          key={svc.id}
          className='card rounded-lg border border-gray-200 bg-white p-4'
        >
          <div className='flex items-start justify-between'>
            <div>
              <div className='text-sm font-bold'>{svc.name}</div>
              {svc.extraDetails && (
                <div className='mt-1 text-xs text-gray-500'>
                  {svc.extraDetails}
                </div>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
