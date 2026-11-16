import type { ArticleInput } from '../types/support'

const chars = (value: string) => Array.from(value).length

export function validateArticle(article: ArticleInput): string | undefined {
  const titleLength = chars(article.title.trim())
  if (titleLength < 5 || titleLength > 255) return 'Заголовок должен содержать от 5 до 255 символов.'
  if (!article.body.trim() || chars(article.body) > 20_000) return 'Введите текст статьи длиной до 20 000 символов.'
  if (!article.category.trim()) return 'Укажите категорию.'
  if (article.tags.length > 10) return 'Укажите до 10 тегов через запятую.'
}

export function validateBodySize(data: unknown) {
  if (new TextEncoder().encode(JSON.stringify(data)).byteLength > 65_536) {
    throw new Error('Размер запроса превышает 64 КБ. Сократите текст или разбейте импорт на части.')
  }
}

export function parseArticles(value: unknown): ArticleInput[] {
  if (!Array.isArray(value) || !value.length) throw new Error('JSON должен содержать непустой массив статей.')
  return value.map((entry, index) => {
    const prefix = `Статья ${index + 1}.`
    if (!entry || typeof entry !== 'object'
      || typeof entry.title !== 'string' || typeof entry.body !== 'string' || typeof entry.category !== 'string'
      || (entry.tags !== undefined && (!Array.isArray(entry.tags) || entry.tags.some((tag: unknown) => typeof tag !== 'string')))
      || (entry.isActive !== undefined && typeof entry.isActive !== 'boolean')) {
      throw new Error(`${prefix} Проверьте поля title, body, category, tags и isActive.`)
    }
    const article: ArticleInput = {
      title: entry.title.trim(), body: entry.body.trim(), category: entry.category.trim(),
      tags: (entry.tags ?? []).map((tag: string) => tag.trim()).filter(Boolean), isActive: entry.isActive ?? true,
    }
    const message = validateArticle(article)
    if (message) throw new Error(`${prefix} ${message}`)
    return article
  })
}
