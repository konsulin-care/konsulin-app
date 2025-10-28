import {
  MarkUnavailabilityRequest,
  MarkUnavailabilityResponse,
  MarkUnavailabilityResult
} from '@/types/schedule';
import { useMutation } from '@tanstack/react-query';
import { getAPI } from '../api';

export async function postMarkUnavailability(
  payload: MarkUnavailabilityRequest
): Promise<MarkUnavailabilityResult> {
  const API = await getAPI();
  const res = await API.post('/api/v1/schedule/unavailable', payload, {
    validateStatus: s => [200, 201, 409].includes(s)
  });
  return { data: res.data as MarkUnavailabilityResponse, status: res.status };
}

export function useMarkUnavailability() {
  return useMutation({
    mutationKey: ['schedule-unavailable'],
    mutationFn: postMarkUnavailability
  });
}
