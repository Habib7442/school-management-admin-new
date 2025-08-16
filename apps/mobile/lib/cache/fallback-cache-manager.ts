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
  }> {
    try {
      const allKeys = await AsyncStorage.getAllKeys()
      const cacheKeys = allKeys.filter(key => key.startsWith(this.keyPrefix))
      
      return {
        totalKeys: cacheKeys.length,
        cacheSize: `${cacheKeys.length} items`,
        isOnline: this.isOnline,
      }
    } catch (error) {
      console.error('Get stats error:', error)
      return {
        totalKeys: 0,
        cacheSize: '0 items',
        isOnline: this.isOnline,
      }
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
} as const
