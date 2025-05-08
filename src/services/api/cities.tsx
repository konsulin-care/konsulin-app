import { useQuery } from '@tanstack/react-query';
import axios from 'axios';

export const useGetProvinces = () => {
  return useQuery({
    queryKey: ['provinces'],
    queryFn: async () => {
      const response = await axios.get('/api/provinces');
      return response.data.data;
    },
    select: response => response || []
  });
};

export const useGetCities = (provinceCode: number) => {
  return useQuery({
    queryKey: ['cities', provinceCode],
    queryFn: async () => {
      if (provinceCode === 0) return null;
      const response = await axios.get(`/api/cities/${provinceCode}`);
      return response.data.data;
    },
    enabled: !provinceCode !== undefined && provinceCode !== null,
    select: response => response || null
  });
};

export const useGetDistricts = (cityCode: number) => {
  return useQuery({
    queryKey: ['districts', cityCode],
    queryFn: async () => {
      if (cityCode === 0) return null;
      const response = await axios.get(`/api/districts/${cityCode}`);
      return response.data.data;
    },
    enabled: !cityCode !== undefined && cityCode !== null,
    select: response => response || null
  });
};
