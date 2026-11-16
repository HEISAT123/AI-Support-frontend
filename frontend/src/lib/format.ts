export const categories: Record<string, string> = {
  technical: 'Техническая поддержка',
  billing: 'Финансы',
  services: 'Услуги',
  auth: 'Личный кабинет',
  equipment: 'Оборудование',
  other: 'Другое',
}

const numbers = new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 1 })
const dates = new Intl.DateTimeFormat('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric' })
const shortDates = new Intl.DateTimeFormat('ru-RU', { day: '2-digit', month: '2-digit' })
const times = new Intl.DateTimeFormat('ru-RU', { hour: '2-digit', minute: '2-digit' })

export function categoryLabel(code?: string | null) {
  return code ? categories[code] ?? code : 'Не определена'
}

export function dateKey(date = new Date()): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export function dateFromKey(key: string) {
  return new Date(`${key}T12:00:00`)
}

export function moveDay(date: Date, days: number) {
  const next = new Date(date)
  next.setDate(next.getDate() + days)
  return next
}

export function displayDate(value?: string, short = false) {
  if (!value) return '—'
  const date = /^\d{4}-\d{2}-\d{2}$/.test(value) ? dateFromKey(value) : new Date(value)
  return Number.isNaN(date.getTime()) ? '—' : (short ? shortDates : dates).format(date)
}

export function displayRecent(value?: string) {
  if (!value) return '—'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '—'
  const today = new Date()
  const label = dateKey(date) === dateKey(today) ? 'Сегодня'
    : dateKey(date) === dateKey(moveDay(today, -1)) ? 'Вчера' : dates.format(date)
  return `${label}, ${times.format(date)}`
}

export function displayNumber(value?: number | null, suffix = '') {
  return typeof value === 'number' && Number.isFinite(value) ? numbers.format(value) + suffix : '—'
}

export function scorePercent(score: number) {
  return Math.round(Math.max(0, Math.min(100, score <= 1 ? score * 100 : score)))
}

export function initials(name: string) {
  return name.trim().split(/\s+/).slice(0, 2).map((part) => part[0]?.toUpperCase()).join('')
}
