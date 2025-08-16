/**
 * Cache Hook - Uses fallback cache manager (AsyncStorage only)
 * Temporary solution while fixing Redis polyfill issues
 */

import { useState, useEffect, useCallback } from 'react'
import { fallbackCacheManager, CACHE_CONFIGS } from '../lib/cache/fallback-cache-manager'

type CacheKey = keyof typeof CACHE_CONFIGS

interface UseCacheOptions {
  userId?: string
  schoolId?: string
  enabled?: boolean
}

interface UseCacheReturn<T> {
  data: T | null
  isLoading: boolean
  error: string | null
  refetch: () => Promise<void>
  setCache: (data: T) => Promise<void>
  clearCache: () => Promise<void>
}

export function useCache<T>(
  key: CacheKey,
  fetcher: () => Promise<T>,
  options: UseCacheOptions = {}
): UseCacheReturn<T> {
  const { userId, schoolId, enabled = true } = options
  const [data, setData] = useState<T | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const config = CACHE_CONFIGS[key]

  const fetchData = useCallback(async () => {
    if (!enabled) return

    setIsLoading(true)
    setError(null)

    try {
      // Try cache first
      const cachedData = await fallbackCacheManager.get<T>(
        key,
        config,
        userId,
        schoolId
      )

      if (cachedData) {
        setData(cachedData)
        setIsLoading(false)
        return
      }

      // Fetch fresh data
      console.log('🔄 Fetching fresh data for:', key)
      const freshData = await fetcher()
      
      // Cache the fresh data
      await fallbackCacheManager.set(
        key,
        freshData,
        config,
        userId,
        schoolId
      )

      setData(freshData)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error'
      setError(errorMessage)
      console.error('Cache fetch error:', errorMessage)
    } finally {
      setIsLoading(false)
    }
  }, [key, fetcher, userId, schoolId, enabled, config])

  const setCache = useCallback(async (newData: T) => {
    try {
      await fallbackCacheManager.set(
        key,
        newData,
        config,
        userId,
        schoolId
      )
      setData(newData)
    } catch (err) {
      console.error('Cache set error:', err)
    }
  }, [key, userId, schoolId, config])

  const clearCache = useCallback(async () => {
    try {
      await fallbackCacheManager.remove(key, userId, schoolId)
      setData(null)
    } catch (err) {
      console.error('Cache clear error:', err)
    }
  }, [key, userId, schoolId])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  return {
    data,
    isLoading,
    error,
    refetch: fetchData,
    setCache,
    clearCache,
  }
}

// Utility hook for cache stats
export function useCacheStats() {
  const [stats, setStats] = useState({
    totalKeys: 0,
    cacheSize: '0 items',
    isOnline: false,
  })

  const refreshStats = useCallback(async () => {
    const newStats = await fallbackCacheManager.getStats()
    setStats(newStats)
  }, [])

  useEffect(() => {
    refreshStats()
  }, [refreshStats])

  return { stats, refreshStats }
}

// Utility hook for clearing user cache
export function useClearUserCache() {
  const clearUserCache = useCallback(async (userId: string) => {
    await fallbackCacheManager.clearUserCache(userId)
  }, [])

  const clearAllCache = useCallback(async () => {
    await fallbackCacheManager.clearAll()
  }, [])

  return { clearUserCache, clearAllCache }
}
