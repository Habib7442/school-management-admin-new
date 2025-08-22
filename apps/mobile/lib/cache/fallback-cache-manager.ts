/**
 * Fallback Cache Manager - AsyncStorage Only
 * Temporary solution while fixing Redis polyfill issues
 */

import AsyncStorage from '@react-native-async-storage/async-storage'
import NetInfo from '@react-native-community/netinfo'

interface CacheItem<T = any> {
  data: T
  timestamp: number
  ttl: number
  version: string
}

interface CacheConfig {
  ttl: number
  useLocal: boolean
  priority: 'high' | 'medium' | 'low'
}

class FallbackCacheManager {
  private isOnline: boolean = true
  private cacheVersion = '1.0.0'
  private keyPrefix = 'sms'

  constructor() {
    this.initializeNetworkListener()
  }

  private initializeNetworkListener() {
    NetInfo.addEventListener(state => {
      this.isOnline = state.isConnected ?? false
      console.log('📶 Network status:', this.isOnline ? 'Online' : 'Offline')
    })
  }

  /**
   * Generate cache key with user and school context
   */
  private generateKey(key: string, userId?: string, schoolId?: string): string {
    const parts = [this.keyPrefix, key]
    if (schoolId) parts.push(`school:${schoolId}`)
    if (userId) parts.push(`user:${userId}`)
    return parts.join(':')
  }

  /**
   * Check if cache item is still valid
   */
  private isValid<T>(item: CacheItem<T>): boolean {
    const now = Date.now()
    const age = (now - item.timestamp) / 1000 // Convert to seconds
    return age < item.ttl && item.version === this.cacheVersion
  }

  /**
   * Get data from cache
   */
  async get<T>(
    key: string, 
    config: CacheConfig,
    userId?: string, 
    schoolId?: string
  ): Promise<T | null> {
    const cacheKey = this.generateKey(key, userId, schoolId)
    
    try {
      console.log('🔍 Checking AsyncStorage for:', cacheKey)
      const localData = await AsyncStorage.getItem(cacheKey)
      
      if (localData) {
        const item = JSON.parse(localData) as CacheItem<T>
        if (this.isValid(item)) {
          console.log('✅ Cache HIT (AsyncStorage):', cacheKey)
          return item.data
        } else {
          console.log('⏰ Cache EXPIRED (AsyncStorage):', cacheKey)
          await AsyncStorage.removeItem(cacheKey)
        }
      }
      
      console.log('❌ Cache MISS:', cacheKey)
      return null
    } catch (error) {
      console.error('Cache get error:', error)
      return null
    }
  }

  /**
   * Set data in cache
   */
  async set<T>(
    key: string, 
    data: T, 
    config: CacheConfig,
    userId?: string, 
    schoolId?: string
  ): Promise<void> {
    const cacheKey = this.generateKey(key, userId, schoolId)
    
    const item: CacheItem<T> = {
      data,
      timestamp: Date.now(),
      ttl: config.ttl,
      version: this.cacheVersion,
    }

    try {
      // Store in AsyncStorage
      if (config.useLocal) {
        console.log('💾 Storing in AsyncStorage:', cacheKey)
        await AsyncStorage.setItem(cacheKey, JSON.stringify(item))
      }
    } catch (error) {
      console.error('Cache set error:', error)
    }
  }

  /**
   * Remove specific cache entry
   */
  async remove(key: string, userId?: string, schoolId?: string): Promise<void> {
    const cacheKey = this.generateKey(key, userId, schoolId)
    
    try {
      await AsyncStorage.removeItem(cacheKey)
      console.log('🗑️ Cache removed:', cacheKey)
    } catch (error) {
      console.error('Cache remove error:', error)
    }
  }

  /**
   * Clear all cache for a specific user
   */
  async clearUserCache(userId: string): Promise<void> {
    try {
      const allKeys = await AsyncStorage.getAllKeys()
      const userKeys = allKeys.filter(key => 
        key.includes(`user:${userId}`) && key.startsWith(this.keyPrefix)
      )
      
      await AsyncStorage.multiRemove(userKeys)
      console.log('🧹 User cache cleared:', userId)
    } catch (error) {
      console.error('Clear user cache error:', error)
    }
  }

