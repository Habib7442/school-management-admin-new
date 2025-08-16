import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { supabase } from '../supabase'
import { toast } from 'sonner'
import type { AuthStore, AuthUser, UserRole, AuthResult } from '@repo/types'

// Helper function to safely extract error message
const getErrorMessage = (error: unknown): string => {
  if (error instanceof Error) {
    return error.message
  }
  if (typeof error === 'string') {
    return error
  }
  if (error && typeof error === 'object' && 'message' in error) {
    return String(error.message)
  }
  return 'An unexpected error occurred'
}

// Enhanced security configuration
const SECURITY_CONFIG = {
  maxFailedAttempts: 5,
  lockoutDuration: 15, // minutes
  sessionTimeout: 60, // minutes
  passwordMinLength: 6,
  retryAttempts: 3,
  retryDelay: 1000, // milliseconds
}

// Rate limiting storage (in production, use Redis or database)
const rateLimitStore = new Map<string, { attempts: number; resetTime: Date }>()

// Password validation utility
const validatePassword = (password: string) => {
  const errors: string[] = []
  let score = 0

  if (password.length < SECURITY_CONFIG.passwordMinLength) {
    errors.push(`Password must be at least ${SECURITY_CONFIG.passwordMinLength} characters long`)
  } else {
    score += 1
  }

  if (!/[A-Z]/.test(password)) {
    errors.push('Password must contain at least one uppercase letter')
  } else {
    score += 1
  }

  if (!/[a-z]/.test(password)) {
    errors.push('Password must contain at least one lowercase letter')
  } else {
    score += 1
  }

  if (!/\d/.test(password)) {
    errors.push('Password must contain at least one number')
  } else {
    score += 1
  }

  if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
    errors.push('Password must contain at least one special character')
  } else {
    score += 1
  }

  const strength = score < 3 ? 'weak' : score < 5 ? 'medium' : 'strong'

  return {
    isValid: errors.length === 0,
    errors,
    strength,
    score
  }
}

// Retry mechanism for failed requests
const withRetry = async <T>(
  operation: () => Promise<T>,
  maxAttempts: number = SECURITY_CONFIG.retryAttempts,
  delay: number = SECURITY_CONFIG.retryDelay
): Promise<T> => {
  let lastError: unknown

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await operation()
    } catch (error: unknown) {
      lastError = error

      // Don't retry on certain errors
      const errorMsg = getErrorMessage(error)
      const hasStatus = error && typeof error === 'object' && 'status' in error
      const statusCode = hasStatus ? (error as { status: number }).status : null

      if (errorMsg.includes('invalid_credentials') ||
          errorMsg.includes('email_already_registered') ||
          statusCode === 429) {
        throw error
      }

      if (attempt < maxAttempts) {
        await new Promise(resolve => setTimeout(resolve, delay * attempt))
      }
    }
  }

  throw lastError
}

