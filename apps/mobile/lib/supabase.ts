import { createClient } from '@supabase/supabase-js'
import AsyncStorage from '@react-native-async-storage/async-storage'

// Supabase configuration
const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables')
}

// Create Supabase client with mobile-optimized configuration
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false, // Disable for mobile
    storageKey: 'school-management-mobile-auth',
    flowType: 'pkce', // Use PKCE flow for better security on mobile
  },
  global: {
    headers: {
      'X-Client-Info': 'school-management-mobile',
    },
  },
})

// Database types based on the web app schema
export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          email: string
          name: string
          role: 'admin' | 'sub-admin' | 'teacher' | 'student'
          phone?: string
          avatar_url?: string
          school_id?: string
          onboarding_completed?: boolean
          last_sign_in_at?: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          email: string
          name: string
          role: 'admin' | 'sub-admin' | 'teacher' | 'student'
          phone?: string
          avatar_url?: string
          school_id?: string
          onboarding_completed?: boolean
          last_sign_in_at?: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          email?: string
          name?: string
          role?: 'admin' | 'sub-admin' | 'teacher' | 'student'
          phone?: string
          avatar_url?: string
          school_id?: string
          onboarding_completed?: boolean
          last_sign_in_at?: string
          updated_at?: string
        }
      }
      schools: {
        Row: {
          id: string
          admin_id: string
          name: string
          logo_url?: string
          address?: string
          geo_lat?: number
          geo_lng?: number
          contact_email?: string
          contact_phone?: string
          school_code: string
          academic_start?: string
          academic_end?: string
          timezone: string
          language: string
          motto?: string
          principal_name?: string
          website_url?: string
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          admin_id: string
          name: string
          logo_url?: string
          address?: string
          geo_lat?: number
          geo_lng?: number
          contact_email?: string
          contact_phone?: string
          school_code: string
          academic_start?: string
          academic_end?: string
          timezone?: string
          language?: string
          motto?: string
          principal_name?: string
          website_url?: string
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          admin_id?: string
          name?: string
          logo_url?: string
          address?: string
          geo_lat?: number
          geo_lng?: number
          contact_email?: string
          contact_phone?: string
          school_code?: string
          academic_start?: string
          academic_end?: string
          timezone?: string
          language?: string
          motto?: string
          principal_name?: string
          website_url?: string
          is_active?: boolean
          updated_at?: string
        }
      }
      students: {
        Row: {
          id: string
          school_id: string
          student_id?: string
          admission_number?: string
          class_id?: string
          section?: string
          roll_number?: number
          date_of_birth?: string
          gender?: 'male' | 'female' | 'other'
          blood_group?: 'A+' | 'A-' | 'B+' | 'B-' | 'AB+' | 'AB-' | 'O+' | 'O-'
          address?: string
          parent_name?: string
          parent_phone?: string
          parent_email?: string
          emergency_contact_name?: string
          emergency_contact_phone?: string
          emergency_contact_relation?: string
          admission_date?: string
          is_active?: boolean
          created_at: string
          updated_at: string
        }
      }
      teachers: {
        Row: {
          id: string
          school_id: string
          employee_id?: string
          department?: string
          designation?: string
          qualification?: string
          experience_years?: number
          date_of_birth?: string
          gender?: 'male' | 'female' | 'other'
          blood_group?: 'A+' | 'A-' | 'B+' | 'B-' | 'AB+' | 'AB-' | 'O+' | 'O-'
          address?: string
          emergency_contact_name?: string
          emergency_contact_phone?: string
          emergency_contact_relation?: string
          salary?: number
          joining_date?: string
          is_active?: boolean
          created_at: string
          updated_at: string
        }
      }
    }
    Functions: {
      generate_school_code: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
    }
  }
}

// Helper function to check if user is authenticated
export const isAuthenticated = async (): Promise<boolean> => {
  try {
    const { data: { session } } = await supabase.auth.getSession()
    return !!session?.user
  } catch (error) {
    console.error('Error checking authentication:', error)
    return false
  }
}

// Helper function to get current user
export const getCurrentUser = async () => {
  try {
    const { data: { user } } = await supabase.auth.getUser()
    return user
  } catch (error) {
    console.error('Error getting current user:', error)
    return null
  }
}

// Helper function to get user profile
export const getUserProfile = async (userId: string) => {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single()

    if (error) {
      console.error('Error fetching user profile:', error)
      return null
    }

    return data
  } catch (error) {
    console.error('Error fetching user profile:', error)
    return null
  }
}

// Helper function to validate school code
export const validateSchoolCode = async (schoolCode: string): Promise<boolean> => {
  try {
    console.log('Validating school code:', schoolCode.toUpperCase())

    const { data, error } = await supabase
      .from('schools')
      .select('id, name, is_active')
      .eq('school_code', schoolCode.toUpperCase())
      .single()

    console.log('School validation result:', { data, error })

    if (error) {
      console.error('School code validation error:', error)
      return false
    }

    if (!data) {
      console.log('No school found with code:', schoolCode.toUpperCase())
      return false
    }

    if (!data.is_active) {
      console.log('School found but not active:', data)
      return false
    }

    console.log('School code validation successful:', data)
    return true
  } catch (error) {
    console.error('Error validating school code:', error)
    return false
  }
}

// Helper function to get school by code
export const getSchoolByCode = async (schoolCode: string) => {
  try {
    const { data, error } = await supabase
      .from('schools')
      .select('*')
      .eq('school_code', schoolCode.toUpperCase())
      .eq('is_active', true)
      .single()

    if (error) {
      console.error('Error fetching school:', error)
      return null
    }

    return data
  } catch (error) {
    console.error('Error fetching school:', error)
    return null
  }
}
