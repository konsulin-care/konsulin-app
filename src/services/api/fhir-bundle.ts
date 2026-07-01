import { getAPI } from '@/services/api';
import { useMutation } from '@tanstack/react-query';
import type { Bundle } from 'fhir/r4';

/**
 * Submit a FHIR transaction bundle to the proxy endpoint.
 *
 * Accepts a complete FHIR Bundle (transaction type) containing entries
 * with resources and request instructions (POST/PUT), POSTs it to
 * `/fhir` (via the `/proxy` baseURL), and returns the response Bundle.
 *
 * @param bundle - The FHIR transaction bundle to submit
 * @returns The response Bundle from the FHIR server
 */
export async function submitFhirBundle(bundle: Bundle): Promise<Bundle> {
  const API = await getAPI();
  const response = await API.post<Bundle>('/fhir', bundle);
  return response.data;
}

/**
 * React Query mutation hook for submitting FHIR transaction bundles.
 *
 * Wraps submitFhirBundle for use in components. On success the response
 * bundle is returned from mutateAsync.
 */
export function useFhirBundleSubmit() {
  return useMutation({
    mutationKey: ['fhir-bundle-submit'],
    mutationFn: (bundle: Bundle) => submitFhirBundle(bundle)
  });
}
