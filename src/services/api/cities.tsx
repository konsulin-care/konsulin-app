import { useQuery } from '@tanstack/react-query';
import axios from 'axios';

const BASE = 'https://wilayah.id/api';

export const useGetProvinces = () => {
  return useQuery({
    queryKey: ['provinces'],
    queryFn: async () => {
      const response = await axios.get(`${BASE}/provinces.json`);
      return response.data.data; // eslint-disable-line @typescript-eslint/no-unsafe-return
    },
    select: response => response || [] // eslint-disable-line @typescript-eslint/no-unsafe-return
  });
};

export const useGetCities = (provinceCode: number) => {
  return useQuery({
    queryKey: ['cities', provinceCode],
    queryFn: async () => {
      if (provinceCode === 0) return null;
      const response = await axios.get(
        `${BASE}/regencies/${provinceCode}.json`
      );
      const payload = response.data?.data ?? response.data;
      return Array.isArray(payload) ? payload : []; // eslint-disable-line @typescript-eslint/no-unsafe-return
    },
    enabled: provinceCode !== undefined && provinceCode !== null,
    select: response => response || [] // eslint-disable-line @typescript-eslint/no-unsafe-return
  });
};

export const useGetDistricts = (cityCode: number) => {
  return useQuery({
    queryKey: ['districts', cityCode],
    queryFn: async () => {
      if (cityCode === 0) return null;
      const response = await axios.get(`${BASE}/districts/${cityCode}.json`);
      const payload = response.data?.data ?? response.data;
      return Array.isArray(payload) ? payload : []; // eslint-disable-line @typescript-eslint/no-unsafe-return
    },
    enabled: cityCode !== undefined && cityCode !== null,
    select: response => response || [] // eslint-disable-line @typescript-eslint/no-unsafe-return
  });
};
