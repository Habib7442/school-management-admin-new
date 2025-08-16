'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { useAuthStore } from '@/lib/stores/auth-store'

export default function UnauthorizedPage() {
  const { user, logout } = useAuthStore()
  const router = useRouter()

  const handleGoBack = () => {
    if (user) {
      // Redirect based on user role
      switch (user.role) {
        case 'teacher':
          router.push('/dashboard')
          break
        case 'student':
          router.push('/student')
          break
        default:
          router.push('/')
      }
    } else {
      router.push('/')
    }
  }

  const handleSignOut = async () => {
    await logout()
    router.push('/login')
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-red-50 to-orange-50 p-4">
      <Card className="w-full max-w-md shadow-xl">
        <CardHeader className="text-center space-y-2">
          <div className="mx-auto w-16 h-16 bg-gradient-to-r from-red-500 to-orange-500 rounded-full flex items-center justify-center mb-4">
            <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          <CardTitle className="text-2xl font-bold text-red-600">
            Access Denied
          </CardTitle>
          <CardDescription className="text-lg">
            You don't have permission to access this page
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6 text-center">
          <div className="space-y-2">
            <p className="text-gray-600">
              This page is restricted to administrators only.
            </p>
            {user && (
              <p className="text-sm text-gray-500">
                You are currently signed in as: <span className="font-semibold">{user.name}</span> ({user.role})
              </p>
            )}
          </div>

          <div className="space-y-3">
            <Button
              onClick={handleGoBack}
              className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
            >
              Go to Dashboard
            </Button>
            
            <Button
              onClick={handleSignOut}
              variant="outline"
              className="w-full"
            >
              Sign Out
            </Button>
          </div>

          <div className="pt-4 border-t">
            <p className="text-xs text-gray-500">
              If you believe this is an error, please contact your system administrator.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
