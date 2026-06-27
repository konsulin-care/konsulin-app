'use client';

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useDetailPractitioner } from '@/services/clinic';
import { PractitionerRole } from 'fhir/r4';
import PractitionerAvailabilityEditor from './practitioner-availability-editor';
import ServicesTab from './services-tab';

type Props = {
  practitionerRoleId: string;
};

/**
 * Inject organization display name from the included Organization resource.
 * The PractitionerRole only stores `organization.reference`, not `display`.
 */
function enhanceWithOrgDisplay(
  role: PractitionerRole,
  org?: { name?: string }
): PractitionerRole {
  return {
    ...role,
    organization: {
      ...role.organization,
      display: org?.name ?? 'Clinic'
    }
  };
}

/**
 * Two-tab admin management shell for a practitioner role.
 *
 * Availability tab: renders PractitionerAvailabilityEditor with the fetched
 * role (same component used in /profile). Services tab: manages
 * HealthcareService resources.
 */
export default function PractitionerRoleManagementShell(props: Props) {
  const { newData: detail } = useDetailPractitioner(props.practitionerRoleId);

  return (
    <Tabs
      defaultValue='availability'
      className='w-full'
      data-role-id={props.practitionerRoleId}
    >
      <TabsList className='grid w-full grid-cols-2'>
        <TabsTrigger value='availability'>Availability</TabsTrigger>
        <TabsTrigger value='services'>Services</TabsTrigger>
      </TabsList>
      <TabsContent value='availability'>
        {detail?.resource ? (
          <PractitionerAvailabilityEditor
            practitionerRole={enhanceWithOrgDisplay(
              detail.resource,
              detail.organization
            )}
          />
        ) : null}
      </TabsContent>
      <TabsContent value='services'>
        <ServicesTab practitionerRoleId={props.practitionerRoleId} />
      </TabsContent>
    </Tabs>
  );
}
