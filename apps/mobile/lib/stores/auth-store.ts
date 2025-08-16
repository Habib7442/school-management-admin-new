import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { supabase, getUserProfile, validateSchoolCode, getSchoolByCode } from '../supabase'
import type { AuthUser, UserRole, AuthStore, AuthResult } from '@repo/types'
import { parseSupabaseError, logError } from '../utils/errorHandling'

// Password validation
const validatePassword = (password: string) => {
  const errors: string[] = []
  
  if (password.length < 6) {
    errors.push('Password must be at least 6 characters long')
  }
  
  if (!/[A-Z]/.test(password)) {
    errors.push('Password must contain at least one uppercase letter')
  }
  
  if (!/[a-z]/.test(password)) {
    errors.push('Password must contain at least one lowercase letter')
  }
  
  if (!/\d/.test(password)) {
    errors.push('Password must contain at least one number')
  }
  
  return {
    isValid: errors.length === 0,
    errors
  }
}

// User permissions based on role
const getUserPermissions = (role: UserRole): Record<string, string[]> => {
  const permissionsMap: Record<UserRole, Record<string, string[]>> = {
    admin: {
      users: ['create', 'read', 'update', 'delete'],
      roles: ['create', 'read', 'update', 'delete'],
      classes: ['create', 'read', 'update', 'delete'],
      students: ['create', 'read', 'update', 'delete'],
      teachers: ['create', 'read', 'update', 'delete'],
      reports: ['create', 'read', 'update', 'delete'],
      settings: ['read', 'update'],
    },
    'sub-admin': {
      users: ['read', 'update'],
      classes: ['create', 'read', 'update'],
      students: ['create', 'read', 'update'],
      teachers: ['read', 'update'],
      reports: ['read', 'update'],
    },
    teacher: {
      classes: ['read', 'update'],
      students: ['read', 'update'],
      assignments: ['create', 'read', 'update'],
      grades: ['create', 'read', 'update'],
      attendance: ['create', 'read', 'update'],
    },
    student: {
      profile: ['read', 'update'],
      classes: ['read'],
      assignments: ['read', 'update'],
      grades: ['read'],
    },
  }

  return permissionsMap[role] || {}
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
        })
      },

      setLoading: (loading: boolean) => {
        set({ isLoading: loading })
      },

      login: async (email: string, password: string): Promise<{ error?: string }> => {
        set({ isLoading: true })
        
        try {
          const { data, error } = await supabase.auth.signInWithPassword({
            email: email.toLowerCase().trim(),
            password,
          })

          if (error) {
            set({ isLoading: false })
            const appError = parseSupabaseError(error)
            logError(error, 'Login attempt')
            return { error: appError.message }
          }

          if (data.user) {
            // Fetch user profile
            const profile = await getUserProfile(data.user.id)
            
            if (profile) {
              const authUser: AuthUser = {
                id: profile.id,
                email: profile.email,
                name: profile.name,
                role: profile.role,
                phone: profile.phone,
                avatar_url: profile.avatar_url,
                school_id: profile.school_id,
                onboarding_completed: profile.onboarding_completed,
                created_at: profile.created_at,
                updated_at: profile.updated_at,
              }
              
              get().setUser(authUser)
              set({ isLoading: false })
              return {}
            } else {
              set({ isLoading: false })
              return { error: 'User profile not found' }
            }
          }

          set({ isLoading: false })
          return { error: 'Login failed' }
        } catch (error) {
          set({ isLoading: false })
          return { error: 'An unexpected error occurred' }
        }
      },

      register: async (
        email: string, 
        password: string, 
        name: string, 
        role: UserRole,
        schoolCode?: string
      ): Promise<AuthResult> => {
        // Validate password
        const passwordValidation = validatePassword(password)
        if (!passwordValidation.isValid) {
          return { error: passwordValidation.errors[0] }
        }

        // Validate school code for non-admin roles
        if (role !== 'admin' && schoolCode) {
          console.log('Validating school code for registration:', schoolCode)
          const isValidSchool = await validateSchoolCode(schoolCode)
          console.log('School code validation result:', isValidSchool)

          if (!isValidSchool) {
            return {
              error: `School code "${schoolCode}" not found. Please check with your school administrator for the correct code.`
            }
          }
        }

        set({ isLoading: true })

        try {
          const { data, error } = await supabase.auth.signUp({
            email: email.toLowerCase().trim(),
            password,
            options: {
              data: {
                name,
                role,
                full_name: name,
                school_code: schoolCode,
              },
            },
          })

          if (error) {
            set({ isLoading: false })
            return { error: error.message }
          }

          if (data.user) {
            // Check if email confirmation is required
            if (!data.session) {
              set({ isLoading: false })
              return { requiresEmailConfirmation: true }
            }

            // If auto-signed in, fetch profile
            const profile = await getUserProfile(data.user.id)
            if (profile) {
              const authUser: AuthUser = {
                id: profile.id,
                email: profile.email,
                name: profile.name,
                role: profile.role,
                phone: profile.phone,
                avatar_url: profile.avatar_url,
                school_id: profile.school_id,
                onboarding_completed: profile.onboarding_completed,
                created_at: profile.created_at,
                updated_at: profile.updated_at,
              }
              
              get().setUser(authUser)
            }
          }

          set({ isLoading: false })
          return {}
        } catch (error) {
          set({ isLoading: false })
          return { error: 'Registration failed' }
        }
      },

      logout: async (): Promise<void> => {
        set({ isLoading: true })
        
        try {
          await supabase.auth.signOut()
          get().setUser(null)
        } catch (error) {
          console.error('Logout error:', error)
        } finally {
          set({ isLoading: false })
        }
      },

      updateProfile: async (updates: Partial<AuthUser>): Promise<{ error?: string }> => {
        const { user } = get()
        if (!user) {
          return { error: 'Not authenticated' }
        }

        set({ isLoading: true })

        try {
          const { error } = await supabase
            .from('profiles')
            .update({
              ...updates,
              updated_at: new Date().toISOString(),
            })
            .eq('id', user.id)

          if (error) {
            set({ isLoading: false })
            return { error: error.message }
          }

          // Update local state
          get().setUser({ ...user, ...updates })
          set({ isLoading: false })
          return {}
        } catch (error) {
          set({ isLoading: false })
          return { error: 'Failed to update profile' }
        }
      },

      checkPermission: (resource: string, action: string): boolean => {
        const { permissions } = get()
        return permissions[resource]?.includes(action) || false
      },

      refreshSession: async (): Promise<boolean> => {
        try {
          const { data, error } = await supabase.auth.refreshSession()
          
          if (error || !data.session) {
            get().setUser(null)
            return false
          }

          // Refresh user profile
          const profile = await getUserProfile(data.session.user.id)
          if (profile) {
            const authUser: AuthUser = {
              id: profile.id,
              email: profile.email,
              name: profile.name,
              role: profile.role,
              phone: profile.phone,
              avatar_url: profile.avatar_url,
              school_id: profile.school_id,
              onboarding_completed: profile.onboarding_completed,
              created_at: profile.created_at,
              updated_at: profile.updated_at,
            }
            
            get().setUser(authUser)
            return true
          }

          return false
        } catch (error) {
          console.error('Session refresh error:', error)
          get().setUser(null)
          return false
        }
      },
    }),
    {
      name: 'auth-storage',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        user: state.user,
        isAuthenticated: state.isAuthenticated,
        permissions: state.permissions,
      }),
    }
  )
)

