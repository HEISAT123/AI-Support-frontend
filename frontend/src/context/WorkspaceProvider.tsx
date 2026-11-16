import { useEffect, useRef, useState, type ReactNode } from 'react'
import { sendFeedback } from '../api/requestsApi'
import { defaultProfile, WorkspaceContext, type Profile } from './workspace-context'
import type { Analysis } from '../types/support'

const profileKey = 'ai-support-profile'

function readProfile(): Profile {
  try {
    return { ...defaultProfile, ...JSON.parse(localStorage.getItem(profileKey) || '{}') }
  } catch {
    return defaultProfile
  }
}

export function WorkspaceProvider({ children }: { children: ReactNode }) {
  const [recent, setRecent] = useState<Analysis[]>([])
  const [profile, setProfile] = useState(readProfile)
  const [ratings, setRatings] = useState<Record<string, boolean>>({})
  const pending = useRef(new Set<string>())
  const [pendingRatings, setPendingRatings] = useState<ReadonlySet<string>>(() => new Set())

  useEffect(() => {
    if (import.meta.env.MODE !== 'demo') return
    let active = true
    void import('../api/demoApi').then(({ demoRecent }) => {
      if (active) setRecent((items) => [...items, ...demoRecent.filter((entry) => !items.some(({ requestId }) => requestId === entry.requestId))])
    })
    return () => { active = false }
  }, [])

  useEffect(() => {
    document.documentElement.dataset.theme = profile.dark ? 'dark' : 'light'
  }, [profile.dark])

  function updateProfile(next: Profile) {
    localStorage.setItem(profileKey, JSON.stringify(next))
    setProfile(next)
  }

  function remember(result: Analysis) {
    setRecent((items) => [result, ...items.filter(({ requestId }) => requestId !== result.requestId)].slice(0, 30))
  }

  async function rate(requestId: string, articleId: string, helpful: boolean) {
    const key = `${requestId}:${articleId}`
    if (pending.current.has(key)) return
    pending.current.add(key)
    setPendingRatings(new Set(pending.current))
    try {
      await sendFeedback(requestId, articleId, helpful)
      setRatings((previous) => ({ ...previous, [key]: helpful }))
    } finally {
      pending.current.delete(key)
      setPendingRatings(new Set(pending.current))
    }
  }

  return (
    <WorkspaceContext.Provider value={{ profile, updateProfile, recent, remember, rate, ratings, pendingRatings }}>
      {children}
    </WorkspaceContext.Provider>
  )
}
