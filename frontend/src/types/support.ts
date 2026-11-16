export interface ArticleInput {
  title: string
  body: string
  category: string
  tags: string[]
  isActive: boolean
}

export interface Article extends ArticleInput {
  id: string
  updatedAt?: string
  views?: number
}

export interface ArticleList {
  items: Article[]
  total: number
}

export interface Recommendation {
  articleId: string
  title: string
  category: string
  snippet: string
  relevance: number
  body?: string
  helpful?: boolean | null
}

export interface Analysis {
  requestId: string
  text: string
  category?: string | null
  confidence?: number | null
  entities?: string[]
  suggestedReply?: string | null
  recommendations: Recommendation[]
  degraded?: boolean
  createdAt?: string
}

export type Metric = 'totalRequests' | 'fcr' | 'averageHandlingSeconds' | 'helpfulRate'

export interface AnalyticsFilters {
  from: string
  to: string
  category?: string
  groupBy?: 'day' | 'week'
}

export interface AnalyticsPoint extends Partial<Record<Metric, number | null>> {
  date: string
}

export interface AnalyticsSummary extends Partial<Record<Metric, number | null>> {
  qualityScore?: number | null
  byCategory?: { category: string; count: number }[]
  series?: AnalyticsPoint[]
  topQueries?: { text: string; percent: number }[]
}
