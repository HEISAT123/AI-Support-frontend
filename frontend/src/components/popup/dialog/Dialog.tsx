import { useEffect, useId, useRef, type ReactNode } from 'react'
import styles from './Dialog.module.scss'

interface Props {
  title: string
  busy: boolean
  onClose: () => void
  children: ReactNode
}

export default function Dialog({ title, busy, onClose, children }: Props) {
  const ref = useRef<HTMLDialogElement>(null)
  const titleId = useId()
  useEffect(() => {
    const dialog = ref.current
    dialog?.showModal()
    return () => dialog?.close()
  }, [])

  return (
    <dialog ref={ref} className={styles.dialog} aria-labelledby={titleId} onCancel={(event) => {
      event.preventDefault()
      if (!busy) onClose()
    }}>
      <header className={styles.header}>
        <h2 id={titleId}>{title}</h2>
        <button type="button" className={styles.close} aria-label="Закрыть окно" onClick={onClose} disabled={busy}>×</button>
      </header>
      {children}
    </dialog>
  )
}
