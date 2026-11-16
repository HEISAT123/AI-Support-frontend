import { useCallback, useState } from 'react'
import Markdown from 'react-markdown'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { findArticle, getArticles } from '../../../api/knowledgeApi'
import { useAnalysis } from '../../../hooks/useAnalysis'
import { useDocumentTitle } from '../../../hooks/useDocumentTitle'
import { useResource } from '../../../hooks/useResource'
import { ApiError } from '../../../lib/apiClient'
import { categoryLabel, displayDate, displayNumber, scorePercent } from '../../../lib/format'
import type { Article, Recommendation } from '../../../types/support'
import ArticleEditorPopup from '../../popup/article-editor-popup'
import { CopyButton } from '../../widgets/ui/CopyButton'
import { FeedbackButtons } from '../../widgets/ui/FeedbackButtons'
import { HelpCard } from '../../widgets/ui/HelpCard'
import { Status } from '../../widgets/ui/Status'
import ui from '../../widgets/ui/ui.module.scss'
import styles from './ArticlePage.module.scss'

function articleLink(id: string, title: string, requestId?: string) {
  const base = requestId ? `/requests/${encodeURIComponent(requestId)}/articles` : '/knowledge'
  return `${base}/${encodeURIComponent(id)}?${new URLSearchParams({ title })}`
}

function Related({ article, recommendations, requestId }: { article: Article; recommendations: Recommendation[]; requestId?: string }) {
  const load = useCallback((signal: AbortSignal) => getArticles('', article.category, signal), [article.category])
  const result = useResource(load)
  const similar = result.status === 'success' ? result.data.items.filter(({ id, isActive }) => id !== article.id && isActive) : []
  const fromRequest = recommendations.filter(({ articleId }) => articleId !== article.id).map((item) => ({
    id: item.articleId, title: item.title, category: item.category, percent: scorePercent(item.relevance), requestId,
  }))
  const items = [...fromRequest, ...similar.filter(({ id }) => !fromRequest.some((item) => item.id === id)).map((item) => ({
    id: item.id, title: item.title, category: item.category, percent: null, requestId: undefined,
  }))].slice(0, 3)

  return (
    <section className={ui.panel}>
      <h2>Похожие статьи</h2>
      {items.length ? <ul className={styles.related}>
        {items.map((item) => <li key={item.id}>
          <Link to={articleLink(item.id, item.title, item.requestId)}>
            <span><strong>{item.title}</strong><small>{categoryLabel(item.category)}</small></span>
            {item.percent != null && <span className={`${ui.chip} ${ui.positive}`}>{item.percent}%</span>}
          </Link>
        </li>)}
      </ul> : result.status === 'error' ? <Status error onRetry={result.retry}>{result.message}</Status>
        : <Status>{result.status === 'loading' ? 'Загрузка статей…' : 'Похожие статьи не найдены.'}</Status>}
    </section>
  )
}

function ArticleContent({ id, title, requestId, recommendations = [] }: { id: string; title: string; requestId?: string; recommendations?: Recommendation[] }) {
  const selected = recommendations.find(({ articleId }) => articleId === id)
  const [popup, setPopup] = useState<'edit' | 'deactivate' | null>(null)
  const [success, setSuccess] = useState('')
  const navigate = useNavigate()
  const load = useCallback(async (signal: AbortSignal): Promise<Article> => {
    const found = await findArticle(id, selected?.title || title, signal)
    if (found) return found
    if (selected?.body) return { ...selected, id, body: selected.body, tags: [], isActive: true }
    throw new ApiError('Статья не найдена в базе знаний.', 404, 'NOT_FOUND')
  }, [id, selected, title])
  const result = useResource(load)
  const article = result.status === 'success' ? result.data : undefined
  const words = article?.body.trim().split(/\s+/).length ?? 0

  useDocumentTitle(article?.title ?? 'Статья')

  if (result.status !== 'success' || !article) return <section className={ui.panel}>
    {result.status === 'error' ? <Status error onRetry={result.retry}>{result.message}</Status> : <Status>Загрузка статьи…</Status>}
  </section>

  return (
    <div className={ui.columns}>
      <section className={`${ui.panel} ${styles.article}`}>
        <header className={styles.header}>
          <div className={styles.title}>
            <h1>{article.title}</h1>
            <div className={styles.meta}>
              <span className={`${ui.chip} ${ui.positive}`}>{categoryLabel(article.category)}</span>
              {article.updatedAt && <span>Обновлено {displayDate(article.updatedAt)}</span>}
              {article.views != null && <span>{displayNumber(article.views)} просм.</span>}
            </div>
            <p className={ui.muted}>{Math.max(1, Math.ceil(words / 200))} мин чтения</p>
          </div>
          <CopyButton text={article.body} label="Копировать ответ" />
        </header>
        {!article.isActive && <Status>Статья деактивирована.</Status>}
        <div className={styles.markdown}><Markdown skipHtml>{article.body}</Markdown></div>
        {requestId && selected && <FeedbackButtons requestId={requestId} articleId={article.id} helpful={selected.helpful} short />}
        {!requestId && <div className={ui.actions}>
          <button className={ui.outline} type="button" onClick={() => { setSuccess(''); setPopup('edit') }}>Редактировать</button>
          {article.isActive && <button className={ui.soft} type="button" onClick={() => { setSuccess(''); setPopup('deactivate') }}>Деактивировать</button>}
        </div>}
        {success && <Status>{success}</Status>}
        {popup && <ArticleEditorPopup mode={popup} article={article} onClose={() => setPopup(null)} onDone={() => {
          if (popup === 'deactivate') { navigate('/knowledge'); return }
          setPopup(null)
          setSuccess('Изменения сохранены.')
          navigate(`/knowledge/${encodeURIComponent(id)}`, { replace: true })
          result.retry()
        }} />}
      </section>
      <aside className={ui.stack}>
        <Related article={article} recommendations={recommendations} requestId={requestId} />
        <HelpCard article />
      </aside>
    </div>
  )
}

function RecommendationArticle({ id, title, requestId }: { id: string; title: string; requestId: string }) {
  const result = useAnalysis(requestId)
  if (result.status === 'success') return <ArticleContent id={id} title={title} requestId={requestId} recommendations={result.data.recommendations} />
  return <section className={ui.panel}>
    {result.status === 'error' ? <Status error onRetry={result.retry}>{result.message}</Status> : <Status>Загрузка обращения…</Status>}
  </section>
}

export default function ArticlePage() {
  const { requestId, articleId = '' } = useParams()
  const [query] = useSearchParams()
  const title = query.get('title') ?? ''
  return (
    <>
      <Link className={ui.back} to={requestId ? `/requests/${encodeURIComponent(requestId)}` : '/knowledge'}>← Назад</Link>
      {requestId ? <RecommendationArticle key={articleId} id={articleId} title={title} requestId={requestId} />
        : <ArticleContent key={articleId} id={articleId} title={title} />}
    </>
  )
}
