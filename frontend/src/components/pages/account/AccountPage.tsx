import { useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { defaultProfile, useWorkspace, type Profile } from '../../../context/workspace-context'
import { useDocumentTitle } from '../../../hooks/useDocumentTitle'
import { initials } from '../../../lib/format'
import Dialog from '../../popup/dialog/Dialog'
import { Status } from '../../widgets/ui/Status'
import ui from '../../widgets/ui/ui.module.scss'
import styles from './AccountPage.module.scss'

const demo = import.meta.env.MODE === 'demo'
const stats = [
  { label: 'Обработано', value: '312' }, { label: 'Оценка клиентов', value: '4,8' },
  { label: 'Решено с 1 раза', value: '92%' }, { label: 'Среднее время', value: '1,8 мин' },
]
const settings = [
  { field: 'notifications', label: 'Уведомления', description: 'Когда рекомендации готовы в фоновой вкладке' },
  { field: 'sound', label: 'Звук', description: 'Сигнал, когда рекомендации готовы' },
  { field: 'dark', label: 'Тёмная тема', description: 'Меняется сразу' },
] as const

type ProfileFields = Pick<Profile, 'name' | 'email' | 'shift'>

export default function AccountPage() {
  useDocumentTitle('Мой аккаунт')
  const { profile, updateProfile } = useWorkspace()
  const [draft, setDraft] = useState<ProfileFields>(profile)
  const [notice, setNotice] = useState('')
  const [error, setError] = useState('')
  const [confirm, setConfirm] = useState(false)
  const [asking, setAsking] = useState(false)

  function change(field: keyof ProfileFields, value: string) {
    setDraft((previous) => ({ ...previous, [field]: value }))
    setNotice('')
    setError('')
  }

  function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const values = { name: draft.name.trim(), email: draft.email.trim(), shift: draft.shift.trim() }
    try {
      updateProfile({ ...profile, ...values })
      setDraft(values)
      setNotice('Изменения сохранены на этом устройстве.')
      setError('')
    } catch { setError('Браузер ограничил сохранение настроек на этом устройстве.') }
  }

  async function toggle(field: typeof settings[number]['field'], checked: boolean) {
    setError('')
    setNotice('')
    if (field === 'notifications' && checked) {
      if (!('Notification' in window) || !window.isSecureContext) {
        setError('В этом браузере системные уведомления недоступны.')
        return
      }
      setAsking(true)
      try {
        if (await Notification.requestPermission() !== 'granted') {
          setError('Разрешите уведомления в настройках браузера.')
          return
        }
      } catch {
        setError('Не удалось включить уведомления.')
        return
      } finally { setAsking(false) }
    }
    try { updateProfile({ ...profile, [field]: checked }) }
    catch { setError('Браузер ограничил сохранение настроек на этом устройстве.') }
  }

  function reset() {
    try {
      updateProfile(defaultProfile)
      setDraft(defaultProfile)
      setConfirm(false)
      setNotice('Локальные настройки сброшены.')
      setError('')
    } catch {
      setConfirm(false)
      setError('Браузер ограничил доступ к локальным настройкам.')
    }
  }

  return (
    <>
      <Link to="/" className={ui.back}>← Назад</Link>
      <header className={`${ui.heading} ${styles.heading}`}>
        <h1>Мой аккаунт</h1><p className={ui.muted}>Профиль и настройки рабочего места</p>
      </header>
      <div className={ui.columns}>
        <div className={ui.stack}>
          <section className={`${ui.panel} ${styles.hero}`}>
            <div className={styles.cover} />
            <div className={styles.identity}>
              <span className={styles.avatar} aria-hidden="true">{initials(profile.name) || 'AI'}</span>
              <div><h2>{profile.name || 'Оператор'}</h2><p className={ui.muted}>Оператор{demo ? ' · Линия 1' : ''}</p></div>
              <button type="button" className={ui.outline} onClick={() => setConfirm(true)}>Сбросить профиль</button>
            </div>
          </section>
          <section className={ui.panel}>
            <h2>Данные профиля</h2>
            <form className={styles.form} onSubmit={save}>
              <label className={ui.label}>Имя и фамилия <input className={ui.field} value={draft.name} maxLength={80} autoComplete="name" onChange={(event) => change('name', event.target.value)} /></label>
              <label className={ui.label}>Эл. почта <input className={ui.field} value={draft.email} maxLength={120} type="email" autoComplete="email" onChange={(event) => change('email', event.target.value)} /></label>
              <label className={ui.label}>Смена <input className={ui.field} value={draft.shift} maxLength={80} onChange={(event) => change('shift', event.target.value)} /></label>
              <button className={ui.primary} type="submit">Сохранить изменения</button>
              {notice && <Status>{notice}</Status>}
              {error && <Status error>{error}</Status>}
            </form>
          </section>
        </div>
        <aside className={ui.stack}>
          <section className={ui.panel}>
            <h2>Моя работа за месяц</h2>
            <dl className={styles.metrics}>{stats.map(({ label, value }) => <div key={label}><dt>{label}</dt><dd>{demo ? value : '—'}</dd></div>)}</dl>
            {!demo && <p className={`${ui.muted} ${styles.unavailable}`}>Персональные показатели пока недоступны.</p>}
          </section>
          <section className={ui.panel}>
            <h2>Настройки</h2>
            <div className={styles.settings}>
              {settings.map(({ field, label, description }) => <label className={styles.setting} key={field}>
                <span><strong>{label}</strong><small>{description}</small></span>
                <input type="checkbox" role="switch" className={styles.switch} aria-label={label} checked={profile[field]}
                  disabled={asking} onChange={(event) => void toggle(field, event.target.checked)} />
              </label>)}
            </div>
          </section>
        </aside>
      </div>
      {confirm && <Dialog title="Сбросить профиль" onClose={() => setConfirm(false)} busy={false}>
        <p className={styles.resetText}>Вернуть исходные данные и настройки этого устройства?</p>
        <div className={ui.actions}>
          <button className={ui.primary} type="button" onClick={reset}>Сбросить</button>
          <button className={ui.outline} type="button" onClick={() => setConfirm(false)}>Отмена</button>
        </div>
      </Dialog>}
    </>
  )
}
