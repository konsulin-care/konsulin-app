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
import { STORES, dbGet } from '@/lib/indexeddb';
import { getAPI } from '@/services/api';
import {
  useGetCities,
  useGetDistricts,
  useGetProvinces
} from '@/services/api/cities';
import { DayOfWeek, TimeRange } from '@/types/availability';
import { IWilayahResponse } from '@/types/wilayah';
import { generateTimeRangeId } from '@/utils/availability';
import { setLocationImageUrl } from '@/utils/fhir/location-image';
import { buildFhirHours } from '@/utils/location-hours';
import { useQueryClient } from '@tanstack/react-query';
import { useCallback, useMemo, useState } from 'react';
import { toast } from 'react-toastify';

type Props = {
  readonly open: boolean;
  readonly onClose: () => void;
};

/**
 * Drawer for adding a new Location to the selected clinic.
 *
 * Reads selected_clinic from IndexedDB for managingOrganization reference.
 * Posts a full FHIR Location resource with status, name, address,
 * position, and hoursOfOperation.
 */
export default function AddLocationDrawer({ open, onClose }: Props) {
  const queryClient = useQueryClient();
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
  const [hours, setHours] = useState<Record<DayOfWeek, TimeRange[]>>({
    0: [],
    1: [],
    2: [],
    3: [],
    4: [],
    5: [],
    6: []
  });
  const [imageUrl, setImageUrl] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { data: listProvinces, isLoading: provinceLoading } = useGetProvinces();
  const { data: listCities, isLoading: cityLoading } = useGetCities(
    Number(provinceCode)
  );
  const { data: listDistricts, isLoading: districtLoading } = useGetDistricts(
    Number(cityCode)
  );

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

        let locationPayload: Record<string, unknown> = {
          resourceType: 'Location',
          status,
          name: nameTrimmed,
          address: {
            line: [addressLine],
            city: cityName,
            district: districtName,
            state: provinceName
          },
          position: {
            longitude: parsedLon,
            latitude: parsedLat
          },
          hoursOfOperation: fhirHours,
          managingOrganization: {
            reference: `Organization/${orgId}`
          }
        };

        if (imageUrl) {
          locationPayload = setLocationImageUrl(
            locationPayload as unknown as Parameters<
              typeof setLocationImageUrl
            >[0],
            imageUrl
          ) as unknown as Record<string, unknown>;
        }

        await API.post('/fhir/Location', locationPayload);

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
    };

    submit().catch(() => {
      /* errors handled inside submit */
    });
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
