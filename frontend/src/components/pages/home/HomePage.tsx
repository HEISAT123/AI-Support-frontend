import { useCallback, useEffect, useRef, useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { getAnalytics } from '../../../api/analyticsApi'
import { analyzeRequest } from '../../../api/requestsApi'
import check from '../../../assets/check.svg'
import clock from '../../../assets/clock.svg'
import message from '../../../assets/message.svg'
import sparkles from '../../../assets/sparkles.svg'
import star from '../../../assets/star.svg'
import { useWorkspace } from '../../../context/workspace-context'
import { useDocumentTitle } from '../../../hooks/useDocumentTitle'
import { useResource } from '../../../hooks/useResource'
import { errorMessage } from '../../../lib/apiClient'
import { categoryLabel, dateKey, displayNumber, displayRecent } from '../../../lib/format'
import { HelpCard } from '../../widgets/ui/HelpCard'
import { Status } from '../../widgets/ui/Status'
import ui from '../../widgets/ui/ui.module.scss'
import styles from './HomePage.module.scss'

const examples = [
  'Не работает интернет', 'Возврат средств', 'Смена тарифа',
  'Ошибка 651', 'Подключение оборудования',
]
const fullExample: Record<string, string> = {
  'Не работает интернет': 'Не работает интернет на даче, пишет ошибка 651',
  'Возврат средств': 'Как вернуть деньги за подписку?',
  'Смена тарифа': 'Клиент хочет сменить тариф на мобильную связь.',
  'Ошибка 651': 'Не получается подключиться к интернету, пишет ошибка 651.',
  'Подключение оборудования': 'Клиенту нужна помощь с подключением оборудования.',
}

function TodayStats() {
  const today = dateKey()
  const load = useCallback((signal: AbortSignal) => getAnalytics({ from: today, to: today }, signal), [today])
  const summary = useResource(load)
  const data = summary.status === 'success' ? summary.data : undefined
  const stats = [
    { icon: message, label: 'Обращения', value: displayNumber(data?.totalRequests) },
    { icon: check, label: 'Решено с 1 раза', value: displayNumber(data?.fcr, '%') },
    { icon: clock, label: 'Среднее время', value: displayNumber(data?.averageHandlingSeconds == null ? null : data.averageHandlingSeconds / 60, ' мин') },
    { icon: star, label: 'Оценка качества', value: displayNumber(data?.qualityScore) },
  ]
  return (
    <section className={ui.panel} aria-labelledby="today-heading">
      <h2 id="today-heading">Статистика за сегодня</h2>
      <dl className={styles.metrics}>
        {stats.map(({ icon, label, value }) => (
          <div key={label}>
            <span className={styles.metricIcon}><img src={icon} alt="" /></span>
            <dt>{label}</dt><dd>{value}</dd>
          </div>
        ))}
      </dl>
      {summary.status === 'loading' && <Status>Загрузка статистики…</Status>}
      {summary.status === 'error' && <Status error onRetry={summary.retry}>Статистика временно недоступна.</Status>}
    </section>
  )
}

export function RecentRequests({ all = false }: { all?: boolean }) {
  const { recent } = useWorkspace()
  const items = all ? recent : recent.slice(0, 4)
  return (
    <section className={ui.panel} aria-labelledby="recent-heading">
      <div className={styles.recentHeading}>
        <h2 id="recent-heading">{all ? 'Обращения за текущий сеанс' : 'Недавние обращения'}</h2>
        {!all && items.length > 0 && <Link to="/requests">Все обращения</Link>}
      </div>
      {items.length ? (
        <ul className={styles.recent}>
          {items.map((entry) => (
            <li key={entry.requestId}>
              <Link to={`/requests/${encodeURIComponent(entry.requestId)}`}>
                <span className={styles.requestTitle}><i data-category={entry.category} />{entry.text}</span>
                <span className={ui.chip}>{categoryLabel(entry.category)}</span>
                <time dateTime={entry.createdAt}>{displayRecent(entry.createdAt)}</time>
              </Link>
            </li>
          ))}
        </ul>
      ) : <Status>Обработанные обращения появятся здесь в течение текущего сеанса.</Status>}
    </section>
  )
}

export default function HomePage() {
  useDocumentTitle('Главная')
  const { remember, profile } = useWorkspace()
  const navigate = useNavigate()
  const [text, setText] = useState('')
  const [error, setError] = useState('')
  const [invalid, setInvalid] = useState(false)
  const [pending, setPending] = useState(false)
  const field = useRef<HTMLTextAreaElement>(null)
  const request = useRef<AbortController | null>(null)

  useEffect(() => () => request.current?.abort(), [])

  function update(value: string) {
    setText(value)
    setError('')
    setInvalid(false)
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (request.current) return
    const value = text.trim()
    const length = Array.from(value).length
    if (length < 3 || length > 4000) {
      setError('Введите от 3 до 4000 символов.')
      setInvalid(true)
      field.current?.focus()
      return
    }

    const controller = new AbortController()
    request.current = controller
    const audio = profile.sound && 'AudioContext' in window ? new AudioContext() : undefined
    if (audio) void audio.resume().catch(() => {})
    setPending(true)
    setError('')
    try {
      const result = await analyzeRequest(value, controller.signal)
      if (controller.signal.aborted) return
      remember(result)
      if (profile.notifications && document.hidden && 'Notification' in window && Notification.permission === 'granted') {
        try { new Notification('Рекомендации готовы') } catch { /* notifications may be unavailable on this device */ }
      }
      if (audio?.state === 'running') {
        const tone = audio.createOscillator()
        const volume = audio.createGain()
        tone.frequency.value = 620
        volume.gain.value = .035
        tone.connect(volume).connect(audio.destination)
        tone.start()
        tone.stop(audio.currentTime + .16)
        tone.onended = () => { void audio.close().catch(() => {}) }
      }
      navigate(`/requests/${encodeURIComponent(result.requestId)}`)
    } catch (failure) {
      if (!controller.signal.aborted) setError(errorMessage(failure))
    } finally {
      if (audio && !controller.signal.aborted && audio.state !== 'running') void audio.close().catch(() => {})
      if (audio?.state === 'running' && (controller.signal.aborted || request.current !== controller)) void audio.close().catch(() => {})
      request.current = null
      if (!controller.signal.aborted) setPending(false)
    }
  }

  return (
    <div className={ui.columns}>
      <div className={ui.stack}>
        <header className={`${ui.heading} ${styles.heading}`}>
          <h1>AI-ассистент поддержки</h1>
          <p className={ui.muted}>Получите релевантные решения из базы знаний за несколько секунд</p>
        </header>
        <form className={styles.form} onSubmit={(event) => void submit(event)} aria-busy={pending} noValidate>
          <div className={styles.inputWrap}>
            <span className={styles.inputDot} aria-hidden="true" />
            <label className="visuallyHidden" htmlFor="request-text">Суть обращения</label>
            <textarea id="request-text" ref={field} value={text} disabled={pending} onChange={(event) => update(event.target.value)}
              aria-invalid={invalid} aria-describedby={error ? 'request-count request-error' : 'request-count'}
              placeholder="Опишите суть обращения клиента… Например: «Не работает интернет на даче, пишет ошибка 651»" />
          </div>
          {error && <p id="request-error" className={`${ui.error} ${styles.error}`} role="alert">{error}</p>}
          <div className={styles.formFooter}>
            <span id="request-count" className={Array.from(text).length > 4000 ? ui.error : ui.muted}>{Array.from(text).length}/4000</span>
            <button className={ui.primary} type="submit" disabled={pending}>
              <img src={sparkles} alt="" />{pending ? 'Анализируем обращение…' : 'Получить рекомендации'}
            </button>
          </div>
        </form>
        <section className={styles.examples} aria-labelledby="examples-heading">
          <h2 id="examples-heading">Популярные запросы</h2>
          <div className={styles.examplesList}>
            {examples.map((example) => (
              <button key={example} className={styles.example} type="button" disabled={pending}
                aria-pressed={text === fullExample[example]}
                onClick={() => { update(fullExample[example]); field.current?.focus() }}>
                {example}
              </button>
            ))}
          </div>
        </section>
        <RecentRequests />
      </div>
      <div className={`${ui.stack} ${styles.side}`}><TodayStats /><HelpCard /></div>
    </div>
  )
}
