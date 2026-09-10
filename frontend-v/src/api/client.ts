

const BASE_URL = (import.meta.env.VITE_API_BASE_URL || '').replace(/\/$/, '')

const TOKEN_KEY = 'authToken'

export const getToken = (): string => localStorage.getItem(TOKEN_KEY) || ''

export const setToken = (token: string): void => {
  localStorage.setItem(TOKEN_KEY, token)
}

export const clearSession = (): void => {
  localStorage.removeItem(TOKEN_KEY)
  localStorage.removeItem('isLoggedIn')
  localStorage.removeItem('userRole')
  localStorage.removeItem('userLicense')
  localStorage.removeItem('orNumber')
}

export const SESSION_EXPIRED_KEY = 'sessionExpiredMessage'

const handleUnauthorized = (): void => {
  const role = localStorage.getItem('userRole')
  clearSession()

  sessionStorage.setItem(SESSION_EXPIRED_KEY, 'Your session has expired. Please log in again.')

  const loginPath = role === 'admin' ? '/admin-login' : '/login'
  if (window.location.pathname !== loginPath) {
    window.location.replace(loginPath)
  }
}

export async function apiFetch(path: string, options: RequestInit & { skipAuth?: boolean } = {}) {
  const { skipAuth, headers, ...rest } = options
  const finalHeaders = new Headers(headers)

  if (!skipAuth) {
    const token = getToken()
    if (token) finalHeaders.set('Authorization', `Bearer ${token}`)
  }

  const response = await fetch(`${BASE_URL}${path}`, { ...rest, headers: finalHeaders })

  if (response.status === 401 && !skipAuth) handleUnauthorized()

  return response
}

export class ApiError extends Error {
  status: number
  payload: unknown

  constructor(status: number, message: string, payload: unknown) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.payload = payload
  }
}

type ApiOptions = Omit<RequestInit, 'body'> & {

  body?: unknown

  skipAuth?: boolean
}

export async function api<T = any>(path: string, options: ApiOptions = {}): Promise<T> {
  const { body, skipAuth, headers, ...rest } = options

  const finalHeaders = new Headers(headers)

  if (body !== undefined && !finalHeaders.has('Content-Type')) {
    finalHeaders.set('Content-Type', 'application/json')
  }

  if (!skipAuth) {
    const token = getToken()
    if (token) finalHeaders.set('Authorization', `Bearer ${token}`)
  }

  const response = await fetch(`${BASE_URL}${path}`, {
    ...rest,
    headers: finalHeaders,
    body: body === undefined ? undefined : JSON.stringify(body),
  })

  const text = await response.text()
  let payload: unknown = null
  try {
    payload = text ? JSON.parse(text) : null
  } catch {
    payload = text
  }

  if (response.status === 401 && !skipAuth) {
    handleUnauthorized()
    throw new ApiError(401, 'Your session has expired. Please log in again.', payload)
  }

  if (!response.ok) {
    const errorBody = payload as { error?: string; message?: string } | null
    const message =
    errorBody?.error || errorBody?.message || `API request failed (${response.status})`
    throw new ApiError(response.status, message, payload)
  }

  return payload as T
}

export const apiGet = <T = any>(path: string, options: ApiOptions = {}) =>
  api<T>(path, { ...options, method: 'GET' })

export const apiPost = <T = any>(path: string, body?: unknown, options: ApiOptions = {}) =>
  api<T>(path, { ...options, method: 'POST', body })

export const apiPut = <T = any>(path: string, body?: unknown, options: ApiOptions = {}) =>
  api<T>(path, { ...options, method: 'PUT', body })

export const apiPatch = <T = any>(path: string, body?: unknown, options: ApiOptions = {}) =>
  api<T>(path, { ...options, method: 'PATCH', body })

export const apiDelete = <T = any>(path: string, options: ApiOptions = {}) =>
  api<T>(path, { ...options, method: 'DELETE' })
