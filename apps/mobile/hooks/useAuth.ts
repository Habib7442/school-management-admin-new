import { useEffect } from 'react'
import { router } from 'expo-router'
import { useAuthStore } from '@/lib/stores/auth-store'
import type { AuthUser, UserRole } from '@repo/types'

interface UseAuthOptions {
  redirectTo?: string
  redirectIfFound?: boolean
  requiredRole?: UserRole | UserRole[]
}

export function useAuth(options: UseAuthOptions = {}) {
  const {
    user,
    isLoading,
    isAuthenticated,
    login,
    register,
    logout,
    updateProfile,
    checkPermission,
    setLoading
  } = useAuthStore()

  useEffect(() => {
    if (isLoading) return

    const { redirectTo = '/(auth)/login', redirectIfFound = false, requiredRole } = options

    // Redirect if not authenticated and redirect is required
    if (!isAuthenticated && !redirectIfFound && redirectTo) {
      router.replace(redirectTo as any)
      return
    }

    // Redirect if authenticated and redirectIfFound is true
    if (isAuthenticated && redirectIfFound && redirectTo) {
      router.replace(redirectTo as any)
      return
    }

    // Check role requirements
    if (isAuthenticated && user && requiredRole) {
      const allowedRoles = Array.isArray(requiredRole) ? requiredRole : [requiredRole]
      if (!allowedRoles.includes(user.role)) {
        router.replace('/unauthorized' as any)
        return
      }
    }
  }, [isAuthenticated, isLoading, user, options])

  const signIn = async (email: string, password: string) => {
    const result = await login(email, password)
    if (!result.error && options.redirectTo) {
      router.replace(options.redirectTo as any)
    }
    return result
  }

  const signUp = async (email: string, password: string, name: string, role: UserRole = 'student') => {
    const result = await register(email, password, name, role)
    if (!result.error) {
      // Navigate to appropriate dashboard based on role
      if (role === 'teacher') {
        router.replace('/teacher-dashboard' as any)
      } else {
        router.replace('/student-dashboard' as any)
      }
    }
    return result
  }

  const signOut = async () => {
    await logout()
    router.replace('/(auth)/login' as any)
  }

  const updateUserProfile = async (updates: Partial<AuthUser>) => {
    return await updateProfile(updates)
  }

  const hasPermission = (resource: string, action: string) => {
    return checkPermission(resource, action)
  }

  const requireAuth = () => {
    if (!isAuthenticated) {
      router.replace('/(auth)/login' as any)
      return false
    }
    return true
  }

  const requireRole = (role: UserRole | UserRole[]) => {
    if (!requireAuth()) return false
    
    const allowedRoles = Array.isArray(role) ? role : [role]
    if (!user || !allowedRoles.includes(user.role)) {
      router.replace('/unauthorized' as any)
      return false
    }
    return true
  }

  const requirePermission = (resource: string, action: string) => {
    if (!requireAuth()) return false
    
    if (!hasPermission(resource, action)) {
      router.replace('/unauthorized' as any)
      return false
    }
    return true
  }

  // Mobile-specific utilities
  const navigateBasedOnRole = () => {
    if (!user) return

    switch (user.role) {
      case 'admin':
      case 'sub-admin':
        router.replace('/admin-dashboard' as any)
        break
      case 'teacher':
        router.replace('/teacher-dashboard' as any)
        break
      case 'student':
        router.replace('/student-dashboard' as any)
        break
      default:
        router.replace('/(tabs)' as any)
    }
  }

  const isTeacherOrAdmin = () => {
    return user && ['admin', 'sub-admin', 'teacher'].includes(user.role)
  }

  const isStudentOnly = () => {
    return user && user.role === 'student'
  }

  const canAccessAdminFeatures = () => {
    return user && ['admin', 'sub-admin'].includes(user.role)
  }

  return {
    // State
    user,
    isLoading,
    isAuthenticated,
    
    // Actions
    signIn,
    signUp,
    signOut,
    updateUserProfile,
    
    // Permission checks
    hasPermission,
    requireAuth,
    requireRole,
    requirePermission,
    
    // Mobile-specific utilities
    navigateBasedOnRole,
    isTeacherOrAdmin,
    isStudentOnly,
    canAccessAdminFeatures,
    
    // Utilities
    setLoading
  }
}

// Hook for protecting routes that require authentication
export function useRequireAuth(options: UseAuthOptions = {}) {
  return useAuth({
    redirectTo: '/(auth)/login',
    ...options
  })
}

// Hook for protecting teacher routes
export function useRequireTeacher() {
  return useAuth({
    redirectTo: '/(auth)/login',
    requiredRole: ['admin', 'sub-admin', 'teacher']
  })
}

// Hook for protecting student routes
export function useRequireStudent() {
  return useAuth({
    redirectTo: '/(auth)/login',
    requiredRole: 'student'
  })
}

// Hook for guest-only pages (login, register)
export function useGuestOnly() {
  return useAuth({
    redirectTo: '/(tabs)',
    redirectIfFound: true
  })
}

// Hook for role-based navigation
export function useRoleBasedNavigation() {
  const { user, isAuthenticated, navigateBasedOnRole } = useAuth()

  useEffect(() => {
    if (isAuthenticated && user) {
      navigateBasedOnRole()
    }
  }, [isAuthenticated, user, navigateBasedOnRole])

  return {
    user,
    isAuthenticated,
    navigateBasedOnRole
  }
}
