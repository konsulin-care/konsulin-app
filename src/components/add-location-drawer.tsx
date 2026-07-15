'use client';

import LocationFormFields from '@/components/shared/location-form-fields';
import { Button } from '@/components/ui/button';
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle
} from '@/components/ui/drawer';
import { useLocationFormState } from '@/hooks/useLocationFormState';
import { STORES, dbGet } from '@/lib/indexeddb';
import { getAPI } from '@/services/api';
import { setLocationImageUrl } from '@/utils/fhir/location-image';
import { useQueryClient } from '@tanstack/react-query';
import type { Location } from 'fhir/r4';
import { useCallback } from 'react';
import { toast } from 'react-toastify';

type Props = {
  readonly open: boolean;
  readonly onClose: () => void;
};

/** Submit a new location to the FHIR API. */
async function submitNewLocation(params: {
  status: 'active' | 'inactive';
  nameTrimmed: string;
  addressLine: string;
  cityName: string;
  districtName: string;
  provinceName: string;
  parsedLon: number;
  parsedLat: number;
  fhirHours: Location['hoursOfOperation'];
  imageUrl: string;
  orgId: string;
}): Promise<void> {
  const API = await getAPI();

  let locationPayload: Location = {
    resourceType: 'Location',
    status: params.status,
    name: params.nameTrimmed,
    address: {
      line: [params.addressLine],
      city: params.cityName,
      district: params.districtName,
      state: params.provinceName
    },
    position: {
      longitude: params.parsedLon,
      latitude: params.parsedLat
    },
    hoursOfOperation: params.fhirHours,
    managingOrganization: {
      reference: `Organization/${params.orgId}`
    }
  };

  if (params.imageUrl) {
    locationPayload = setLocationImageUrl(locationPayload, params.imageUrl);
  }

  await API.post('/fhir/Location', locationPayload);
}

/**
 * Drawer for adding a new Location to the selected clinic.
 */
export default function AddLocationDrawer({ open, onClose }: Props) {
  const queryClient = useQueryClient();

  const {
    status,
    setStatus,
    name,
    setName,
    addressLine,
    setAddressLine,
    provinceCode,
    cityCode,
    districtCode,
    provinceName,
    cityName,
    districtName,
    longitude,
    setLongitude,
    latitude,
    setLatitude,
    hours,
    imageUrl,
    setImageUrl,
    isSubmitting,
    setIsSubmitting,
    listProvinces,
    provinceLoading,
    listCities,
    cityLoading,
    listDistricts,
    districtLoading,
    handleProvinceSelect,
    handleCitySelect,
    handleDistrictSelect,
    handleAddTimeRange,
    handleUpdateTimeRange,
    handleDeleteTimeRange,
    nameTrimmed,
    isValid,
    parsedLon,
    parsedLat,
    fhirHours
  } = useLocationFormState();

  const handleSubmit = useCallback(async () => {
    if (!isValid || isSubmitting) return;

    setIsSubmitting(true);
    try {
      const clinicPref = await dbGet<{ value: string }>(STORES.uiPreferences, [
        '',
        'clinic_organization'
      ]);
      const orgId = clinicPref?.value ?? '';

      await submitNewLocation({
        status,
        nameTrimmed,
        addressLine,
        cityName,
        districtName,
        provinceName,
        parsedLon,
        parsedLat,
        fhirHours,
        imageUrl,
        orgId
      });
      toast.success('Location added successfully');
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
        err instanceof Error ? err.message : 'Failed to add location';
      toast.error(message);
    } finally {
      setIsSubmitting(false);
    }
  }, [
    isValid,
    isSubmitting,
    status,
    nameTrimmed,
    addressLine,
    cityName,
    districtName,
    provinceName,
    parsedLon,
    parsedLat,
    fhirHours,
    imageUrl,
    queryClient,
    onClose,
    setIsSubmitting
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
          <DrawerTitle>Add Location</DrawerTitle>
          <DrawerDescription>
            Add a new location for your clinic.
          </DrawerDescription>
        </DrawerHeader>

        <div className='space-y-4 px-4'>
          <LocationFormFields
            status={status}
            name={name}
            addressLine={addressLine}
            provinceCode={provinceCode}
            cityCode={cityCode}
            districtCode={districtCode}
            longitude={longitude}
            latitude={latitude}
            listProvinces={listProvinces ?? []}
            listCities={listCities ?? []}
            listDistricts={listDistricts ?? []}
            provinceLoading={provinceLoading}
            cityLoading={cityLoading}
            districtLoading={districtLoading}
            hours={hours}
            imageUrl={imageUrl}
            onImageUrlChange={setImageUrl}
            onStatusChange={setStatus}
            onNameChange={setName}
            onAddressLineChange={setAddressLine}
            onProvinceSelect={handleProvinceSelect}
            onCitySelect={handleCitySelect}
            onDistrictSelect={handleDistrictSelect}
            onLongitudeChange={setLongitude}
            onLatitudeChange={setLatitude}
            onAddTimeRange={handleAddTimeRange}
            onUpdateTimeRange={handleUpdateTimeRange}
            onDeleteTimeRange={handleDeleteTimeRange}
          />
        </div>

        <DrawerFooter>
          <Button
            onClick={() => {
              handleSubmit().catch(() => {
                /* handled in handleSubmit */
              });
            }}
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
