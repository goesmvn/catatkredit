import { useState, useEffect, useCallback } from 'react'

const cache = new Map<string, any>()
const fetchPromises = new Map<string, Promise<any>>()

export function useDataCache<T>(url: string | null) {
  const [data, setData] = useState<T | null>(url ? cache.get(url) || null : null)
  const [loading, setLoading] = useState(url ? !cache.has(url) : false)
  const [error, setError] = useState<Error | null>(null)

  const refetch = useCallback(async () => {
    if (!url) return
    
    // Only show loading if we don't have cached data
    if (!cache.has(url)) setLoading(true)
    
    try {
      if (!fetchPromises.has(url)) {
        fetchPromises.set(url, fetch(url).then(r => {
          if (!r.ok) throw new Error('Failed to fetch')
          return r.json()
        }))
      }
      
      const result = await fetchPromises.get(url)
      cache.set(url, result)
      setData(result)
      setError(null)
    } catch (e) {
      console.error(`Error fetching ${url}:`, e)
      setError(e as Error)
    } finally {
      fetchPromises.delete(url)
      setLoading(false)
    }
  }, [url])

  useEffect(() => {
    if (url) refetch()
  }, [url, refetch])

  return { data, loading, error, refetch }
}

export function invalidateCache(url?: string) {
  if (url) cache.delete(url)
  else cache.clear()
}
