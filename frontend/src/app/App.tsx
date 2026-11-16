import { BrowserRouter, Link, Route, Routes } from 'react-router-dom'
import ArticlePage from '../components/pages/article'
import KnowledgePage from '../components/pages/knowledge'
import HomePage from '../components/pages/home'
import { RecentRequests } from '../components/pages/home/HomePage'
import ResultsPage from '../components/pages/results'
import { AppLayout } from '../components/widgets/app-layout'
import ui from '../components/widgets/ui/ui.module.scss'
import { WorkspaceProvider } from '../context/WorkspaceProvider'

export default function App() {
  return (
    <BrowserRouter>
      <WorkspaceProvider>
        <Routes>
          <Route element={<AppLayout />}>
            <Route index element={<HomePage />} />
            <Route path="requests" element={<><Link className={ui.back} to="/">← Назад</Link><RecentRequests all /></>} />
            <Route path="requests/:requestId" element={<ResultsPage />} />
            <Route path="knowledge" element={<KnowledgePage />} />
            <Route path="knowledge/:articleId" element={<ArticlePage />} />
            <Route path="requests/:requestId/articles/:articleId" element={<ArticlePage />} />
            <Route path="*" element={<section className={ui.panel}><h1>Страница не найдена</h1><Link to="/">На главную</Link></section>} />
          </Route>
        </Routes>
      </WorkspaceProvider>
    </BrowserRouter>
  )
}
