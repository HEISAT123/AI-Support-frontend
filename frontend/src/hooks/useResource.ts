import { useEffect, useState } from 'react'
import { errorMessage } from '../lib/apiClient'

type Resource<T> =
  | { status: 'loading' }
  | { status: 'success'; data: T }
  | { status: 'error'; message: string }

export function useResource<T>(fetchData: (signal: AbortSignal) => Promise<T>) {
  const [attempt, setAttempt] = useState(0)
  const [snapshot, setSnapshot] = useState<{ fetchData: typeof fetchData; attempt: number; result: Resource<T> }>()

  useEffect(() => {
    const controller = new AbortController()

    fetchData(controller.signal).then(
      (data) => {
        if (!controller.signal.aborted) setSnapshot({ fetchData, attempt, result: { status: 'success', data } })
      },
      (error: unknown) => {
        if (!controller.signal.aborted) {
          setSnapshot({ fetchData, attempt, result: { status: 'error', message: errorMessage(error) } })
        }
      },
    )
    return () => controller.abort()
  }, [attempt, fetchData])

  const result: Resource<T> = snapshot?.fetchData === fetchData && snapshot.attempt === attempt
    ? snapshot.result : { status: 'loading' }
  return { ...result, retry: () => setAttempt((value) => value + 1) }
}
