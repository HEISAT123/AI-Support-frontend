import { Link, useParams } from 'react-router-dom'
import { useAnalysis } from '../../../hooks/useAnalysis'
import { useDocumentTitle } from '../../../hooks/useDocumentTitle'
import { categoryLabel, scorePercent } from '../../../lib/format'
import type { Recommendation } from '../../../types/support'
import { CopyButton } from '../../widgets/ui/CopyButton'
import { FeedbackButtons } from '../../widgets/ui/FeedbackButtons'
import { Status } from '../../widgets/ui/Status'
import ui from '../../widgets/ui/ui.module.scss'
import styles from './ResultsPage.module.scss'

function RecommendationCard({ item, requestId, first }: { item: Recommendation; requestId: string; first: boolean }) {
  const relevance = scorePercent(item.relevance)
  return (
    <li className={`${styles.card} ${first ? styles.featured : ''}`}>
      <span className={styles.score} data-level={relevance >= 75 ? 'high' : relevance >= 50 ? 'medium' : 'low'} aria-label={`Релевантность ${relevance}%`}>
        {relevance}%
      </span>
      <div className={styles.summary}>
        <h3>{item.title}</h3>
        <p className={ui.muted}>{categoryLabel(item.category)}</p>
        <p>{item.snippet}</p>
        <div className={styles.feedback}><FeedbackButtons requestId={requestId} articleId={item.articleId} helpful={item.helpful} /></div>
      </div>
      <Link className={ui.outline} to={`articles/${encodeURIComponent(item.articleId)}`}>Открыть<span className="visuallyHidden"> статью «{item.title}»</span></Link>
    </li>
  )
}

export default function ResultsPage() {
  const { requestId = '' } = useParams()
  const result = useAnalysis(requestId)
  useDocumentTitle('Рекомендации')

  if (result.status !== 'success') {
    return <><Link className={ui.back} to="/">← Назад</Link><section className={ui.panel}>
      {result.status === 'error' ? <Status error onRetry={result.retry}>{result.message}</Status> : <Status>Загрузка обращения…</Status>}
    </section></>
  }

  const entry = result.data
  const recommendations = [...entry.recommendations].sort((a, b) => scorePercent(b.relevance) - scorePercent(a.relevance)).slice(0, 10)
  const confidence = entry.confidence == null ? null : scorePercent(entry.confidence)
  return (
    <>
      <Link to="/" className={ui.back}>← Назад</Link>
      <div className={ui.columns}>
        <div className={ui.stack}>
          <section className={ui.panel} aria-labelledby="recommendations">
            <h1 id="recommendations" className={styles.title}>Рекомендуемые статьи</h1>
            {entry.degraded && <p className={styles.degraded} role="status">ИИ-анализ временно недоступен. Показаны результаты поиска по базе знаний.</p>}
            {recommendations.length > 0 ? (
              <ul className={styles.recommendations}>
                {recommendations.map((item, index) => <RecommendationCard key={item.articleId} requestId={requestId} item={item} first={index === 0} />)}
              </ul>
            ) : <Status>Подходящих рекомендаций нет. Попробуйте уточнить обращение или воспользоваться базой знаний.</Status>}
          </section>
          {entry.suggestedReply && (
            <section className={`${ui.panel} ${ui.tint} ${styles.reply}`}>
              <h2>Предлагаемый ответ</h2>
              <p>{entry.suggestedReply}</p>
              <CopyButton text={entry.suggestedReply} />
            </section>
          )}
        </div>
        <aside className={ui.stack}>
          <section className={`${ui.panel} ${styles.context}`}>
            <h2>Ваш запрос</h2>
            <p className={styles.requestText}>{entry.text}</p>
            <h2>Категория</h2>
            <p className={`${ui.chip} ${ui.positive}`}>{categoryLabel(entry.category)}</p>
            {confidence != null && <div className={styles.confidence}>
              <h2>Уверенность классификации</h2>
              <strong>{confidence}%</strong>
              <progress max={100} value={confidence} aria-label="Уверенность классификации" />
            </div>}
            {Boolean(entry.entities?.length) && <>
              <h2>Ключевые сущности</h2>
              <div className={ui.actions}>{entry.entities?.map((entity, index) => <span key={`${entity}-${index}`} className={`${ui.chip} ${ui.positive}`}>{entity}</span>)}</div>
            </>}
          </section>
          {recommendations.length > 0 && <p className={`${ui.panel} ${ui.muted}`}>Найдено статей: {recommendations.length}. Откройте статью, чтобы посмотреть полную информацию.</p>}
        </aside>
      </div>
    </>
  )
}
