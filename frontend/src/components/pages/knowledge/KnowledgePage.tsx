import { useCallback, useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { getArticles } from '../../../api/knowledgeApi'
import { useDocumentTitle } from '../../../hooks/useDocumentTitle'
import { useResource } from '../../../hooks/useResource'
import { categories, categoryLabel, displayDate, displayNumber } from '../../../lib/format'
import type { Article } from '../../../types/support'
import ArticleEditorPopup from '../../popup/article-editor-popup'
import { Status } from '../../widgets/ui/Status'
import ui from '../../widgets/ui/ui.module.scss'
import styles from './KnowledgePage.module.scss'

type Sort = 'title' | 'date' | 'views'
const compareTitle = (a: Article, b: Article) => a.title.localeCompare(b.title, 'ru')

function compare(a: Article, b: Article, sort: Sort) {
  if (sort === 'date') return (b.updatedAt ?? '').localeCompare(a.updatedAt ?? '') || compareTitle(a, b)
  if (sort === 'views') return (b.views ?? -1) - (a.views ?? -1) || compareTitle(a, b)
  return compareTitle(a, b)
}

export default function KnowledgePage() {
  useDocumentTitle('База знаний')
  const [params, setParams] = useSearchParams()
  const q = params.get('q') ?? ''
  const category = params.get('category') ?? ''
  const [search, setSearch] = useState(q)
  const [sort, setSort] = useState<Sort>('title')
  const [popup, setPopup] = useState<'create' | 'import' | null>(null)
  const [success, setSuccess] = useState('')
  const load = useCallback((signal: AbortSignal) => getArticles(search, category, signal), [search, category])
  const result = useResource(load)

  useEffect(() => {
    const timer = window.setTimeout(() => setSearch(q), 250)
    return () => window.clearTimeout(timer)
  }, [q])

  const items = result.status === 'success' ? [...result.data.items].sort((a, b) => compare(a, b, sort)) : []
  const codes = [...new Set([...Object.keys(categories), ...items.map((item) => item.category), ...(category ? [category] : [])])]

  return (
    <div className={styles.page}>
      <header className={ui.heading}><h1>База знаний</h1><p className={ui.muted}>Управляйте базой знаний и находите решения</p></header>
      <section className={ui.panel} aria-label="Статьи базы знаний">
        <div className={styles.filters}>
          <label className={ui.label}>Поиск <input className={ui.field} value={q} type="search" maxLength={255}
            placeholder="Поиск по базе знаний…" onChange={(event) => {
              const next = new URLSearchParams(params)
              if (event.target.value) next.set('q', event.target.value)
              else next.delete('q')
              setParams(next, { replace: true })
            }} /></label>
          <label className={ui.label}>Категория <select className={ui.field} value={category} onChange={(event) => {
            const next = new URLSearchParams(params)
            if (event.target.value) next.set('category', event.target.value)
            else next.delete('category')
            setParams(next, { replace: true })
          }}>
            <option value="">Все категории</option>
            {codes.map((code) => <option key={code} value={code}>{categoryLabel(code)}</option>)}
          </select></label>
          <label className={ui.label}>Сортировка <select className={ui.field} value={sort} onChange={(event) => setSort(event.target.value as Sort)}>
            <option value="title">Название А–Я</option>
            <option value="date">Сначала новые</option>
            <option value="views">По просмотрам</option>
          </select></label>
          <button type="button" className={ui.primary} onClick={() => { setSuccess(''); setPopup('create') }}>Добавить статью</button>
        </div>
        <div className={styles.tableHeading}>
          <p className={ui.muted}>{result.status === 'success' ? `Найдено статей: ${result.data.total}` : 'Статьи'}</p>
          <button type="button" className={styles.import} onClick={() => { setSuccess(''); setPopup('import') }}>Импорт JSON</button>
        </div>
        {success && <div className={styles.message}><Status>{success}</Status></div>}
        {result.status === 'loading' && <Status>Загрузка статей…</Status>}
        {result.status === 'error' && <Status error onRetry={result.retry}>{result.message}</Status>}
        {result.status === 'success' && (items.length ? (
          <div className={styles.tableWrap} tabIndex={0} aria-label="Таблица статей базы знаний">
            <table className={styles.table}>
              <thead><tr>{['Название статьи', 'Категория', 'Обновлено', 'Просмотры', 'Статус'].map((column) => <th scope="col" key={column}>{column}</th>)}</tr></thead>
              <tbody>
                {items.map((article) => (
                  <tr key={article.id}>
                    <th scope="row"><Link to={`${encodeURIComponent(article.id)}?${new URLSearchParams({ title: article.title })}`}>{article.title}</Link></th>
                    <td><span className={ui.chip}>{categoryLabel(article.category)}</span></td>
                    <td>{displayDate(article.updatedAt)}</td>
                    <td>{displayNumber(article.views)}</td>
                    <td><span className={`${ui.chip} ${article.isActive ? ui.positive : ''}`}>{article.isActive ? 'Опубликовано' : 'Неактивна'}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : <Status>Статьи не найдены. Измените запрос или выберите другую категорию.</Status>)}
      </section>
      {popup && <ArticleEditorPopup mode={popup} onClose={() => setPopup(null)} onDone={() => {
        setSuccess(popup === 'create' ? 'Статья добавлена.' : 'Статьи импортированы.')
        setPopup(null)
        result.retry()
      }} />}
    </div>
  )
}
