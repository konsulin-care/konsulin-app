import { getClientConfig } from '@/lib/config';
import axios, { AxiosInstance } from 'axios';
import { deleteCookie, getCookie } from 'cookies-next';
import { toast } from 'react-toastify';
import { parseAxiosError } from './api-error';

let apiInstance: AxiosInstance | null = null;

export async function getAPI(): Promise<AxiosInstance> {
  if (apiInstance) return apiInstance;

  const config = await getClientConfig();

  apiInstance = axios.create({
    baseURL: config.appInfo.apiDomain,
    headers: {
      'Content-Type': 'application/json'
    }
  });

  apiInstance.interceptors.request.use(
    config => {
      const auth = JSON.parse(decodeURI(getCookie('auth') || '{}'));

      if (auth.token) config.headers.Authorization = `Bearer ${auth.token}`;

      return config;
    },
    error => {
      return Promise.reject(error);
    }
  );

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
          deleteCookie('auth');
          try {
            localStorage.clear();
          } catch {}
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
