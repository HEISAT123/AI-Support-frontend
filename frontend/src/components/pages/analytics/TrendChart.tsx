import { dateFromKey, displayDate, displayNumber } from '../../../lib/format'
import type { AnalyticsPoint, Metric } from '../../../types/support'
import styles from './AnalyticsPage.module.scss'

const width = 1000
const height = 350
const left = 68
const right = 22
const top = 16
const bottom = 303
const dayMs = 86_400_000

export function dayIndex(key: string) {
  const date = dateFromKey(key)
  return Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()) / dayMs
}

function coordinate(day: number, start: number, end: number) {
  return start === end ? (left + width - right) / 2 : left + (day - start) / (end - start) * (width - right - left)
}

function entries(points: AnalyticsPoint[], metric: Metric, start: number, end: number, shift = 0) {
  return points.flatMap((point) => {
    const value = point[metric]
    const day = dayIndex(point.date) + shift
    return typeof value === 'number' && Number.isFinite(value) && day >= start && day <= end
      ? [{ day, value, date: point.date }] : []
  }).sort((a, b) => a.day - b.day)
}

const dateForDay = (day: number) => new Date(day * dayMs).toISOString().slice(0, 10)

export function TrendChart({ from, to, points, comparison, metric, title, suffix, grouping }: {
  from: string
  to: string
  points: AnalyticsPoint[]
  comparison?: AnalyticsPoint[]
  metric: Metric
  title: string
  suffix: string
  grouping: 'day' | 'week'
}) {
  const start = dayIndex(from)
  const end = dayIndex(to)
  const current = entries(points, metric, start, end)
  const previous = entries(comparison ?? [], metric, start, end, end - start + 1)
  if (!current.length && !previous.length) return <p className={styles.noChart}>За выбранный период нет данных для графика.</p>

  const isPercent = metric === 'fcr' || metric === 'helpfulRate'
  const maximum = Math.max(1, ...current.map(({ value }) => value), ...previous.map(({ value }) => value))
  const rounded = Math.pow(10, Math.floor(Math.log10(maximum / 4)))
  const yMax = isPercent ? 100 : 4 * Math.ceil(maximum / (4 * rounded)) * rounded
  const x = (day: number) => coordinate(day, start, end)
  const y = (value: number) => bottom - Math.max(0, Math.min(yMax, value)) / yMax * (bottom - top)
  const labelCount = Math.min(7, end - start + 1)
  const labels = Array.from({ length: labelCount }, (_, index) => (
    Math.round(start + index * (end - start) / Math.max(1, labelCount - 1))
  ))

  function segments(data: typeof current) {
    const series: (typeof current)[] = []
    for (const point of data) {
      const last = series.at(-1)
      const prior = last?.at(-1)
      if (last && prior && point.day - prior.day <= (grouping === 'week' ? 7 : 1)) last.push(point)
      else series.push([point])
    }
    return series
  }
  function draw(data: typeof current, compare: boolean) {
    return segments(data).map((segment) => {
      const coords = segment.map(({ day, value }) => `${x(day)},${y(value)}`)
      const first = segment[0]
      const last = segment[segment.length - 1]
      return <g key={first.day}>
        {!compare && segment.length > 1 && <path className={styles.area} d={`M ${x(first.day)},${bottom} L ${coords.join(' L ')} L ${x(last.day)},${bottom} Z`} />}
        {segment.length > 1 && <polyline className={compare ? styles.comparisonLine : styles.line} points={coords.join(' ')} />}
        {segment.map(({ day, value, date }) => <circle key={day} className={compare ? styles.comparisonDot : styles.dot}
          cx={x(day)} cy={y(value)} r={4}><title>{displayDate(date)} — {displayNumber(value, suffix)}</title></circle>)}
      </g>
    })
  }

  return (
    <div>
      <svg className={styles.chart} viewBox={`0 0 ${width} ${height}`} role="img" aria-label={`${title} в динамике`}>
        {[0, 1, 2, 3, 4].map((step) => {
          const value = yMax * step / 4
          return <g key={step}>
            <line className={styles.gridLine} x1={left} x2={width - right} y1={y(value)} y2={y(value)} />
            <text x={left - 13} y={y(value)} dy=".34em" textAnchor="end">{displayNumber(value, isPercent ? '%' : '')}</text>
          </g>
        })}
        {labels.map((day) => <text key={day} x={x(day)} y={height - 14} textAnchor="middle">{displayDate(dateForDay(day), true)}</text>)}
        {draw(current, false)}
        {draw(previous, true)}
      </svg>
      {!!previous.length && <p className={styles.legend}><span>Текущий период</span><span>Предыдущий период</span></p>}
      <details className={styles.dataDetails}>
        <summary>Значения графика</summary>
        <table>
          <thead><tr><th scope="col">Дата</th><th scope="col">{title}</th></tr></thead>
          <tbody>{current.map(({ date, value }) => <tr key={date}><td>{displayDate(date)}</td><td>{displayNumber(value, suffix)}</td></tr>)}</tbody>
          {previous.length > 0 && <tbody>
            <tr><th colSpan={2}>Предыдущий период</th></tr>
            {previous.map(({ date, value }) => <tr key={date}><td>{displayDate(date)}</td><td>{displayNumber(value, suffix)}</td></tr>)}
          </tbody>}
        </table>
      </details>
    </div>
  )
}
