import { dateFromKey, dateKey, moveDay } from '../lib/format'
import type { Analysis, AnalyticsPoint, AnalyticsSummary, Article, ArticleInput, Recommendation } from '../types/support'

function mockArticle(n: number, title: string, category: string, body: string, views: number): Article {
  return {
    id: `a1000000-0000-4000-8000-${String(n).padStart(12, '0')}`,
    title, category, body, views, tags: [], isActive: true, updatedAt: '2025-04-14T12:00:00Z',
  }
}

let articles = [
  mockArticle(1, 'Ошибка 651 при подключении к интернету', 'technical', `Основные причины ошибки 651 и способы решения.

## Порядок действий

1. Проверьте, что кабель надёжно подключён к модему и роутеру и не повреждён.
2. Перезагрузите модем: отключите питание на 30 секунд и включите снова.
3. Удалите подключение в настройках сети и создайте его заново, указав логин и пароль из договора.
4. Если ошибка 651 остаётся, передайте обращение на вторую линию с указанием номера ошибки.

> **Важно.** Не просите клиента менять настройки роутера, пока не проверен кабель.`, 1840),
  mockArticle(2, 'Настройка интернета на даче (роутер)', 'technical', 'Пошаговая инструкция по настройке оборудования для стабильного соединения.\n\n1. Проверьте уровень сигнала.\n2. Перезапустите роутер.\n3. Проверьте параметры подключения в личном кабинете.', 2410),
  mockArticle(3, 'Проверка кабеля и оборудования', 'equipment', 'Как самостоятельно проверить кабель, модем и роутер.\n\n1. Убедитесь, что разъёмы установлены до щелчка.\n2. Проверьте индикаторы питания и сети.', 1120),
  mockArticle(4, 'Частые ошибки при подключении', 'technical', 'Проверьте код ошибки, состояние сети и настройки подключения. Если код сохраняется, передайте обращение на вторую линию.', 610),
  mockArticle(5, 'Возврат средств за подписку', 'billing', 'Уточните дату и сумму списания. Проверьте условия возврата и передайте заявку на рассмотрение.', 1260),
  mockArticle(6, 'Как сбросить пароль от аккаунта', 'auth', 'Откройте страницу входа, нажмите «Забыли пароль?» и отправьте ссылку восстановления на почту клиента.', 1840),
  mockArticle(7, 'Смена тарифа на мобильную связь', 'services', 'Предложите клиенту доступные тарифы и проверьте дату вступления выбранного тарифа в силу.', 980),
]

const requests = new Map<string, Analysis>()

const topics = [
  { pattern: /интернет|651|роутер|подключ|сет[ьи]/i, category: 'technical', matches: [1, 2, 3], entities: ['интернет', 'дача', 'ошибка', '651'] },
  { pattern: /возврат|вернуть|деньг|списан/i, category: 'billing', matches: [5], entities: ['возврат', 'подписка'] },
  { pattern: /войти|вход|парол|кабинет/i, category: 'auth', matches: [6], entities: ['вход', 'аккаунт'] },
  { pattern: /тариф/i, category: 'services', matches: [7], entities: ['тариф', 'связь'] },
  { pattern: /оборудован|кабел|модем/i, category: 'equipment', matches: [3, 2], entities: ['оборудование'] },
]

function analyze(text: string, requestId = crypto.randomUUID(), createdAt = new Date().toISOString()): Analysis {
  const topic = topics.find(({ pattern }) => pattern.test(text))
  const recommendations = (topic?.matches ?? []).flatMap<Recommendation>((number, index) => {
    const suffix = String(number).padStart(12, '0')
    const article = articles.find(({ id, isActive }) => isActive && id.endsWith(suffix))
    if (!article) return []
    return [{
      articleId: article.id, title: article.title, category: article.category,
      snippet: article.body.split('\n\n')[0], relevance: [0.96, 0.89, 0.78][index],
    }]
  })
  const top = recommendations[0]
  return {
    requestId, text, createdAt, category: topic?.category ?? 'other',
    confidence: topic ? 0.93 : null, entities: topic?.entities ?? [],
    recommendations,
    suggestedReply: top ? `Здравствуйте! По вашему вопросу может помочь статья «${top.title}». ${top.snippet} Если проблема сохранится, напишите нам — подключим специалиста.` : null,
  }
}

export const demoRecent = [
  'Не работает интернет на даче, пишет ошибка 651',
  'Как вернуть деньги за подписку?',
  'Не могу войти в личный кабинет',
  'Смена тарифа на мобильную связь',
].map((entry, i) => {
  const timestamp = moveDay(new Date(), i === 3 ? -1 : 0)
  timestamp.setHours([14, 12, 10, 16][i], [32, 17, 5, 45][i], 0, 0)
  const result = analyze(entry, `b0000000-0000-4000-8000-00000000000${i + 1}`, timestamp.toISOString())
  requests.set(result.requestId, result)
  return result
})

