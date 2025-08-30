import { getClientConfig } from '@/lib/config';
import axios, { AxiosInstance } from 'axios';
import { deleteCookie, getCookie } from 'cookies-next';
import { toast } from 'react-toastify';

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
      console.log('Logging the error', error);

      let errorMessage = error?.message || 'An unexpected error occured!';
      if (error.response.data.message)
        errorMessage = error.response.data.message;

      toast.error(errorMessage, {
        position: 'top-right',
        autoClose: 2500,
        hideProgressBar: false,
        closeOnClick: true,
        pauseOnHover: true,
        draggable: true,
        progress: undefined
      });

      // expired token
      if (
        (error.response.status === 401 &&
          error.response.data.dev_message ===
            'invalid or expired token: Token is expired') ||
        error.response.data.dev_message === 'token missing'
      ) {
        setTimeout(() => {
          deleteCookie('auth');
          localStorage.clear();
          window.location.href = '/';
        }, 1000);
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