  /**
   * Clear all cache
   */
  async clearAll(): Promise<void> {
    try {
      const allKeys = await AsyncStorage.getAllKeys()
      const cacheKeys = allKeys.filter(key => key.startsWith(this.keyPrefix))
      
      await AsyncStorage.multiRemove(cacheKeys)
      console.log('🧹 All cache cleared')
    } catch (error) {
      console.error('Clear all cache error:', error)
    }
  }

  /**
   * Get cache statistics
   */
  async getStats(): Promise<{
    totalKeys: number
    cacheSize: string
    isOnline: boolean
    totalSizeBytes: number
    expiredKeys: number
  }> {
    try {
      const allKeys = await AsyncStorage.getAllKeys()
      const cacheKeys = allKeys.filter(key => key.startsWith(this.keyPrefix))

      let totalSizeBytes = 0
      let expiredKeys = 0

      for (const key of cacheKeys) {
        try {
          const data = await AsyncStorage.getItem(key)
          if (data) {
            totalSizeBytes += data.length
            const item = JSON.parse(data) as CacheItem<any>
            if (!this.isValid(item)) {
              expiredKeys++
            }
          }
        } catch (error) {
          // Count corrupted entries as expired
          expiredKeys++
        }
      }

      return {
        totalKeys: cacheKeys.length,
        cacheSize: `${this.formatBytes(totalSizeBytes)}`,
        isOnline: this.isOnline,
        totalSizeBytes,
        expiredKeys,
      }
    } catch (error) {
      console.error('Get stats error:', error)
      return {
        totalKeys: 0,
        cacheSize: '0 bytes',
        isOnline: this.isOnline,
        totalSizeBytes: 0,
        expiredKeys: 0,
      }
    }
  }

  /**
   * Clean up expired cache entries
   */
  async cleanupExpired(): Promise<{ removedCount: number; freedBytes: number }> {
    try {
      const allKeys = await AsyncStorage.getAllKeys()
      const cacheKeys = allKeys.filter(key => key.startsWith(this.keyPrefix))

      const expiredKeys: string[] = []
      let freedBytes = 0

      for (const key of cacheKeys) {
        try {
          const data = await AsyncStorage.getItem(key)
          if (data) {
            const item = JSON.parse(data) as CacheItem<any>
            if (!this.isValid(item)) {
              expiredKeys.push(key)
              freedBytes += data.length
            }
          }
        } catch (error) {
          // Remove corrupted entries
          expiredKeys.push(key)
        }
      }

      if (expiredKeys.length > 0) {
        await AsyncStorage.multiRemove(expiredKeys)
        console.log(`🧹 Cleaned up ${expiredKeys.length} expired cache entries (${this.formatBytes(freedBytes)} freed)`)
      }

      return {
        removedCount: expiredKeys.length,
        freedBytes,
      }
    } catch (error) {
      console.error('Cleanup expired error:', error)
      return { removedCount: 0, freedBytes: 0 }
    }
  }

  /**
   * Preload critical data for offline use
   */
  async preloadCriticalData(userId: string, schoolId: string): Promise<void> {
    console.log('🚀 Preloading critical data for offline use...')

    // This would typically load essential data like:
    // - User profile
    // - Today's classes
    // - Recent assignments
    // - Student lists for teacher's classes

    const criticalKeys = [
      `user_profile_${userId}`,
      `teacher_classes_${userId}`,
      `dashboard_stats_${userId}`,
      `today_schedule_${userId}`,
    ]

    // In a real implementation, you would fetch this data from the API
    // and cache it with high priority
    console.log('📦 Critical data preloaded:', criticalKeys)
  }

