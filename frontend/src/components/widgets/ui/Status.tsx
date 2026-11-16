import styles from './ui.module.scss'

type Props = {
  children: string
  error?: boolean
  onRetry?: () => void
}

export function Status({ children, error, onRetry }: Props) {
  return (
    <div className={`${styles.notice} ${error ? styles.error : ''}`} role={error ? 'alert' : 'status'}>
      <p>{children}</p>
      {onRetry && <button type="button" className={styles.soft} onClick={onRetry}>Повторить</button>}
    </div>
  )
}
