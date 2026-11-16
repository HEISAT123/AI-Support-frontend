import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import '@fontsource-variable/manrope'
import App from './app/App'
import './app/styles/main.scss'

const root = document.getElementById('root')
if (!root) throw new Error('Не найден контейнер приложения')

createRoot(root).render(<StrictMode><App /></StrictMode>)
