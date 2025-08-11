'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/lib/stores/auth-store'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import type { UserRole } from '@repo/types'

interface AuthGuardProps {
  children: React.ReactNode
  requiredRoles?: UserRole[]
  fallbackPath?: string
  showUnauthorized?: boolean
}

export function AuthGuard({ 
  children, 
  requiredRoles = [], 
  fallbackPath = '/login',
  showUnauthorized = true 
}: AuthGuardProps) {
  const [isInitialized, setIsInitialized] = useState(false)
  const { user, isLoading, isAuthenticated } = useAuthStore()
  const router = useRouter()

  useEffect(() => {
    const initializeAuth = async () => {
      try {
        // Import dynamically to avoid SSR issues
        const { initializeAuth } = await import('@/lib/stores/auth-store')
        await initializeAuth()
      } catch (error) {
        console.error('Auth initialization error:', error)
      } finally {
        setIsInitialized(true)
      }
    }

    // Only initialize if not already done
    if (!isInitialized) {
      initializeAuth()
    }
  }, [isInitialized])

  useEffect(() => {
    if (!isInitialized || isLoading) return

    // Redirect if not authenticated
    if (!isAuthenticated) {
      router.push(fallbackPath)
      return
    }

    // Check role requirements
    if (requiredRoles.length > 0 && user && !requiredRoles.includes(user.role)) {
      if (showUnauthorized) {
        router.push('/unauthorized')
      } else {
        router.push(fallbackPath)
      }
      return
    }
  }, [isInitialized, isLoading, isAuthenticated, user, requiredRoles, router, fallbackPath, showUnauthorized])

  // Show loading state
  if (!isInitialized || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Card className="p-8 max-w-md w-full text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </Card>
      </div>
    )
  }

  // Show unauthorized if user doesn't have required role
  if (requiredRoles.length > 0 && user && !requiredRoles.includes(user.role)) {
    if (!showUnauthorized) return null
    
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Card className="p-8 max-w-md w-full text-center">
          <h1 className="text-2xl font-bold text-red-600 mb-4">Access Denied</h1>
          <p className="text-gray-600 mb-6">You don't have permission to access this page.</p>
          <Button onClick={() => router.push('/')} className="w-full">
            Go to Home
          </Button>
        </Card>
      </div>
    )
  }

  // Show content if authenticated and authorized
  if (isAuthenticated && (requiredRoles.length === 0 || (user && requiredRoles.includes(user.role)))) {
    return <>{children}</>
  }

  // Fallback - should not reach here
  return null
}

// Convenience components for common use cases
export function AdminGuard({ children }: { children: React.ReactNode }) {
  return (
    <AuthGuard requiredRoles={['admin', 'sub-admin']}>
      {children}
    </AuthGuard>
  )
}

export function TeacherGuard({ children }: { children: React.ReactNode }) {
  return (
    <AuthGuard requiredRoles={['admin', 'sub-admin', 'teacher']}>
      {children}
    </AuthGuard>
  )
}

export function StudentGuard({ children }: { children: React.ReactNode }) {
  return (
    <AuthGuard requiredRoles={['student']}>
      {children}
    </AuthGuard>
  )
}
