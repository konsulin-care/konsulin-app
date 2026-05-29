import { clearUserData } from '@/lib/indexeddb';
import axios, { AxiosInstance } from 'axios';
import { toast } from 'react-toastify';
import { parseAxiosError } from './api-error';

let apiInstance: AxiosInstance | null = null;
export let currentUserId: string | null = null;

export function setCurrentUserId(id: string | null) {
  currentUserId = id;
}

export async function getAPI(): Promise<AxiosInstance> {
  if (apiInstance) return apiInstance;

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
          } catch {}
        }, 1000);
      }

      if (process.env.NODE_ENV !== 'production') {
        // eslint-disable-next-line no-console
        console.debug('API error:', { error });
      }

      return Promise.reject(error);
    }
  );

  return apiInstance;
}

export async function apiRequest<T>(
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE',
  endpoint: string,
  data?: any,
  params?: any
): Promise<T> {
  const API = await getAPI();

  const config = {
    method,
    url: endpoint,
    data: data,
    params: params
  };

  try {
    const response = await API.request<T>(config);
    return response.data;
  } catch (error) {
    throw error;
  }
}
