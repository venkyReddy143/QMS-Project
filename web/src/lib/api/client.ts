import axios, { type AxiosError } from 'axios'
import { clearAccessToken, getAccessToken } from './session'

export const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || '/api',
  timeout: 20000,
  headers: {
    Accept: 'application/json',
    'Content-Type': 'application/json',
  },
})

type UnauthorizedListener = () => void

const unauthorizedListeners = new Set<UnauthorizedListener>()

export function onUnauthorized(listener: UnauthorizedListener): () => void {
  unauthorizedListeners.add(listener)
  return () => {
    unauthorizedListeners.delete(listener)
  }
}

function isLoginRequest(url: string | undefined): boolean {
  return Boolean(url?.includes('/auth/login'))
}

apiClient.interceptors.request.use((config) => {
  const token = getAccessToken()
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  } else {
    delete config.headers.Authorization
  }
  return config
})

apiClient.interceptors.response.use(
  (response) => response,
  (error: AxiosError<{ message?: string }>) => {
    const status = error.response?.status
    const url = error.config?.url

    if (status === 401 && !isLoginRequest(url)) {
      clearAccessToken()
      unauthorizedListeners.forEach((listener) => listener())
    }

    const message =
      error.response?.data?.message ||
      error.message ||
      'Request failed. Please try again.'

    return Promise.reject(new Error(message))
  },
)
