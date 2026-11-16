import { dateFromKey, dateKey, moveDay } from '../lib/format'
import type { Analysis, AnalyticsSummary, Article, ArticleInput, Recommendation } from '../types/support'

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

type DemoAnalysis = Analysis & { createdAt: string }

interface DemoRequest {
  analysis: DemoAnalysis
  reopenedAt?: string
}

const requests = new Map<string, DemoRequest>()

const topics = [
  { pattern: /интернет|651|роутер|подключ|сет[ьи]/i, category: 'technical', matches: [1, 2, 3], entities: ['интернет', 'дача', 'ошибка', '651'] },
  { pattern: /возврат|вернуть|деньг|списан/i, category: 'billing', matches: [5], entities: ['возврат', 'подписка'] },
  { pattern: /войти|вход|парол|кабинет/i, category: 'auth', matches: [6], entities: ['вход', 'аккаунт'] },
  { pattern: /тариф/i, category: 'services', matches: [7], entities: ['тариф', 'связь'] },
  { pattern: /оборудован|кабел|модем/i, category: 'equipment', matches: [3, 2], entities: ['оборудование'] },
]

function analyze(text: string, requestId = crypto.randomUUID(), createdAt = new Date().toISOString()): DemoAnalysis {
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
    relevanceScale: 'fraction',
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
  requests.set(result.requestId, {
    analysis: result,
    reopenedAt: i === 2 ? new Date(timestamp.getTime() + 30 * 60 * 1000).toISOString() : undefined,
  })
  return result
})

const demoCategories = [
  { category: 'technical', share: .38 }, { category: 'billing', share: .27 },
  { category: 'services', share: .2 }, { category: 'auth', share: .15 },
]

interface Totals {
  requests: number
  resolved: number
  feedback: number
  helpful: number
  handlingSeconds: number
  handlingSamples: number
}

const emptyTotals = (): Totals => ({
  requests: 0, resolved: 0, feedback: 0, helpful: 0, handlingSeconds: 0, handlingSamples: 0,
})

function addTotals(total: Totals, value: Totals) {
  total.requests += value.requests
  total.resolved += value.resolved
  total.feedback += value.feedback
  total.helpful += value.helpful
  total.handlingSeconds += value.handlingSeconds
  total.handlingSamples += value.handlingSamples
}

function summarize(total: Totals) {
  return {
    totalRequests: total.requests,
    fcr: total.requests ? total.resolved / total.requests * 100 : null,
    averageHandlingSeconds: total.handlingSamples ? total.handlingSeconds / total.handlingSamples : null,
    helpfulRate: total.feedback ? total.helpful / total.feedback * 100 : null,
  }
}

function historyForDay(day: Date, isToday: boolean) {
  const step = Math.floor(day.getTime() / 86_400_000)
  const volume = isToday ? 21 : 240 + Math.round(48 * Math.sin(step * .39) + 28 * Math.cos(step * 1.37))
  const resolvedRate = isToday ? .92 : (82 + step % 16) / 100
  const helpfulRate = (86 + step % 13) / 100
  const averageSeconds = isToday ? 108 : 40 + step % 18

  let allocated = 0
  return demoCategories.map(({ category, share }, index) => {
    const count = index === demoCategories.length - 1 ? volume - allocated : Math.round(volume * share)
    allocated += count
    const totals: Totals = {
      requests: count, resolved: Math.round(count * resolvedRate),
      feedback: count, helpful: Math.round(count * helpfulRate),
      handlingSeconds: count * averageSeconds, handlingSamples: count,
    }
    return { category, totals }
  })
}

function analytics(query: URLSearchParams): AnalyticsSummary {
  const today = dateKey()
  const from = query.get('from') || today
  const to = query.get('to') || from
  const start = dateFromKey(from)
  const category = query.get('category')
  const weekly = query.get('groupBy') === 'week'
  const total = emptyTotals()
  const byCategory = new Map<string, number>()
  const groups: { date: string; totals: Totals }[] = []
  const activity = new Map<string, DemoRequest[]>()
  for (const request of requests.values()) {
    const day = dateKey(new Date(request.analysis.createdAt))
    const items = activity.get(day)
    if (items) items.push(request)
    else activity.set(day, [request])
  }

  function record(day: Totals, code: string, totals: Totals) {
    if (category && category !== code) return
    addTotals(day, totals)
    byCategory.set(code, (byCategory.get(code) ?? 0) + totals.requests)
  }

  for (let i = 0; i < 370; i++) {
    const date = moveDay(start, i)
    const day = dateKey(date)
    if (day > to) break
    const daily = emptyTotals()

    for (const item of historyForDay(date, day === today)) record(daily, item.category, item.totals)
    for (const { analysis, reopenedAt } of activity.get(day) ?? []) {
      const feedback = analysis.recommendations.filter(({ helpful }) => typeof helpful === 'boolean')
      const helpful = feedback.filter((item) => item.helpful).length
      const reopenedSameDay = reopenedAt !== undefined && dateKey(new Date(reopenedAt)) === day
      record(daily, analysis.category ?? 'other', {
        ...emptyTotals(),
        requests: 1,
        resolved: helpful > 0 && !reopenedSameDay ? 1 : 0,
        feedback: feedback.length,
        helpful,
      })
    }

    addTotals(total, daily)
    const group = groups.at(-1)
    if (weekly && i % 7 !== 0 && group) addTotals(group.totals, daily)
    else groups.push({ date: day, totals: daily })
  }

  const topQueries = [
    { text: 'Сброс пароля', percent: 82, category: 'auth' },
    { text: 'Ошибка 500', percent: 64, category: 'technical' },
    { text: 'Пополнение баланса', percent: 51, category: 'billing' },
    { text: 'Возврат средств', percent: 38, category: 'billing' },
    { text: 'Настройка уведомлений', percent: 27, category: 'services' },
  ].filter((item) => total.requests && (!category || category === item.category))
  return {
    ...summarize(total),
    qualityScore: total.handlingSamples ? 4.8 : null,
    byCategory: Array.from(byCategory, ([category, count]) => ({ category, count })),
    series: groups.map(({ date, totals }) => ({ date, ...summarize(totals) })),
    topQueries,
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
    if (typeof body?.text !== 'string' || Array.from(body.text).length < 3 || Array.from(body.text).length > 4000) {
      return fail(400, 'VALIDATION_ERROR', 'Введите от 3 до 4000 символов.')
    }
    const result = analyze(body.text)
    requests.set(result.requestId, { analysis: result })
    return Response.json(result)
  }

  const requestMatch = /^\/requests\/([^/]+)(\/feedback)?$/.exec(pathname)
  if (requestMatch) {
    const result = requests.get(requestMatch[1])?.analysis
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
