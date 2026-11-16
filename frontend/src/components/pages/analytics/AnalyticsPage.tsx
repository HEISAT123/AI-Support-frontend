import { useCallback, useState } from 'react'
import { getAnalytics } from '../../../api/analyticsApi'
import calendarIcon from '../../../assets/calendar.svg'
import { useDocumentTitle } from '../../../hooks/useDocumentTitle'
import { useResource } from '../../../hooks/useResource'
import { categories, categoryLabel, dateFromKey, dateKey, displayDate, displayNumber, moveDay } from '../../../lib/format'
import type { AnalyticsFilters, AnalyticsSummary, Metric } from '../../../types/support'
import { Status } from '../../widgets/ui/Status'
import ui from '../../widgets/ui/ui.module.scss'
import { TrendChart, dayIndex } from './TrendChart'
import styles from './AnalyticsPage.module.scss'

const metrics: { id: Metric; label: string; suffix: string; icon: string }[] = [
  { id: 'totalRequests', label: 'Всего обращений', suffix: '', icon: '✦' },
  { id: 'fcr', label: 'Решено с первого раза', suffix: '%', icon: '✓' },
  { id: 'averageHandlingSeconds', label: 'Среднее время обработки', suffix: ' сек', icon: '⏱' },
  { id: 'helpfulRate', label: 'Полезные рекомендации', suffix: '%', icon: '★' },
]
const colors = ['#68a333', '#96c275', '#b7d4a0', '#d9e9d0', '#759e5b', '#c7d9b4']

function delta(value: number | null | undefined, previous: number | null | undefined, percentagePoints: boolean) {
  if (value == null || previous == null || (!percentagePoints && previous === 0)) return ''
  const change = percentagePoints ? value - previous : (value - previous) / previous * 100
  const rounded = Math.round(change * 10) / 10
  return (rounded > 0 ? '+' : '') + displayNumber(rounded, percentagePoints ? ' п. п.' : '%')
}

