import { useState, type FormEvent } from 'react'
import { deactivateArticle, importArticles, saveArticle } from '../../../api/knowledgeApi'
import { parseArticles, validateArticle, validateBodySize } from '../../../lib/articles'
import { categories, categoryLabel } from '../../../lib/format'
import type { Article, ArticleInput } from '../../../types/support'
import { Status } from '../../widgets/ui/Status'
import ui from '../../widgets/ui/ui.module.scss'
import Dialog from '../dialog/Dialog'
import styles from '../dialog/Dialog.module.scss'

type Props = {
  mode: 'create' | 'edit' | 'deactivate' | 'import'
  article?: Article
  onClose: () => void
  onDone: () => void
}

const titles = {
  create: 'Добавить статью',
  edit: 'Редактировать статью',
  deactivate: 'Деактивировать статью',
  import: 'Импорт статей',
}

export default function ArticleEditorPopup({ mode, article, onClose, onDone }: Props) {
  const [title, setTitle] = useState(article?.title ?? '')
  const [body, setBody] = useState(article?.body ?? '')
  const [category, setCategory] = useState(article?.category ?? 'technical')
  const [tags, setTags] = useState(article?.tags.join(', ') ?? '')
  const [isActive, setActive] = useState(article?.isActive ?? true)
  const [apiKey, setApiKey] = useState('')
  const [file, setFile] = useState<File>()
  const [pending, setPending] = useState(false)
  const [error, setError] = useState('')
  const isEditor = mode === 'create' || mode === 'edit'

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (pending) return
    setPending(true)
    setError('')
    try {
      const key = apiKey.trim()
      if (mode === 'import') {
        if (!file) throw new Error('Выберите JSON-файл.')
        if (file.size > 65_536) throw new Error('Выберите файл размером до 64 КБ.')
        let raw: unknown
        try { raw = JSON.parse((await file.text()).replace(/^\uFEFF/, '')) }
        catch { throw new Error('Файл не удалось прочитать как JSON.') }
        const articles = parseArticles(raw)
        validateBodySize({ articles })
        await importArticles(articles, key)
      } else if (mode === 'deactivate') {
        if (!article) throw new Error('Статья не найдена.')
        await deactivateArticle(article.id, key)
      } else {
        const input: ArticleInput = {
          title: title.trim(), body: body.trim(), category,
          tags: tags.split(',').map((tag) => tag.trim()).filter(Boolean), isActive,
        }
        const message = validateArticle(input)
        if (message) throw new Error(message)
        validateBodySize(input)
        await saveArticle(input, key, article?.id)
      }
      onDone()
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : 'Не удалось сохранить изменения.')
    } finally {
      setPending(false)
    }
  }

  return (
    <Dialog title={titles[mode]} busy={pending} onClose={onClose}>
      <form className={styles.form} onSubmit={(event) => void submit(event)} aria-busy={pending}>
        {isEditor && <>
          <label className={ui.label}>Название <input className={ui.field} value={title} required maxLength={255}
            onChange={(event) => setTitle(event.target.value)} disabled={pending} /></label>
          <label className={ui.label}>Текст статьи (Markdown) <textarea className={ui.field} required value={body}
            onChange={(event) => setBody(event.target.value)} disabled={pending} /></label>
          <label className={ui.label}>Категория <select className={ui.field} value={category} onChange={(event) => setCategory(event.target.value)} disabled={pending}>
            {[...new Set([...Object.keys(categories), article?.category ?? category])].map((code) => <option key={code} value={code}>{categoryLabel(code)}</option>)}
          </select></label>
          <label className={ui.label}>Теги через запятую <input className={ui.field} value={tags} onChange={(event) => setTags(event.target.value)} disabled={pending} /></label>
          <label><input type="checkbox" checked={isActive} onChange={(event) => setActive(event.target.checked)} disabled={pending} /> Опубликовано</label>
        </>}
        {mode === 'deactivate' && <p>«{article?.title}» больше не будет появляться в рекомендациях.</p>}
        {mode === 'import' && <>
          <p className={ui.muted}>Загрузите JSON с массивом статей. Для каждой статьи укажите title, body и category. Поля tags и isActive необязательны.</p>
          <label className={ui.label}>JSON-файл <input className={ui.field} type="file" accept=".json,application/json" required
            onChange={(event) => setFile(event.target.files?.[0])} disabled={pending} /></label>
        </>}
        <label className={ui.label}>Ключ API (если требуется сервером)
          <input className={ui.field} autoComplete="off" type="password" value={apiKey} onChange={(event) => setApiKey(event.target.value)} disabled={pending} />
        </label>
        {error && <Status error>{error}</Status>}
        <footer>
          <button type="submit" className={ui.primary} disabled={pending}>
            {pending ? 'Отправляем…' : mode === 'import' ? 'Импортировать' : mode === 'deactivate' ? 'Деактивировать' : 'Сохранить'}
          </button>
          <button type="button" className={ui.outline} disabled={pending} onClick={onClose}>Отмена</button>
        </footer>
      </form>
    </Dialog>
  )
}
