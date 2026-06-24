/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-return */
import { useQuery } from '@tanstack/react-query';
import axios from 'axios';

const BASE = 'https://wilayah.id/api';

/** Fetch all provinces from wilayah.id API. */
export const useGetProvinces = () => {
  return useQuery({
    queryKey: ['provinces'],
    queryFn: async () => {
      const response = await axios.get(`${BASE}/provinces.json`);
      return response.data.data;
    },
    select: response => response || []
  });
};

/** Fetch cities for a given province code from wilayah.id API. */
export const useGetCities = (provinceCode: number) => {
  return useQuery({
    queryKey: ['cities', provinceCode],
    queryFn: async () => {
      if (provinceCode === 0) return null;
      const response = await axios.get(
        `${BASE}/regencies/${provinceCode}.json`
      );
      const payload = response.data?.data ?? response.data;
      return Array.isArray(payload) ? payload : [];
    },
    enabled: provinceCode !== undefined && provinceCode !== null,
    select: response => response || []
  });
};

/** Fetch districts for a given city code from wilayah.id API. */
export const useGetDistricts = (cityCode: number) => {
  return useQuery({
    queryKey: ['districts', cityCode],
    queryFn: async () => {
      if (cityCode === 0) return null;
      const response = await axios.get(`${BASE}/districts/${cityCode}.json`);
      const payload = response.data?.data ?? response.data;
      return Array.isArray(payload) ? payload : [];
    },
    enabled: cityCode !== undefined && cityCode !== null,
    select: response => response || []
  });
};
