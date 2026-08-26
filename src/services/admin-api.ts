import type { HttpMethod } from '@/lib/admin/endpoints';
import axios, { AxiosRequestConfig } from 'axios';

/**
 * Superadmin API client. Requests go through the BFF /proxy base URL with
 * same-origin credentials — the browser sends the HttpOnly superadmin key
 * cookie automatically, so JS never reads or sets the X-API-Key header.
 * The BFF injects the header server-side (lazy backend enforcement).
 */

// eslint-disable-next-line import/no-named-as-default-member
const adminClient = axios.create({
  baseURL: '/proxy',
  withCredentials: true
});

/**
 * Issues a superadmin API request through the BFF proxy.
 *
 * @param method - HTTP method
 * @param path - backend path (e.g. /fhir/Organization) — /proxy prefix implied
 * @param body - optional JSON payload (POST/PUT)
 * @param params - optional query parameters (GET)
 * @returns the response data
 */
export async function adminRequest<T>(
  method: HttpMethod,
  path: string,
  body?: Record<string, unknown>,
  params?: Record<string, unknown>
): Promise<T> {
  const config: AxiosRequestConfig = { method, url: path };
  if (body !== undefined) config.data = body;
  if (params !== undefined) config.params = params;
  const response = await adminClient.request<T>(config);
  return response.data;
}

/**
 * Submits the superadmin API key to the BFF, which stores it in an HttpOnly
 * cookie. The key never reaches client-side storage.
 *
 * @param apiKey - superadmin API key
 */
export async function setAdminKey(apiKey: string): Promise<void> {
  await adminClient.request({
    method: 'POST',
    url: '/api/admin/key',
    data: { apiKey }
  });
}

/**
 * Clears the BFF-held superadmin key cookie (lock button).
 */
export async function clearAdminKey(): Promise<void> {
  await adminClient.request({
    method: 'DELETE',
    url: '/api/admin/key'
  });
}

/**
 * Extracts a human-readable message from an admin API error without ever
 * echoing the key value.
 *
 * @param err - thrown error (axios or otherwise)
 * @returns backend message when present, else a generic fallback
 */
export function parseAdminKeyError(err: unknown): string {
  const axiosErr = err as
    | { response?: { data?: { message?: unknown } } }
    | undefined;
  const message = axiosErr?.response?.data?.message;
  if (typeof message === 'string' && message.length > 0) {
    return message;
  }
  return 'An unexpected error occurred';
}
