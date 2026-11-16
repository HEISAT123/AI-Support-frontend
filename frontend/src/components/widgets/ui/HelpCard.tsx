import { Link } from 'react-router-dom'
import helpIcon from '../../../assets/help.svg'
import styles from './ui.module.scss'

export function HelpCard({ article = false }: { article?: boolean }) {
  return (
    <section className={`${styles.panel} ${styles.tint} ${styles.help}`}>
      <span className={styles.helpIcon} aria-hidden="true">{article ? '?' : <img src={helpIcon} alt="" />}</span>
      <div>
        <h3>{article ? 'Не нашли решение?' : 'Нужна помощь?'}</h3>
        <p className={styles.muted}>{article ? 'Передайте обращение специалисту второй линии.' : 'Откройте базу знаний или напишите администратору.'}</p>
        <Link to="/knowledge"><strong>{article ? 'Вернуться к базе знаний' : 'Перейти к базе знаний'}</strong></Link>
      </div>
    </section>
  )
}
