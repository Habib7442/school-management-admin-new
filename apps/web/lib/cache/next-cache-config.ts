/**
 * Next.js 14 App Router Comprehensive Caching Configuration
 * Implements all 4 caching layers as per Next.js documentation
 * 
 * Reference: https://nextjs.org/docs/app/guides/caching
 */

import { NextRequest } from 'next/server'

// =============================================
// CACHE CONFIGURATION
// =============================================

/**
 * Cache durations for different data types
 */
export const CACHE_CONFIG = {
  // Request Memoization (React cache) - automatic within render cycle
  REQUEST_MEMO: {
    enabled: true,
    description: 'Deduplicates requests within the same render cycle'
  },

  // Data Cache (unstable_cache) - server-side data caching
  DATA_CACHE: {
    // Static data that rarely changes
    STATIC: {
      revalidate: 3600, // 1 hour
      tags: ['static-data'],
      description: 'School settings, fee types, etc.'
    },
    
    // Semi-static data that changes occasionally
    SEMI_STATIC: {
      revalidate: 1800, // 30 minutes
      tags: ['semi-static-data'],
      description: 'Fee structures, class information'
    },
    
    // Dynamic data that changes frequently
    DYNAMIC: {
      revalidate: 300, // 5 minutes
      tags: ['dynamic-data'],
      description: 'Fee assignments, payment status'
    },
    
    // Real-time data that changes very frequently
    REALTIME: {
      revalidate: 60, // 1 minute
      tags: ['realtime-data'],
      description: 'Dashboard metrics, payment notifications'
    }
  },

  // Full Route Cache - static generation
  ROUTE_CACHE: {
    // Static routes that can be pre-generated
    STATIC_ROUTES: [
      '/admin/fees/reports/templates',
      '/admin/fees/help',
      '/admin/fees/settings'
    ],
    
    // Dynamic routes with ISR (Incremental Static Regeneration)
    ISR_ROUTES: {
      '/admin/fees/dashboard': {
        revalidate: 300, // 5 minutes
        description: 'Dashboard with cached metrics'
      },
      '/admin/fees/reports/[type]': {
        revalidate: 1800, // 30 minutes
        description: 'Financial reports with caching'
      }
    }
  },

  // Router Cache - client-side navigation cache
  ROUTER_CACHE: {
    enabled: true,
    description: 'Automatic client-side caching for navigation',
    duration: 300, // 5 minutes for dynamic routes
    staticDuration: 300 // 5 minutes for static routes
  }
} as const

// =============================================
// CACHE HEADERS CONFIGURATION
// =============================================

/**
 * Generate appropriate cache headers for different content types
 */
export function getCacheHeaders(cacheType: keyof typeof CACHE_CONFIG.DATA_CACHE) {
  const config = CACHE_CONFIG.DATA_CACHE[cacheType]
  
  return {
    'Cache-Control': `public, s-maxage=${config.revalidate}, stale-while-revalidate=${config.revalidate * 2}`,
    'CDN-Cache-Control': `public, s-maxage=${config.revalidate}`,
    'Vercel-CDN-Cache-Control': `public, s-maxage=${config.revalidate}`,
    'X-Cache-Tags': config.tags.join(','),
    'X-Cache-Description': config.description
  }
}

/**
 * Generate cache headers for API responses
 */
export function getApiCacheHeaders(request: NextRequest, cacheType: keyof typeof CACHE_CONFIG.DATA_CACHE) {
  const headers = getCacheHeaders(cacheType)
  
  // Add CORS headers if needed
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization'
  }
  
  return { ...headers, ...corsHeaders }
}

// =============================================
// CACHE WARMING STRATEGIES
// =============================================

/**
 * Cache warming configuration for different user types
 */
export const CACHE_WARMING = {
  // Admin users - warm comprehensive data
  ADMIN: {
    priority: ['dashboard', 'fee-structures', 'assignments', 'payments'],
    warmOnLogin: true,
    backgroundRefresh: true
  },
  
  // Sub-admin users - warm relevant data
  SUB_ADMIN: {
    priority: ['dashboard', 'fee-structures', 'assignments'],
    warmOnLogin: true,
    backgroundRefresh: false
  },
  
  // Teacher users - warm limited data
  TEACHER: {
    priority: ['assignments'],
    warmOnLogin: false,
    backgroundRefresh: false
  },
  
  // Student users - warm personal data only
  STUDENT: {
    priority: ['personal-assignments', 'payment-history'],
    warmOnLogin: false,
    backgroundRefresh: false
  }
} as const

// =============================================
// CACHE INVALIDATION STRATEGIES
// =============================================

/**
 * Cache invalidation rules for different operations
 */
export const CACHE_INVALIDATION = {
  // Fee structure operations
  FEE_STRUCTURE: {
    CREATE: ['fee-structures', 'dashboard', 'semi-static-data'],
    UPDATE: ['fee-structures', 'dashboard', 'assignments', 'semi-static-data'],
    DELETE: ['fee-structures', 'dashboard', 'assignments', 'semi-static-data']
  },
  
  // Fee assignment operations
  FEE_ASSIGNMENT: {
    CREATE: ['assignments', 'dashboard', 'dynamic-data'],
    UPDATE: ['assignments', 'dashboard', 'dynamic-data'],
    DELETE: ['assignments', 'dashboard', 'dynamic-data'],
    BULK_CREATE: ['assignments', 'dashboard', 'fee-structures', 'dynamic-data']
  },
  
  // Payment operations
  PAYMENT: {
    CREATE: ['payments', 'assignments', 'dashboard', 'invoices', 'realtime-data'],
    UPDATE: ['payments', 'assignments', 'dashboard', 'realtime-data'],
    VERIFY: ['payments', 'assignments', 'dashboard', 'realtime-data']
  },
  
  // Invoice operations
  INVOICE: {
    CREATE: ['invoices', 'dashboard', 'dynamic-data'],
    UPDATE: ['invoices', 'dashboard', 'dynamic-data'],
    SEND: ['invoices', 'dynamic-data']
  }
} as const

