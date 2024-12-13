import axios from 'axios'
import { deleteCookie, getCookie } from 'cookies-next'
import { toast } from 'react-toastify'

export const API = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL,
  headers: {
    'Content-Type': 'application/json'
  }
})

API.interceptors.request.use(
  config => {
    const auth = JSON.parse(decodeURI(getCookie('auth') || '{}'))

    if (auth.token) config.headers.Authorization = `Bearer ${auth.token}`

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
      autoClose: 2500,
      hideProgressBar: false,
      closeOnClick: true,
      pauseOnHover: true,
      draggable: true,
      progress: undefined
    })

    // expired token
    if (
      (error.response.status === 401 &&
        error.response.data.dev_message ===
          'invalid or expired token: Token is expired') ||
      error.response.data.dev_message === 'token missing'
    ) {
      setTimeout(() => {
        deleteCookie('auth')
        localStorage.clear()
        window.location.href = '/register'
      }, 1000)
    }

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
