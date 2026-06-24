/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-argument */
import { clearUserData } from '@/lib/indexeddb';
import axios, { AxiosInstance } from 'axios';
import { toast } from 'react-toastify';
import { parseAxiosError } from './api-error';

export interface UserProfile {
  userId: string;
  role_name?: string;
  roles?: string[];
  email?: string;
  phoneNumber?: string;
  fullname?: string;
  profile_picture?: string;
  fhirId?: string;
  profile_complete?: boolean;
  cachedAt?: number;
}

let apiInstance: AxiosInstance | null = null;
let currentUserId: string | null = null;

/** Returns the current user ID set during auth. */
export function getCurrentUserId(): string | null {
  return currentUserId;
}

/** Sets the current user ID for use in API error handlers. */
export function setCurrentUserId(id: string | null) {
  currentUserId = id;
}

/**
 *
 */
export function getAPI(): Promise<AxiosInstance> {
  if (apiInstance) return Promise.resolve(apiInstance);

  // eslint-disable-next-line import/no-named-as-default-member
  apiInstance = axios.create({
    baseURL: '/proxy',
    headers: {
      'Content-Type': 'application/json'
    }
  });

  // Authorization header injected by Go SSR proxy (reads sAccessToken cookie).
  // SuperTokens SDK global interceptors handle 401 + token refresh automatically.

  apiInstance.interceptors.response.use(
    response => response,
    error => {
      const { errorMessage, isExpiredToken, isMissingToken } =
        parseAxiosError(error);

      const requestUrl: string =
        (error.config?.url as string | undefined) ?? '';
      const isFhirRequest = requestUrl.startsWith('/fhir/');
      const isAuthEndpoint = requestUrl.startsWith('/api/v1/auth/');

      // Show toast for non-FHIR errors; FHIR 401s are often permission errors,
      // not actual token expiry, and showing toasts for every FHIR 401 is noisy.
      if (!isFhirRequest) {
        toast.error(errorMessage, {
          position: 'top-right',
          autoClose: 2500,
          hideProgressBar: false,
          closeOnClick: true,
          pauseOnHover: true,
          draggable: true,
          progress: undefined
        });
      }

      // Only clear user data / redirect for actual auth endpoint failures,
      // not for FHIR data access errors (e.g., Person resource 401).
      if ((isExpiredToken || isMissingToken) && isAuthEndpoint) {
        setTimeout(() => {
          void clearUserData(currentUserId ?? 'guest');
          try {
            window.location.href = '/';
          } catch (err) {
            console.error('Failed to redirect to home:', err);
          }
        }, 1000);
      }

      if (process.env.NODE_ENV !== 'production') {
        console.info('API error:', {
          url: requestUrl,
          isFhirRequest,
          isAuthEndpoint,
          error
        });
      }

      return Promise.reject(new Error(error));
    }
  );

  return Promise.resolve(apiInstance);
}

/** Performs an API request and returns the response data. */
export async function apiRequest<T>(
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE',
  endpoint: string,
  data?: Record<string, unknown>,
  params?: Record<string, unknown>
): Promise<T> {
  const API = await getAPI();

  const response = await API.request<T>({
    method,
    url: endpoint,
    data,
    params
  });
  return response.data;
}