export const useAuthStore = create<AuthStore>()(
  persist(
    (set, get) => ({
      // State
      user: null,
      isLoading: false,
      isAuthenticated: false,
      permissions: {},

      // Actions
      setUser: (user: AuthUser | null) => {
        set({
          user,
          isAuthenticated: !!user,
          permissions: user ? getUserPermissions(user.role) : {},
          isLoading: false, // Always set loading to false when setting user
        })
      },

      setLoading: (loading: boolean) => {
        set({ isLoading: loading })
      },

      login: async (email: string, password: string): Promise<{ error?: string }> => {
        // Check rate limiting
        const rateLimitKey = `login_${email}`
        const rateLimit = rateLimitStore.get(rateLimitKey)

        if (rateLimit && rateLimit.attempts >= SECURITY_CONFIG.maxFailedAttempts) {
          if (new Date() < rateLimit.resetTime) {
            const remainingTime = Math.ceil((rateLimit.resetTime.getTime() - Date.now()) / 60000)
            const errorMsg = `Account temporarily locked. Try again in ${remainingTime} minutes.`
            toast.error(errorMsg)
            return { error: errorMsg }
          } else {
            // Reset rate limit
            rateLimitStore.delete(rateLimitKey)
          }
        }

        set({ isLoading: true })
        const loadingToast = toast.loading('Signing in...', { duration: Infinity })

        try {
          const result = await withRetry(async () => {
            const { data, error } = await supabase.auth.signInWithPassword({
              email,
              password,
            })

            if (error) {
              throw error
            }

            return data
          })

          if (result.user) {
            // Fetch user profile with retry
            const profile = await withRetry(async () => {
              const { data: profile, error: profileError } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', result.user.id)
                .single()

              if (profileError) {
                throw new Error('Failed to fetch user profile')
              }

              return profile
            })

            // Clear rate limiting on successful login
            rateLimitStore.delete(rateLimitKey)

            get().setUser(profile)

            // Update last sign in
            await supabase
              .from('profiles')
              .update({ last_sign_in_at: new Date().toISOString() })
              .eq('id', result.user.id)

            toast.dismiss(loadingToast)
            toast.success('Welcome back!', {
              description: `Signed in as ${profile.name}`,
              duration: 3000
            })

            // Log security event
            console.log('Security Event: Login Success', {
              userId: result.user.id,
              email: result.user.email,
              timestamp: new Date().toISOString(),
              userAgent: navigator.userAgent
            })
          }

          set({ isLoading: false })
          return {}
        } catch (err: unknown) {
          set({ isLoading: false })
          toast.dismiss(loadingToast)

          // Record failed attempt
          const currentRateLimit = rateLimitStore.get(rateLimitKey) || { attempts: 0, resetTime: new Date() }
          currentRateLimit.attempts += 1
          currentRateLimit.resetTime = new Date(Date.now() + SECURITY_CONFIG.lockoutDuration * 60000)
          rateLimitStore.set(rateLimitKey, currentRateLimit)

          // Parse error message for user-friendly display
          const errorMsg = getErrorMessage(err)
          let errorMessage = 'An unexpected error occurred'

          if (errorMsg.includes('Invalid login credentials')) {
            errorMessage = 'Invalid email or password'
          } else if (errorMsg.includes('Email not confirmed')) {
            errorMessage = 'Please check your email and confirm your account'
          } else if (errorMsg.includes('Too many requests')) {
            errorMessage = 'Too many login attempts. Please try again later'
          } else if (errorMsg.includes('Network')) {
            errorMessage = 'Network error. Please check your connection'
          }

          toast.error('Sign in failed', {
            description: errorMessage,
            duration: 5000
          })

          // Log security event
          console.log('Security Event: Login Failure', {
            email,
            error: errorMsg,
            attempts: currentRateLimit.attempts,
            timestamp: new Date().toISOString(),
            userAgent: navigator.userAgent
          })

          return { error: errorMessage }
        }
      },

      register: async (email: string, password: string, name: string, role: UserRole, schoolCode?: string): Promise<AuthResult> => {
        // Validate password strength
        const passwordValidation = validatePassword(password)
        if (!passwordValidation.isValid) {
          const errorMsg = passwordValidation.errors[0]
          toast.error('Password validation failed', {
            description: errorMsg,
            duration: 5000
          })
          return { error: errorMsg }
        }

        set({ isLoading: true })
        const loadingToast = toast.loading('Creating your account...', { duration: Infinity })

        try {
          const result = await withRetry(async () => {
            const { data, error } = await supabase.auth.signUp({
              email,
              password,
              options: {
                data: {
                  name,
                  role,
                  full_name: name
                },
              },
            })

            if (error) {
              throw error
            }

            return data
          })

          set({ isLoading: false })
          toast.dismiss(loadingToast)

          if (result.user) {
            // Check if email confirmation is required
            if (!result.session) {
              toast.success('Account created successfully!', {
                description: 'Please check your email to verify your account before signing in.',
                duration: 8000
              })

              // Log security event
              console.log('Security Event: Registration Success (Email Confirmation Required)', {
                userId: result.user.id,
                email: result.user.email,
                role,
                timestamp: new Date().toISOString(),
                userAgent: navigator.userAgent
              })

              return { requiresEmailConfirmation: true }
            } else {
              toast.success('Account created and signed in!', {
                description: `Welcome to the school management system, ${name}!`,
                duration: 5000
              })

              // Log security event
              console.log('Security Event: Registration Success (Auto Sign-in)', {
                userId: result.user.id,
                email: result.user.email,
                role,
                timestamp: new Date().toISOString(),
                userAgent: navigator.userAgent
              })
            }
          }

          return {}
        } catch (err: unknown) {
          set({ isLoading: false })
          toast.dismiss(loadingToast)

          // Parse error message for user-friendly display
          const errorMsg = getErrorMessage(err)
          let errorMessage = 'An unexpected error occurred'

          if (errorMsg.includes('User already registered')) {
            errorMessage = 'An account with this email already exists'
          } else if (errorMsg.includes('Password should be')) {
            errorMessage = 'Password does not meet security requirements'
          } else if (errorMsg.includes('Invalid email')) {
            errorMessage = 'Please enter a valid email address'
          } else if (errorMsg.includes('Network')) {
            errorMessage = 'Network error. Please check your connection'
          }

          toast.error('Registration failed', {
            description: errorMessage,
            duration: 5000
          })

          // Log security event
          console.log('Security Event: Registration Failure', {
            email,
            error: errorMsg,
            timestamp: new Date().toISOString(),
            userAgent: navigator.userAgent
          })

          return { error: errorMessage }
        }
      },

      logout: async () => {
        const { user } = get()
        set({ isLoading: true })

        const loadingToast = toast.loading('Signing out...', { duration: Infinity })

        try {
          await withRetry(async () => {
            const { error } = await supabase.auth.signOut()
            if (error) throw error
          })

          // Clear user data
          get().setUser(null)

          // Clear any cached data
          localStorage.removeItem('auth-store')
          sessionStorage.clear()

          toast.dismiss(loadingToast)
          toast.success('Signed out successfully', {
            description: 'You have been securely logged out',
            duration: 3000
          })

          // Log security event
          if (user) {
            console.log('Security Event: Logout Success', {
              userId: user.id,
              email: user.email,
              timestamp: new Date().toISOString(),
              userAgent: navigator.userAgent
            })
          }

        } catch (err: unknown) {
          toast.dismiss(loadingToast)

          // Even if logout fails on server, clear local state for security
          get().setUser(null)
          localStorage.removeItem('auth-store')
          sessionStorage.clear()

          toast.error('Logout error', {
            description: 'You have been logged out locally for security',
            duration: 4000
          })

          console.error('Logout error:', err)
        } finally {
          set({ isLoading: false })
        }
      },

      // Enhanced session refresh with automatic retry
      refreshSession: async () => {
        try {
          const { data, error } = await supabase.auth.refreshSession()

          if (error) {
            console.error('Session refresh failed:', error)
            // If refresh fails, user needs to sign in again
            get().setUser(null)
            toast.info('Session expired', {
              description: 'Please sign in again',
              duration: 5000
            })
            return false
          }

          if (data.user) {
            // Fetch updated profile
            const { data: profile } = await supabase
              .from('profiles')
              .select('*')
              .eq('id', data.user.id)
              .single()

            if (profile) {
              get().setUser(profile)
            }
          }

          return true
        } catch (err) {
          console.error('Session refresh error:', err)
          get().setUser(null)
          return false
        }
      },

      updateProfile: async (updates: Partial<AuthUser>) => {
        const { user } = get()
        if (!user) return { error: 'No user logged in' }

        set({ isLoading: true })
        try {
          const { data, error } = await supabase
            .from('profiles')
            .update(updates)
            .eq('id', user.id)
            .select()
            .single()

          if (error) {
            set({ isLoading: false })
            return { error: error.message }
          }

          get().setUser(data)
          set({ isLoading: false })
          return {}
        } catch {
          set({ isLoading: false })
          return { error: 'Failed to update profile' }
        }
      },

      checkPermission: (resource: string, action: string) => {
        const { permissions } = get()
        return permissions[resource]?.includes(action) || false
      },
    }),
    {
      name: 'auth-store',
      // Only persist user profile data, not authentication state
      // Let Supabase handle session persistence
      partialize: (state) => ({
        user: state.user,
        permissions: state.permissions,
      }),
      // Use localStorage for session persistence across browser restarts
      // Supabase handles its own session storage securely
      // We only store user profile data here
    }
  )
)

