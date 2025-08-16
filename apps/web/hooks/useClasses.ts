import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from './useAuth'
import { toast } from 'sonner'
import type {
  Class,
  ClassEnrollment,
  Subject,
  ClassFilters,
  CreateClassData,
  UpdateClassData,
  ClassStats
} from '@repo/types'

interface UseClassesOptions {
  teacherId?: string
  studentId?: string
  isActive?: boolean
  limit?: number
  autoFetch?: boolean
  filters?: ClassFilters
}

// Cache configuration
const CACHE_DURATION = 5 * 60 * 1000 // 5 minutes
const CACHE_KEY = 'classes_data'

// Simple in-memory cache
let classesCache: {
  data: Class[]
  timestamp: number
} | null = null

export function useClasses(options: UseClassesOptions = {}) {
  const [classes, setClasses] = useState<ClassWithDetails[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const { hasPermission, user } = useAuth()

  const { teacherId, studentId, isActive = true, limit, autoFetch = true } = options

  const fetchClasses = useCallback(async () => {
    if (!hasPermission('classes', 'read')) {
      setError('Permission denied')
      return
    }

    setLoading(true)
    setError(null)

    try {
      let query = supabase
        .from('classes')
        .select(`
          *,
          teacher:profiles!classes_teacher_id_fkey(id, name, email),
          enrollments:class_enrollments(id, student_id, status)
        `)
        .order('created_at', { ascending: false })

      if (teacherId) {
        query = query.eq('teacher_id', teacherId)
      }

      if (isActive !== undefined) {
        query = query.eq('is_active', isActive)
      }

      if (limit) {
        query = query.limit(limit)
      }

      const { data, error: fetchError } = await query

      if (fetchError) throw fetchError

      // Process data to add enrollment counts
      const processedClasses = (data || []).map(classItem => ({
        ...classItem,
        enrollment_count: classItem.enrollments?.filter((e: ClassEnrollment) => e.status === 'active').length || 0
      }))

      // Filter by student enrollment if specified
      if (studentId) {
        const studentClasses = processedClasses.filter(classItem =>
          classItem.enrollments?.some((e: ClassEnrollment) => e.student_id === studentId && e.status === 'active')
        )
        setClasses(studentClasses)
      } else {
        setClasses(processedClasses)
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch classes'
      setError(errorMessage)
      console.error('Error fetching classes:', err)
    } finally {
      setLoading(false)
    }
  }, [teacherId, studentId, isActive, limit, hasPermission])

  const createClass = async (classData: CreateClassData) => {
    if (!hasPermission('classes', 'create')) {
      throw new Error('Permission denied')
    }

    setLoading(true)
    setError(null)

    try {
      const { data, error: createError } = await supabase
        .from('classes')
        .insert([{
          ...classData,
          max_students: classData.max_students || 30
        }])
        .select()
        .single()

      if (createError) throw createError

      // Refresh classes list
      await fetchClasses()

      return { data, error: null }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to create class'
      setError(errorMessage)
      return { data: null, error: errorMessage }
    } finally {
      setLoading(false)
    }
  }

  const updateClass = async (classId: string, updates: UpdateClassData) => {
    if (!hasPermission('classes', 'update')) {
      throw new Error('Permission denied')
    }

    setLoading(true)
    setError(null)

    try {
      const { data, error: updateError } = await supabase
        .from('classes')
        .update(updates)
        .eq('id', classId)
        .select()
        .single()

      if (updateError) throw updateError

      // Update local state
      setClasses(prevClasses =>
        prevClasses.map(classItem =>
          classItem.id === classId ? { ...classItem, ...data } : classItem
        )
      )

      return { data, error: null }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update class'
      setError(errorMessage)
      return { data: null, error: errorMessage }
    } finally {
      setLoading(false)
    }
  }

  const deleteClass = async (classId: string) => {
    if (!hasPermission('classes', 'delete')) {
      throw new Error('Permission denied')
    }

    setLoading(true)
    setError(null)

    try {
      const { error: deleteError } = await supabase
        .from('classes')
        .delete()
        .eq('id', classId)

      if (deleteError) throw deleteError

      // Update local state
      setClasses(prevClasses => prevClasses.filter(classItem => classItem.id !== classId))

      return { error: null }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to delete class'
      setError(errorMessage)
      return { error: errorMessage }
    } finally {
      setLoading(false)
    }
  }

  const enrollStudent = async (classId: string, studentId: string) => {
    if (!hasPermission('classes', 'update')) {
      throw new Error('Permission denied')
    }

    setLoading(true)
    setError(null)

    try {
      const { data, error: enrollError } = await supabase
        .from('class_enrollments')
        .insert([{
          class_id: classId,
          student_id: studentId,
          status: 'active'
        }])
        .select()
        .single()

      if (enrollError) throw enrollError

      // Refresh classes to update enrollment counts
      await fetchClasses()

      return { data, error: null }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to enroll student'
      setError(errorMessage)
      return { data: null, error: errorMessage }
    } finally {
      setLoading(false)
    }
  }

  const unenrollStudent = async (classId: string, studentId: string) => {
    if (!hasPermission('classes', 'update')) {
      throw new Error('Permission denied')
    }

    setLoading(true)
    setError(null)

    try {
      const { error: unenrollError } = await supabase
        .from('class_enrollments')
        .delete()
        .eq('class_id', classId)
        .eq('student_id', studentId)

      if (unenrollError) throw unenrollError

      // Refresh classes to update enrollment counts
      await fetchClasses()

      return { error: null }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to unenroll student'
      setError(errorMessage)
      return { error: errorMessage }
    } finally {
      setLoading(false)
    }
  }

  const getClassById = (classId: string) => {
    return classes.find(classItem => classItem.id === classId)
  }

  const getClassesByTeacher = (teacherId: string) => {
    return classes.filter(classItem => classItem.teacher_id === teacherId)
  }

  const getClassStats = () => {
    const stats = {
      total: classes.length,
      active: classes.filter(c => c.is_active).length,
      inactive: classes.filter(c => !c.is_active).length,
      totalEnrollments: classes.reduce((sum, c) => sum + (c.enrollment_count || 0), 0),
      averageEnrollment: classes.length > 0
        ? Math.round(classes.reduce((sum, c) => sum + (c.enrollment_count || 0), 0) / classes.length)
        : 0
    }

    return stats
  }

  const bulkEnrollStudents = async (classId: string, studentIds: string[]) => {
    if (!hasPermission('classes', 'update')) {
      throw new Error('Permission denied')
    }

    if (studentIds.length === 0) {
      throw new Error('No students selected')
    }

    setLoading(true)
    setError(null)

    try {
      // Get class info to check capacity
      const classInfo = getClassById(classId)
      if (!classInfo) {
        throw new Error('Class not found')
      }

      const availableSpots = (classInfo.max_students || 30) - (classInfo.enrollment_count || 0)
      if (studentIds.length > availableSpots) {
        throw new Error(`Class capacity exceeded. Only ${availableSpots} spots available.`)
      }

      // Create enrollment records
      const enrollments = studentIds.map(studentId => ({
        class_id: classId,
        student_id: studentId,
        status: 'active'
      }))

      const { error: enrollmentError } = await supabase
        .from('class_enrollments')
        .insert(enrollments)

      if (enrollmentError) throw enrollmentError

      // Update students table with class_id
      const { error: updateError } = await supabase
        .from('students')
        .update({ class_id: classId })
        .in('id', studentIds)

      if (updateError) throw updateError

      // Refresh classes to update enrollment counts
      await fetchClasses()

      return { error: null }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to enroll students'
      setError(errorMessage)
      return { error: errorMessage }
    } finally {
      setLoading(false)
    }
  }

  const bulkUnenrollStudents = async (classId: string, studentIds: string[]) => {
    if (!hasPermission('classes', 'update')) {
      throw new Error('Permission denied')
    }

    if (studentIds.length === 0) {
      throw new Error('No students selected')
    }

    setLoading(true)
    setError(null)

    try {
      // Remove enrollment records
      const { error: unenrollError } = await supabase
        .from('class_enrollments')
        .delete()
        .eq('class_id', classId)
        .in('student_id', studentIds)

      if (unenrollError) throw unenrollError

      // Clear class_id from students table
      const { error: updateError } = await supabase
        .from('students')
        .update({ class_id: null })
        .in('id', studentIds)

      if (updateError) throw updateError

      // Refresh classes to update enrollment counts
      await fetchClasses()

      return { error: null }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to unenroll students'
      setError(errorMessage)
      return { error: errorMessage }
    } finally {
      setLoading(false)
    }
  }

  // Auto-fetch on mount if enabled
  useEffect(() => {
    if (autoFetch) {
      fetchClasses()
    }
  }, [autoFetch, fetchClasses])

  return {
    // State
    classes,
    loading,
    error,

    // Actions
    fetchClasses,
    createClass,
    updateClass,
    deleteClass,
    enrollStudent,
    unenrollStudent,
    bulkEnrollStudents,
    bulkUnenrollStudents,

    // Utilities
    getClassById,
    getClassesByTeacher,
    getClassStats,

    // Computed
    totalClasses: classes.length,
    hasClasses: classes.length > 0
  }
}

// Specialized hook for teacher's classes
export function useTeacherClasses() {
  const { user } = useAuth()
  return useClasses({ 
    teacherId: user?.id,
    autoFetch: !!user?.id 
  })
}

// Specialized hook for student's classes
export function useStudentClasses() {
  const { user } = useAuth()
  return useClasses({ 
    studentId: user?.id,
    autoFetch: !!user?.id 
  })
}
