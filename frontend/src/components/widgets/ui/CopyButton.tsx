import { useState } from 'react'
import { copyText } from '../../../lib/clipboard'
import styles from './ui.module.scss'

export function CopyButton({ text, label = 'Копировать ответ' }: { text: string; label?: string }) {
  const [state, setState] = useState<'idle' | 'copied' | 'error'>('idle')

  async function copy() {
    try {
      await copyText(text)
      setState('copied')
    } catch {
      setState('error')
    }
  }

  return (
    <div>
      <button type="button" className={styles.primary} onClick={() => void copy()}>
        <span aria-hidden="true">⧉</span> {state === 'copied' ? 'Скопировано' : label}
      </button>
      <span className="visuallyHidden" aria-live="polite">{state === 'copied' ? 'Текст скопирован.' : ''}</span>
      {state === 'error' && <p className={styles.error} role="alert">Не удалось скопировать. Выделите текст и скопируйте вручную.</p>}
    </div>
  )
}
