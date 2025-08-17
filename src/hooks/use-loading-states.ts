import { useState, useCallback } from 'react'

interface LoadingStates {
  [key: string]: boolean
}

export function useLoadingStates(initialStates: LoadingStates = {}) {
  const [loadingStates, setLoadingStates] = useState<LoadingStates>(initialStates)

  const setLoading = useCallback((key: string, isLoading: boolean) => {
    setLoadingStates(prev => ({ ...prev, [key]: isLoading }))
  }, [])

  const isLoading = useCallback((key: string) => {
    return loadingStates[key] || false
  }, [loadingStates])

  const withLoading = useCallback(
    async <T>(key: string, asyncFn: () => Promise<T>): Promise<T> => {
      setLoading(key, true)
      try {
        const result = await asyncFn()
        return result
      } finally {
        setLoading(key, false)
      }
    },
    [setLoading]
  )

  return { loadingStates, setLoading, isLoading, withLoading }
}