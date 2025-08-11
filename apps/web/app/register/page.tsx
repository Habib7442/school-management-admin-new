'use client'

import RegisterForm from '@/components/auth/RegisterForm'
import { useGuestOnly } from '@/hooks/useGuestOnly'

export default function RegisterPage() {
  const { isLoading } = useGuestOnly()

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

  return <RegisterForm />
}
