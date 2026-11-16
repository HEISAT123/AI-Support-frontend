import { createContext, useContext } from 'react'
import type { Analysis } from '../types/support'

export interface Profile {
  name: string
  email: string
  shift: string
  notifications: boolean
  sound: boolean
  dark: boolean
}

export const defaultProfile: Profile = {
  name: import.meta.env.MODE === 'demo' ? 'Анна Петрова' : '',
  email: import.meta.env.MODE === 'demo' ? 'anna.petrova@company.ru' : '',
  shift: '09:00–18:00, пн–пт',
  notifications: false,
  sound: false,
  dark: false,
}

interface Workspace {
  recent: Analysis[]
  remember: (result: Analysis) => void
  rate: (requestId: string, articleId: string, helpful: boolean) => Promise<void>
  ratings: Record<string, boolean>
  profile: Profile
  updateProfile: (profile: Profile) => void
}

export const WorkspaceContext = createContext<Workspace | null>(null)

export function useWorkspace() {
  const context = useContext(WorkspaceContext)
  if (!context) throw new Error('Требуется WorkspaceProvider')
  return context
}
