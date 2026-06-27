'use client';

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useDetailPractitioner } from '@/services/clinic';
import { PractitionerRole } from 'fhir/r4';
import { useCallback, useState } from 'react';
import DynamicFloatingActionButton from './dynamic-floating-action-button';
import PractitionerAvailabilityEditor from './practitioner-availability-editor';
import ServicesTab from './services-tab';

type Props = {
  practitionerRoleId: string;
};

type DirtyState = {
  dirty: boolean;
  save: () => Promise<void>;
  saving: boolean;
};

/**
 * Inject organization display name from the included Organization resource.
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
 * Availability tab: renders PractitionerAvailabilityEditor (same as /profile).
 * Services tab: manages HealthcareService resources.
 * DynamicFloatingActionButton: single save button at shell level —
 * transforms to "Save Changes" when a tab has unsaved changes.
 */
export default function PractitionerRoleManagementShell(props: Props) {
  const { newData: detail } = useDetailPractitioner(props.practitionerRoleId);
  const [activeTab, setActiveTab] = useState('availability');
  const [availDirty, setAvailDirty] = useState<DirtyState | null>(null);
  const [svcDirty, setSvcDirty] = useState<DirtyState | null>(null);

  const currentDirty = activeTab === 'availability' ? availDirty : svcDirty;

  // Services tab default action: "Add Service" is triggered from the tab itself
  const handleDefaultAction = useCallback(() => {
    // The services tab has inline "Add Service" buttons — no FAB default needed
  }, []);

  const handleAvailDirtyChange = useCallback(
    (dirty: boolean, save: () => Promise<void>, saving: boolean) => {
      setAvailDirty(dirty ? { dirty, save, saving } : null);
    },
    []
  );

  const handleSvcDirtyChange = useCallback(
    (dirty: boolean, save: () => Promise<void>, saving: boolean) => {
      setSvcDirty(dirty ? { dirty, save, saving } : null);
    },
    []
  );

  return (
    <>
      <Tabs
        defaultValue='availability'
        className='w-full'
        data-role-id={props.practitionerRoleId}
        onValueChange={setActiveTab}
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
              hideSaveButton
              onDirtyChange={handleAvailDirtyChange}
            />
          ) : null}
        </TabsContent>
        <TabsContent value='services'>
          <ServicesTab
            practitionerRoleId={props.practitionerRoleId}
            onDirtyChange={handleSvcDirtyChange}
          />
        </TabsContent>
      </Tabs>

      <DynamicFloatingActionButton
        isDirty={currentDirty?.dirty ?? false}
        isSaving={currentDirty?.saving ?? false}
        label='Save Changes'
        onSave={currentDirty?.save}
        onDefaultAction={handleDefaultAction}
      />
    </>
  );
}
