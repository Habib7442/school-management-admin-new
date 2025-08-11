'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useAuthStore } from '@/lib/stores/auth-store'
import { useErrorHandler } from '@/hooks/useErrorHandler'
import { toast } from 'sonner'
import type { UserRole } from '@repo/types'

export default function RegisterForm() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    role: 'sub-admin' as UserRole
  })
  const [showPassword, setShowPassword] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const { register: signUp, isLoading } = useAuthStore()
  const { handleError, showErrorToast } = useErrorHandler()
  const router = useRouter()

  // Form validation
  const validateForm = () => {
    if (!formData.name.trim()) {
      toast.error('Full name is required')
      return false
    }

    if (formData.name.trim().length < 2) {
      toast.error('Name must be at least 2 characters long')
      return false
    }

    if (!formData.email.trim()) {
      toast.error('Email is required')
      return false
    }

    if (!formData.email.includes('@')) {
      toast.error('Please enter a valid email address')
      return false
    }

    if (!formData.password) {
      toast.error('Password is required')
      return false
    }

    if (formData.password.length < 8) {
      toast.error('Password must be at least 8 characters long')
      return false
    }

    if (!formData.confirmPassword) {
      toast.error('Please confirm your password')
      return false
    }

    if (formData.password !== formData.confirmPassword) {
      toast.error('Passwords do not match')
      return false
    }

    return true
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    // Prevent double submission
    if (isSubmitting || isLoading) {
      return
    }

    // Validate form
    if (!validateForm()) {
      return
    }

    setIsSubmitting(true)

    try {
      const result = await signUp(
        formData.email.trim().toLowerCase(),
        formData.password,
        formData.name.trim(),
        formData.role
      )

      if (result.error) {
        // Error is already handled by the store with toast notifications
        console.error('Registration failed:', result.error)
      } else if (result.requiresEmailConfirmation) {
        // Email confirmation required
        toast.success('Registration successful!', {
          description: 'Please check your email to verify your account before signing in.',
          duration: 8000
        })

        // Redirect to login after a delay
        setTimeout(() => {
          router.push('/login')
        }, 3000)
      } else {
        // Registration successful and auto-signed in
        toast.success('Welcome!', {
          description: 'Your account has been created. Setting up your school...',
          duration: 3000
        })

        // Clear form
        setFormData({
          name: '',
          email: '',
          password: '',
          confirmPassword: '',
          role: 'sub-admin' as UserRole
        })

        // Redirect to onboarding for new admin users
        setTimeout(() => {
          const currentUser = useAuthStore.getState().user

          if (currentUser && (currentUser.role === 'admin' || currentUser.role === 'sub-admin')) {
            // New admin users need to complete onboarding
            router.push('/onboarding')
          } else {
            // Other users go to appropriate dashboard
            router.push('/dashboard')
          }
        }, 1500)
      }
    } catch (err: unknown) {
      // Handle unexpected errors
      const appError = handleError(err, 'RegisterForm.handleSubmit')
      showErrorToast(appError)
    } finally {
      setIsSubmitting(false)
    }
  }

  // Handle keyboard shortcuts
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !isSubmitting && !isLoading) {
      handleSubmit(e as React.FormEvent)
    }
  }

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-purple-50 p-4">
      <Card className="w-full max-w-md shadow-xl">
        <CardHeader className="text-center space-y-2">
          <CardTitle className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
            Create Admin Account
          </CardTitle>
          <CardDescription className="text-lg">
            Create an administrator account for the school management system
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4" onKeyDown={handleKeyDown}>
            <div className="space-y-2">
              <Label htmlFor="name">Full Name</Label>
              <Input
                id="name"
                type="text"
                placeholder="Enter your full name"
                value={formData.name}
                onChange={(e) => handleInputChange('name', e.target.value)}
                disabled={isSubmitting || isLoading}
                required
                className="w-full"
                autoComplete="name"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="Enter your email"
                value={formData.email}
                onChange={(e) => handleInputChange('email', e.target.value)}
                disabled={isSubmitting || isLoading}
                required
                className="w-full"
                autoComplete="email"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="role">Role</Label>
              <select
                id="role"
                value={formData.role}
                onChange={(e) => handleInputChange('role', e.target.value)}
                disabled={isSubmitting || isLoading}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
                required
              >
                <option value="sub-admin">Sub Administrator</option>
                <option value="admin">Administrator</option>
              </select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Enter your password (min 8 characters)"
                  value={formData.password}
                  onChange={(e) => handleInputChange('password', e.target.value)}
                  disabled={isSubmitting || isLoading}
                  required
                  className="w-full pr-10"
                  minLength={8}
                  autoComplete="new-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  disabled={isSubmitting || isLoading}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700 disabled:opacity-50"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? '🙈' : '👁️'}
                </button>
              </div>
              <div className="text-xs text-gray-500">
                Password must contain at least 8 characters with uppercase, lowercase, number, and special character
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirm Password</Label>
              <Input
                id="confirmPassword"
                type="password"
                placeholder="Confirm your password"
                value={formData.confirmPassword}
                onChange={(e) => handleInputChange('confirmPassword', e.target.value)}
                disabled={isSubmitting || isLoading}
                required
                className="w-full"
                minLength={8}
                autoComplete="new-password"
              />
            </div>

            <Button
              type="submit"
              disabled={isSubmitting || isLoading}
              className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting || isLoading ? (
                <div className="flex items-center space-x-2">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  <span>Creating account...</span>
                </div>
              ) : (
                'Create Admin Account'
              )}
            </Button>
          </form>
          
          <div className="mt-6 text-center space-y-4">
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-300"></div>
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-white text-gray-500">Already have an account?</span>
              </div>
            </div>
            
            <Link
              href="/login"
              className="inline-flex items-center justify-center w-full px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 transition-colors"
            >
              Sign In
            </Link>
          </div>
          
          <div className="mt-6 text-center">
            <p className="text-xs text-gray-500">
              By creating an account, you agree to our terms of service
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
