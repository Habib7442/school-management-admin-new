import { useState, useEffect, useCallback } from 'react'
import { useAuthStore } from '@/lib/store/authStore'
import { 
  ClassTeacherPermissions, 
  ClassTeacherAssignment, 
  ClassTeacherPermissionCheck,
  CLASS_TEACHER_PERMISSIONS,
  type ClassTeacherPermission
} from '@/lib/permissions/classTeacherPermissions'

interface UseClassTeacherPermissionsOptions {
  classId?: string
  autoFetch?: boolean
}

interface ClassTeacherPermissionsState {
  assignments: ClassTeacherAssignment[]
  isLoading: boolean
  error: string | null
}

export function useClassTeacherPermissions(options: UseClassTeacherPermissionsOptions = {}) {
  const { user } = useAuthStore()
  const { classId, autoFetch = true } = options
  
  const [state, setState] = useState<ClassTeacherPermissionsState>({
    assignments: [],
    isLoading: false,
    error: null
  })

  // Fetch user's class teacher assignments
  const fetchAssignments = useCallback(async () => {
    if (!user?.id) return

    setState(prev => ({ ...prev, isLoading: true, error: null }))

    try {
      const assignments = await ClassTeacherPermissions.getUserClassTeacherAssignments(user.id)
      setState(prev => ({ ...prev, assignments, isLoading: false }))
    } catch (error) {
      setState(prev => ({ 
        ...prev, 
        error: error instanceof Error ? error.message : 'Failed to fetch assignments',
        isLoading: false 
      }))
    }
  }, [user?.id])

  // Check if user is class teacher for a specific class
  const isClassTeacher = useCallback(async (targetClassId?: string): Promise<boolean> => {
    if (!user?.id) return false
    
    const checkClassId = targetClassId || classId
    if (!checkClassId) return false

    return ClassTeacherPermissions.isClassTeacher(user.id, checkClassId)
  }, [user?.id, classId])

  // Check if user has specific permission for a class
  const hasClassTeacherPermission = useCallback(async (
    permission: ClassTeacherPermission,
    targetClassId?: string
  ): Promise<boolean> => {
    if (!user?.id) return false
    
    const checkClassId = targetClassId || classId
    if (!checkClassId) return false

    return ClassTeacherPermissions.hasClassTeacherPermission(user.id, checkClassId, permission)
  }, [user?.id, classId])

  // Comprehensive permission check
  const checkPermission = useCallback(async (
    permission: ClassTeacherPermission,
    targetClassId?: string
  ): Promise<ClassTeacherPermissionCheck> => {
    if (!user?.id) {
      return { isClassTeacher: false, hasPermission: false }
    }
    
    const checkClassId = targetClassId || classId
    if (!checkClassId) {
      return { isClassTeacher: false, hasPermission: false }
    }

    return ClassTeacherPermissions.checkClassTeacherPermission(user.id, checkClassId, permission)
  }, [user?.id, classId])

  // Check multiple permissions at once
  const checkMultiplePermissions = useCallback(async (
    permissions: ClassTeacherPermission[],
    targetClassId?: string
  ): Promise<Record<string, boolean>> => {
    if (!user?.id) {
      return permissions.reduce((acc, permission) => {
        acc[permission] = false
        return acc
      }, {} as Record<string, boolean>)
    }
    
    const checkClassId = targetClassId || classId
    if (!checkClassId) {
      return permissions.reduce((acc, permission) => {
        acc[permission] = false
        return acc
      }, {} as Record<string, boolean>)
    }

    return ClassTeacherPermissions.checkMultipleClassTeacherPermissions(
      user.id, 
      checkClassId, 
      permissions
    )
  }, [user?.id, classId])

  // Get assignment for specific class
  const getClassAssignment = useCallback((targetClassId?: string): ClassTeacherAssignment | undefined => {
    const checkClassId = targetClassId || classId
    if (!checkClassId) return undefined
    
    return state.assignments.find(assignment => assignment.class_id === checkClassId)
  }, [state.assignments, classId])

  // Check if user is class teacher for any class
  const isClassTeacherForAnyClass = useCallback((): boolean => {
    return state.assignments.length > 0
  }, [state.assignments])

  // Get all classes where user is class teacher
  const getClassTeacherClasses = useCallback((): ClassTeacherAssignment[] => {
    return state.assignments
  }, [state.assignments])

  // Permission shortcuts for common operations
  const canUpdateStudents = useCallback((targetClassId?: string) => 
    hasClassTeacherPermission(CLASS_TEACHER_PERMISSIONS.UPDATE_CLASS_STUDENTS, targetClassId)
  , [hasClassTeacherPermission])

  const canEnrollStudents = useCallback((targetClassId?: string) => 
    hasClassTeacherPermission(CLASS_TEACHER_PERMISSIONS.ENROLL_TO_CLASS, targetClassId)
  , [hasClassTeacherPermission])

  const canUpdateTimetable = useCallback((targetClassId?: string) => 
    hasClassTeacherPermission(CLASS_TEACHER_PERMISSIONS.UPDATE_CLASS_SCHEDULE, targetClassId)
  , [hasClassTeacherPermission])

  const canAssignTeachers = useCallback((targetClassId?: string) => 
    hasClassTeacherPermission(CLASS_TEACHER_PERMISSIONS.ASSIGN_TEACHERS, targetClassId)
  , [hasClassTeacherPermission])

  const canManageClass = useCallback((targetClassId?: string) => 
    hasClassTeacherPermission(CLASS_TEACHER_PERMISSIONS.MANAGE_ASSIGNED_CLASS, targetClassId)
  , [hasClassTeacherPermission])

  const canViewAnalytics = useCallback((targetClassId?: string) => 
    hasClassTeacherPermission(CLASS_TEACHER_PERMISSIONS.VIEW_CLASS_ANALYTICS, targetClassId)
  , [hasClassTeacherPermission])

  // Auto-fetch assignments on mount
  useEffect(() => {
    if (autoFetch && user?.id) {
      fetchAssignments()
    }
  }, [autoFetch, user?.id, fetchAssignments])

  return {
    // State
    assignments: state.assignments,
    isLoading: state.isLoading,
    error: state.error,

    // Actions
    fetchAssignments,
    
    // Permission checks
    isClassTeacher,
    hasClassTeacherPermission,
    checkPermission,
    checkMultiplePermissions,
    
    // Utilities
    getClassAssignment,
    isClassTeacherForAnyClass,
    getClassTeacherClasses,
    
    // Permission shortcuts
    canUpdateStudents,
    canEnrollStudents,
    canUpdateTimetable,
    canAssignTeachers,
    canManageClass,
    canViewAnalytics
  }
}

// Hook for checking permissions for a specific class
export function useClassTeacherPermissionsForClass(classId: string) {
  return useClassTeacherPermissions({ classId, autoFetch: true })
}

// Hook for getting all class teacher assignments
export function useClassTeacherAssignments() {
  return useClassTeacherPermissions({ autoFetch: true })
}
