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
import { getAPI } from '@/services/api';
import {
  useGetCities,
  useGetDistricts,
  useGetProvinces
} from '@/services/api/cities';
import { DayOfWeek, TimeRange } from '@/types/availability';
import { IWilayahResponse } from '@/types/wilayah';
import { generateTimeRangeId } from '@/utils/availability';
import {
  buildFhirHours,
  emptyHoursRecord,
  parseHoursFromFHIR
} from '@/utils/location-hours';
import { useQuery } from '@tanstack/react-query';
import { type Location } from 'fhir/r4';
import { useCallback, useEffect, useMemo, useState } from 'react';

/** Extract Location form values from a FHIR Location resource. */
function extractValues(location: Location) {
  const addr = location.address || ({} as Record<string, unknown>);
  const pos = location.position || {
    longitude: undefined,
    latitude: undefined
  };

  const status: 'active' | 'inactive' =
    location.status === 'active' ? 'active' : 'inactive';
  const name = location.name || '';

  return {
    status,
    name,
    addressLine: (addr.line as string[])?.[0] || '',
    cityName: (addr.city as string) || '',
    districtName: (addr.district as string) || '',
    provinceName: (addr.state as string) || '',
    longitude: String(pos.longitude || ''),
    latitude: String(pos.latitude || '')
  };
}

type Props = {
  readonly locationId: string;
  readonly onClose: () => void;
};

/**
 * Drawer for editing a full FHIR Location resource.
 *
 * Fetches the complete Location (no _elements filter), pre-fills all
 * form fields, and submits a PUT with all fields.
 */
export default function EditLocationDrawer({ locationId, onClose }: Props) {
  const [status, setStatus] = useState<'active' | 'inactive'>('active');
  const [name, setName] = useState('');
  const [addressLine, setAddressLine] = useState('');
  const [provinceCode, setProvinceCode] = useState('');
  const [provinceName, setProvinceName] = useState('');
  const [cityCode, setCityCode] = useState('');
  const [cityName, setCityName] = useState('');
  const [districtCode, setDistrictCode] = useState('');
  const [districtName, setDistrictName] = useState('');
  const [longitude, setLongitude] = useState('');
  const [latitude, setLatitude] = useState('');
  const [hours, setHours] =
    useState<Record<DayOfWeek, TimeRange[]>>(emptyHoursRecord);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDataLoaded, setIsDataLoaded] = useState(false);

  const { data: location, isLoading } = useQuery({
    queryKey: ['location-detail', locationId],
    queryFn: async () => {
      const API = await getAPI();
      const resp = await API.get<Location>(`/fhir/Location/${locationId}`);
      return resp.data;
    },
    enabled: Boolean(locationId)
  });

  const { data: listProvinces, isLoading: provinceLoading } = useGetProvinces();
  const { data: listCities, isLoading: cityLoading } = useGetCities(
    Number(provinceCode)
  );
  const { data: listDistricts, isLoading: districtLoading } = useGetDistricts(
    Number(cityCode)
  );

  // Pre-fill form when location data loads
  useEffect(() => {
    if (!location || isDataLoaded) return;
    setIsDataLoaded(true);

    const v = extractValues(location);
    setStatus(v.status);
    setName(v.name);
    setAddressLine(v.addressLine);
    setCityName(v.cityName);
    setDistrictName(v.districtName);
    setProvinceName(v.provinceName);
    setLongitude(v.longitude);
    setLatitude(v.latitude);
    setHours(parseHoursFromFHIR(location.hoursOfOperation));
  }, [location, isDataLoaded]);

  // Match province name to code when list loads
  useEffect(() => {
    if (!isDataLoaded || provinceCode) return;
    if (!listProvinces?.length) return;
    const m = listProvinces.find(p => p.name === provinceName);
    if (m) setProvinceCode(m.code);
  }, [isDataLoaded, listProvinces, provinceName, provinceCode]);

  // Match city name to code when list loads
  useEffect(() => {
    if (!isDataLoaded || cityCode) return;
    if (!listCities?.length) return;
    const m = listCities.find(c => c.name === cityName);
    if (m) setCityCode(m.code);
  }, [isDataLoaded, listCities, cityName, cityCode]);

  // Match district name to code when list loads
  useEffect(() => {
    if (!isDataLoaded || districtCode) return;
    if (!listDistricts?.length) return;
    const m = listDistricts.find(d => d.name === districtName);
    if (m) setDistrictCode(m.code);
  }, [isDataLoaded, listDistricts, districtName, districtCode]);

  const nameTrimmed = name.trim();
  const nameValid =
    nameTrimmed.length > 0 &&
    nameTrimmed.length <= 30 &&
    /^[a-zA-Z0-9 ]+$/.test(nameTrimmed);

  const parsedLon = Number.parseFloat(longitude);
  const parsedLat = Number.parseFloat(latitude);
  const isValid =
    nameValid &&
    longitude.trim().length > 0 &&
    latitude.trim().length > 0 &&
    !Number.isNaN(parsedLon) &&
    !Number.isNaN(parsedLat);

  const handleProvinceSelect = useCallback((option: IWilayahResponse) => {
    setProvinceCode(option.code);
    setProvinceName(option.name);
    setCityCode('');
    setCityName('');
    setDistrictCode('');
    setDistrictName('');
  }, []);

  const handleCitySelect = useCallback((option: IWilayahResponse) => {
    setCityCode(option.code);
    setCityName(option.name);
    setDistrictCode('');
    setDistrictName('');
  }, []);

  const handleDistrictSelect = useCallback((option: IWilayahResponse) => {
    setDistrictCode(option.code);
    setDistrictName(option.name);
  }, []);

  const handleAddTimeRange = useCallback((day: DayOfWeek) => {
    setHours(prev => ({
      ...prev,
      [day]: [
        ...prev[day],
        { id: generateTimeRangeId(), from: '08:00', to: '17:00' }
      ]
    }));
  }, []);

  const handleUpdateTimeRange = useCallback(
    (day: DayOfWeek, id: string, field: 'from' | 'to', value: string) => {
      setHours(prev => ({
        ...prev,
        [day]: prev[day].map(tr =>
          tr.id === id ? { ...tr, [field]: value } : tr
        )
      }));
    },
    []
  );

  const handleDeleteTimeRange = useCallback((day: DayOfWeek, id: string) => {
    setHours(prev => ({
      ...prev,
      [day]: prev[day].filter(tr => tr.id !== id)
    }));
  }, []);

  const fhirHours = useMemo(() => buildFhirHours(hours), [hours]);

  const doSubmit = useCallback(async () => {
    const API = await getAPI();
    await API.put(`/fhir/Location/${locationId}`, {
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
      hoursOfOperation: fhirHours
    });
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
    locationId
  ]);

  const handleSubmit = useCallback(() => {
    if (!isValid || isSubmitting) return;
    setIsSubmitting(true);

    const submit = async () => {
      try {
        await doSubmit();
        onClose();
      } catch {
        /* handled by API interceptor */
      } finally {
        setIsSubmitting(false);
      }
    };

    submit().catch(() => {
      /* errors handled inside */
    });
  }, [isValid, isSubmitting, doSubmit, onClose]);

  const content =
    isLoading || !isDataLoaded ? (
      <div className='p-4 text-center'>Loading...</div>
    ) : (
      <>
        <DrawerHeader>
          <DrawerTitle>Edit Location</DrawerTitle>
          <DrawerDescription>Update location details.</DrawerDescription>
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
