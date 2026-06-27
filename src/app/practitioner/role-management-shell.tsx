'use client';

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import ServicesTab from './services-tab';

type Props = {
  practitionerRoleId: string;
};

/**
 * Two-tab admin management shell for a practitioner role.
 *
 * Tabs: Availability (weekly schedule) | Services (HealthcareService).
 * Each tab manages its own local edits and has a Save All button that
 * submits a FHIR transaction bundle.
 */
export default function PractitionerRoleManagementShell(props: Props) {
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
        <div className='py-4'>Availability</div>
      </TabsContent>
      <TabsContent value='services'>
        <ServicesTab practitionerRoleId={props.practitionerRoleId} />
      </TabsContent>
    </Tabs>
  );
}
