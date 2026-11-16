import { useCallback } from 'react'
import { getRequest } from '../api/requestsApi'
import { useWorkspace } from '../context/workspace-context'
import { useResource } from './useResource'

export function useAnalysis(id: string) {
  const { recent } = useWorkspace()
  const cached = recent.find(({ requestId }) => requestId === id)
  const load = useCallback((signal: AbortSignal) => cached ? Promise.resolve(cached) : getRequest(id, signal), [cached, id])
  return useResource(load)
}
