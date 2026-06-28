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
import { useCallback, useState } from 'react';
import { toast } from 'react-toastify';

type Props = {
  open: boolean;
  onClose: () => void;
};

/**
 * Drawer for adding a new Location to the selected clinic.
 *
 * Reads selected_clinic from IndexedDB for managingOrganization reference.
 * Posts a FHIR Location resource with position (longitude, latitude).
 */
export default function AddLocationDrawer({ open, onClose }: Props) {
  const queryClient = useQueryClient();
  const [longitude, setLongitude] = useState('');
  const [latitude, setLatitude] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const parsedLon = Number.parseFloat(longitude);
  const parsedLat = Number.parseFloat(latitude);
  const isValid =
    longitude.trim().length > 0 &&
    latitude.trim().length > 0 &&
    !Number.isNaN(parsedLon) &&
    !Number.isNaN(parsedLat);

  const handleSubmit = useCallback(() => {
    if (!isValid || isSubmitting) return;

    setIsSubmitting(true);

    const submit = async () => {
      try {
        const API = await getAPI();

        const clinicPref = await dbGet<{ value: string }>(
          STORES.uiPreferences,
          ['', 'clinic_organization']
        );
        const orgId = clinicPref?.value ?? '';

        await API.post('/fhir/Location', {
          resourceType: 'Location',
          position: {
            longitude: parsedLon,
            latitude: parsedLat
          },
          managingOrganization: {
            reference: `Organization/${orgId}`
          }
        });

        toast.success('Location added successfully');
        void queryClient.invalidateQueries({
          queryKey: ['practitioner-count']
        });
        onClose();
      } catch (err) {
        const message =
          err instanceof Error ? err.message : 'Failed to add location';
        toast.error(message);
      } finally {
        setIsSubmitting(false);
      }
    };

    void submit();
  }, [isValid, isSubmitting, parsedLon, parsedLat, queryClient, onClose]);

  return (
    <Drawer
      open={open}
      onOpenChange={o => {
        if (!o) onClose();
      }}
    >
      <DrawerContent>
        <DrawerHeader>
          <DrawerTitle>Add Location</DrawerTitle>
          <DrawerDescription>
            Add a new location for your clinic.
          </DrawerDescription>
        </DrawerHeader>

        <div className='space-y-4 px-4'>
          <div>
            <Label htmlFor='loc-longitude'>Longitude</Label>
            <Input
              id='loc-longitude'
              type='number'
              value={longitude}
              onChange={e => setLongitude(e.target.value)}
              placeholder='e.g. 106.846'
              className='bg-white'
              aria-label='Longitude'
              step='any'
            />
          </div>

          <div>
            <Label htmlFor='loc-latitude'>Latitude</Label>
            <Input
              id='loc-latitude'
              type='number'
              value={latitude}
              onChange={e => setLatitude(e.target.value)}
              placeholder='e.g. -6.305'
              className='bg-white'
              aria-label='Latitude'
              step='any'
            />
          </div>
        </div>

        <DrawerFooter>
          <Button
            onClick={handleSubmit}
            disabled={!isValid || isSubmitting}
            variant='secondary'
            className='text-white'
          >
            {isSubmitting ? 'Adding...' : 'Add Location'}
          </Button>
          <Button variant='outline' onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
}
