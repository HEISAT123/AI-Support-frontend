import { apiRequest } from '../lib/apiClient'
import type { Article, ArticleInput, ArticleList } from '../types/support'

export async function getArticles(q = '', category = '', signal?: AbortSignal): Promise<ArticleList> {
  const params = new URLSearchParams()
  if (q.trim()) params.set('q', q.trim())
  if (category) params.set('category', category)
  const result = await apiRequest<Article[] | ArticleList>(
    `/knowledge/articles${params.size ? '?' + params : ''}`, { signal },
  )
  return Array.isArray(result) ? { items: result, total: result.length } : result
}

export async function findArticle(id: string, title = '', signal?: AbortSignal) {
  const result = await getArticles(title, '', signal)
  const found = result.items.find((article) => article.id === id)
  if (found || !title) return found
  const all = await getArticles('', '', signal)
  return all.items.find((article) => article.id === id)
}

export function saveArticle(article: ArticleInput, apiKey: string, id?: string) {
  const path = id ? `/knowledge/articles/${encodeURIComponent(id)}` : '/knowledge/articles'
  return apiRequest<Article>(path, { method: id ? 'PUT' : 'POST', body: article, apiKey })
}

export function deactivateArticle(id: string, apiKey: string) {
  return apiRequest<void>(`/knowledge/articles/${encodeURIComponent(id)}`, { method: 'DELETE', apiKey })
}

export function importArticles(articles: ArticleInput[], apiKey: string) {
  return apiRequest<unknown>('/knowledge/import', { method: 'POST', body: { articles }, apiKey })
}
