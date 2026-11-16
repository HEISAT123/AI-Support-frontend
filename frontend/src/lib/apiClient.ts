const baseUrl = (import.meta.env.VITE_API_BASE_URL || '/api/v1').replace(/\/+$/, '')

export class ApiError extends Error {
  constructor(message: string, readonly status: number, readonly code?: string) {
    super(message)
    this.name = 'ApiError'
  }
}

const errorMessages: Record<number, string> = {
  400: 'Проверьте введённые данные.',
  401: 'Требуется ключ API.',
  403: 'Сервер отклонил ключ API.',
  404: 'Запрошенные данные не найдены.',
  422: 'Сервер не принял введённые данные.',
  429: 'Слишком много запросов. Повторите попытку позже.',
  502: 'Сервис анализа временно недоступен. Повторите попытку позже.',
}

type ApiOptions = {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE'
  body?: unknown
  apiKey?: string
  signal?: AbortSignal
}

export async function apiRequest<T>(path: string, options: ApiOptions = {}): Promise<T> {
  const { method = 'GET', body, apiKey, signal } = options
  const headers = new Headers({ Accept: 'application/json' })
  if (body !== undefined) headers.set('Content-Type', 'application/json')
  if (apiKey) headers.set('X-Api-Key', apiKey)

  const init = { method, headers, body: body === undefined ? undefined : JSON.stringify(body), signal }
  let response: Response
  try {
    response = await fetch(baseUrl + path, init)
  } catch (error) {
    if (signal?.aborted) throw error
    throw new ApiError('Не удалось связаться с сервером. Проверьте подключение и повторите попытку.', 0)
  }

  if (!response.ok) {
    const data = await response.json().catch(() => null) as {
      error?: { message?: string; code?: string }
      detail?: string
    } | null
    const detail = typeof data?.detail === 'string' ? data.detail : undefined
    throw new ApiError(
      data?.error?.message || detail || errorMessages[response.status] || 'Сервис временно недоступен.',
      response.status,
      data?.error?.code,
    )
  }

  if (response.status === 204 || method === 'DELETE') return undefined as T
  const content = await response.text()
  if (!content && method !== 'GET') return undefined as T
  try {
    return JSON.parse(content) as T
  } catch {
    throw new ApiError('Сервер вернул ответ в неожиданном формате.', response.status)
  }
}

export function errorMessage(error: unknown): string {
  return error instanceof ApiError ? error.message : 'Не удалось выполнить запрос. Повторите попытку.'
}
