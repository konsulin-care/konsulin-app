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
import { getAPI } from '@/services/api';
import { useQuery } from '@tanstack/react-query';
import { type Location } from 'fhir/r4';
import { useCallback, useMemo, useState } from 'react';

type Props = {
  locationId: string;
  onClose: () => void;
};

/**
 * Drawer for editing a Location (name, longitude, latitude).
 *
 * Fetches current data via GET /fhir/Location/{id} and submits via PUT.
 */
export default function EditLocationDrawer({ locationId, onClose }: Props) {
  const [name, setName] = useState('');
  const [longitude, setLongitude] = useState('');
  const [latitude, setLatitude] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { data: location } = useQuery({
    queryKey: ['location-detail', locationId],
    queryFn: async () => {
      const API = await getAPI();
      const resp = await API.get<Location>(
        `/fhir/Location/${locationId}?_elements=name,position,address`
      );
      return resp.data;
    },
    enabled: Boolean(locationId)
  });

  // Pre-fill once location loads
  useMemo(() => {
    if (!location) return;
    setName(location.name ?? '');
    setLongitude(String(location.position?.longitude ?? ''));
    setLatitude(String(location.position?.latitude ?? ''));
  }, [location]);

  const nameTrimmed = name.trim();
  const parsedLon = Number.parseFloat(longitude);
  const parsedLat = Number.parseFloat(latitude);
  const nameOk = nameTrimmed.length > 0;
  const lonOk = longitude.trim().length > 0 && !Number.isNaN(parsedLon);
  const latOk = latitude.trim().length > 0 && !Number.isNaN(parsedLat);
  const isValid = nameOk && lonOk && latOk;

  const handleSubmit = useCallback(() => {
    if (!isValid || isSubmitting) return;
    setIsSubmitting(true);

    const submit = async () => {
      try {
        const API = await getAPI();
        await API.put(`/fhir/Location/${locationId}`, {
          resourceType: 'Location',
          id: locationId,
          name: nameTrimmed,
          position: { longitude: parsedLon, latitude: parsedLat }
        });
        onClose();
      } catch {
        // Toast handled by API interceptor
      } finally {
        setIsSubmitting(false);
      }
    };
    submit().catch(() => {
      /* errors handled inside */
    });
  }, [
    isValid,
    isSubmitting,
    nameTrimmed,
    parsedLon,
    parsedLat,
    locationId,
    onClose
  ]);

  const content = location ? (
    <>
      <DrawerHeader>
        <DrawerTitle>Edit Location</DrawerTitle>
        <DrawerDescription>Update location details.</DrawerDescription>
      </DrawerHeader>

      <div className='space-y-4 px-4'>
        <div>
          <Label htmlFor='edit-loc-name'>Location Name</Label>
          <Input
            id='edit-loc-name'
            type='text'
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder='Main Clinic'
            className='bg-white'
            aria-label='Location Name'
            maxLength={30}
          />
        </div>
        <div>
          <Label htmlFor='edit-loc-longitude'>Longitude</Label>
          <Input
            id='edit-loc-longitude'
            type='number'
            value={longitude}
            onChange={e => setLongitude(e.target.value)}
            placeholder='106.846'
            className='bg-white'
            aria-label='Longitude'
            step='any'
          />
        </div>
        <div>
          <Label htmlFor='edit-loc-latitude'>Latitude</Label>
          <Input
            id='edit-loc-latitude'
            type='number'
            value={latitude}
            onChange={e => setLatitude(e.target.value)}
            placeholder='-6.305'
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
          {isSubmitting ? 'Saving...' : 'Save'}
        </Button>
        <Button variant='outline' onClick={onClose} disabled={isSubmitting}>
          Cancel
        </Button>
      </DrawerFooter>
    </>
  ) : (
    <div className='p-4 text-center'>Loading...</div>
  );

  return (
    <Drawer
      open
      onOpenChange={o => {
        if (!o) onClose();
      }}
    >
      <DrawerContent>{content}</DrawerContent>
    </Drawer>
  );
}
