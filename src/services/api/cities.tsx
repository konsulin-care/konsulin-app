/* eslint-disable @typescript-eslint/no-unsafe-return */
import { useQuery } from '@tanstack/react-query';
import { getAPI } from '../api';

/** Fetch all provinces from Go BFF wilayah endpoint. */
export const useGetProvinces = () => {
  return useQuery({
    queryKey: ['provinces'],
    queryFn: async () => {
      const API = await getAPI();
      const response = await API.get('/api/provinces');
      return response.data;
    },
    select: response => response || []
  });
};

/** Fetch cities for a given province code from Go BFF wilayah endpoint. */
export const useGetCities = (provinceCode: number) => {
  return useQuery({
    queryKey: ['cities', provinceCode],
    queryFn: async () => {
      if (provinceCode === 0) return null;
      const API = await getAPI();
      const response = await API.get(`/api/regencies/${provinceCode}`);
      return Array.isArray(response.data) ? response.data : [];
    },
    enabled: provinceCode !== undefined && provinceCode !== null,
    select: response => response || []
  });
};

/** Fetch districts for a given city code from Go BFF wilayah endpoint. */
export const useGetDistricts = (cityCode: number) => {
  return useQuery({
    queryKey: ['districts', cityCode],
    queryFn: async () => {
      if (cityCode === 0) return null;
      const API = await getAPI();
      const response = await API.get(`/api/districts/${cityCode}`);
      return Array.isArray(response.data) ? response.data : [];
    },
    enabled: cityCode !== undefined && cityCode !== null,
    select: response => response || []
  });
};
