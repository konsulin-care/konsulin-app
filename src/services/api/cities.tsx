import { useQuery } from '@tanstack/react-query';
import axios from 'axios';

export const useGetProvince = () => {
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
      const response = await axios.get(`/api/cities/${provinceCode}`);
      return response.data.data;
    },
    enabled: !!provinceCode,
    select: response => response || []
  });
};
