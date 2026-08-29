'use client';
import LocationFormFields from '@/components/shared/location-form-fields';
import AppDrawer from '@/components/ui/app-drawer';
import { useLocationFormState } from '@/hooks/useLocationFormState';
import { STORES, dbGet } from '@/lib/indexeddb';
import { getAPI } from '@/services/api';
import {
  getLocationImageUrl,
  setLocationImageUrl
} from '@/utils/fhir/location-image';
import { parseHoursFromFHIR } from '@/utils/location-hours';
import { useQuery } from '@tanstack/react-query';
import { type Location } from 'fhir/r4';
import { useCallback, useEffect, useState } from 'react';
import { toast } from 'react-toastify';

/** Extract Location form values from a FHIR Location resource. */
function extractValues(location: Location) {
  const addr = location.address || {};
  const pos = location.position || {
    longitude: undefined,
    latitude: undefined
  };

  const status: 'active' | 'inactive' | 'suspended' = [
    'active',
    'inactive',
    'suspended'
  ].includes(location.status ?? '')
    ? location.status
    : 'inactive';
  const name = location.name || '';

  const managingOrg = location.managingOrganization?.reference ?? '';

  return {
    status,
    name,
    addressLine: addr.line?.[0] || '',
    cityName: addr.city || '',
    districtName: addr.district || '',
    provinceName: addr.state || '',
    longitude: String(pos.longitude ?? ''),
    latitude: String(pos.latitude ?? ''),
    managingOrg
  };
}

type Props = {
  readonly locationId: string;
  readonly onClose: () => void;
};

/** Drawer for editing a full FHIR Location resource. */
export default function EditLocationDrawer({ locationId, onClose }: Props) {
  const [isDataLoaded, setIsDataLoaded] = useState(false);

  const {
    status,
    setStatus,
    name,
    setName,
    addressLine,
    setAddressLine,
    provinceCode,
    setProvinceCode,
    provinceName,
    setProvinceName,
    cityCode,
    setCityCode,
    cityName,
    setCityName,
    districtCode,
    setDistrictCode,
    districtName,
    setDistrictName,
    longitude,
    setLongitude,
    latitude,
    setLatitude,
    hours,
    setHours,
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

  const { data: location, isLoading } = useQuery({
    queryKey: ['location-detail', locationId],
    queryFn: async () => {
      const API = await getAPI();
      const resp = await API.get<Location>(`/fhir/Location/${locationId}`);
      return resp.data;
    },
    enabled: Boolean(locationId)
  });

  const [managingOrg, setManagingOrg] = useState('');

  // Pre-fill form when location data loads
  useEffect(() => {
    if (!location || isDataLoaded) return;
    setIsDataLoaded(true);

    const values = extractValues(location);
    setStatus(values.status);
    setName(values.name);
    setAddressLine(values.addressLine);
    setCityName(values.cityName);
    setDistrictName(values.districtName);
    setProvinceName(values.provinceName);
    setLongitude(values.longitude);
    setLatitude(values.latitude);
    setManagingOrg(values.managingOrg);
    setHours(parseHoursFromFHIR(location.hoursOfOperation));
    setImageUrl(getLocationImageUrl(location) ?? '');
  }, [
    location,
    isDataLoaded,
    setStatus,
    setName,
    setAddressLine,
    setCityName,
    setDistrictName,
    setProvinceName,
    setLongitude,
    setLatitude,
    setManagingOrg,
    setHours,
    setImageUrl
  ]);

  // Match province/city/district names to codes when lists load
  useEffect(() => {
    if (!isDataLoaded) return;
    if (listProvinces?.length && !provinceCode) {
      const matched = listProvinces.find(p => p.name === provinceName);
      if (matched) setProvinceCode(matched.code);
    }
    if (listCities?.length && !cityCode) {
      const matched = listCities.find(c => c.name === cityName);
      if (matched) setCityCode(matched.code);
    }
    if (listDistricts?.length && !districtCode) {
      const matched = listDistricts.find(d => d.name === districtName);
      if (matched) setDistrictCode(matched.code);
    }
  }, [
    isDataLoaded,
    listProvinces,
    provinceName,
    provinceCode,
    setProvinceCode,
    listCities,
    cityName,
    cityCode,
    setCityCode,
    listDistricts,
    districtName,
    districtCode,
    setDistrictCode
  ]);

  const doSubmit = useCallback(async () => {
    const API = await getAPI();
    const clinicPref = await dbGet<{ value: string }>(STORES.uiPreferences, [
      '',
      'clinic_organization'
    ]);
    const orgId = clinicPref?.value ?? '';

    let payload: Location = {
      resourceType: 'Location',
      id: locationId,
      status,
      name: nameTrimmed,
      address: {
        line: [addressLine],
        city: cityName,
        district: districtName,
        state: provinceName
      },
      position: { longitude: parsedLon, latitude: parsedLat },
      hoursOfOperation: fhirHours,
      managingOrganization: managingOrg
        ? { reference: managingOrg }
        : { reference: `Organization/${orgId}` }
    };
    if (imageUrl) {
      payload = setLocationImageUrl(payload, imageUrl);
    }

    await API.put(`/fhir/Location/${locationId}`, payload);
  }, [
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
    locationId,
    managingOrg
  ]);

  const handleSubmit = useCallback(() => {
    if (!isValid || isSubmitting) return;
    setIsSubmitting(true);
    doSubmit()
      .then(onClose)
      .finally(() => {
        setIsSubmitting(false);
      })
      .catch((err: unknown) => {
        console.error('Failed to submit location:', err);
        toast.error('Failed to save location. Please try again.');
      });
  }, [isValid, isSubmitting, doSubmit, onClose, setIsSubmitting]);

  const content =
    isLoading || !isDataLoaded ? (
      <div className='p-4 text-center'>Loading...</div>
    ) : (
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
    );

  return (
    <AppDrawer
      open
      onClose={onClose}
      title='Edit Location'
      description='Update location details.'
      ctaLabel='Save'
      onCtaClick={handleSubmit}
      ctaDisabled={!isValid || isSubmitting}
      ctaLoading={isSubmitting}
    >
      {content}
    </AppDrawer>
  );
}
