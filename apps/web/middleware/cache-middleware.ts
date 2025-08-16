/**
 * Next.js 14 Comprehensive Caching Middleware
 * Implements all 4 caching layers with intelligent cache management
 */

import { NextRequest, NextResponse } from 'next/server'
import { 
  getCacheHeaders, 
  getApiCacheHeaders, 
  shouldBypassCache, 
  getRouteCacheConfig,
  cacheMonitor,
  generateCacheKey
} from '@/lib/cache/next-cache-config'

// =============================================
// CACHE MIDDLEWARE
// =============================================

/**
 * Main caching middleware that applies appropriate caching strategies
 */
export function cacheMiddleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  const startTime = Date.now()
  
  // Skip caching for certain paths
  if (shouldSkipCaching(pathname)) {
    return NextResponse.next()
  }
  
  // Check if cache should be bypassed
  if (shouldBypassCache(request)) {
    const response = NextResponse.next()
    response.headers.set('X-Cache-Status', 'BYPASSED')
    return response
  }
  
  // Get cache configuration for this route
  const cacheConfig = getRouteCacheConfig(pathname)
  
  // Apply appropriate caching strategy
  const response = NextResponse.next()
  
  // Set cache headers based on route type
  if (cacheConfig.type === 'static') {
    // Static routes - long cache duration
    response.headers.set('Cache-Control', 'public, max-age=31536000, immutable')
    response.headers.set('X-Cache-Type', 'STATIC')
  } else if (cacheConfig.type === 'isr') {
    // ISR routes - revalidate on interval
    response.headers.set('Cache-Control', `public, s-maxage=${cacheConfig.revalidate}, stale-while-revalidate=${cacheConfig.revalidate! * 2}`)
    response.headers.set('X-Cache-Type', 'ISR')
  } else {
    // Dynamic routes - short cache with revalidation
    response.headers.set('Cache-Control', 'public, s-maxage=60, stale-while-revalidate=120')
    response.headers.set('X-Cache-Type', 'DYNAMIC')
  }
  
  // Add performance headers
  const responseTime = Date.now() - startTime
  response.headers.set('X-Response-Time', `${responseTime}ms`)
  response.headers.set('X-Cache-Config', JSON.stringify(cacheConfig))
  
  // Record metrics
  const cacheKey = generateCacheKey('route', { pathname })
  cacheMonitor.recordHit(cacheKey, responseTime)
  
  return response
}

/**
 * API-specific caching middleware
 */
export function apiCacheMiddleware(request: NextRequest, cacheType: 'STATIC' | 'SEMI_STATIC' | 'DYNAMIC' | 'REALTIME') {
  const startTime = Date.now()
  
  // Check if cache should be bypassed
  if (shouldBypassCache(request)) {
    const response = NextResponse.next()
    response.headers.set('X-Cache-Status', 'BYPASSED')
    return response
  }
  
  const response = NextResponse.next()
  
  // Apply API cache headers
  const headers = getApiCacheHeaders(request, cacheType)
  Object.entries(headers).forEach(([key, value]) => {
    response.headers.set(key, value)
  })
  
  // Add API-specific headers
  response.headers.set('X-API-Cache-Type', cacheType)
  response.headers.set('X-Response-Time', `${Date.now() - startTime}ms`)
  
  return response
}

/**
 * Fee management specific caching middleware
 */
export function feeManagementCacheMiddleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  
  // Determine cache type based on fee management route
  let cacheType: 'STATIC' | 'SEMI_STATIC' | 'DYNAMIC' | 'REALTIME' = 'DYNAMIC'
  
  if (pathname.includes('/fees/structures')) {
    cacheType = 'SEMI_STATIC' // Fee structures change occasionally
  } else if (pathname.includes('/fees/dashboard')) {
    cacheType = 'REALTIME' // Dashboard needs fresh data
  } else if (pathname.includes('/fees/reports')) {
    cacheType = 'SEMI_STATIC' // Reports can be cached longer
  } else if (pathname.includes('/fees/payments')) {
    cacheType = 'DYNAMIC' // Payments change frequently
  } else if (pathname.includes('/fees/assignments')) {
    cacheType = 'DYNAMIC' // Assignments change frequently
  }
  
  return apiCacheMiddleware(request, cacheType)
}

// =============================================
// CACHE WARMING MIDDLEWARE
// =============================================

/**
 * Cache warming middleware for critical routes
 */
export async function cacheWarmingMiddleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  const userAgent = request.headers.get('user-agent') || ''
  
  // Skip warming for bots and crawlers
  if (isBot(userAgent)) {
    return NextResponse.next()
  }
  
  // Warm cache for critical fee management routes
  if (pathname === '/admin/fees' || pathname === '/admin/fees/dashboard') {
    // Trigger background cache warming
    warmCriticalCaches(request)
  }
  
  return NextResponse.next()
}

/**
 * Background cache warming for critical data
 */
async function warmCriticalCaches(request: NextRequest) {
  try {
    const schoolId = request.nextUrl.searchParams.get('school_id')
    const userId = request.headers.get('x-user-id')
    
    if (!schoolId || !userId) return
    
    // Warm critical caches in background (don't await)
    Promise.all([
      fetch(`${request.nextUrl.origin}/api/fees/dashboard?school_id=${schoolId}`, {
        headers: { 'x-cache-warm': 'true' }
      }),
      fetch(`${request.nextUrl.origin}/api/fees/structures?school_id=${schoolId}&user_id=${userId}`, {
        headers: { 'x-cache-warm': 'true' }
      })
    ]).catch(error => {
      console.warn('Cache warming failed:', error)
    })
  } catch (error) {
    console.warn('Cache warming error:', error)
  }
}

