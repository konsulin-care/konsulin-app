import {
  useGetCities,
  useGetDistricts,
  useGetProvinces
} from '@/services/api/cities';
import { DayOfWeek, TimeRange } from '@/types/availability';
import { IWilayahResponse } from '@/types/wilayah';
import { generateTimeRangeId } from '@/utils/availability';
import { buildFhirHours } from '@/utils/location-hours';
import { useCallback, useMemo, useState } from 'react';

/** Type-safe hours updater — prevents Codacy Object Injection Sink on dynamic keys. */
function updateHoursForDay(
  prev: Record<DayOfWeek, TimeRange[]>,
  day: DayOfWeek,
  updater: (ranges: TimeRange[]) => TimeRange[]
): Record<DayOfWeek, TimeRange[]> {
  return { ...prev, [day]: updater(prev[day]) };
}

/**
 * Shared form state and handlers for Add/Edit Location drawers.
 *
 * Encapsulates all state declarations, wilayah queries, handler callbacks,
 * validation logic, and FHIR hours memoisation. Each drawer provides its own
 * submit logic and loading/pre-fill behaviour on top of this hook.
 */
export function useLocationFormState() {
  const [status, setStatus] = useState<'active' | 'inactive' | 'suspended'>(
    'active'
  );
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
    setHours(prev =>
      updateHoursForDay(prev, day, ranges => [
        ...ranges,
        { id: generateTimeRangeId(), from: '08:00', to: '17:00' }
      ])
    );
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

  const resetForm = useCallback(() => {
    setStatus('active');
    setName('');
    setAddressLine('');
    setProvinceCode('');
    setProvinceName('');
    setCityCode('');
    setCityName('');
    setDistrictCode('');
    setDistrictName('');
    setLongitude('');
    setLatitude('');
    setHours({
      0: [],
      1: [],
      2: [],
      3: [],
      4: [],
      5: [],
      6: []
    });
    setImageUrl('');
    setIsSubmitting(false);
  }, []);

  return {
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
    nameValid,
    parsedLon,
    parsedLat,
    isValid,
    fhirHours,
    resetForm
  };
}
