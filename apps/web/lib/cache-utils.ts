import { cache } from 'react'
import { supabase } from './supabase'

// React cache function for request memoization
// This ensures the same data request is only executed once per render cycle

export const getClassesData = cache(async (schoolId: string) => {
  console.log('🔄 Fetching classes data (memoized):', schoolId)
  
  const { data, error } = await supabase
    .from('classes')
    .select('*')
    .eq('school_id', schoolId)
    .order('grade_level', { ascending: true })
    .order('section', { ascending: true })

  if (error) throw error
  return data
})

export const getTeachersData = cache(async (schoolId: string) => {
  console.log('🔄 Fetching teachers data (memoized):', schoolId)
  
  const { data, error } = await supabase
    .from('profiles')
    .select('id, name, email')
    .eq('role', 'teacher')
    .eq('school_id', schoolId)
    .order('name')

  if (error) throw error
  return data
})

export const getSubjectsData = cache(async (schoolId: string) => {
  console.log('🔄 Fetching subjects data (memoized):', schoolId)
  
  const { data, error } = await supabase
    .from('subjects')
    .select('*')
    .eq('school_id', schoolId)
    .eq('is_active', true)
    .order('name')

  if (error) throw error
  return data
})

export const getEnrollmentCounts = cache(async (classIds: string[]) => {
  if (classIds.length === 0) return {}
  
  console.log('🔄 Fetching enrollment counts (memoized):', classIds.length, 'classes')
  
  const { data, error } = await supabase
    .from('class_enrollments')
    .select('class_id')
    .in('class_id', classIds)

  if (error) {
    console.warn('Could not fetch enrollment counts:', error)
    return {}
  }

  return (data || []).reduce((acc, enrollment) => {
    acc[enrollment.class_id] = (acc[enrollment.class_id] || 0) + 1
    return acc
  }, {} as Record<string, number>)
})

// Cache invalidation utilities
export const invalidateClassesCache = async (schoolId: string) => {
  try {
    const response = await fetch('/api/classes', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        action: 'revalidate',
        schoolId
      })
    })

    if (!response.ok) {
      throw new Error('Failed to invalidate cache')
    }

    console.log('✅ Classes cache invalidated successfully')
    return true
  } catch (error) {
    console.error('❌ Failed to invalidate classes cache:', error)
    return false
  }
}

// Client-side cache management
export class ClientCache {
  private static instance: ClientCache
  private cache = new Map<string, { data: any; timestamp: number; ttl: number }>()

  static getInstance(): ClientCache {
    if (!ClientCache.instance) {
      ClientCache.instance = new ClientCache()
    }
    return ClientCache.instance
  }

  set(key: string, data: any, ttl: number = 300000): void { // 5 minutes default
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl
    })
  }

  get(key: string): any | null {
    const item = this.cache.get(key)
    if (!item) return null

    const now = Date.now()
    if (now - item.timestamp > item.ttl) {
      this.cache.delete(key)
      return null
    }

    return item.data
  }

  invalidate(key: string): void {
    this.cache.delete(key)
  }

  invalidatePattern(pattern: string): void {
    for (const key of this.cache.keys()) {
      if (key.includes(pattern)) {
        this.cache.delete(key)
      }
    }
  }

  clear(): void {
    this.cache.clear()
  }

  getStats(): { size: number; keys: string[] } {
    return {
      size: this.cache.size,
      keys: Array.from(this.cache.keys())
    }
  }
}

// Export singleton instance
export const clientCache = ClientCache.getInstance()
