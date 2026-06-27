'use client';

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Roles } from '@/constants/roles';
import { useAuth } from '@/context/auth/authContext';
import { useFabDirty } from '@/context/fabDirtyContext';
import { useDetailPractitioner } from '@/services/clinic';
import { PractitionerRole } from 'fhir/r4';
import { useCallback } from 'react';
import PractitionerAvailabilityEditor from './practitioner-availability-editor';
import ServicesTab from './services-tab';

type Props = {
  practitionerRoleId: string;
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
 * Two-tab admin shell for a practitioner role.
 *
 * Sets dirty state on the global FabDirtyContext so QuickActionFab morphs
 * into a "Save Changes" button when the active tab has unsaved changes.
 */
export default function PractitionerRoleManagementShell(props: Props) {
  const { newData: detail } = useDetailPractitioner(props.practitionerRoleId);
  const { setDirtyState } = useFabDirty();
  const { state: authState } = useAuth();

  const handleDirtyChange = useCallback(
    (dirty: boolean, save: () => Promise<void>, saving: boolean) => {
      if (dirty) {
        setDirtyState({
          isDirty: true,
          label: 'Save Changes',
          onSave: save,
          isSaving: saving
        });
      } else {
        setDirtyState(null);
      }
    },
    [setDirtyState]
  );

  // Only ClinicAdmin users see the management shell
  if (authState?.userInfo?.role_name !== Roles.ClinicAdmin) {
    return null;
  }

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
            hideSaveButton
            onDirtyChange={handleDirtyChange}
          />
        ) : null}
      </TabsContent>
      <TabsContent value='services'>
        <ServicesTab
          practitionerRoleId={props.practitionerRoleId}
          onDirtyChange={handleDirtyChange}
        />
      </TabsContent>
    </Tabs>
  );
}
