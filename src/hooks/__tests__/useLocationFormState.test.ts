import { act, renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { useLocationFormState } from '../useLocationFormState';

vi.mock('@/services/api/cities', () => ({
  useGetProvinces: () => ({ data: [], isLoading: false }),
  useGetCities: () => ({ data: [], isLoading: false }),
  useGetDistricts: () => ({ data: [], isLoading: false })
}));

describe('useLocationFormState', () => {
  it('initialises with default form state', () => {
    const { result } = renderHook(() => useLocationFormState());

    expect(result.current.status).toBe('active');
    expect(result.current.name).toBe('');
    expect(result.current.addressLine).toBe('');
    expect(result.current.longitude).toBe('');
    expect(result.current.latitude).toBe('');
    expect(result.current.provinceCode).toBe('');
    expect(result.current.cityCode).toBe('');
    expect(result.current.districtCode).toBe('');
    expect(result.current.imageUrl).toBe('');
  });

  it('validates empty form as invalid', () => {
    const { result } = renderHook(() => useLocationFormState());

    expect(result.current.nameValid).toBe(false);
    expect(result.current.isValid).toBe(false);
  });

  it('validates form with name + coordinates as valid', () => {
    const { result } = renderHook(() => useLocationFormState());

    act(() => result.current.setName('Main Clinic'));
    act(() => result.current.setLongitude('106.846'));
    act(() => result.current.setLatitude('-6.305'));

    expect(result.current.nameValid).toBe(true);
    expect(result.current.isValid).toBe(true);
  });

  it('rejects name exceeding 30 characters', () => {
    const { result } = renderHook(() => useLocationFormState());

    act(() =>
      result.current.setName('A very long location name that exceeds the limit')
    );

    expect(result.current.nameValid).toBe(false);
  });

  it('rejects name with special characters', () => {
    const { result } = renderHook(() => useLocationFormState());

    act(() => result.current.setName('Clinic#1!'));

    expect(result.current.nameValid).toBe(false);
  });

  it('updates province and resets city/district on province select', () => {
    const { result } = renderHook(() => useLocationFormState());

    act(() => result.current.setCityCode('321'));
    act(() => result.current.setDistrictCode('123'));

    act(() =>
      result.current.handleProvinceSelect({
        code: '31',
        name: 'DKI Jakarta'
      })
    );

    expect(result.current.provinceCode).toBe('31');
    expect(result.current.provinceName).toBe('DKI Jakarta');
    expect(result.current.cityCode).toBe('');
    expect(result.current.cityName).toBe('');
    expect(result.current.districtCode).toBe('');
    expect(result.current.districtName).toBe('');
  });

  it('updates city and resets district on city select', () => {
    const { result } = renderHook(() => useLocationFormState());

    act(() =>
      result.current.handleCitySelect({ code: '3171', name: 'Jakarta Pusat' })
    );

    expect(result.current.cityCode).toBe('3171');
    expect(result.current.cityName).toBe('Jakarta Pusat');
    expect(result.current.districtCode).toBe('');
    expect(result.current.districtName).toBe('');
  });

  it('updates district on district select', () => {
    const { result } = renderHook(() => useLocationFormState());

    act(() =>
      result.current.handleDistrictSelect({
        code: '3171010',
        name: 'Gambir'
      })
    );

    expect(result.current.districtCode).toBe('3171010');
    expect(result.current.districtName).toBe('Gambir');
  });

  it('adds a time range for a day', () => {
    const { result } = renderHook(() => useLocationFormState());

    act(() => result.current.handleAddTimeRange(1));

    expect(result.current.hours[1]).toHaveLength(1);
    expect(result.current.hours[1][0].from).toBe('08:00');
    expect(result.current.hours[1][0].to).toBe('17:00');
    expect(result.current.hours[1][0].id).toBeDefined();
  });

  it('updates a time range field', () => {
    const { result } = renderHook(() => useLocationFormState());

    act(() => result.current.handleAddTimeRange(1));
    const id = result.current.hours[1][0].id;

    act(() => result.current.handleUpdateTimeRange(1, id, 'from', '09:00'));

    expect(result.current.hours[1][0].from).toBe('09:00');
    expect(result.current.hours[1][0].to).toBe('17:00');
  });

  it('deletes a time range', () => {
    const { result } = renderHook(() => useLocationFormState());

    act(() => result.current.handleAddTimeRange(1));
    act(() => result.current.handleAddTimeRange(1));
    const id = result.current.hours[1][0].id;

    act(() => result.current.handleDeleteTimeRange(1, id));

    expect(result.current.hours[1]).toHaveLength(1);
  });

  it('builds FHIR hours from state', () => {
    const { result } = renderHook(() => useLocationFormState());

    // Day 0 = Monday
    act(() => result.current.handleAddTimeRange(0));
    act(() =>
      result.current.handleUpdateTimeRange(
        0,
        result.current.hours[0][0].id,
        'from',
        '09:00'
      )
    );

    expect(result.current.fhirHours).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          daysOfWeek: ['mon'],
          openingTime: '09:00:00',
          closingTime: '17:00:00'
        })
      ])
    );
  });

  it('sets provinceName alongside provinceCode via setProvinceName', () => {
    const { result } = renderHook(() => useLocationFormState());

    act(() => result.current.setProvinceName('West Java'));
    expect(result.current.provinceName).toBe('West Java');
  });
});