// =============================================
// CACHE INVALIDATION MIDDLEWARE
// =============================================

/**
 * Cache invalidation middleware for write operations
 */
export function cacheInvalidationMiddleware(request: NextRequest) {
  const { pathname, method } = request
  
  // Only handle write operations
  if (!['POST', 'PUT', 'PATCH', 'DELETE'].includes(method)) {
    return NextResponse.next()
  }
  
  const response = NextResponse.next()
  
  // Add cache invalidation headers based on the operation
  if (pathname.includes('/fees/structures')) {
    response.headers.set('X-Invalidate-Tags', 'fee-structures,dashboard,semi-static-data')
  } else if (pathname.includes('/fees/assignments')) {
    response.headers.set('X-Invalidate-Tags', 'assignments,dashboard,dynamic-data')
  } else if (pathname.includes('/fees/payments')) {
    response.headers.set('X-Invalidate-Tags', 'payments,assignments,dashboard,invoices,realtime-data')
  } else if (pathname.includes('/fees/invoices')) {
    response.headers.set('X-Invalidate-Tags', 'invoices,dashboard,dynamic-data')
  }
  
  return response
}

// =============================================
// CACHE MONITORING MIDDLEWARE
// =============================================

/**
 * Cache monitoring and analytics middleware
 */
export function cacheMonitoringMiddleware(request: NextRequest) {
  const startTime = Date.now()
  const { pathname } = request.nextUrl
  
  const response = NextResponse.next()
  
  // Add monitoring headers
  response.headers.set('X-Cache-Monitor', 'enabled')
  response.headers.set('X-Request-ID', generateRequestId())
  response.headers.set('X-Timestamp', new Date().toISOString())
  
  // Record request metrics
  const responseTime = Date.now() - startTime
  const cacheKey = generateCacheKey('request', { pathname, method: request.method })
  
  // Determine if this was a cache hit or miss based on response time
  if (responseTime < 50) {
    cacheMonitor.recordHit(cacheKey, responseTime)
    response.headers.set('X-Cache-Result', 'HIT')
  } else {
    cacheMonitor.recordMiss(cacheKey, responseTime)
    response.headers.set('X-Cache-Result', 'MISS')
  }
  
  return response
}

// =============================================
// UTILITY FUNCTIONS
// =============================================

/**
 * Check if caching should be skipped for a path
 */
function shouldSkipCaching(pathname: string): boolean {
  const skipPaths = [
    '/api/auth',
    '/api/webhooks',
    '/_next',
    '/favicon.ico',
    '/robots.txt',
    '/sitemap.xml'
  ]
  
  return skipPaths.some(path => pathname.startsWith(path))
}

/**
 * Check if user agent is a bot
 */
function isBot(userAgent: string): boolean {
  const botPatterns = [
    'googlebot',
    'bingbot',
    'slurp',
    'duckduckbot',
    'baiduspider',
    'yandexbot',
    'facebookexternalhit',
    'twitterbot',
    'linkedinbot',
    'whatsapp',
    'telegrambot'
  ]
  
  return botPatterns.some(pattern => 
    userAgent.toLowerCase().includes(pattern)
  )
}

/**
 * Generate unique request ID
 */
function generateRequestId(): string {
  return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
}

/**
 * Get cache statistics for monitoring
 */
export function getCacheStatistics() {
  const metrics = cacheMonitor.getMetrics() as Map<string, any>
  const stats = {
    totalRequests: 0,
    cacheHits: 0,
    cacheMisses: 0,
    averageResponseTime: 0,
    cacheEfficiency: 0,
    lastUpdated: new Date().toISOString()
  }
  
  metrics.forEach((metric) => {
    stats.totalRequests += metric.hitRate + metric.missRate
    stats.cacheHits += metric.hitRate
    stats.cacheMisses += metric.missRate
    stats.averageResponseTime += metric.averageResponseTime
  })
  
  if (metrics.size > 0) {
    stats.averageResponseTime = stats.averageResponseTime / metrics.size
    stats.cacheEfficiency = stats.totalRequests > 0 
      ? (stats.cacheHits / stats.totalRequests) * 100 
      : 0
  }
  
  return stats
}

// =============================================
// CACHE HEALTH CHECK
// =============================================

/**
 * Cache health check endpoint data
 */
export function getCacheHealthCheck() {
  const stats = getCacheStatistics()
  
  return {
    status: stats.cacheEfficiency > 70 ? 'healthy' : 
            stats.cacheEfficiency > 50 ? 'warning' : 'unhealthy',
    efficiency: `${stats.cacheEfficiency.toFixed(2)}%`,
    totalRequests: stats.totalRequests,
    cacheHits: stats.cacheHits,
    cacheMisses: stats.cacheMisses,
    averageResponseTime: `${stats.averageResponseTime.toFixed(2)}ms`,
    recommendations: generateCacheRecommendations(stats),
    lastChecked: stats.lastUpdated
  }
}

/**
 * Generate cache optimization recommendations
 */
function generateCacheRecommendations(stats: any): string[] {
  const recommendations: string[] = []
  
  if (stats.cacheEfficiency < 50) {
    recommendations.push('Consider increasing cache duration for frequently accessed data')
  }
  
  if (stats.averageResponseTime > 200) {
    recommendations.push('Optimize database queries and consider adding more caching layers')
  }
  
  if (stats.cacheMisses > stats.cacheHits) {
    recommendations.push('Review cache invalidation strategy to reduce unnecessary cache misses')
  }
  
  if (recommendations.length === 0) {
    recommendations.push('Cache performance is optimal')
  }
  
  return recommendations
}
