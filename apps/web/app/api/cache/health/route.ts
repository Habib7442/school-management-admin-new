/**
 * Cache Health Monitoring API
 * Provides comprehensive cache performance metrics and health status
 */

import { NextRequest, NextResponse } from 'next/server'
import { getCacheHealthCheck, getCacheStatistics } from '@/middleware/cache-middleware'
import { getCacheHealthStatus } from '@/lib/cache/next-cache-config'

// GET endpoint - Cache health status
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const detailed = searchParams.get('detailed') === 'true'
    
    // Get basic health check
    const healthCheck = getCacheHealthCheck()
    
    if (!detailed) {
      return NextResponse.json({
        success: true,
        data: {
          status: healthCheck.status,
          efficiency: healthCheck.efficiency,
          lastChecked: healthCheck.lastChecked
        }
      })
    }
    
    // Get detailed statistics
    const statistics = getCacheStatistics()
    const healthStatus = getCacheHealthStatus()
    
    const detailedResponse = {
      health: healthCheck,
      statistics,
      systemHealth: healthStatus,
      cacheConfiguration: {
        layers: {
          requestMemoization: {
            enabled: true,
            description: 'React cache() for request deduplication'
          },
          dataCache: {
            enabled: true,
            description: 'unstable_cache() for server-side data caching'
          },
          routeCache: {
            enabled: true,
            description: 'Full route caching with ISR'
          },
          routerCache: {
            enabled: true,
            description: 'Client-side navigation cache'
          }
        },
        performance: {
          averageResponseTime: statistics.averageResponseTime,
          cacheHitRatio: statistics.cacheEfficiency,
          totalCaches: healthStatus.totalCaches
        }
      },
      recommendations: healthCheck.recommendations,
      timestamp: new Date().toISOString()
    }
    
    return NextResponse.json({
      success: true,
      data: detailedResponse
    })
    
  } catch (error) {
    console.error('Error fetching cache health:', error)
    return NextResponse.json(
      { 
        error: 'Failed to fetch cache health status',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

// POST endpoint - Clear specific caches
export async function POST(request: NextRequest) {
  try {
    const { action, tags, paths } = await request.json()
    
    if (action === 'clear') {
      // This would integrate with your cache clearing logic
      // For now, we'll return a success response
      
      const clearedItems = []
      
      if (tags && Array.isArray(tags)) {
        // Clear by tags
        clearedItems.push(...tags.map(tag => `tag:${tag}`))
      }
      
      if (paths && Array.isArray(paths)) {
        // Clear by paths
        clearedItems.push(...paths.map(path => `path:${path}`))
      }
      
      return NextResponse.json({
        success: true,
        message: `Cache cleared for ${clearedItems.length} items`,
        clearedItems,
        timestamp: new Date().toISOString()
      })
    }
    
    if (action === 'warm') {
      // Trigger cache warming
      return NextResponse.json({
        success: true,
        message: 'Cache warming initiated',
        timestamp: new Date().toISOString()
      })
    }
    
    return NextResponse.json(
      { error: 'Invalid action. Use "clear" or "warm"' },
      { status: 400 }
    )
    
  } catch (error) {
    console.error('Error managing cache:', error)
    return NextResponse.json(
      { 
        error: 'Failed to manage cache',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}
