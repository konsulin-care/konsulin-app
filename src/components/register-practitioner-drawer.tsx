'use client';

import { Button } from '@/components/ui/button';
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle
} from '@/components/ui/drawer';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { STORES, dbGet } from '@/lib/indexeddb';
import { getAPI } from '@/services/api';
import { useQueryClient } from '@tanstack/react-query';
import type { Bundle, Practitioner, PractitionerRole, Schedule } from 'fhir/r4';
import { useCallback, useState } from 'react';
import { toast } from 'react-toastify';

type Props = {
  open: boolean;
  onClose: () => void;
};

type PractitionerName = {
  use: string;
  family: string;
  given: string[];
};

/**
 * Parse full name into FHIR HumanName parts.
 * Last space-separated token becomes family name, rest become given names.
 */
function parseName(fullName: string): PractitionerName {
  const parts = fullName.trim().split(/\s+/);
  const given = parts.slice(0, -1);
  const family = parts.at(-1) ?? '';
  return {
    use: 'official',
    family,
    given: given.length > 0 ? given : [family]
  };
}

/** Extract first entry ID from a FHIR Bundle search response. */
function extractFirstEntryId(data: Bundle | undefined): string | null {
  const entry = data?.entry?.[0]?.resource;
  return entry?.id ?? null;
}

/**
 * Drawer for registering a new practitioner via FHIR pipeline.
 *
 * 3-step process: Practitioner → PractitionerRole → Schedule.
 * Reads selected_clinic and selected_location from IndexedDB.
 */
export default function RegisterPractitionerDrawer({ open, onClose }: Props) {
  const queryClient = useQueryClient();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isValid = name.trim().length > 0 && email.trim().length > 0;

  const handleRegister = useCallback(() => {
    if (!isValid || isSubmitting) return;

    setIsSubmitting(true);

    const register = async () => {
      try {
        const API = await getAPI();

        // Read clinic org and optional location from IndexedDB
        const clinicPref = await dbGet<{ value: string }>(
          STORES.uiPreferences,
          ['', 'clinic_organization']
        );
        const locationPref = await dbGet<{ value: string }>(
          STORES.uiPreferences,
          ['', 'selected_location']
        );

        const orgId = clinicPref?.value ?? '';
        const locId = locationPref?.value ?? '';

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

        // Step 4: Send magic link
        await API.post('/api/v1/auth/magiclink', {
          email: email.trim(),
          roles: ['Practitioner', 'Patient']
        });

        toast.success(
          created ? 'Practitioner registered successfully' : 'Magic link sent'
        );
        void queryClient.invalidateQueries({
          queryKey: ['practitioner-count']
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

    void register();
  }, [isValid, isSubmitting, email, name, queryClient, onClose]);

  return (
    <Drawer
      open={open}
      onOpenChange={o => {
        if (!o) onClose();
      }}
    >
      <DrawerContent>
        <DrawerHeader>
          <DrawerTitle>Register Practitioner</DrawerTitle>
          <DrawerDescription>
            Add a new practitioner to your clinic.
          </DrawerDescription>
        </DrawerHeader>

        <div className='space-y-4 px-4'>
          <div>
            <Label htmlFor='prac-name'>Name</Label>
            <Input
              id='prac-name'
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder='Full Name'
              className='bg-white'
              aria-label='Name'
            />
          </div>

          <div>
            <Label htmlFor='prac-email'>Email</Label>
            <Input
              id='prac-email'
              type='email'
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder='email@clinic.com'
              className='bg-white'
              aria-label='Email'
            />
          </div>
        </div>

        <DrawerFooter>
          <Button
            onClick={handleRegister}
            disabled={!isValid || isSubmitting}
            variant='secondary'
            className='text-white'
          >
            {isSubmitting ? 'Registering...' : 'Register'}
          </Button>
          <Button variant='outline' onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
}

/** Resolve existing Practitioner by email or create one. */
async function resolveOrCreatePractitioner(
  API: Awaited<ReturnType<typeof getAPI>>,
  email: string,
  name: string
): Promise<{ id: string; created: boolean }> {
  const searchResponse = await API.get<Bundle>(
    `/fhir/Practitioner?email=${encodeURIComponent(email)}&_elements=name`
  );

  const existingId = extractFirstEntryId(searchResponse.data);
  if (existingId) return { id: existingId, created: false };

  const parsedName = parseName(name);
  const createResponse = await API.post<Practitioner>('/fhir/Practitioner', {
    resourceType: 'Practitioner',
    active: true,
    name: [parsedName],
    telecom: [
      {
        system: 'email',
        value: email,
        use: 'work'
      }
    ]
  });

  return { id: createResponse.data.id ?? '', created: true };
}

/** Resolve existing PractitionerRole or create one. */
async function resolveOrCreatePractitionerRole(
  API: Awaited<ReturnType<typeof getAPI>>,
  practitionerId: string,
  orgId: string,
  locId: string
): Promise<string> {
  const params: string[] = [
    `organization=Organization/${orgId}`,
    `practitioner=Practitioner/${practitionerId}`
  ];

  if (locId) {
    params.push(`location=Location/${locId}`);
  }

  const searchResponse = await API.get<Bundle>(
    `/fhir/PractitionerRole?${params.join('&')}`
  );

  const existingId = extractFirstEntryId(searchResponse.data);
  if (existingId) return existingId;

  const payload: Record<string, unknown> = {
    resourceType: 'PractitionerRole',
    active: false,
    practitioner: {
      reference: `Practitioner/${practitionerId}`
    },
    organization: {
      reference: `Organization/${orgId}`
    }
  };

  if (locId) {
    payload.location = {
      reference: `Location/${locId}`
    };
  }

  const createResponse = await API.post<PractitionerRole>(
    '/fhir/PractitionerRole',
    payload
  );
  return createResponse.data.id ?? '';
}

/** Resolve existing Schedule or create one. */
async function resolveOrCreateSchedule(
  API: Awaited<ReturnType<typeof getAPI>>,
  practitionerId: string,
  roleId: string
): Promise<string> {
  const searchResponse = await API.get<Bundle>(
    `/fhir/Schedule?actor=PractitionerRole/${roleId}`
  );

  const existingId = extractFirstEntryId(searchResponse.data);
  if (existingId) return existingId;

  const createResponse = await API.post<Schedule>('/fhir/Schedule', {
    resourceType: 'Schedule',
    actor: [
      { reference: `Practitioner/${practitionerId}` },
      { reference: `PractitionerRole/${roleId}` }
    ]
  });

  return createResponse.data.id ?? '';
}
