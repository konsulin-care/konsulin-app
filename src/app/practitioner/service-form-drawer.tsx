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
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import type { HealthcareService } from 'fhir/r4';
import { useState } from 'react';

type Props = {
  open: boolean;
  onClose: () => void;
  onSave: (service: HealthcareService) => void;
  service?: HealthcareService;
  providedBy: string;
  location?: string;
};

/**
 * Drawer form for creating or editing a HealthcareService resource.
 *
 * Mode is "edit" when `service` is provided, otherwise "create".
 */
export default function ServiceFormDrawer({
  open,
  onClose,
  onSave,
  service,
  providedBy,
  location
}: Props) {
  const [name, setName] = useState(service?.name ?? '');
  const [extraDetails, setExtraDetails] = useState(service?.extraDetails ?? '');
  const [active, setActive] = useState(service?.active ?? true);

  const handleSave = () => {
    const resource: HealthcareService = {
      resourceType: 'HealthcareService',
      ...(service?.id ? { id: service.id } : {}),
      active,
      name,
      extraDetails: extraDetails || undefined,
      providedBy: { reference: providedBy },
      ...(location ? { location: [{ reference: location }] } : {})
    };
    onSave(resource);
  };

  return (
    <Drawer
      open={open}
      onOpenChange={o => {
        if (!o) onClose();
      }}
    >
      <DrawerContent>
        <DrawerHeader>
          <DrawerTitle>{service ? 'Edit Service' : 'Add Service'}</DrawerTitle>
          <DrawerDescription>
            Configure a healthcare service for this practitioner.
          </DrawerDescription>
        </DrawerHeader>

        <div className='space-y-4 px-4'>
          <div className='flex items-center justify-between'>
            <Switch
              id='service-active'
              checked={active}
              onCheckedChange={setActive}
            />
          </div>

          <div>
            <label htmlFor='service-name' className='text-sm font-medium'>
              Name
            </label>
            <Input
              id='service-name'
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder='e.g. General Consultation'
              className='bg-white'
            />
          </div>

          <div>
            <label
              htmlFor='service-extra-details'
              className='text-sm font-medium'
            >
              Extra Details
            </label>
            <Textarea
              id='service-extra-details'
              value={extraDetails}
              onChange={e => setExtraDetails(e.target.value)}
              rows={3}
              className='bg-white'
            />
          </div>
        </div>

        <DrawerFooter>
          <Button
            onClick={handleSave}
            disabled={!name.trim()}
            variant='secondary'
            className='text-white'
          >
            Save
          </Button>
          <Button variant='outline' onClick={onClose}>
            Cancel
          </Button>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
}
