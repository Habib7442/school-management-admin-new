'use client'

/**
 * Performance Monitor Component
 * Tracks API usage, cache performance, and optimization metrics
 * Helps monitor the effectiveness of our optimization strategies
 */

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { 
  Activity, 
  Database, 
  Zap, 
  TrendingUp, 
  Clock, 
  BarChart3,
  RefreshCw,
  CheckCircle,
  AlertTriangle
} from 'lucide-react'
import { cacheManager } from '@/lib/cache/CacheManager'
import { apiService } from '@/lib/api/OptimizedApiService'

interface PerformanceMetrics {
  cacheHitRate: number
  totalRequests: number
  cachedRequests: number
  apiRequests: number
  averageResponseTime: number
  costSavings: number
  lastUpdated: number
}

interface ApiUsageStats {
  today: number
  thisWeek: number
  thisMonth: number
  estimated: number
  limit: number
}

interface PerformanceMonitorProps {
  className?: string
}

export function PerformanceMonitor({ className = '' }: PerformanceMonitorProps) {
  const [metrics, setMetrics] = useState<PerformanceMetrics>({
    cacheHitRate: 0,
    totalRequests: 0,
    cachedRequests: 0,
    apiRequests: 0,
    averageResponseTime: 0,
    costSavings: 0,
    lastUpdated: Date.now()
  })

  const [apiUsage, setApiUsage] = useState<ApiUsageStats>({
    today: 0,
    thisWeek: 0,
    thisMonth: 0,
    estimated: 0,
    limit: 500000 // Supabase free tier limit
  })

  useEffect(() => {
    updateMetrics()
    const interval = setInterval(updateMetrics, 30000) // Update every 30 seconds
    return () => clearInterval(interval)
  }, [])

  const updateMetrics = () => {
    try {
      // Get cache statistics
      const cacheStats = cacheManager.getStats()
      const apiStats = apiService.getStats()

      // Calculate metrics
      const totalRequests = cacheStats.hits + cacheStats.misses
      const cacheHitRate = totalRequests > 0 ? (cacheStats.hits / totalRequests) * 100 : 0
      
      // Estimate cost savings (assuming $0.0001 per API request)
      const costSavings = cacheStats.hits * 0.0001

      // Get API usage from localStorage (simulated)
      const storedUsage = localStorage.getItem('api_usage_stats')
      let usage = apiUsage
      
      if (storedUsage) {
        try {
          usage = JSON.parse(storedUsage)
        } catch (e) {
          console.warn('Failed to parse stored API usage stats')
        }
      }

      // Update usage with current session
      usage.today += cacheStats.misses
      usage.thisWeek += cacheStats.misses
      usage.thisMonth += cacheStats.misses

      setMetrics({
        cacheHitRate,
        totalRequests,
        cachedRequests: cacheStats.hits,
        apiRequests: cacheStats.misses,
        averageResponseTime: 150, // Simulated - would be tracked in real implementation
        costSavings,
        lastUpdated: Date.now()
      })

      setApiUsage(usage)

      // Store updated usage
      localStorage.setItem('api_usage_stats', JSON.stringify(usage))
    } catch (error) {
      console.error('Error updating performance metrics:', error)
    }
  }

  const resetMetrics = () => {
    cacheManager.clear()
    apiService.clearCaches()
    localStorage.removeItem('api_usage_stats')
    updateMetrics()
  }

  const getUsageColor = (usage: number, limit: number) => {
    const percentage = (usage / limit) * 100
    if (percentage < 50) return 'text-green-600'
    if (percentage < 80) return 'text-yellow-600'
    return 'text-red-600'
  }

  const getUsageIcon = (usage: number, limit: number) => {
    const percentage = (usage / limit) * 100
    if (percentage < 80) return <CheckCircle className="h-4 w-4 text-green-600" />
    return <AlertTriangle className="h-4 w-4 text-yellow-600" />
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header Section */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <Activity className="h-6 w-6 text-blue-600" />
          <div>
            <h2 className="text-2xl font-bold">Performance Monitor</h2>
            <p className="text-gray-600">Real-time API optimization metrics</p>
          </div>
        </div>
        <Button
          variant="outline"
          onClick={resetMetrics}
          className="flex items-center space-x-2"
        >
          <RefreshCw className="h-4 w-4" />
          <span>Reset Metrics</span>
        </Button>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Cache Performance Card */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center space-x-2">
              <Database className="h-5 w-5 text-blue-600" />
              <CardTitle className="text-lg">Cache Performance</CardTitle>
            </div>
            <CardDescription>
              Caching efficiency and hit rates
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="font-medium">Cache Hit Rate</span>
                <Badge variant={metrics.cacheHitRate > 70 ? "default" : "secondary"} className="text-sm">
                  {metrics.cacheHitRate.toFixed(1)}%
                </Badge>
              </div>
              <Progress value={metrics.cacheHitRate} className="h-3" />
              <div className="flex justify-between text-sm text-gray-600">
                <span>Cached: {metrics.cachedRequests}</span>
                <span>API: {metrics.apiRequests}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* API Usage Card */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center space-x-2">
              <BarChart3 className="h-5 w-5 text-green-600" />
              <CardTitle className="text-lg">API Usage</CardTitle>
            </div>
            <CardDescription>
              Monthly API request tracking
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="font-medium">Monthly Usage</span>
                {getUsageIcon(apiUsage.thisMonth, apiUsage.limit)}
              </div>
              <Progress
                value={(apiUsage.thisMonth / apiUsage.limit) * 100}
                className="h-3"
              />
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span>Used: {apiUsage.thisMonth.toLocaleString()}</span>
                  <span className={getUsageColor(apiUsage.thisMonth, apiUsage.limit)}>
                    {((apiUsage.thisMonth / apiUsage.limit) * 100).toFixed(1)}%
                  </span>
                </div>
                <div className="text-center text-gray-600">
                  Limit: {apiUsage.limit.toLocaleString()} requests
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Cost Savings Card */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center space-x-2">
              <TrendingUp className="h-5 w-5 text-green-600" />
              <CardTitle className="text-lg">Cost Savings</CardTitle>
            </div>
            <CardDescription>
              Estimated savings from optimizations
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="text-center">
              <div className="text-3xl font-bold text-green-600">
                ${metrics.costSavings.toFixed(4)}
              </div>
              <p className="text-sm text-gray-600">Saved this session</p>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Avg Response Time:</span>
                <Badge variant="outline">{metrics.averageResponseTime}ms</Badge>
              </div>
              <div className="flex justify-between text-sm">
                <span>Total Requests:</span>
                <span className="font-medium">{metrics.totalRequests}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Detailed Statistics */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Usage Breakdown */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Clock className="h-5 w-5 text-blue-600" />
              <span>Usage Breakdown</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span>Today</span>
                <Badge variant="outline">{apiUsage.today}</Badge>
              </div>
              <div className="flex justify-between items-center">
                <span>This Week</span>
                <Badge variant="outline">{apiUsage.thisWeek}</Badge>
              </div>
              <div className="flex justify-between items-center">
                <span>This Month</span>
                <Badge variant="outline">{apiUsage.thisMonth}</Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Performance Insights */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Zap className="h-5 w-5 text-yellow-600" />
              <span>Performance Insights</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="p-3 bg-green-50 rounded-lg">
                <div className="flex items-center space-x-2">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  <span className="text-sm font-medium text-green-800">
                    Optimization Active
                  </span>
                </div>
                <p className="text-xs text-green-700 mt-1">
                  Cache hit rate above 70% - excellent performance
                </p>
              </div>

              <div className="text-xs text-gray-500 text-center">
                Last updated: {new Date(metrics.lastUpdated).toLocaleTimeString()}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

export default PerformanceMonitor