// Helper function to get user permissions based on role
function getUserPermissions(role: UserRole): Record<string, string[]> {
  const permissionsMap: Record<UserRole, Record<string, string[]>> = {
    admin: {
      dashboard: ['read'],
      admissions: ['create', 'read', 'update', 'delete'],
      users: ['create', 'read', 'update', 'delete'],
      roles: ['create', 'read', 'update', 'delete'],
      classes: ['create', 'read', 'update', 'delete'],
      students: ['create', 'read', 'update', 'delete'],
      teachers: ['create', 'read', 'update', 'delete'],
      attendance: ['create', 'read', 'update', 'delete'],
      examinations: ['create', 'read', 'update', 'delete'],
      timetables: ['create', 'read', 'update', 'delete', 'manage'],
      time_periods: ['create', 'read', 'update', 'delete'],
      library: ['create', 'read', 'update', 'delete', 'manage'],
      rooms: ['create', 'read', 'update', 'delete'],
      fees: ['create', 'read', 'update', 'delete'],
      payments: ['create', 'read', 'update', 'verify'],
      invoices: ['create', 'read', 'update', 'send'],
      refunds: ['create', 'read', 'approve'],
      financial_reports: ['create', 'read'],
      reports: ['create', 'read', 'update', 'delete'],
      settings: ['read', 'update'],
    },
    'sub-admin': {
      dashboard: ['read'],
      admissions: ['read', 'update'],
      users: ['read', 'update'],
      classes: ['create', 'read', 'update'],
      students: ['create', 'read', 'update'],
      teachers: ['read', 'update'],
      attendance: ['create', 'read', 'update'],
      examinations: ['create', 'read', 'update'],
      timetables: ['create', 'read', 'update', 'delete', 'manage'],
      time_periods: ['create', 'read', 'update', 'delete'],
      rooms: ['create', 'read', 'update', 'delete'],
      library: ['create', 'read', 'update', 'delete', 'manage'],
      fees: ['create', 'read', 'update'],
      payments: ['create', 'read', 'update'],
      invoices: ['create', 'read', 'update'],
      refunds: ['read'],
      financial_reports: ['read'],
      reports: ['read', 'update'],
    },
    teacher: {
      dashboard: ['read'],
      classes: ['read', 'update'],
      students: ['read', 'update'],
      attendance: ['create', 'read', 'update'],
      examinations: ['read', 'update'], // Teachers can enter grades but not create exams
      timetables: ['read'], // Teachers can view their schedules
      time_periods: ['read'], // Teachers can view time periods
      rooms: ['read'], // Teachers can view room information
      fees: ['read'], // Teachers can view fee information for their students
      payments: ['read'], // Teachers can view payment status
      reports: ['create', 'read', 'update'],
      assignments: ['create', 'read', 'update', 'delete'],
      library: ['read'], // Teachers can view library resources
    },
    student: {
      dashboard: ['read'],
      profile: ['read', 'update'],
      classes: ['read'],
      assignments: ['read', 'update'],
      grades: ['read'],
      fees: ['read'], // Students can view their own fee information
      payments: ['read'], // Students can view their payment history
      invoices: ['read'], // Students can view their invoices
      library: ['read'], // Students can view library resources and manage their borrowings
    },
  }

  return permissionsMap[role] || {}
}

