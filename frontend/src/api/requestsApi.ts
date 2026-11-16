import { apiRequest } from '../lib/apiClient'
import type { Analysis } from '../types/support'

export function analyzeRequest(text: string, signal?: AbortSignal) {
  return apiRequest<Analysis>('/requests/analyze', { method: 'POST', body: { text }, signal })
}

export function getRequest(id: string, signal?: AbortSignal) {
  return apiRequest<Analysis>(`/requests/${encodeURIComponent(id)}`, { signal })
}

export function sendFeedback(requestId: string, articleId: string, helpful: boolean) {
  return apiRequest<unknown>(`/requests/${encodeURIComponent(requestId)}/feedback`, {
    method: 'POST',
    body: { articleId, helpful },
  })
}
