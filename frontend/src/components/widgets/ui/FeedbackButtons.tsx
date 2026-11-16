import { useState } from 'react'
import { useWorkspace } from '../../../context/workspace-context'
import { errorMessage } from '../../../lib/apiClient'
import styles from './ui.module.scss'

type Props = { requestId: string; articleId: string; helpful?: boolean | null; short?: boolean }

export function FeedbackButtons({ requestId, articleId, helpful, short = false }: Props) {
  const { rate, ratings } = useWorkspace()
  const selected = ratings[`${requestId}:${articleId}`] ?? helpful
  const [pending, setPending] = useState(false)
  const [error, setError] = useState('')

  async function submit(value: boolean) {
    if (pending || value === selected) return
    setPending(true)
    setError('')
    try { await rate(requestId, articleId, value) }
    catch (failure) { setError(errorMessage(failure)) }
    finally { setPending(false) }
  }

  return (
    <div>
      <div className={styles.actions} role="group" aria-label="Оценка рекомендации" aria-busy={pending}>
        {short && <span className={styles.muted}>Статья помогла?</span>}
        <button className={styles.soft} type="button" aria-pressed={selected === true} disabled={pending}
          onClick={() => void submit(true)}>{short ? 'Да' : 'Полезно'}</button>
        <button className={styles.soft} type="button" aria-pressed={selected === false} disabled={pending}
          onClick={() => void submit(false)}>{short ? 'Нет' : 'Не полезно'}</button>
      </div>
      {error && <p className={styles.error} role="alert">{error}</p>}
    </div>
  )
}
