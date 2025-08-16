'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useAuthStore } from '@/lib/stores/auth-store'
import { useErrorHandler } from '@/hooks/useErrorHandler'
import { toast } from 'sonner'

export default function LoginForm() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [rememberMe, setRememberMe] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const { login, isLoading } = useAuthStore()
  const { handleError, showErrorToast } = useErrorHandler()
  const router = useRouter()

  // Form validation
  const validateForm = () => {
    if (!email.trim()) {
      toast.error('Email is required')
      return false
    }

    if (!email.includes('@')) {
      toast.error('Please enter a valid email address')
      return false
    }

    if (!password) {
      toast.error('Password is required')
      return false
    }

    if (password.length < 6) {
      toast.error('Password must be at least 6 characters')
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
      const result = await login(email.trim().toLowerCase(), password)

      if (result.error) {
        // Error is already handled by the store with toast notifications
        console.error('Login failed:', result.error)
      } else {
        // Success - clear form and redirect
        setEmail('')
        setPassword('')

        // Show success message
        toast.success('Login successful!', {
          description: 'Redirecting to your dashboard...',
          duration: 2000
        })

        // Wait a moment for the toast, then redirect
        setTimeout(() => {
          // Get the current user to determine redirect path
          const currentUser = useAuthStore.getState().user

          if (currentUser) {
            // Redirect based on role and onboarding status
            if ((currentUser.role === 'admin' || currentUser.role === 'sub-admin')) {
              if (!currentUser.onboarding_completed) {
                router.push('/onboarding')
              } else {
                router.push('/admin')
              }
            } else if (currentUser.role === 'teacher') {
              router.push('/dashboard')
            } else if (currentUser.role === 'student') {
              router.push('/student')
            } else {
              router.push('/dashboard')
            }
          } else {
            // Fallback redirect
            router.push('/dashboard')
          }
        }, 1000)
      }
    } catch (err: any) {
      // Handle unexpected errors
      const appError = handleError(err, 'LoginForm.handleSubmit')
      showErrorToast(appError)
    } finally {
      setIsSubmitting(false)
    }
  }

  // Handle keyboard shortcuts
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !isSubmitting && !isLoading) {
      handleSubmit(e as any)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-purple-50 p-4">
      <Card className="w-full max-w-md shadow-xl">
        <CardHeader className="text-center space-y-2">
          <CardTitle className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
            School Management
          </CardTitle>
          <CardDescription className="text-lg">
            Sign in to your account
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4" onKeyDown={handleKeyDown}>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="Enter your email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={isSubmitting || isLoading}
                required
                className="w-full"
                autoComplete="email"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={isSubmitting || isLoading}
                  required
                  className="w-full pr-10"
                  autoComplete="current-password"
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
            </div>

            <div className="flex items-center space-x-2">
              <input
                id="remember-me"
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                disabled={isSubmitting || isLoading}
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <Label htmlFor="remember-me" className="text-sm text-gray-600">
                Remember me for 30 days
              </Label>
            </div>

            <Button
              type="submit"
              disabled={isSubmitting || isLoading}
              className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting || isLoading ? (
                <div className="flex items-center space-x-2">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  <span>Signing in...</span>
                </div>
              ) : (
                'Sign In'
              )}
            </Button>
          </form>
          
          <div className="mt-6 text-center space-y-4">
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-300"></div>
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-white text-gray-500">Don't have an account?</span>
              </div>
            </div>
            
            <Link
              href="/register"
              className="inline-flex items-center justify-center w-full px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 transition-colors"
            >
              Create Account
            </Link>
          </div>
          
          <div className="mt-6 text-center">
            <p className="text-xs text-gray-500">
              Secure authentication powered by Supabase
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
