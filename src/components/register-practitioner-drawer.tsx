'use client';

import { Button } from '@/components/ui/button';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList
} from '@/components/ui/command';
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
import {
  Popover,
  PopoverContent,
  PopoverTrigger
} from '@/components/ui/popover';
import { STORES, dbGet } from '@/lib/indexeddb';
import { cn } from '@/lib/utils';
import { getAPI } from '@/services/api';
import { useOrganizationLocations } from '@/services/clinic-practitioners';
import { useQueryClient } from '@tanstack/react-query';
import { Check, ChevronDown } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { toast } from 'react-toastify';
import {
  resolveOrCreatePractitioner,
  resolveOrCreatePractitionerRole,
  resolveOrCreateSchedule
} from './register-practitioner.utils';

type Props = {
  readonly open: boolean;
  readonly onClose: () => void;
};

type LocationOption = { id: string; name: string };

/** Combobox for selecting an organization Location. */
function LocationCombobox({
  locations,
  selectedId,
  onSelect
}: {
  readonly locations: readonly LocationOption[];
  readonly selectedId: string | null;
  readonly onSelect: (id: string | null) => void;
}) {
  const [open, setOpen] = useState(false);
  const selectedName = locations.find(l => l.id === selectedId)?.name;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant='outline'
          role='combobox'
          aria-expanded={open}
          className={cn(
            'h-10 w-full justify-between bg-white px-3 text-sm font-normal',
            !selectedId && 'text-muted-foreground'
          )}
        >
          {selectedName ?? 'Select location...'}
          <ChevronDown className='ml-2 h-4 w-4 shrink-0 opacity-50' />
        </Button>
      </PopoverTrigger>
      <PopoverContent className='w-[var(--radix-popover-trigger-width)] p-0'>
        <Command>
          <CommandInput placeholder='Select location...' />
          <CommandList>
            <CommandEmpty>No locations found</CommandEmpty>
            <CommandGroup>
              {locations.map(loc => (
                <CommandItem
                  key={loc.id}
                  value={loc.id}
                  onSelect={currentValue => {
                    onSelect(currentValue === selectedId ? null : currentValue);
                    setOpen(false);
                  }}
                >
                  <Check
                    className={cn(
                      'mr-2 h-4 w-4',
                      selectedId === loc.id ? 'opacity-100' : 'opacity-0'
                    )}
                  />
                  {loc.name}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

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
              onChange={e => {
                setName(e.target.value);
              }}
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
              onChange={e => {
                setEmail(e.target.value);
              }}
              placeholder='email@clinic.com'
              className='bg-white'
              aria-label='Email'
            />
          </div>

          <div>
            <Label>Location</Label>
            <LocationCombobox
              locations={locations}
              selectedId={selectedLocationId}
              onSelect={setSelectedLocationId}
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
