import { apiRequest } from '../lib/apiClient'
import type { AnalyticsFilters, AnalyticsSummary } from '../types/support'

export function getAnalytics(filters: AnalyticsFilters, signal?: AbortSignal) {
  const query = new URLSearchParams({ from: filters.from, to: filters.to })
  if (filters.category) query.set('category', filters.category)
  if (filters.groupBy) query.set('groupBy', filters.groupBy)
  return apiRequest<AnalyticsSummary>(`/analytics/summary?${query}`, { signal })
}
