import { createClient } from '@supabase/supabase-js'

/**
 * Centralized Supabase Client Configuration
 *
 * This file provides singleton instances of Supabase clients to prevent
 * multiple GoTrueClient instances and ensure consistent authentication state.
 *
 * - supabase: Main client for client-side operations
 * - createServerSupabaseClient: For API routes (no auth persistence)
 * - createAdminSupabaseClient: For admin operations (service role key)
 */

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

// Client-side Supabase client
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
    storageKey: 'school-management-auth' // Unique storage key to avoid conflicts
  }
})

// Server-side Supabase client (for API routes)
export const createServerSupabaseClient = () => {
  return createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
      detectSessionInUrl: false
    }
  })
}

// Admin Supabase client (for admin operations)
export const createAdminSupabaseClient = () => {
  return createClient(supabaseUrl, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
      detectSessionInUrl: false
    }
  })
}

// Types for our database
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
      admins: {
        Row: {
          id: string
          school_id: string
          permissions?: any
          can_create_sub_admins?: boolean
          can_manage_finances?: boolean
          can_manage_staff?: boolean
          emergency_contact_name?: string
          emergency_contact_phone?: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          school_id: string
          permissions?: any
          can_create_sub_admins?: boolean
          can_manage_finances?: boolean
          can_manage_staff?: boolean
          emergency_contact_name?: string
          emergency_contact_phone?: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          school_id?: string
          permissions?: any
          can_create_sub_admins?: boolean
          can_manage_finances?: boolean
          can_manage_staff?: boolean
          emergency_contact_name?: string
          emergency_contact_phone?: string
          updated_at?: string
        }
      }
      sub_admins: {
        Row: {
          id: string
          school_id: string
          created_by?: string
          permissions?: any
          temporary_access?: any
          access_expires_at?: string
          department?: string
          can_view_reports?: boolean
          can_manage_students?: boolean
          can_manage_teachers?: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          school_id: string
          created_by?: string
          permissions?: any
          temporary_access?: any
          access_expires_at?: string
          department?: string
          can_view_reports?: boolean
          can_manage_students?: boolean
          can_manage_teachers?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          school_id?: string
          created_by?: string
          permissions?: any
          temporary_access?: any
          access_expires_at?: string
          department?: string
          can_view_reports?: boolean
          can_manage_students?: boolean
          can_manage_teachers?: boolean
          updated_at?: string
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
        Insert: {
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
          created_at?: string
          updated_at?: string
        }
        Update: {
          school_id?: string
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
        Insert: {
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
          created_at?: string
          updated_at?: string
        }
        Update: {
          school_id?: string
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
          updated_at?: string
        }
      }
      classes: {
        Row: {
          id: string
          school_id: string
          name: string
          grade_level?: number
          section?: string
          class_teacher_id?: string
          room_number?: string
          capacity?: number
          academic_year?: string
          is_active?: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          school_id: string
          name: string
          grade_level?: number
          section?: string
          class_teacher_id?: string
          room_number?: string
          capacity?: number
          academic_year?: string
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          school_id?: string
          name?: string
          grade_level?: number
          section?: string
          class_teacher_id?: string
          room_number?: string
          capacity?: number
          academic_year?: string
          is_active?: boolean
          updated_at?: string
        }
      }
      time_periods: {
        Row: {
          id: string
          school_id: string
          name: string
          start_time: string
          end_time: string
          period_order: number
          is_break?: boolean
          is_active?: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          school_id: string
          name: string
          start_time: string
          end_time: string
          period_order: number
          is_break?: boolean
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          school_id?: string
          name?: string
          start_time?: string
          end_time?: string
          period_order?: number
          is_break?: boolean
          is_active?: boolean
          updated_at?: string
        }
      }
      rooms: {
        Row: {
          id: string
          school_id: string
          name: string
          room_number?: string
          building?: string
          floor_number?: number
          capacity?: number
          room_type?: string
          facilities?: any[]
          is_active?: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          school_id: string
          name: string
          room_number?: string
          building?: string
          floor_number?: number
          capacity?: number
          room_type?: string
          facilities?: any[]
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          school_id?: string
          name?: string
          room_number?: string
          building?: string
          floor_number?: number
          capacity?: number
          room_type?: string
          facilities?: any[]
          is_active?: boolean
          updated_at?: string
        }
      }
      timetables: {
        Row: {
          id: string
          school_id: string
          academic_year_id: string
          class_id: string
          subject_id: string
          teacher_id?: string
          room_id?: string
          time_period_id: string
          day_of_week: string
          effective_from?: string
          effective_to?: string
          notes?: string
          is_active?: boolean
          created_by?: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          school_id: string
          academic_year_id: string
          class_id: string
          subject_id: string
          teacher_id?: string
          room_id?: string
          time_period_id: string
          day_of_week: string
          effective_from?: string
          effective_to?: string
          notes?: string
          is_active?: boolean
          created_by?: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          school_id?: string
          academic_year_id?: string
          class_id?: string
          subject_id?: string
          teacher_id?: string
          room_id?: string
          time_period_id?: string
          day_of_week?: string
          effective_from?: string
          effective_to?: string
          notes?: string
          is_active?: boolean
          created_by?: string
          updated_at?: string
        }
      }
      subjects: {
        Row: {
          id: string
          school_id: string
          name: string
          code?: string
          description?: string
          grade_level?: number
          is_active?: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          school_id: string
          name: string
          code?: string
          description?: string
          grade_level?: number
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          school_id?: string
          name?: string
          code?: string
          description?: string
          grade_level?: number
          is_active?: boolean
          updated_at?: string
        }
      }
      roles: {
        Row: {
          id: string
          name: string
          display_name: string
          description?: string
          is_system_role: boolean
          is_active: boolean
          hierarchy_level: number
          school_id?: string
          created_by?: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          display_name: string
          description?: string
          is_system_role?: boolean
          is_active?: boolean
          hierarchy_level?: number
          school_id?: string
          created_by?: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          name?: string
          display_name?: string
          description?: string
          is_system_role?: boolean
          is_active?: boolean
          hierarchy_level?: number
          school_id?: string
          created_by?: string
          updated_at?: string
        }
      }
      permissions: {
        Row: {
          id: string
          name: string
          display_name: string
          description?: string
          module: string
          action: string
          is_system_permission: boolean
          created_at: string
        }
        Insert: {
          id?: string
          name: string
          display_name: string
          description?: string
          module: string
          action: string
          is_system_permission?: boolean
          created_at?: string
        }
        Update: {
          name?: string
          display_name?: string
          description?: string
          module?: string
          action?: string
          is_system_permission?: boolean
        }
      }
      role_permissions: {
        Row: {
          id: string
          role_id: string
          permission_id: string
          granted: boolean
          created_at: string
        }
        Insert: {
          id?: string
          role_id: string
          permission_id: string
          granted?: boolean
          created_at?: string
        }
        Update: {
          role_id?: string
          permission_id?: string
          granted?: boolean
        }
      }
      user_roles: {
        Row: {
          id: string
          user_id: string
          role_id: string
          assigned_by?: string
          assigned_at: string
          expires_at?: string
          is_active: boolean
        }
        Insert: {
          id?: string
          user_id: string
          role_id: string
          assigned_by?: string
          assigned_at?: string
          expires_at?: string
          is_active?: boolean
        }
        Update: {
          user_id?: string
          role_id?: string
          assigned_by?: string
          assigned_at?: string
          expires_at?: string
          is_active?: boolean
        }
      }
      admissions: {
        Row: {
          id: string
          full_name: string
          email: string
          phone?: string
          date_of_birth?: string
          gender?: 'male' | 'female' | 'other'
          class_level: string
          address?: string
          parent_name?: string
          parent_phone?: string
          parent_email?: string
          photograph_url?: string
          documents?: Record<string, unknown>
          status: 'pending' | 'interview_scheduled' | 'accepted' | 'rejected'
          applied_date: string
          interview_date?: string
          interview_notes?: string
          decision_date?: string
          decided_by?: string
          school_id: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          full_name: string
          email: string
          phone?: string
          date_of_birth?: string
          gender?: 'male' | 'female' | 'other'
          class_level: string
          address?: string
          parent_name?: string
          parent_phone?: string
          parent_email?: string
          photograph_url?: string
          documents?: Record<string, unknown>
          status?: 'pending' | 'interview_scheduled' | 'accepted' | 'rejected'
          applied_date?: string
          interview_date?: string
          interview_notes?: string
          decision_date?: string
          decided_by?: string
          school_id: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          full_name?: string
          email?: string
          phone?: string
          date_of_birth?: string
          gender?: 'male' | 'female' | 'other'
          class_level?: string
          address?: string
          parent_name?: string
          parent_phone?: string
          parent_email?: string
          photograph_url?: string
          documents?: Record<string, unknown>
          status?: 'pending' | 'interview_scheduled' | 'accepted' | 'rejected'
          applied_date?: string
          interview_date?: string
          interview_notes?: string
          decision_date?: string
          decided_by?: string
          school_id?: string
          updated_at?: string
        }
      }
      timetable_templates: {
        Row: {
          id: string
          school_id: string
          name: string
          description?: string
          grade_level?: number
          template_data: any
          is_active?: boolean
          created_by?: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          school_id: string
          name: string
          description?: string
          grade_level?: number
          template_data: any
          is_active?: boolean
          created_by?: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          school_id?: string
          name?: string
          description?: string
          grade_level?: number
          template_data?: any
          is_active?: boolean
          created_by?: string
          updated_at?: string
        }
      }
      teacher_workload: {
        Row: {
          id: string
          teacher_id: string
          academic_year_id: string
          total_periods_per_week?: number
          max_periods_per_day?: number
          max_periods_per_week?: number
          unavailable_days?: string[]
          unavailable_periods?: string[]
          preferred_subjects?: string[]
          current_periods_assigned?: number
          workload_percentage?: number
          updated_at: string
        }
        Insert: {
          id?: string
          teacher_id: string
          academic_year_id: string
          total_periods_per_week?: number
          max_periods_per_day?: number
          max_periods_per_week?: number
          unavailable_days?: string[]
          unavailable_periods?: string[]
          preferred_subjects?: string[]
          current_periods_assigned?: number
          workload_percentage?: number
          updated_at?: string
        }
        Update: {
          teacher_id?: string
          academic_year_id?: string
          total_periods_per_week?: number
          max_periods_per_day?: number
          max_periods_per_week?: number
          unavailable_days?: string[]
          unavailable_periods?: string[]
          preferred_subjects?: string[]
          current_periods_assigned?: number
          workload_percentage?: number
          updated_at?: string
        }
      }
      timetable_conflicts: {
        Row: {
          id: string
          school_id: string
          conflict_type: string
          description: string
          timetable_id_1?: string
          timetable_id_2?: string
          teacher_id?: string
          room_id?: string
          class_id?: string
          day_of_week?: string
          time_period_id?: string
          status?: string
          resolved_by?: string
          resolved_at?: string
          resolution_notes?: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          school_id: string
          conflict_type: string
          description: string
          timetable_id_1?: string
          timetable_id_2?: string
          teacher_id?: string
          room_id?: string
          class_id?: string
          day_of_week?: string
          time_period_id?: string
          status?: string
          resolved_by?: string
          resolved_at?: string
          resolution_notes?: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          school_id?: string
          conflict_type?: string
          description?: string
          timetable_id_1?: string
          timetable_id_2?: string
          teacher_id?: string
          room_id?: string
          class_id?: string
          day_of_week?: string
          time_period_id?: string
          status?: string
          resolved_by?: string
          resolved_at?: string
          resolution_notes?: string
          updated_at?: string
        }
      }
    }
  }
}
