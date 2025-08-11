import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
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
  
  const router = useRouter()

  useEffect(() => {
    if (isLoading) return

    const { redirectTo = '/login', redirectIfFound = false, requiredRole } = options

    // Prevent redirect loops by checking current pathname
    const currentPath = window.location.pathname

    // Redirect if not authenticated and redirect is required
    if (!isAuthenticated && !redirectIfFound && redirectTo && currentPath !== redirectTo) {
      router.push(redirectTo)
      return
    }

    // Redirect if authenticated and redirectIfFound is true
    if (isAuthenticated && redirectIfFound && redirectTo && currentPath !== redirectTo) {
      router.push(redirectTo)
      return
    }

    // Check role requirements
    if (isAuthenticated && user && requiredRole) {
      const allowedRoles = Array.isArray(requiredRole) ? requiredRole : [requiredRole]
      if (!allowedRoles.includes(user.role) && currentPath !== '/unauthorized') {
        router.push('/unauthorized')
        return
      }
    }
  }, [isAuthenticated, isLoading, user, router, options])

  const signIn = async (email: string, password: string) => {
    const result = await login(email, password)
    // Don't redirect here - let the main page handle redirects
    // This prevents redirect loops
    return result
  }

  const signUp = async (email: string, password: string, name: string, role: UserRole = 'student') => {
    const result = await register(email, password, name, role)
    if (!result.error) {
      // Redirect to login or verification page
      router.push('/login?message=Please check your email to verify your account')
    }
    return result
  }

  const signOut = async () => {
    await logout()
    router.push('/login')
  }

  const updateUserProfile = async (updates: Partial<AuthUser>) => {
    return await updateProfile(updates)
  }

  const hasPermission = (resource: string, action: string) => {
    return checkPermission(resource, action)
  }

  const requireAuth = () => {
    if (!isAuthenticated) {
      router.push('/login')
      return false
    }
    return true
  }

  const requireRole = (role: UserRole | UserRole[]) => {
    if (!requireAuth()) return false
    
    const allowedRoles = Array.isArray(role) ? role : [role]
    if (!user || !allowedRoles.includes(user.role)) {
      router.push('/unauthorized')
      return false
    }
    return true
  }

  const requirePermission = (resource: string, action: string) => {
    if (!requireAuth()) return false
    
    if (!hasPermission(resource, action)) {
      router.push('/unauthorized')
      return false
    }
    return true
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
    
    // Utilities
    setLoading
  }
}

// Hook for protecting routes that require authentication
export function useRequireAuth(options: UseAuthOptions = {}) {
  return useAuth({
    redirectTo: '/login',
    ...options
  })
}

// Hook for protecting admin routes
export function useRequireAdmin() {
  return useAuth({
    redirectTo: '/login',
    requiredRole: ['admin', 'sub-admin']
  })
}

// Hook for protecting teacher routes
export function useRequireTeacher() {
  return useAuth({
    redirectTo: '/login',
    requiredRole: ['admin', 'sub-admin', 'teacher']
  })
}

// Hook for guest-only pages (login, register)
export function useGuestOnly() {
  return useAuth({
    redirectTo: '/dashboard',
    redirectIfFound: true
  })
}
