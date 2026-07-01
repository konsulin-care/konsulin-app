/* eslint-disable @typescript-eslint/no-unsafe-return */
import { useQuery } from '@tanstack/react-query';
import axios from 'axios';

/** Fetch all provinces from Go BFF wilayah endpoint. */
export const useGetProvinces = () => {
  return useQuery({
    queryKey: ['provinces'],
    queryFn: async () => {
      const response = await axios.get('/api/provinces');
      return response.data;
    },
    select: (response: { id: string; name: string }[] | null | undefined) =>
      (response || []).map(p => ({ code: p.id, name: p.name }))
  });
};

/** Fetch cities for a given province code from Go BFF wilayah endpoint. */
export const useGetCities = (provinceCode: number) => {
  return useQuery({
    queryKey: ['cities', provinceCode],
    queryFn: async () => {
      if (provinceCode === 0) return null;
      const response = await axios.get(`/api/regencies/${provinceCode}`);
      return Array.isArray(response.data) ? response.data : [];
    },
    enabled: provinceCode !== undefined && provinceCode !== null,
    select: (response: { id: string; name: string }[] | null | undefined) =>
      (response || []).map(c => ({ code: c.id, name: c.name }))
  });
};

/** Fetch districts for a given city code from Go BFF wilayah endpoint. */
export const useGetDistricts = (cityCode: number) => {
  return useQuery({
    queryKey: ['districts', cityCode],
    queryFn: async () => {
      if (cityCode === 0) return null;
      const response = await axios.get(`/api/districts/${cityCode}`);
      return Array.isArray(response.data) ? response.data : [];
    },
    enabled: cityCode !== undefined && cityCode !== null,
    select: (response: { id: string; name: string }[] | null | undefined) =>
      (response || []).map(d => ({ code: d.id, name: d.name }))
  });
};