function DateField({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return <label className={ui.label}>{label}
    <span className={styles.dateField}>
      <input className={ui.field} type="date" value={value} onChange={(event) => onChange(event.target.value)} />
      <img src={calendarIcon} alt="" />
    </span>
  </label>
}

function Breakdown({ data }: { data: AnalyticsSummary }) {
  const categories = data.byCategory?.filter(({ count }) => count > 0) ?? []
  const total = categories.reduce((sum, entry) => sum + entry.count, 0)
  let offset = 0
  const slices = categories.map((entry, index) => {
    const color = colors[index % colors.length]
    const start = offset
    const ratio = entry.count / total * 100
    offset += ratio
    return { ...entry, color, ratio, stop: `${color} ${start}% ${offset}%` }
  })
  return <div className={styles.breakdowns}>
    <section className={ui.panel}>
      <h2>Распределение по категориям</h2>
      {total ? <div className={styles.distribution}>
        <div className={styles.donut} style={{ background: `conic-gradient(${slices.map((slice) => slice.stop).join(',')})` }}>
          <span><strong>{displayNumber(total)}</strong><small>всего</small></span>
        </div>
        <ul>{slices.map((item) => <li key={item.category}>
          <i style={{ backgroundColor: item.color }} />{categoryLabel(item.category)} <strong>{displayNumber(item.ratio, '%')}</strong>
        </li>)}</ul>
      </div> : <p className={ui.muted}>Нет данных о категориях за этот период.</p>}
    </section>
    <section className={ui.panel}>
      <h2>Топ запросов</h2>
      {data.topQueries?.length ? <ul className={styles.topQueries}>
        {data.topQueries.map(({ text, percent }, index) => <li key={`${text}-${index}`}>
          <span>{text}</span><span className={ui.muted}>{displayNumber(percent, '%')}</span>
          <progress max={100} value={percent} aria-label={text} />
        </li>)}
      </ul> : <p className={ui.muted}>Нет данных о популярных запросах за этот период.</p>}
    </section>
  </div>
}

function Dashboard({ from, to, category, groupBy, metric, compare, controls }: Required<AnalyticsFilters> & {
  metric: Metric
  compare: boolean
  controls: React.ReactNode
}) {
  const load = useCallback((signal: AbortSignal) => getAnalytics({ from, to, category, groupBy }, signal), [from, to, category, groupBy])
  const loadPrevious = useCallback((signal: AbortSignal) => {
    const start = dateFromKey(from)
    const duration = dayIndex(to) - dayIndex(from) + 1
    return getAnalytics({ from: dateKey(moveDay(start, -duration)), to: dateKey(moveDay(start, -1)), category, groupBy }, signal)
  }, [from, to, category, groupBy])
  const summary = useResource(load)
  const previous = useResource(loadPrevious)
  const data = summary.status === 'success' ? summary.data : undefined
  const baseline = previous.status === 'success' ? previous.data : undefined
  const selected = metrics.find((item) => item.id === metric) ?? metrics[0]

  return <>
    <div className={styles.kpis}>
      {metrics.map(({ id, label, suffix, icon }) => (
        <section className={`${ui.panel} ${styles.kpi}`} key={id}>
          <span className={styles.icon} aria-hidden="true">{icon}</span>
          <h2>{label}</h2>
          <strong>{displayNumber(data?.[id], suffix)}</strong>
          <small>{delta(data?.[id], baseline?.[id], id === 'fcr' || id === 'helpfulRate')}</small>
        </section>
      ))}
    </div>
    <section className={`${ui.panel} ${styles.trend}`}>
      <h2>{selected.label}</h2>
      <p className={ui.muted}>По {groupBy === 'day' ? 'дням' : 'неделям'}, {category ? categoryLabel(category).toLocaleLowerCase('ru') : 'все категории'}</p>
      {controls}
      {summary.status === 'loading' && <Status>Загрузка аналитики…</Status>}
      {summary.status === 'error' && <Status error onRetry={summary.retry}>{summary.message}</Status>}
      {data && <TrendChart from={from} to={to} points={data.series ?? []} comparison={compare ? baseline?.series : undefined}
        metric={metric} title={selected.label} suffix={selected.suffix} grouping={groupBy} />}
      {compare && previous.status === 'loading' && <Status>Загрузка предыдущего периода…</Status>}
      {compare && previous.status === 'error' && <Status error onRetry={previous.retry}>Данные предыдущего периода недоступны.</Status>}
    </section>
    {data && <Breakdown data={data} />}
  </>
}

export default function AnalyticsPage() {
  useDocumentTitle('Аналитика')
  const [from, setFrom] = useState(() => dateKey(moveDay(new Date(), -29)))
  const [to, setTo] = useState(() => dateKey())
  const [category, setCategory] = useState('')
  const [metric, setMetric] = useState<Metric>('totalRequests')
  const [groupBy, setGroupBy] = useState<'day' | 'week'>('day')
  const [compare, setCompare] = useState(false)
  const valid = Boolean(from && to && from <= to)
  const controls = <>
    <div className={styles.filters}>
      <DateField label="С" value={from} onChange={setFrom} />
      <DateField label="По" value={to} onChange={setTo} />
      <label className={ui.label}>Показатель <select className={ui.field} value={metric} onChange={(event) => setMetric(event.target.value as Metric)}>
        {metrics.map(({ id, label }) => <option key={id} value={id}>{label}{id === 'fcr' ? ' (FCR)' : ''}</option>)}
      </select></label>
      <label className={ui.label}>Категория <select className={ui.field} value={category} onChange={(event) => setCategory(event.target.value)}>
        <option value="">Все категории</option>
        {Object.entries(categories).map(([id, label]) => <option key={id} value={id}>{label}</option>)}
      </select></label>
      <fieldset className={styles.group}>
        <legend>Группировка</legend>
        <div>
          <button type="button" aria-pressed={groupBy === 'day'} onClick={() => setGroupBy('day')}>День</button>
          <button type="button" aria-pressed={groupBy === 'week'} onClick={() => setGroupBy('week')}>Неделя</button>
        </div>
      </fieldset>
    </div>
    <label className={styles.compare}><input type="checkbox" checked={compare} onChange={(event) => setCompare(event.target.checked)} /> Сравнить с предыдущим периодом</label>
  </>

  return (
    <div className={ui.stack}>
      <header className={ui.heading}>
        <h1>Аналитика</h1>
        <p className={ui.muted}>{valid ? `Ключевые метрики по обращениям за ${displayDate(from)} — ${displayDate(to)}. Изменение — к предыдущему периоду такой же длины.` : 'Ключевые метрики по обращениям.'}</p>
      </header>
      {valid ? <Dashboard from={from} to={to} category={category} groupBy={groupBy} metric={metric} compare={compare} controls={controls} />
        : <section className={`${ui.panel} ${styles.trend}`}>{controls}<Status error>Укажите даты начала и конца периода. Дата окончания должна быть не раньше даты начала.</Status></section>}
    </div>
  )
}
