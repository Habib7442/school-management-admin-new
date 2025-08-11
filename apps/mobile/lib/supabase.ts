import { createClient } from '@supabase/supabase-js'
import AsyncStorage from '@react-native-async-storage/async-storage'

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!

// Mobile Supabase client with AsyncStorage for persistence
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false, // Disable for mobile
  },
})

// Types for our database (shared with web)
export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          email: string
          name: string
          role: 'admin' | 'sub-admin' | 'teacher' | 'student'
          created_at: string
          updated_at: string
          onboarding_completed?: boolean
          school_id?: string
          last_sign_in_at?: string
        }
        Insert: {
          id: string
          email: string
          name: string
          role: 'admin' | 'sub-admin' | 'teacher' | 'student'
          created_at?: string
          updated_at?: string
          onboarding_completed?: boolean
          school_id?: string
          last_sign_in_at?: string
        }
        Update: {
          id?: string
          email?: string
          name?: string
          role?: 'admin' | 'sub-admin' | 'teacher' | 'student'
          updated_at?: string
          onboarding_completed?: boolean
          school_id?: string
          last_sign_in_at?: string
        }
      }
    }
  }
}

// Auth helper functions
export const signUp = async (email: string, password: string, name: string) => {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        name,
      },
    },
  })
  return { data, error }
}

export const signIn = async (email: string, password: string) => {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  })
  return { data, error }
}

export const signOut = async () => {
  const { error } = await supabase.auth.signOut()
  return { error }
}

export const getCurrentUser = async () => {
  const { data: { user }, error } = await supabase.auth.getUser()
  return { user, error }
}