  /**
   * Intelligent cache warming based on usage patterns
   */
  async warmCache(userId: string, schoolId: string): Promise<void> {
    if (!this.isOnline) {
      console.log('📶 Offline - skipping cache warming')
      return
    }

    console.log('🔥 Warming cache with frequently accessed data...')

    // This would analyze usage patterns and preload likely-to-be-accessed data
    // For example:
    // - If it's Monday morning, preload weekly schedule
    // - If it's near assignment due dates, preload assignment data
    // - If it's attendance time, preload student lists

    const now = new Date()
    const hour = now.getHours()
    const dayOfWeek = now.getDay()

    if (hour >= 8 && hour <= 16 && dayOfWeek >= 1 && dayOfWeek <= 5) {
      // School hours - preload teaching-related data
      console.log('🏫 School hours detected - warming teaching data')
    }
  }

  /**
   * Format bytes to human readable string
   */
  private formatBytes(bytes: number): string {
    if (bytes === 0) return '0 bytes'

    const k = 1024
    const sizes = ['bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))

    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  /**
   * Batch operations for better performance
   */
  async batchSet<T>(
    items: Array<{ key: string; data: T; config: CacheConfig; userId?: string; schoolId?: string }>,
  ): Promise<void> {
    try {
      const operations: Array<[string, string]> = []

      for (const item of items) {
        const cacheKey = this.generateKey(item.key, item.userId, item.schoolId)
        const cacheItem: CacheItem<T> = {
          data: item.data,
          timestamp: Date.now(),
          ttl: item.config.ttl,
          version: this.cacheVersion,
        }

        operations.push([cacheKey, JSON.stringify(cacheItem)])
      }

      await AsyncStorage.multiSet(operations)
      console.log(`💾 Batch cached ${operations.length} items`)
    } catch (error) {
      console.error('Batch set error:', error)
    }
  }

  /**
   * Batch get operations
   */
  async batchGet<T>(
    keys: Array<{ key: string; config: CacheConfig; userId?: string; schoolId?: string }>,
  ): Promise<Array<{ key: string; data: T | null }>> {
    try {
      const cacheKeys = keys.map(item => this.generateKey(item.key, item.userId, item.schoolId))
      const results = await AsyncStorage.multiGet(cacheKeys)

      return results.map(([cacheKey, data], index) => {
        const originalKey = keys[index].key

        if (data) {
          try {
            const item = JSON.parse(data) as CacheItem<T>
            if (this.isValid(item)) {
              return { key: originalKey, data: item.data }
            }
          } catch (error) {
            console.error('Parse error for key:', cacheKey)
          }
        }

        return { key: originalKey, data: null }
      })
    } catch (error) {
      console.error('Batch get error:', error)
      return keys.map(item => ({ key: item.key, data: null }))
    }
  }
}

// Export singleton instance
export const fallbackCacheManager = new FallbackCacheManager()

// Cache configurations (same as before but without Redis)
export const CACHE_CONFIGS = {
  // High priority - real-time data (5 minutes)
  USER_PROFILE: { ttl: 300, useLocal: true, priority: 'high' as const },
  DASHBOARD_STATS: { ttl: 180, useLocal: true, priority: 'high' as const },
  TODAY_CLASSES: { ttl: 300, useLocal: true, priority: 'high' as const },

  // Medium priority - semi-static data (30 minutes)
  CLASS_LIST: { ttl: 1800, useLocal: true, priority: 'medium' as const },
  STUDENT_LIST: { ttl: 1800, useLocal: true, priority: 'medium' as const },
  ASSIGNMENT_LIST: { ttl: 1800, useLocal: true, priority: 'medium' as const },

  // Low priority - static data (2 hours)
  SCHOOL_INFO: { ttl: 7200, useLocal: true, priority: 'low' as const },
  USER_PERMISSIONS: { ttl: 3600, useLocal: true, priority: 'low' as const },

  // Teacher-specific data
  TEACHER_DATA: { ttl: 900, useLocal: true, priority: 'high' as const },
  LESSON_PLANS: { ttl: 1800, useLocal: true, priority: 'medium' as const },
  BEHAVIORAL_NOTES: { ttl: 600, useLocal: true, priority: 'medium' as const },
  ATTENDANCE_DATA: { ttl: 300, useLocal: true, priority: 'high' as const },
} as const
