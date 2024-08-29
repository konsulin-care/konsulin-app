import { getFromLocalStorage } from '@/lib/utils'
import axios from 'axios'
import { toast } from 'react-toastify'

export const API = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL,
  headers: {
    'Content-Type': 'application/json'
  }
})

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
  response => response.data,
  error => {
    console.log('Logging the error', error)

    let errorMessage = error?.message || 'An unexpected error occured!'
    if (error.response.data.message) errorMessage = error.response.data.message

    toast.error(errorMessage, {
      position: 'top-right',
      autoClose: 5000,
      hideProgressBar: false,
      closeOnClick: true,
      pauseOnHover: true,
      draggable: true,
      progress: undefined
      // theme: 'dark',
    })

    // handle this letter if no refresh-token

    // if (error.status === 401) {
    //   localStorage.clear()
    //   window.location.href = '/register';
    // }

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
    return response as T
  } catch (error) {
    throw error
  }
}