// Track if auth has been initialized to prevent multiple listeners
let isAuthInitialized = false

// Initialize auth state on app start
export const initializeAuth = async () => {
  if (isAuthInitialized) return
  isAuthInitialized = true

  try {
    const { data: { session } } = await supabase.auth.getSession()

    if (session?.user) {
      const profile = await getUserProfile(session.user.id)

      if (profile) {
        const authUser: AuthUser = {
          id: profile.id,
          email: profile.email,
          name: profile.name,
          role: profile.role,
          phone: profile.phone,
          avatar_url: profile.avatar_url,
          school_id: profile.school_id,
          onboarding_completed: profile.onboarding_completed,
          created_at: profile.created_at,
          updated_at: profile.updated_at,
        }

        useAuthStore.getState().setUser(authUser)
      }
    }

    // Listen for auth changes (only set up once)
    supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('Auth state change:', event, !!session?.user)

      if (event === 'SIGNED_IN' && session?.user) {
        const profile = await getUserProfile(session.user.id)

        if (profile) {
          const authUser: AuthUser = {
            id: profile.id,
            email: profile.email,
            name: profile.name,
            role: profile.role,
            phone: profile.phone,
            avatar_url: profile.avatar_url,
            school_id: profile.school_id,
            onboarding_completed: profile.onboarding_completed,
            created_at: profile.created_at,
            updated_at: profile.updated_at,
          }

          useAuthStore.getState().setUser(authUser)
        }
      } else if (event === 'SIGNED_OUT') {
        useAuthStore.getState().setUser(null)
      }
    })
  } catch (error) {
    console.error('Auth initialization error:', error)
  }
}
