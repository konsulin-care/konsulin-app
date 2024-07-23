import { getFromLocalStorage } from '@/lib/utils'
import { QueryClient } from '@tanstack/react-query'
import axios, { AxiosError } from 'axios'
import { toast } from 'react-toastify'

export const API = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL,
  headers: {
    'Content-Type': 'application/json'
  }
})

export const queryClient = new QueryClient()

API.interceptors.request.use(
  config => {
    const auth = getFromLocalStorage('auth')
    if (auth) {
      const { token } = JSON.parse(auth)
      if (token) {
        config.headers.Authorization = `Bearer ${token}`
      }
    }
    return config
  },
  error => {
    return Promise.reject(error)
  }
)

API.interceptors.response.use(
  response => response,
  (error: AxiosError) => {
    console.log('Logging the error', error)
    console.log('Logging message', error?.message)
    toast.error(error?.message || 'An unexpected error occured!', {
      position: 'top-right',
      autoClose: 5000,
      hideProgressBar: false,
      closeOnClick: true,
      pauseOnHover: true,
      draggable: true,
      progress: undefined
      // theme: 'dark',
    })
    return Promise.reject(error)
  }
)

export async function apiRequest<T>(
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE',
  endpoint: string,
  data?: any,
  params?: any
): Promise<T> {
  const config = {
    method,
    url: endpoint,
    data: data,
    params: params
  }

  try {
    const response = await API(config)
    return response.data as T
  } catch (error) {
    throw error
  }
}
