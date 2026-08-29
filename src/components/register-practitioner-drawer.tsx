'use client';

import AppDrawer from '@/components/ui/app-drawer';
import { STORES, dbGet } from '@/lib/indexeddb';
import { getAPI } from '@/services/api';
import { useOrganizationLocations } from '@/services/clinic-practitioners';
import { useQueryClient } from '@tanstack/react-query';
import { useCallback, useEffect, useState } from 'react';
import { toast } from 'react-toastify';
import RegisterPractitionerDrawerContent from './register-practitioner-drawer/drawer-content';
import {
  resolveOrCreatePractitioner,
  resolveOrCreatePractitionerRole,
  resolveOrCreateSchedule
} from './register-practitioner.utils';

type Props = {
  readonly open: boolean;
  readonly onClose: () => void;
};

export type LocationOption = { id: string; name: string };

/**
 * Drawer for registering a new practitioner via FHIR pipeline.
 *
 * 3-step process: Practitioner → PractitionerRole → Schedule.
 * Reads clinic_organization from IndexedDB and fetches Location resources
 * via useOrganizationLocations. Admin must select a location for registration.
 */
export default function RegisterPractitionerDrawer({ open, onClose }: Props) {
  const queryClient = useQueryClient();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [orgId, setOrgId] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedLocationId, setSelectedLocationId] = useState<string | null>(
    null
  );

  // Reset form fields every time the drawer opens
  useEffect(() => {
    if (!open) return;
    setName('');
    setEmail('');
    setSelectedLocationId(null);
    setIsSubmitting(false);
  }, [open]);

  // Load clinic organization from IndexedDB on mount
  useEffect(() => {
    if (!open) return;
    dbGet<{ value: string }>(STORES.uiPreferences, ['', 'clinic_organization'])
      .then(saved => {
        if (saved?.value) setOrgId(saved.value);
        return null;
      })
      .catch(() => {
        /* IndexedDB unavailable */
      });
  }, [open]);

  // Fetch locations for the current organization
  const { locations, isLoading } = useOrganizationLocations(orgId);

  // Close drawer if no locations exist (after org ID is loaded and query finishes)
  useEffect(() => {
    if (!orgId || isLoading || locations.length > 0) return;
    toast.error('No locations found. Please add a location first.');
    onClose();
  }, [orgId, isLoading, locations, onClose]);

  const isValid =
    name.trim().length > 0 &&
    email.trim().length > 0 &&
    Boolean(selectedLocationId);

  const handleRegister = useCallback(() => {
    if (!isValid || isSubmitting) return;

    setIsSubmitting(true);

    /**
     * Register a new practitioner via 3-step FHIR pipeline.
     * 1. Create Practitioner resource
     * 2. Create PractitionerRole linking to organization and location
     * 3. Create Schedule for the practitioner
     * Shows toast on success/error, invalidates practitioner count cache.
     * Errors are caught and displayed via toast.
     */
    const register = async () => {
      try {
        const API = await getAPI();
        const locId = selectedLocationId ?? '';

        // Step 1: Practitioner
        const { id: practitionerId, created } =
          await resolveOrCreatePractitioner(API, email.trim(), name.trim());

        // Step 2: PractitionerRole
        const roleId = await resolveOrCreatePractitionerRole(
          API,
          practitionerId,
          orgId,
          locId
        );

        // Step 3: Schedule
        await resolveOrCreateSchedule(API, practitionerId, roleId);

        toast.success(
          created
            ? 'Practitioner registered successfully'
            : 'Practitioner already registered'
        );
        queryClient
          .invalidateQueries({
            queryKey: ['practitioner-count']
          })
          .catch(() => {
            /* cache invalidation best-effort */
          });
        onClose();
      } catch (err) {
        const message =
          err instanceof Error
            ? err.message
            : 'Failed to register practitioner';
        toast.error(message);
      } finally {
        setIsSubmitting(false);
      }
    };

    register().catch(() => {
      /* errors handled inside register */
    });
  }, [
    isValid,
    isSubmitting,
    email,
    name,
    selectedLocationId,
    orgId,
    queryClient,
    onClose
  ]);

  const locationOptions: LocationOption[] = locations.map(loc => ({
    id: loc.id ?? '',
    name: loc.name ?? ''
  }));

  return (
    <AppDrawer
      open={open}
      onClose={onClose}
      title='Register Practitioner'
      description='Add a new practitioner to your clinic.'
      ctaLabel='Register'
      onCtaClick={handleRegister}
      ctaDisabled={!isValid || isSubmitting}
      ctaLoading={isSubmitting}
    >
      <RegisterPractitionerDrawerContent
        name={name}
        email={email}
        selectedLocationId={selectedLocationId}
        locations={locationOptions}
        onNameChange={setName}
        onEmailChange={setEmail}
        onLocationSelect={setSelectedLocationId}
      />
    </AppDrawer>
  );
}
