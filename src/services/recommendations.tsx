import type {
  RecommendationsResponse,
  SpecialtiesResponse
} from '@/types/recommendation';
import { useQuery } from '@tanstack/react-query';
import { getAPI } from './api';

export interface RecommendationsParams {
  specialty: string;
  lat?: number;
  lon?: number;
}

/**
 * Fetch recommendation cards from the BFF endpoint.
 *
 * Uses the non-proxied instance — `/api/recommendations` is a Go BFF route,
 * not a FHIR proxy path.
 *
 * @param params - Intent params; null disables the query (picker shown first)
 */
export const useRecommendations = (params: RecommendationsParams | null) => {
  return useQuery({
    queryKey: ['recommendations', params?.specialty, params?.lat, params?.lon],
    queryFn: async () => {
      const API = await getAPI({ proxy: false });
      const response = await API.get<RecommendationsResponse>(
        '/api/recommendations',
        { params: params ?? {} }
      );
      return response.data;
    },
    enabled: Boolean(params?.specialty)
  });
};

/**
 * Fetch the BFF-derived distinct specialty list for the picker/filter.
 */
export const useSpecialties = () => {
  return useQuery({
    queryKey: ['recommendation-specialties'],
    queryFn: async () => {
      const API = await getAPI({ proxy: false });
      const response = await API.get<SpecialtiesResponse>(
        '/api/recommendations/specialties'
      );
      return response.data.specialties;
    },
    staleTime: 60 * 1000
  });
};
