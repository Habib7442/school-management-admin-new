import { supabase } from '../supabase'

export interface ClassTeacherAssignment {
  class_id: string
  class_name: string
  grade_level: number
  section: string
  academic_year: string
  assigned_at: string
}

export interface ClassTeacherPermissionCheck {
  isClassTeacher: boolean
  hasPermission: boolean
  classAssignment?: ClassTeacherAssignment
}

/**
 * Class Teacher Permission utilities for mobile app
 */
export class ClassTeacherPermissions {
  
  /**
   * Check if a user is a class teacher for a specific class
   */
  static async isClassTeacher(userId: string, classId: string): Promise<boolean> {
    try {
      const { data, error } = await supabase.rpc('is_class_teacher', {
        p_user_id: userId,
        p_class_id: classId
      })

      if (error) {
        console.error('❌ Error checking class teacher status:', error)
        return false
      }

      return data || false
    } catch (error) {
      console.error('❌ Exception checking class teacher status:', error)
      return false
    }
  }

  /**
   * Check if a user has a specific class teacher permission for a class
   */
  static async hasClassTeacherPermission(
    userId: string, 
    classId: string, 
    permission: string
  ): Promise<boolean> {
    try {
      const { data, error } = await supabase.rpc('has_class_teacher_permission', {
        p_user_id: userId,
        p_class_id: classId,
        p_permission_name: permission
      })

      if (error) {
        console.error('❌ Error checking class teacher permission:', error)
        return false
      }

      return data || false
    } catch (error) {
      console.error('❌ Exception checking class teacher permission:', error)
      return false
    }
  }

  /**
   * Get all class teacher assignments for a user
   */
  static async getUserClassTeacherAssignments(userId: string): Promise<ClassTeacherAssignment[]> {
    try {
      const { data, error } = await supabase.rpc('get_user_class_teacher_assignments', {
        p_user_id: userId
      })

      if (error) {
        console.error('❌ Error fetching class teacher assignments:', error)
        return []
      }

      return data || []
    } catch (error) {
      console.error('❌ Exception fetching class teacher assignments:', error)
      return []
    }
  }

  /**
   * Comprehensive permission check for class teacher operations
   */
  static async checkClassTeacherPermission(
    userId: string,
    classId: string,
    permission: string
  ): Promise<ClassTeacherPermissionCheck> {
    try {
      const [isClassTeacher, hasPermission, assignments] = await Promise.all([
        this.isClassTeacher(userId, classId),
        this.hasClassTeacherPermission(userId, classId, permission),
        this.getUserClassTeacherAssignments(userId)
      ])

      const classAssignment = assignments.find(a => a.class_id === classId)

      return {
        isClassTeacher,
        hasPermission,
        classAssignment
      }
    } catch (error) {
      console.error('❌ Exception in comprehensive permission check:', error)
      return {
        isClassTeacher: false,
        hasPermission: false
      }
    }
  }

  /**
   * Check multiple class teacher permissions at once
   */
  static async checkMultipleClassTeacherPermissions(
    userId: string,
    classId: string,
    permissions: string[]
  ): Promise<Record<string, boolean>> {
    try {
      const results = await Promise.all(
        permissions.map(permission => 
          this.hasClassTeacherPermission(userId, classId, permission)
        )
      )

      return permissions.reduce((acc, permission, index) => {
        acc[permission] = results[index]
        return acc
      }, {} as Record<string, boolean>)
    } catch (error) {
      console.error('❌ Exception checking multiple permissions:', error)
      return permissions.reduce((acc, permission) => {
        acc[permission] = false
        return acc
      }, {} as Record<string, boolean>)
    }
  }
}

/**
 * Class Teacher Permission constants
 */
export const CLASS_TEACHER_PERMISSIONS = {
  // Student Management
  UPDATE_CLASS_STUDENTS: 'students.update_class_students',
  ENROLL_TO_CLASS: 'students.enroll_to_class',
  VIEW_CLASS_DETAILS: 'students.view_class_details',
  
  // Timetable Management
  UPDATE_CLASS_SCHEDULE: 'timetables.update_class_schedule',
  ASSIGN_TEACHERS: 'timetables.assign_teachers',
  
  // Class Management
  MANAGE_ASSIGNED_CLASS: 'classes.manage_assigned_class',
  VIEW_CLASS_ANALYTICS: 'classes.view_class_analytics'
} as const

export type ClassTeacherPermission = typeof CLASS_TEACHER_PERMISSIONS[keyof typeof CLASS_TEACHER_PERMISSIONS]

/**
 * React hook for class teacher permissions in mobile app
 */
export function useClassTeacherPermissions(classId?: string) {
  const [assignments, setAssignments] = React.useState<ClassTeacherAssignment[]>([])
  const [isLoading, setIsLoading] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)

  // Get current user from auth
  const getCurrentUser = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    return user
  }

  // Fetch user's class teacher assignments
  const fetchAssignments = React.useCallback(async () => {
    const user = await getCurrentUser()
    if (!user?.id) return

    setIsLoading(true)
    setError(null)

    try {
      const assignments = await ClassTeacherPermissions.getUserClassTeacherAssignments(user.id)
      setAssignments(assignments)
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to fetch assignments')
    } finally {
      setIsLoading(false)
    }
  }, [])

  // Check if user is class teacher for a specific class
  const isClassTeacher = React.useCallback(async (targetClassId?: string): Promise<boolean> => {
    const user = await getCurrentUser()
    if (!user?.id) return false
    
    const checkClassId = targetClassId || classId
    if (!checkClassId) return false

    return ClassTeacherPermissions.isClassTeacher(user.id, checkClassId)
  }, [classId])

  // Check if user has specific permission for a class
  const hasClassTeacherPermission = React.useCallback(async (
    permission: ClassTeacherPermission,
    targetClassId?: string
  ): Promise<boolean> => {
    const user = await getCurrentUser()
    if (!user?.id) return false
    
    const checkClassId = targetClassId || classId
    if (!checkClassId) return false

    return ClassTeacherPermissions.hasClassTeacherPermission(user.id, checkClassId, permission)
  }, [classId])

  // Permission shortcuts for common operations
  const canUpdateStudents = React.useCallback((targetClassId?: string) => 
    hasClassTeacherPermission(CLASS_TEACHER_PERMISSIONS.UPDATE_CLASS_STUDENTS, targetClassId)
  , [hasClassTeacherPermission])

  const canEnrollStudents = React.useCallback((targetClassId?: string) => 
    hasClassTeacherPermission(CLASS_TEACHER_PERMISSIONS.ENROLL_TO_CLASS, targetClassId)
  , [hasClassTeacherPermission])

  const canUpdateTimetable = React.useCallback((targetClassId?: string) => 
    hasClassTeacherPermission(CLASS_TEACHER_PERMISSIONS.UPDATE_CLASS_SCHEDULE, targetClassId)
  , [hasClassTeacherPermission])

  const canManageClass = React.useCallback((targetClassId?: string) => 
    hasClassTeacherPermission(CLASS_TEACHER_PERMISSIONS.MANAGE_ASSIGNED_CLASS, targetClassId)
  , [hasClassTeacherPermission])

  // Auto-fetch assignments on mount
  React.useEffect(() => {
    fetchAssignments()
  }, [fetchAssignments])

  return {
    // State
    assignments,
    isLoading,
    error,

    // Actions
    fetchAssignments,
    
    // Permission checks
    isClassTeacher,
    hasClassTeacherPermission,
    
    // Permission shortcuts
    canUpdateStudents,
    canEnrollStudents,
    canUpdateTimetable,
    canManageClass
  }
}

// Import React for the hook
import React from 'react'
