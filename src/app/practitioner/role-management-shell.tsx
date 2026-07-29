'use client';

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Roles } from '@/constants/roles';
import { useAuth } from '@/context/auth/authContext';
import { useFab } from '@/context/fabContext';
import { useDetailPractitioner } from '@/services/clinic-practitioners';
import { PractitionerRole } from 'fhir/r4';
import { useCallback, useMemo } from 'react';
import PractitionerAvailabilityEditor from './practitioner-availability-editor';
import ServicesTab from './services-tab';

type Props = {
  readonly practitionerRoleId: string;
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
  const { dispatch } = useFab();
  const { state: authState } = useAuth();

  const handleDirtyChange = useCallback(
    (dirty: boolean, save: () => Promise<void>, saving: boolean) => {
      if (dirty) {
        dispatch({
          type: 'SET_ACTION',
          config: {
            label: 'Save Changes',
            onAction: save,
            isSaving: saving,
            variant: 'primary'
          }
        });
      } else {
        dispatch({ type: 'SET_ACTION', config: null });
      }
    },
    [dispatch]
  );

  // Stable prop reference — prevents editor from re-computing
  // stableInitialWeeklyAvailability and triggering the reset effect
  // after save when the shell re-renders due to FabDirtyContext changes.
  const enhancedRole = useMemo(
    () =>
      detail?.resource
        ? enhanceWithOrgDisplay(detail.resource, detail.organization)
        : undefined,
    [detail?.resource, detail?.organization]
  );

  // Only ClinicAdmin and Practitioner roles can access the management shell.
  // Practitioner access is gated at the parent route (page.tsx / availability/page.tsx)
  // via ownership check.
  if (
    authState?.userInfo?.role_name !== Roles.ClinicAdmin &&
    authState?.userInfo?.role_name !== Roles.Practitioner
  ) {
    return null;
  }

  return (
    <Tabs
      defaultValue='availability'
      className='w-full'
      data-role-id={props.practitionerRoleId}
    >
      <TabsList className='grid w-full grid-cols-2'>
        <TabsTrigger value='availability' className='tab-active text-black'>
          Availability
        </TabsTrigger>
        <TabsTrigger value='services' className='tab-active text-black'>
          Services
        </TabsTrigger>
      </TabsList>
      <TabsContent value='availability'>
        {enhancedRole ? (
          <PractitionerAvailabilityEditor
            practitionerRole={enhancedRole}
            hideSaveButton
            onDirtyChange={handleDirtyChange}
          />
        ) : null}
      </TabsContent>
      <TabsContent value='services'>
        <ServicesTab
          practitionerRoleId={props.practitionerRoleId}
          practitionerRole={detail?.resource}
          onDirtyChange={handleDirtyChange}
        />
      </TabsContent>
    </Tabs>
  );
}
