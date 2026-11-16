import type { Analysis, Recommendation } from '../types/support'

export function rankRecommendations({ recommendations, relevanceScale }: Analysis): Recommendation[] {
  const scale = relevanceScale ?? (recommendations.some(({ relevance }) => relevance > 1) ? 'percent' : 'fraction')
  const multiplier = scale === 'percent' ? 1 : 100

  return recommendations
    .map((item) => ({ ...item, relevance: Math.max(0, Math.min(100, item.relevance * multiplier)) }))
    .sort((a, b) => b.relevance - a.relevance)
}