// Session management
let sessionRefreshTimer: NodeJS.Timeout | null = null
let isInitialized = false

// Automatic session refresh
const setupSessionRefresh = () => {
  if (sessionRefreshTimer) {
    clearInterval(sessionRefreshTimer)
  }

  // Check session every 5 minutes
  sessionRefreshTimer = setInterval(async () => {
    const { user } = useAuthStore.getState()
    if (user) {
      const { data: { session } } = await supabase.auth.getSession()

      if (session) {
        const expiresAt = new Date(session.expires_at! * 1000)
        const now = new Date()
        const timeUntilExpiry = expiresAt.getTime() - now.getTime()

        // Refresh if session expires in less than 10 minutes
        if (timeUntilExpiry < 10 * 60 * 1000) {
          console.log('Auto-refreshing session...')
          await useAuthStore.getState().refreshSession?.()
        }
      }
    }
  }, 5 * 60 * 1000) // 5 minutes
}

// Enhanced initialization with better error handling
export const initializeAuth = async () => {
  if (isInitialized) return
  isInitialized = true

  try {
    // Set loading to true at start
    useAuthStore.getState().setLoading(true)

    // Get current session
    const { data: { session }, error } = await supabase.auth.getSession()

    if (error) {
      console.error('Failed to get session:', error)
      useAuthStore.getState().setUser(null)
      return
    }

    if (session?.user) {
      try {
        // Fetch user profile
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', session.user.id)
          .single()

        if (profileError) {
          console.error('Failed to fetch profile:', profileError)
          // Don't sign out immediately, just clear user state
          useAuthStore.getState().setUser(null)
        } else if (profile) {
          useAuthStore.getState().setUser(profile)
          setupSessionRefresh()
          console.log('Auth initialized successfully for user:', profile.email)
        }
      } catch (err) {
        console.error('Profile fetch error:', err)
        useAuthStore.getState().setUser(null)
      }
    } else {
      // No session, clear user state
      console.log('No active session found')
      useAuthStore.getState().setUser(null)
    }

    // Enhanced auth state change listener
    supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('Auth state changed:', event)

      try {
        if (event === 'SIGNED_IN' && session?.user) {
          const { data: profile, error: profileError } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', session.user.id)
            .single()

          if (profileError) {
            console.error('Profile fetch error on sign in:', profileError)
            toast.error('Failed to load user profile')
            useAuthStore.getState().setUser(null)
          } else if (profile) {
            useAuthStore.getState().setUser(profile)
            setupSessionRefresh()
            console.log('User signed in:', profile.email)
          }
        } else if (event === 'SIGNED_OUT') {
          console.log('User signed out')
          useAuthStore.getState().setUser(null)
          if (sessionRefreshTimer) {
            clearInterval(sessionRefreshTimer)
            sessionRefreshTimer = null
          }
        } else if (event === 'TOKEN_REFRESHED') {
          console.log('Token refreshed successfully')
          // Ensure user state is maintained after token refresh
          if (session?.user && !useAuthStore.getState().user) {
            const { data: profile } = await supabase
              .from('profiles')
              .select('*')
              .eq('id', session.user.id)
              .single()

            if (profile) {
              useAuthStore.getState().setUser(profile)
            }
          }
        } else if (event === 'USER_UPDATED') {
          // Refetch profile on user update
          if (session?.user) {
            const { data: profile } = await supabase
              .from('profiles')
              .select('*')
              .eq('id', session.user.id)
              .single()

            if (profile) {
              useAuthStore.getState().setUser(profile)
            }
          }
        }
      } catch (err) {
        console.error('Auth state change error:', err)
        toast.error('Authentication error occurred')
      }
    })

  } catch (err) {
    console.error('Auth initialization error:', err)
    useAuthStore.getState().setLoading(false)
    toast.error('Failed to initialize authentication')
  } finally {
    // Ensure loading is always set to false after initialization
    useAuthStore.getState().setLoading(false)
  }
}

// Cleanup function for when app unmounts
export const cleanupAuth = () => {
  if (sessionRefreshTimer) {
    clearInterval(sessionRefreshTimer)
    sessionRefreshTimer = null
  }
  isInitialized = false
}
