import { ApiError, apiRequest } from '../lib/apiClient'
import type { Analysis } from '../types/support'

type AnalysisResponse = Omit<Analysis, 'requestId' | 'text'> & {
  id?: string
  requestId?: string
  text?: string
}

function toAnalysis(response: AnalysisResponse, submittedText?: string): Analysis {
  const requestId = response?.requestId || response?.id
  if (typeof requestId !== 'string' || !Array.isArray(response.recommendations)
    || response.recommendations.some((item) => !item || typeof item.articleId !== 'string'
      || typeof item.title !== 'string' || !Number.isFinite(item.relevance))) {
    throw new ApiError('Сервер вернул результат анализа в неожиданном формате.', 200)
  }
  return { ...response, requestId, text: response.text ?? submittedText ?? 'Текст обращения недоступен.' }
}

export async function analyzeRequest(text: string, signal?: AbortSignal) {
  const response = await apiRequest<AnalysisResponse>('/requests/analyze', { method: 'POST', body: { text }, signal })
  return toAnalysis(response, text)
}

export async function getRequest(id: string, signal?: AbortSignal) {
  const response = await apiRequest<AnalysisResponse>(`/requests/${encodeURIComponent(id)}`, { signal })
  return toAnalysis(response)
}

export function sendFeedback(requestId: string, articleId: string, helpful: boolean) {
  return apiRequest<unknown>(`/requests/${encodeURIComponent(requestId)}/feedback`, {
    method: 'POST',
    body: { articleId, helpful },
  })
}
