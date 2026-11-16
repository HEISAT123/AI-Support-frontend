import { NavLink, Outlet, useMatch } from 'react-router-dom'
import homeIcon from '../../../../assets/home.svg'
import knowledgeIcon from '../../../../assets/knowledge.svg'
import analyticsIcon from '../../../../assets/analytics.svg'
import { useWorkspace } from '../../../../context/workspace-context'
import { initials } from '../../../../lib/format'
import styles from './AppLayout.module.scss'

const links = [
  { to: '/', label: 'Главная', icon: homeIcon },
  { to: '/knowledge', label: 'База знаний', icon: knowledgeIcon },
  { to: '/analytics', label: 'Аналитика', icon: analyticsIcon },
]

export function AppLayout() {
  const { profile } = useWorkspace()
  const requestRoute = useMatch('/requests/*')

  return (
    <div className={styles.shell}>
      <aside className={styles.sidebar}>
        <NavLink to="/account" className={styles.profile} aria-label="Мой аккаунт">
          <span className={styles.avatar} aria-hidden="true">{initials(profile.name) || 'AI'}<i /></span>
          <span className={styles.identity}><strong>{profile.name || 'Оператор'}</strong><small>Оператор</small></span>
        </NavLink>
        <nav className={styles.nav} aria-label="Основная навигация">
          {links.map(({ to, label, icon }) => (
            <NavLink key={to} to={to} end={to === '/'} className={({ isActive }) => isActive || (to === '/' && requestRoute) ? styles.active : undefined}>
              <img src={icon} alt="" />
              <span>{label}</span>
            </NavLink>
          ))}
        </nav>
        {import.meta.env.MODE === 'demo' && <p className={styles.demo}>Демонстрационный режим</p>}
      </aside>
      <main className={styles.main}><Outlet /></main>
    </div>
  )
}
