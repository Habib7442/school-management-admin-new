import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { supabase } from '../supabase'
import type { AuthStore, AuthUser, UserRole } from '@repo/types'

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

      login: async (email: string, password: string) => {
        set({ isLoading: true })
        try {
          const { data, error } = await supabase.auth.signInWithPassword({
            email,
            password,
          })

          if (error) {
            set({ isLoading: false })
            return { error: error.message }
          }

          if (data.user) {
            // Fetch user profile
            const { data: profile, error: profileError } = await supabase
              .from('profiles')
              .select('*')
              .eq('id', data.user.id)
              .single()

            if (profileError) {
              set({ isLoading: false })
              return { error: 'Failed to fetch user profile' }
            }

            get().setUser(profile)
          }

          set({ isLoading: false })
          return {}
        } catch (err) {
          set({ isLoading: false })
          return { error: 'An unexpected error occurred' }
        }
      },

      register: async (email: string, password: string, name: string, role: UserRole) => {
        set({ isLoading: true })
        try {
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
            set({ isLoading: false })
            return { error: error.message }
          }

          // If user is created successfully, the profile will be created automatically
          // via the trigger, so we don't need to manually create it here
          set({ isLoading: false })
          return {}
        } catch (err) {
          set({ isLoading: false })
          return { error: 'An unexpected error occurred' }
        }
      },

      logout: async () => {
        set({ isLoading: true })
        try {
          await supabase.auth.signOut()
          get().setUser(null)
        } catch (err) {
          console.error('Logout error:', err)
        } finally {
          set({ isLoading: false })
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
        } catch (err) {
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
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        user: state.user,
        isAuthenticated: state.isAuthenticated,
        permissions: state.permissions,
      }),
    }
  )
)

// Helper function to get user permissions based on role
function getUserPermissions(role: UserRole): Record<string, string[]> {
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
      reports: ['create', 'read', 'update'],
      assignments: ['create', 'read', 'update', 'delete'],
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

// Initialize auth state on app start
export const initializeAuth = async () => {
  const { data: { session } } = await supabase.auth.getSession()
  
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

  // Listen for auth changes
  supabase.auth.onAuthStateChange(async (event, session) => {
    if (event === 'SIGNED_IN' && session?.user) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', session.user.id)
        .single()

      if (profile) {
        useAuthStore.getState().setUser(profile)
      }
    } else if (event === 'SIGNED_OUT') {
      useAuthStore.getState().setUser(null)
    }
  })
}
