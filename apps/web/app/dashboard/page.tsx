'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { useAuthStore } from '@/lib/stores/auth-store'

export default function DashboardPage() {
  const { user, isAuthenticated, isLoading, logout } = useAuthStore()
  const router = useRouter()

  useEffect(() => {
    // Redirect if not authenticated
    if (!isLoading && !isAuthenticated) {
      router.push('/login')
      return
    }

    // Redirect admin/sub-admin users to admin panel
    if (!isLoading && isAuthenticated && user) {
      if (user.role === 'admin' || user.role === 'sub-admin') {
        if (!user.onboarding_completed) {
          router.push('/onboarding')
        } else {
          router.push('/admin')
        }
        return
      }
    }
  }, [isAuthenticated, isLoading, user, router])

  const handleSignOut = async () => {
    await logout()
    router.push('/login')
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600 text-lg">Loading dashboard...</p>
          <p className="text-gray-500 text-sm mt-2">Please wait while we prepare your workspace</p>
        </div>
      </div>
    )
  }

  if (!isAuthenticated || !user) {
    return null
  }

  // Get role-specific dashboard info
  const getDashboardInfo = () => {
    switch (user.role) {
      case 'teacher':
        return {
          title: 'Teacher Dashboard',
          description: `Welcome back, ${user.name}! Manage your classes and students.`,
          roleColor: 'from-green-600 to-emerald-600'
        }
      case 'student':
        return {
          title: 'Student Dashboard',
          description: `Welcome back, ${user.name}! Access your courses and assignments.`,
          roleColor: 'from-blue-600 to-indigo-600'
        }
      default:
        return {
          title: 'Dashboard',
          description: `Welcome back, ${user.name}!`,
          roleColor: 'from-purple-600 to-pink-600'
        }
    }
  }

  const dashboardInfo = getDashboardInfo()

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 p-4">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className={`text-3xl font-bold bg-gradient-to-r ${dashboardInfo.roleColor} bg-clip-text text-transparent`}>
              {dashboardInfo.title}
            </h1>
            <p className="text-gray-600 mt-1">{dashboardInfo.description}</p>
          </div>
          <Button 
            onClick={handleSignOut}
            variant="outline"
            className="border-gray-300 hover:bg-gray-50"
          >
            Sign Out
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <Card className="shadow-lg border-0 bg-white/80 backdrop-blur-sm">
            <CardHeader className="pb-3">
              <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-blue-600 rounded-lg flex items-center justify-center mb-2">
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
                </svg>
              </div>
              <CardTitle className="text-lg">Students</CardTitle>
              <CardDescription>Manage student records</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-blue-600">1,234</p>
              <p className="text-sm text-gray-500">Total enrolled</p>
            </CardContent>
          </Card>

          <Card className="shadow-lg border-0 bg-white/80 backdrop-blur-sm">
            <CardHeader className="pb-3">
              <div className="w-10 h-10 bg-gradient-to-r from-green-500 to-green-600 rounded-lg flex items-center justify-center mb-2">
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                </svg>
              </div>
              <CardTitle className="text-lg">Teachers</CardTitle>
              <CardDescription>Faculty management</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-green-600">89</p>
              <p className="text-sm text-gray-500">Active teachers</p>
            </CardContent>
          </Card>

          <Card className="shadow-lg border-0 bg-white/80 backdrop-blur-sm">
            <CardHeader className="pb-3">
              <div className="w-10 h-10 bg-gradient-to-r from-purple-500 to-purple-600 rounded-lg flex items-center justify-center mb-2">
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                </svg>
              </div>
              <CardTitle className="text-lg">Classes</CardTitle>
              <CardDescription>Course management</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-purple-600">45</p>
              <p className="text-sm text-gray-500">Active classes</p>
            </CardContent>
          </Card>
        </div>

        <Card className="shadow-lg border-0 bg-white/80 backdrop-blur-sm">
          <CardHeader>
            <CardTitle>Account Information</CardTitle>
            <CardDescription>Your profile details</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex justify-between">
              <span className="text-gray-600">Email:</span>
              <span className="font-medium">{user.email}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Name:</span>
              <span className="font-medium">{user.name || 'Not provided'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Role:</span>
              <span className="font-medium capitalize">{user.role}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Account created:</span>
              <span className="font-medium">{new Date(user.created_at).toLocaleDateString()}</span>
            </div>
            {user.school_id && (
              <div className="flex justify-between">
                <span className="text-gray-600">School ID:</span>
                <span className="font-medium">{user.school_id}</span>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