function analytics(query: URLSearchParams): AnalyticsSummary {
  const from = query.get('from') || dateKey()
  const to = query.get('to') || from
  const day = dateFromKey(from)
  const categories = [
    { category: 'technical', share: .38 }, { category: 'billing', share: .27 },
    { category: 'services', share: .2 }, { category: 'auth', share: .15 },
  ]
  const filter = query.get('category')
  const share = filter ? categories.find(({ category }) => category === filter)?.share ?? 0 : 1
  const series: AnalyticsPoint[] = []
  const weekly = query.get('groupBy') === 'week'
  for (let i = 0; i < 370 && dateKey(moveDay(day, i)) <= to; i++) {
    const current = moveDay(day, i)
    const step = Math.floor(current.getTime() / 86400000)
    const isToday = dateKey(current) === dateKey()
    const point = {
      date: dateKey(current), totalRequests: Math.round((isToday && from === to ? 24 : 180 + step % 187) * share),
      fcr: share ? (from === to ? 92 : 82 + step % 16) : null,
      averageHandlingSeconds: share ? (from === to ? 108 : 40 + step % 18) : null,
      helpfulRate: share ? 86 + step % 13 : null,
    }
    const previous = series.at(-1)
    if (weekly && i % 7 !== 0 && previous) {
      const count = i % 7
      const sum = previous.totalRequests! + point.totalRequests
      for (const key of ['fcr', 'averageHandlingSeconds', 'helpfulRate'] as const) {
        previous[key] = point[key] == null ? null : ((previous[key] ?? 0) * count + point[key]) / (count + 1)
      }
      previous.totalRequests = sum
    } else {
      series.push(point)
    }
  }
  const totalRequests = series.reduce((sum, row) => sum + (row.totalRequests ?? 0), 0)
  const average = (key: 'fcr' | 'averageHandlingSeconds' | 'helpfulRate') => {
    return totalRequests ? series.reduce((sum, row) => sum + (row[key] ?? 0) * (row.totalRequests ?? 0), 0) / totalRequests : null
  }
  let remaining = totalRequests
  const byCategory = filter ? [{ category: filter, count: totalRequests }] : categories.map((entry, index) => {
    const count = index === categories.length - 1 ? remaining : Math.round(totalRequests * entry.share)
    remaining -= count
    return { category: entry.category, count }
  })
  const topQueries = [
    { text: 'Сброс пароля', percent: 82, category: 'auth' },
    { text: 'Ошибка 500', percent: 64, category: 'technical' },
    { text: 'Пополнение баланса', percent: 51, category: 'billing' },
    { text: 'Возврат средств', percent: 38, category: 'billing' },
    { text: 'Настройка уведомлений', percent: 27, category: 'services' },
  ].filter(({ category }) => totalRequests && (!filter || filter === category))
  return {
    totalRequests, fcr: average('fcr'), averageHandlingSeconds: average('averageHandlingSeconds'),
    helpfulRate: average('helpfulRate'), qualityScore: share ? 4.8 : null, byCategory, series, topQueries,
  }
}

function fail(status: number, code: string, message: string) {
  return Response.json({ error: { code, message } }, { status })
}

export async function demoRequest(path: string, init: RequestInit) {
  await new Promise((resolve) => window.setTimeout(resolve, path === '/requests/analyze' ? 450 : 120))
  init.signal?.throwIfAborted()
  const url = new URL(path, window.location.origin)
  const { pathname, searchParams } = url
  const method = init.method ?? 'GET'
  const body = typeof init.body === 'string' ? JSON.parse(init.body) : undefined
  if (pathname === '/requests/analyze' && method === 'POST') {
    if (typeof body?.text !== 'string' || body.text.length < 3 || body.text.length > 4000) {
      return fail(400, 'VALIDATION_ERROR', 'Введите от 3 до 4000 символов.')
    }
    const result = analyze(body.text)
    requests.set(result.requestId, result)
    return Response.json(result)
  }

  const requestMatch = /^\/requests\/([^/]+)(\/feedback)?$/.exec(pathname)
  if (requestMatch) {
    const result = requests.get(requestMatch[1])
    if (!result) return fail(404, 'NOT_FOUND', 'Обращение не найдено.')
    if (!requestMatch[2] && method === 'GET') return Response.json(result)
    const recommendation = result.recommendations.find(({ articleId }) => articleId === body?.articleId)
    if (method !== 'POST' || !recommendation || typeof body?.helpful !== 'boolean') {
      return fail(422, 'UNPROCESSABLE_ENTITY', 'Не удалось определить рекомендацию.')
    }
    recommendation.helpful = body.helpful
    return new Response(null, { status: 204 })
  }

  if (pathname === '/knowledge/articles' && method === 'GET') {
    const q = searchParams.get('q')?.trim().toLocaleLowerCase('ru') ?? ''
    const category = searchParams.get('category')
    const items = articles.filter((article) => (!category || article.category === category)
      && `${article.title} ${article.body} ${article.tags.join(' ')}`.toLocaleLowerCase('ru').includes(q))
    return Response.json({ items, total: items.length })
  }
  if (pathname === '/knowledge/articles' && method === 'POST') {
    const article = { ...body as ArticleInput, id: crypto.randomUUID(), views: 0, updatedAt: new Date().toISOString() }
    articles = [...articles, article]
    return Response.json(article, { status: 201 })
  }
  const articleMatch = /^\/knowledge\/articles\/([^/]+)$/.exec(pathname)
  if (articleMatch) {
    const previous = articles.find(({ id }) => id === articleMatch[1])
    if (!previous) return fail(404, 'NOT_FOUND', 'Статья не найдена.')
    const next = { ...previous, ...(method === 'DELETE' ? { isActive: false } : body), updatedAt: new Date().toISOString() }
    articles = articles.map((article) => article.id === previous.id ? next : article)
    return method === 'DELETE' ? new Response(null, { status: 204 }) : Response.json(next)
  }
  if (pathname === '/knowledge/import' && method === 'POST') {
    const batch = (body.articles as ArticleInput[]).map((article) => ({
      ...article, id: crypto.randomUUID(), views: 0, updatedAt: new Date().toISOString(),
    }))
    articles = [...articles, ...batch]
    return Response.json({ imported: batch.length }, { status: 201 })
  }
  if (pathname === '/analytics/summary' && method === 'GET') return Response.json(analytics(searchParams))
  return fail(404, 'NOT_FOUND', 'Запрошенные данные не найдены.')
}
