import { useState, useEffect, useCallback } from 'react'
import { Alert } from 'react-native'
import { supabase } from '@/lib/supabase'
import { useAuth } from './useAuth'
import type { AuthUser, UserRole } from '@repo/types'

interface UseUsersOptions {
  role?: UserRole
  limit?: number
  autoFetch?: boolean
  enableOffline?: boolean
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
  const [refreshing, setRefreshing] = useState(false)
  const { hasPermission } = useAuth()

  const { role, limit, autoFetch = true, enableOffline = true } = options

  const fetchUsers = useCallback(async (isRefresh = false) => {
    if (!hasPermission('users', 'read')) {
      setError('Permission denied')
      return
    }

    if (isRefresh) {
      setRefreshing(true)
    } else {
      setLoading(true)
    }
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
      
      // Show mobile-friendly error
      Alert.alert('Error', errorMessage)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [role, limit, hasPermission])

  const createUser = async (userData: CreateUserData) => {
    if (!hasPermission('users', 'create')) {
      Alert.alert('Permission Denied', 'You do not have permission to create users')
      return { data: null, error: 'Permission denied' }
    }

    setLoading(true)
    setError(null)

    try {
      // Create user in Supabase Auth
      const { data: authData, error: authError } = await supabase.auth.admin.createUser({
        email: userData.email,
        password: userData.password,
        user_metadata: {
          name: userData.name,
          role: userData.role,
          phone: userData.phone
        },
        email_confirm: true
      })

      if (authError) throw authError

      // Refresh the users list
      await fetchUsers()

      Alert.alert('Success', 'User created successfully')
      return { data: authData.user, error: null }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to create user'
      setError(errorMessage)
      Alert.alert('Error', errorMessage)
      return { data: null, error: errorMessage }
    } finally {
      setLoading(false)
    }
  }

  const updateUser = async (userId: string, updates: UpdateUserData) => {
    if (!hasPermission('users', 'update')) {
      Alert.alert('Permission Denied', 'You do not have permission to update users')
      return { data: null, error: 'Permission denied' }
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

      Alert.alert('Success', 'User updated successfully')
      return { data, error: null }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update user'
      setError(errorMessage)
      Alert.alert('Error', errorMessage)
      return { data: null, error: errorMessage }
    } finally {
      setLoading(false)
    }
  }

  const deleteUser = async (userId: string) => {
    if (!hasPermission('users', 'delete')) {
      Alert.alert('Permission Denied', 'You do not have permission to delete users')
      return { error: 'Permission denied' }
    }

    return new Promise<{ error: string | null }>((resolve) => {
      Alert.alert(
        'Confirm Delete',
        'Are you sure you want to delete this user? This action cannot be undone.',
        [
          {
            text: 'Cancel',
            style: 'cancel',
            onPress: () => resolve({ error: 'Cancelled' })
          },
          {
            text: 'Delete',
            style: 'destructive',
            onPress: async () => {
              setLoading(true)
              setError(null)

              try {
                // Delete from auth (this will cascade to profiles via trigger)
                const { error: deleteError } = await supabase.auth.admin.deleteUser(userId)

                if (deleteError) throw deleteError

                // Update local state
                setUsers(prevUsers => prevUsers.filter(user => user.id !== userId))

                Alert.alert('Success', 'User deleted successfully')
                resolve({ error: null })
              } catch (err) {
                const errorMessage = err instanceof Error ? err.message : 'Failed to delete user'
                setError(errorMessage)
                Alert.alert('Error', errorMessage)
                resolve({ error: errorMessage })
              } finally {
                setLoading(false)
              }
            }
          }
        ]
      )
    })
  }

  const refreshUsers = async () => {
    await fetchUsers(true)
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
    refreshing,

    // Actions
    fetchUsers,
    refreshUsers,
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

// Hook for getting recent users with mobile optimizations
export function useRecentUsers(limit: number = 5) {
  return useUsers({ 
    limit, 
    autoFetch: true,
    enableOffline: true 
  })
}
