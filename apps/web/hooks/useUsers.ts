import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from './useAuth'
import type { AuthUser, UserRole } from '@repo/types'

interface UseUsersOptions {
  role?: UserRole
  limit?: number
  autoFetch?: boolean
}

interface CreateUserData {
  name: string
  email: string
  password: string
  role: UserRole
  phone?: string
}

interface UpdateUserData {
  name?: string
  email?: string
  role?: UserRole
  phone?: string
  avatar_url?: string
}

export function useUsers(options: UseUsersOptions = {}) {
  const [users, setUsers] = useState<AuthUser[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const { hasPermission } = useAuth()

  const { role, limit, autoFetch = true } = options

  const fetchUsers = useCallback(async () => {
    if (!hasPermission('users', 'read')) {
      setError('Permission denied')
      return
    }

    setLoading(true)
    setError(null)

    try {
      let query = supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false })

      if (role) {
        query = query.eq('role', role)
      }

      if (limit) {
        query = query.limit(limit)
      }

      const { data, error: fetchError } = await query

      if (fetchError) throw fetchError

      setUsers(data || [])
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch users'
      setError(errorMessage)
      console.error('Error fetching users:', err)
    } finally {
      setLoading(false)
    }
  }, [role, limit, hasPermission])

  const createUser = async (userData: CreateUserData) => {
    if (!hasPermission('users', 'create')) {
      throw new Error('Permission denied')
    }

    setLoading(true)
    setError(null)

    try {
      // Create user in Supabase Auth with proper metadata
      const { data: authData, error: authError } = await supabase.auth.admin.createUser({
        email: userData.email,
        password: userData.password,
        user_metadata: {
          name: userData.name,
          full_name: userData.name,
          role: userData.role,
          phone: userData.phone
        },
        email_confirm: true
      })

      if (authError) throw authError

      // The profile will be created automatically via the trigger
      // Wait a moment for the trigger to complete
      await new Promise(resolve => setTimeout(resolve, 1000))

      // Refresh the users list
      await fetchUsers()

      return { data: authData.user, error: null }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to create user'
      setError(errorMessage)
      return { data: null, error: errorMessage }
    } finally {
      setLoading(false)
    }
  }

  const updateUser = async (userId: string, updates: UpdateUserData) => {
    if (!hasPermission('users', 'update')) {
      throw new Error('Permission denied')
    }

    setLoading(true)
    setError(null)

    try {
      const { data, error: updateError } = await supabase
        .from('profiles')
        .update(updates)
        .eq('id', userId)
        .select()
        .single()

      if (updateError) throw updateError

      // Update local state
      setUsers(prevUsers =>
        prevUsers.map(user =>
          user.id === userId ? { ...user, ...data } : user
        )
      )

      return { data, error: null }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update user'
      setError(errorMessage)
      return { data: null, error: errorMessage }
    } finally {
      setLoading(false)
    }
  }

  const deleteUser = async (userId: string) => {
    if (!hasPermission('users', 'delete')) {
      throw new Error('Permission denied')
    }

    setLoading(true)
    setError(null)

    try {
      // Delete from auth (this will cascade to profiles via trigger)
      const { error: deleteError } = await supabase.auth.admin.deleteUser(userId)

      if (deleteError) throw deleteError

      // Update local state
      setUsers(prevUsers => prevUsers.filter(user => user.id !== userId))

      return { error: null }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to delete user'
      setError(errorMessage)
      return { error: errorMessage }
    } finally {
      setLoading(false)
    }
  }

  const getUserById = (userId: string) => {
    return users.find(user => user.id === userId)
  }

  const getUsersByRole = (role: UserRole) => {
    return users.filter(user => user.role === role)
  }

  const searchUsers = (searchTerm: string) => {
    const term = searchTerm.toLowerCase()
    return users.filter(user =>
      user.name.toLowerCase().includes(term) ||
      user.email.toLowerCase().includes(term)
    )
  }

  const getUserStats = () => {
    const stats = {
      total: users.length,
      admin: 0,
      'sub-admin': 0,
      teacher: 0,
      student: 0
    }

    users.forEach(user => {
      stats[user.role]++
    })

    return stats
  }

  // Auto-fetch on mount if enabled
  useEffect(() => {
    if (autoFetch) {
      fetchUsers()
    }
  }, [autoFetch, fetchUsers])

  return {
    // State
    users,
    loading,
    error,

    // Actions
    fetchUsers,
    createUser,
    updateUser,
    deleteUser,

    // Utilities
    getUserById,
    getUsersByRole,
    searchUsers,
    getUserStats,

    // Computed
    totalUsers: users.length,
    hasUsers: users.length > 0
  }
}

// Specialized hook for managing students
export function useStudents() {
  return useUsers({ role: 'student' })
}

// Specialized hook for managing teachers
export function useTeachers() {
  return useUsers({ role: 'teacher' })
}

// Hook for getting recent users
export function useRecentUsers(limit: number = 5) {
  return useUsers({ limit, autoFetch: true })
}
