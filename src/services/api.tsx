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

export function getAPI(): Promise<AxiosInstance> {
  if (apiInstance) return Promise.resolve(apiInstance);

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

      toast.error(errorMessage, {
        position: 'top-right',
        autoClose: 2500,
        hideProgressBar: false,
        closeOnClick: true,
        pauseOnHover: true,
        draggable: true,
        progress: undefined
      });

      if (isExpiredToken || isMissingToken) {
        setTimeout(() => {
          clearUserData(currentUserId ?? 'guest');
          try {
            window.location.href = '/';
          } catch { /* redirect may throw */ }
        }, 1000);
      }

      if (process.env.NODE_ENV !== 'production') {
        // eslint-disable-next-line no-console
        console.debug('API error:', { error });
      }

      return Promise.reject(error);
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
