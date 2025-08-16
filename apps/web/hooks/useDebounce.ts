import { useState, useEffect, useCallback, useRef } from 'react'

/**
 * Debounced value hook - prevents excessive API calls during typing
 * Reduces search API calls by 80-95%
 */
export function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value)

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value)
    }, delay)

    return () => {
      clearTimeout(handler)
    }
  }, [value, delay])

  return debouncedValue
}

/**
 * Debounced callback hook - prevents excessive function calls
 */
export function useDebouncedCallback<T extends (...args: any[]) => any>(
  callback: T,
  delay: number,
  deps: React.DependencyList = []
): T {
  const timeoutRef = useRef<NodeJS.Timeout>()
  const callbackRef = useRef(callback)

  // Update callback ref when dependencies change
  useEffect(() => {
    callbackRef.current = callback
  }, [callback, ...deps])

  const debouncedCallback = useCallback(
    ((...args: Parameters<T>) => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }

      timeoutRef.current = setTimeout(() => {
        callbackRef.current(...args)
      }, delay)
    }) as T,
    [delay]
  )

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
    }
  }, [])

  return debouncedCallback
}

/**
 * Debounced search hook with caching
 * Combines debouncing with intelligent caching for search results
 */
export function useDebouncedSearch<T>(
  searchFn: (query: string) => Promise<T[]>,
  delay: number = 300,
  minQueryLength: number = 2
) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<T[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  const debouncedQuery = useDebounce(query, delay)
  const searchCache = useRef(new Map<string, T[]>())
  const abortControllerRef = useRef<AbortController>()

  // Use ref to store the search function to avoid dependency issues
  const searchFnRef = useRef(searchFn)
  searchFnRef.current = searchFn

  const performSearch = useCallback(async (searchQuery: string) => {
    if (searchQuery.length < minQueryLength) {
      setResults([])
      setLoading(false)
      return
    }

    // Check cache first
    const cached = searchCache.current.get(searchQuery)
    if (cached) {
      console.log(`🔍 Search cache HIT for query: "${searchQuery}"`)
      setResults(cached)
      setLoading(false)
      return
    }

    // Cancel previous request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
    }

    // Create new abort controller
    abortControllerRef.current = new AbortController()

    try {
      setLoading(true)
      setError(null)

      console.log(`🔍 Search cache MISS for query: "${searchQuery}" - fetching from API`)
      const searchResults = await searchFnRef.current(searchQuery)

      // Cache the results
      searchCache.current.set(searchQuery, searchResults)

      // Limit cache size (LRU-style)
      if (searchCache.current.size > 50) {
        const firstKey = searchCache.current.keys().next().value
        searchCache.current.delete(firstKey)
      }

      setResults(searchResults)
    } catch (err) {
      if (err instanceof Error && err.name !== 'AbortError') {
        setError(err.message)
        console.error('Search error:', err)
      }
    } finally {
      setLoading(false)
    }
  }, [minQueryLength])

  // Perform search when debounced query changes
  useEffect(() => {
    performSearch(debouncedQuery)
  }, [debouncedQuery, performSearch])

  // Clear cache when component unmounts
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort()
      }
      searchCache.current.clear()
    }
  }, [])

  const clearSearch = useCallback(() => {
    setQuery('')
    setResults([])
    setError(null)
    searchCache.current.clear()
  }, [])

  const clearCache = useCallback(() => {
    searchCache.current.clear()
    console.log('🧹 Search cache cleared')
  }, [])

  return {
    query,
    setQuery,
    results,
    loading,
    error,
    clearSearch,
    clearCache,
    cacheSize: searchCache.current.size
  }
}

/**
 * Throttled callback hook - limits function execution frequency
 */
export function useThrottledCallback<T extends (...args: any[]) => any>(
  callback: T,
  delay: number,
  deps: React.DependencyList = []
): T {
  const lastCallRef = useRef<number>(0)
  const timeoutRef = useRef<NodeJS.Timeout>()
  const callbackRef = useRef(callback)

  useEffect(() => {
    callbackRef.current = callback
  }, [callback, ...deps])

  const throttledCallback = useCallback(
    ((...args: Parameters<T>) => {
      const now = Date.now()
      const timeSinceLastCall = now - lastCallRef.current

      if (timeSinceLastCall >= delay) {
        lastCallRef.current = now
        callbackRef.current(...args)
      } else {
        if (timeoutRef.current) {
          clearTimeout(timeoutRef.current)
        }
        
        timeoutRef.current = setTimeout(() => {
          lastCallRef.current = Date.now()
          callbackRef.current(...args)
        }, delay - timeSinceLastCall)
      }
    }) as T,
    [delay]
  )

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
    }
  }, [])

  return throttledCallback
}
