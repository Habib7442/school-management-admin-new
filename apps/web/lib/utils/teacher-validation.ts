/**
 * Teacher validation utilities
 * Helps prevent foreign key constraint violations when working with teachers
 */

import { createClient } from '@/lib/supabase/server'

/**
 * Validates that a teacher exists in the teachers table
 */
export async function validateTeacherExists(teacherId: string): Promise<{
  exists: boolean
  teacher?: any
  error?: string
}> {
  try {
    const supabase = createClient()
    
    const { data: teacher, error } = await supabase
      .from('teachers')
      .select(`
        id,
        employee_id,
        designation,
        is_active,
        profiles!inner(
          id,
          name,
          email,
          role
        )
      `)
      .eq('id', teacherId)
      .eq('is_active', true)
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        return { exists: false, error: 'Teacher not found' }
      }
      return { exists: false, error: error.message }
    }

    return { exists: true, teacher }
  } catch (error) {
    return { 
      exists: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }
  }
}

/**
 * Ensures a teacher record exists for a given profile
 * Creates the teacher record if it's missing
 */
export async function ensureTeacherRecord(profileId: string): Promise<{
  success: boolean
  teacherId?: string
  error?: string
}> {
  try {
    const supabase = createClient()
    
    // First check if teacher record already exists
    const { data: existingTeacher } = await supabase
      .from('teachers')
      .select('id')
      .eq('id', profileId)
      .single()

    if (existingTeacher) {
      return { success: true, teacherId: existingTeacher.id }
    }

    // Get the profile to ensure it exists and is a teacher
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('id, name, email, role, school_id, created_at')
      .eq('id', profileId)
      .eq('role', 'teacher')
      .single()

    if (profileError || !profile) {
      return { 
        success: false, 
        error: 'Profile not found or not a teacher' 
      }
    }

    // Create the missing teacher record
    const { data: newTeacher, error: teacherError } = await supabase
      .from('teachers')
      .insert({
        id: profile.id,
        school_id: profile.school_id,
        employee_id: `EMP${Date.now()}${Math.random().toString(36).substr(2, 4)}`,
        designation: 'Teacher',
        joining_date: profile.created_at?.split('T')[0] || new Date().toISOString().split('T')[0],
        is_active: true
      })
      .select('id')
      .single()

    if (teacherError) {
      return { 
        success: false, 
        error: `Failed to create teacher record: ${teacherError.message}` 
      }
    }

    return { success: true, teacherId: newTeacher.id }
  } catch (error) {
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }
  }
}

/**
 * Gets all valid teachers for assignment to classes
 */
export async function getValidTeachers(): Promise<{
  teachers: any[]
  error?: string
}> {
  try {
    const supabase = createClient()
    
    const { data: teachers, error } = await supabase
      .from('teachers')
      .select(`
        id,
        employee_id,
        designation,
        joining_date,
        is_active,
        profiles!inner(
          id,
          name,
          email,
          phone,
          role
        )
      `)
      .eq('is_active', true)
      .eq('profiles.role', 'teacher')
      .order('profiles.name')

    if (error) {
      return { teachers: [], error: error.message }
    }

    return { teachers: teachers || [] }
  } catch (error) {
    return { 
      teachers: [], 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }
  }
}

/**
 * Validates teacher assignment to a class
 */
export async function validateTeacherAssignment(
  classId: string, 
  teacherId: string | null
): Promise<{
  valid: boolean
  error?: string
}> {
  try {
    // If teacherId is null, it's valid (removing teacher assignment)
    if (!teacherId) {
      return { valid: true }
    }

    // Validate teacher exists and is active
    const teacherValidation = await validateTeacherExists(teacherId)
    if (!teacherValidation.exists) {
      return { 
        valid: false, 
        error: teacherValidation.error || 'Teacher not found' 
      }
    }

    // Check if teacher is already assigned to another class
    const supabase = createClient()
    const { data: existingAssignment, error } = await supabase
      .from('classes')
      .select('id, name')
      .eq('class_teacher_id', teacherId)
      .neq('id', classId) // Exclude the current class
      .single()

    if (error && error.code !== 'PGRST116') {
      return { valid: false, error: error.message }
    }

    if (existingAssignment) {
      return { 
        valid: false, 
        error: `Teacher is already assigned to class: ${existingAssignment.name}` 
      }
    }

    return { valid: true }
  } catch (error) {
    return { 
      valid: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }
  }
}

/**
 * Safely assigns a teacher to a class with validation
 */
export async function safeAssignTeacher(
  classId: string, 
  teacherId: string | null
): Promise<{
  success: boolean
  error?: string
}> {
  try {
    // Validate the assignment
    const validation = await validateTeacherAssignment(classId, teacherId)
    if (!validation.valid) {
      return { success: false, error: validation.error }
    }

    // Perform the assignment
    const supabase = createClient()
    const { error } = await supabase
      .from('classes')
      .update({ 
        class_teacher_id: teacherId,
        updated_at: new Date().toISOString()
      })
      .eq('id', classId)

    if (error) {
      // Handle specific foreign key constraint error
      if (error.code === '23503' && error.message.includes('teachers')) {
        return { 
          success: false, 
          error: 'The selected teacher is not properly registered in the system. Please contact support.' 
        }
      }
      return { success: false, error: error.message }
    }

    return { success: true }
  } catch (error) {
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }
  }
}
