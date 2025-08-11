'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/lib/stores/auth-store'
import SchoolSetupForm from '@/components/onboarding/SchoolSetupForm'

export default function OnboardingPage() {
  const { user, isLoading } = useAuthStore()
  const router = useRouter()

  useEffect(() => {
    if (!isLoading) {
      // Redirect if not authenticated
      if (!user) {
        router.push('/login')
        return
      }

      // Redirect if not admin/sub-admin
      if (!['admin', 'sub-admin'].includes(user.role)) {
        router.push('/')
        return
      }

      // Redirect if onboarding already completed
      if (user.onboarding_completed) {
        router.push('/admin')
        return
      }
    }
  }, [user, isLoading, router])

  // Show loading state
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-purple-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    )
  }

  // Show onboarding form for eligible users
  if (user && ['admin', 'sub-admin'].includes(user.role) && !user.onboarding_completed) {
    return <SchoolSetupForm />
  }

  // Fallback loading state
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-purple-50">
      <div className="text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
        <p className="text-gray-600">Redirecting...</p>
      </div>
    </div>
  )
}
