export class ApiError extends Error {
  readonly status: number
  readonly code: string

  constructor(status: number, code: string, message: string) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.code = code
  }
}

type HttpConfig = {
  getToken: () => string | null
  onUnauthorized: () => void
}

let config: HttpConfig = { getToken: () => null, onUnauthorized: () => undefined }

export function configureHttp(next: HttpConfig): void {
  config = next
}

export const API_URL = (import.meta.env.VITE_API_URL ?? 'http://localhost:3000/api').replace(/\/$/, '')

type RequestOptions = {
  method?: 'GET' | 'POST' | 'PATCH'
  body?: unknown
  signal?: AbortSignal
}

function isErrorBody(value: unknown): value is { code: string; message?: string } {
  return typeof value === 'object' && value !== null && typeof (value as { code?: unknown }).code === 'string'
}

export async function http<T>(path: string, { method = 'GET', body, signal }: RequestOptions = {}): Promise<T> {
  const token = config.getToken()
  const headers: Record<string, string> = { Accept: 'application/json' }
  if (body !== undefined) headers['Content-Type'] = 'application/json'
  if (token) headers.Authorization = `Bearer ${token}`

  let response: Response
  try {
    response = await fetch(`${API_URL}${path}`, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
      signal,
    })
  } catch (cause) {
    if (cause instanceof DOMException && cause.name === 'AbortError') throw cause
    throw new ApiError(0, 'NETWORK_ERROR', 'No se pudo conectar con la API')
  }

  const payload: unknown = response.status === 204 ? null : await response.json().catch(() => null)

  if (!response.ok) {
    // Only an authenticated request that gets 401 means the session expired;
    // a 401 on login is just bad credentials.
    if (response.status === 401 && token) config.onUnauthorized()
    if (isErrorBody(payload)) {
      throw new ApiError(response.status, payload.code, payload.message ?? payload.code)
    }
    throw new ApiError(response.status, 'UNKNOWN_ERROR', response.statusText)
  }

  return payload as T
}
