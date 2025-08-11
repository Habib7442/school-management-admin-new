import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/lib/stores/auth-store'

export function useGuestOnly() {
  const { isAuthenticated, user, isLoading } = useAuthStore()
  const router = useRouter()

  useEffect(() => {
    if (!isLoading && isAuthenticated && user) {
      // Redirect authenticated users to admin panel (only admin roles allowed)
      switch (user.role) {
        case 'admin':
        case 'sub-admin':
          router.push('/admin')
          break
        default:
          // Unauthorized role - redirect to home
          router.push('/')
          break
      }
    }
  }, [isAuthenticated, user, isLoading, router])

  return {
    isAuthenticated,
    user,
    isLoading
  }
}