// =============================================
// PERFORMANCE MONITORING
// =============================================

/**
 * Cache performance metrics
 */
export interface CacheMetrics {
  hitRate: number
  missRate: number
  averageResponseTime: number
  cacheSize: number
  lastUpdated: string
}

/**
 * Cache performance monitoring
 */
export class CacheMonitor {
  private metrics: Map<string, CacheMetrics> = new Map()
  
  recordHit(cacheKey: string, responseTime: number) {
    const existing = this.metrics.get(cacheKey) || {
      hitRate: 0,
      missRate: 0,
      averageResponseTime: 0,
      cacheSize: 0,
      lastUpdated: new Date().toISOString()
    }
    
    existing.hitRate++
    existing.averageResponseTime = (existing.averageResponseTime + responseTime) / 2
    existing.lastUpdated = new Date().toISOString()
    
    this.metrics.set(cacheKey, existing)
  }
  
  recordMiss(cacheKey: string, responseTime: number) {
    const existing = this.metrics.get(cacheKey) || {
      hitRate: 0,
      missRate: 0,
      averageResponseTime: 0,
      cacheSize: 0,
      lastUpdated: new Date().toISOString()
    }
    
    existing.missRate++
    existing.averageResponseTime = (existing.averageResponseTime + responseTime) / 2
    existing.lastUpdated = new Date().toISOString()
    
    this.metrics.set(cacheKey, existing)
  }
  
  getMetrics(cacheKey?: string): CacheMetrics | Map<string, CacheMetrics> {
    if (cacheKey) {
      return this.metrics.get(cacheKey) || {
        hitRate: 0,
        missRate: 0,
        averageResponseTime: 0,
        cacheSize: 0,
        lastUpdated: new Date().toISOString()
      }
    }
    return this.metrics
  }
  
  getCacheEfficiency(cacheKey: string): number {
    const metrics = this.metrics.get(cacheKey)
    if (!metrics) return 0
    
    const total = metrics.hitRate + metrics.missRate
    return total > 0 ? (metrics.hitRate / total) * 100 : 0
  }
}

// Global cache monitor instance
export const cacheMonitor = new CacheMonitor()

// =============================================
// CACHE UTILITIES
// =============================================

/**
 * Generate cache key with consistent format
 */
export function generateCacheKey(prefix: string, params: Record<string, any>): string {
  const sortedParams = Object.keys(params)
    .sort()
    .map(key => `${key}:${params[key]}`)
    .join('|')
  
  return `${prefix}:${sortedParams}`
}

/**
 * Check if cache should be bypassed (for development/debugging)
 */
export function shouldBypassCache(request: NextRequest): boolean {
  const bypassHeader = request.headers.get('x-bypass-cache')
  const isDevelopment = process.env.NODE_ENV === 'development'
  const forceRefresh = request.nextUrl.searchParams.get('refresh') === 'true'
  
  return !!(bypassHeader || (isDevelopment && forceRefresh))
}

/**
 * Get cache configuration for specific route
 */
export function getRouteCacheConfig(pathname: string) {
  // Check if route is in static routes
  if (CACHE_CONFIG.ROUTE_CACHE.STATIC_ROUTES.includes(pathname)) {
    return { type: 'static', revalidate: false }
  }
  
  // Check if route matches ISR pattern
  for (const [pattern, config] of Object.entries(CACHE_CONFIG.ROUTE_CACHE.ISR_ROUTES)) {
    if (pathname.match(pattern.replace(/\[.*?\]/g, '.*'))) {
      return { type: 'isr', ...config }
    }
  }
  
  // Default to dynamic
  return { type: 'dynamic', revalidate: 0 }
}

/**
 * Cache health check
 */
export function getCacheHealthStatus() {
  const allMetrics = cacheMonitor.getMetrics() as Map<string, CacheMetrics>
  const cacheKeys = Array.from(allMetrics.keys())
  
  const healthStatus = {
    totalCaches: cacheKeys.length,
    averageHitRate: 0,
    averageResponseTime: 0,
    unhealthyCaches: [] as string[],
    lastChecked: new Date().toISOString()
  }
  
  if (cacheKeys.length > 0) {
    let totalHitRate = 0
    let totalResponseTime = 0
    
    cacheKeys.forEach(key => {
      const efficiency = cacheMonitor.getCacheEfficiency(key)
      const metrics = allMetrics.get(key)!
      
      totalHitRate += efficiency
      totalResponseTime += metrics.averageResponseTime
      
      // Mark as unhealthy if hit rate is below 50%
      if (efficiency < 50) {
        healthStatus.unhealthyCaches.push(key)
      }
    })
    
    healthStatus.averageHitRate = totalHitRate / cacheKeys.length
    healthStatus.averageResponseTime = totalResponseTime / cacheKeys.length
  }
  
  return healthStatus
}
