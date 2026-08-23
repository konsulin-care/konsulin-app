'use client';

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger
} from '@/components/ui/accordion';
import { Roles } from '@/constants/roles';
import { useAuth } from '@/context/auth/authContext';
import { useFab } from '@/context/fabContext';
import { useDetailPractitioner } from '@/services/clinic-practitioners';
import { PractitionerRole } from 'fhir/r4';
import { useCallback, useEffect, useMemo, useState } from 'react';
import PractitionerAvailabilityEditor from './practitioner-availability-editor';
import ServicesTab from './services-tab';
import SpecialtySection from './specialty-section';

type Props = {
  readonly practitionerRoleId: string;
};

/** Per-section editor status reported through the dirty coordinator. */
type SectionStatus = {
  dirty: boolean;
  save: () => Promise<void>;
  saving: boolean;
};

type DirtyHandler = (
  dirty: boolean,
  save: () => Promise<void>,
  saving: boolean
) => void;

/** Props forwarded to the accordion markup component. */
type AccordionProps = {
  readonly practitionerRoleId: string;
  readonly enhancedRole?: PractitionerRole;
  readonly resource?: PractitionerRole;
  readonly sections: Record<string, SectionStatus>;
  readonly onAvailabilityDirty: DirtyHandler;
  readonly onServicesDirty: DirtyHandler;
  readonly onSpecialtyDirty: DirtyHandler;
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

/** Dirty indicator dot rendered on accordion triggers. */
function DirtyDot({ sectionId }: { readonly sectionId: string }) {
  return (
    <span
      className='bg-primary ml-1 inline-block h-2 w-2 rounded-full'
      data-testid={`dirty-dot-${sectionId}`}
      aria-label='Unsaved changes'
    />
  );
}

/** Accordion trigger label with an optional dirty dot. */
function SectionTrigger({
  label,
  sectionId,
  dirty
}: {
  readonly label: string;
  readonly sectionId: string;
  readonly dirty: boolean;
}) {
  return (
    <>
      {label}
      {dirty ? <DirtyDot sectionId={sectionId} /> : null}
    </>
  );
}

/**
 * Accordion markup. Every section is force-mounted (closed content hidden
 * via CSS), so switching sections preserves unsaved edits in all editors.
 */
function RoleAccordion({
  practitionerRoleId,
  enhancedRole,
  resource,
  sections,
  onAvailabilityDirty,
  onServicesDirty,
  onSpecialtyDirty
}: AccordionProps) {
  const availabilityDirty = sections.availability?.dirty ?? false;
  const servicesDirty = sections.services?.dirty ?? false;
  const specialtyDirty = sections.specialty?.dirty ?? false;

  return (
    <Accordion
      type='multiple'
      defaultValue={['availability']}
      className='w-full'
      data-role-id={practitionerRoleId}
    >
      <AccordionItem value='availability'>
        <AccordionTrigger>
          <SectionTrigger
            label='Availability'
            sectionId='availability'
            dirty={availabilityDirty}
          />
        </AccordionTrigger>
        <AccordionContent forceMount className='[&[data-state=closed]]:hidden'>
          {enhancedRole ? (
            <PractitionerAvailabilityEditor
              practitionerRole={enhancedRole}
              hideSaveButton
              onDirtyChange={onAvailabilityDirty}
            />
          ) : null}
        </AccordionContent>
      </AccordionItem>

      <AccordionItem value='services'>
        <AccordionTrigger>
          <SectionTrigger
            label='Services'
            sectionId='services'
            dirty={servicesDirty}
          />
        </AccordionTrigger>
        <AccordionContent forceMount className='[&[data-state=closed]]:hidden'>
          <ServicesTab
            practitionerRoleId={practitionerRoleId}
            practitionerRole={resource}
            onDirtyChange={onServicesDirty}
          />
        </AccordionContent>
      </AccordionItem>

      <AccordionItem value='specialty'>
        <AccordionTrigger>
          <SectionTrigger
            label='Specialty'
            sectionId='specialty'
            dirty={specialtyDirty}
          />
        </AccordionTrigger>
        <AccordionContent forceMount className='[&[data-state=closed]]:hidden'>
          {resource ? (
            <SpecialtySection
              practitionerRole={resource}
              onDirtyChange={onSpecialtyDirty}
            />
          ) : null}
        </AccordionContent>
      </AccordionItem>
    </Accordion>
  );
}

/**
 * Three-section admin shell for a practitioner role (Availability, Services,
 * Specialty) as an accordion. Each section reports its dirty state, save
 * handler, and saving flag to this coordinator; the coordinator aggregates
 * them into one global FAB "Save Changes" action that runs every dirty
 * section's save then refetches the role.
 */
export default function PractitionerRoleManagementShell(props: Props) {
  const { newData: detail, refetch } = useDetailPractitioner(
    props.practitionerRoleId
  );
  const { dispatch } = useFab();
  const { state: authState } = useAuth();
  const [sections, setSections] = useState<Record<string, SectionStatus>>({});

  const setSectionStatus = useCallback(
    (sectionId: string, status: SectionStatus) => {
      setSections(prev => ({ ...prev, [sectionId]: status }));
    },
    []
  );

  const handleAvailabilityDirty = useCallback<DirtyHandler>(
    (dirty, save, saving) => {
      setSectionStatus('availability', { dirty, save, saving });
    },
    [setSectionStatus]
  );

  const handleServicesDirty = useCallback<DirtyHandler>(
    (dirty, save, saving) => {
      setSectionStatus('services', { dirty, save, saving });
    },
    [setSectionStatus]
  );

  const handleSpecialtyDirty = useCallback<DirtyHandler>(
    (dirty, save, saving) => {
      setSectionStatus('specialty', { dirty, save, saving });
    },
    [setSectionStatus]
  );

  const anyDirty = Object.values(sections).some(section => section.dirty);
  const anySaving = Object.values(sections).some(section => section.saving);

  /** Run every dirty section's save, then refetch the role for a round-trip. */
  const handleFabSave = useCallback(async () => {
    const dirtySections = Object.values(sections).filter(
      section => section.dirty
    );
    await Promise.all(dirtySections.map(section => section.save()));
    await refetch();
  }, [sections, refetch]);

  // Aggregate the FAB action: one "Save Changes" button for all dirty
  // sections, mirroring the previous single-tab FAB wiring.
  useEffect(() => {
    if (anyDirty) {
      dispatch({
        type: 'SET_ACTION',
        config: {
          label: 'Save Changes',
          onAction: () => handleFabSave(),
          isSaving: anySaving,
          variant: 'primary'
        }
      });
    } else {
      dispatch({ type: 'SET_ACTION', config: null });
    }
  }, [anyDirty, anySaving, handleFabSave, dispatch]);

  // Stable prop reference — prevents the availability editor from
  // re-computing its initial availability after save when the shell
  // re-renders due to FabDirtyContext changes.
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
    <RoleAccordion
      practitionerRoleId={props.practitionerRoleId}
      enhancedRole={enhancedRole}
      resource={detail?.resource}
      sections={sections}
      onAvailabilityDirty={handleAvailabilityDirty}
      onServicesDirty={handleServicesDirty}
      onSpecialtyDirty={handleSpecialtyDirty}
    />
  );
}
