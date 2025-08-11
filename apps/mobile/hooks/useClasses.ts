import { useState, useEffect, useCallback } from 'react'
import { Alert } from 'react-native'
import { supabase } from '@/lib/supabase'
import { useAuth } from './useAuth'
import type { Class, ClassEnrollment } from '@repo/types'

interface UseClassesOptions {
  teacherId?: string
  studentId?: string
  isActive?: boolean
  limit?: number
  autoFetch?: boolean
  enableOffline?: boolean
}

interface CreateClassData {
  name: string
  description?: string
  subject: string
  grade_level: string
  teacher_id?: string
  max_students?: number
}

interface UpdateClassData {
  name?: string
  description?: string
  subject?: string
  grade_level?: string
  teacher_id?: string
  max_students?: number
  is_active?: boolean
}

interface ClassWithDetails extends Class {
  teacher?: {
    id: string
    name: string
    email: string
  }
  enrollment_count?: number
  enrollments?: ClassEnrollment[]
}

export function useClasses(options: UseClassesOptions = {}) {
  const [classes, setClasses] = useState<ClassWithDetails[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [refreshing, setRefreshing] = useState(false)
  const { hasPermission, user } = useAuth()

  const { teacherId, studentId, isActive = true, limit, autoFetch = true, enableOffline = true } = options

  const fetchClasses = useCallback(async (isRefresh = false) => {
    if (!hasPermission('classes', 'read')) {
      setError('Permission denied')
      return
    }

    if (isRefresh) {
      setRefreshing(true)
    } else {
      setLoading(true)
    }
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
        enrollment_count: classItem.enrollments?.filter(e => e.status === 'active').length || 0
      }))

      // Filter by student enrollment if specified
      if (studentId) {
        const studentClasses = processedClasses.filter(classItem =>
          classItem.enrollments?.some(e => e.student_id === studentId && e.status === 'active')
        )
        setClasses(studentClasses)
      } else {
        setClasses(processedClasses)
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch classes'
      setError(errorMessage)
      console.error('Error fetching classes:', err)
      
      // Show mobile-friendly error
      Alert.alert('Error', errorMessage)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [teacherId, studentId, isActive, limit, hasPermission])

  const createClass = async (classData: CreateClassData) => {
    if (!hasPermission('classes', 'create')) {
      Alert.alert('Permission Denied', 'You do not have permission to create classes')
      return { data: null, error: 'Permission denied' }
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

      Alert.alert('Success', 'Class created successfully')
      return { data, error: null }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to create class'
      setError(errorMessage)
      Alert.alert('Error', errorMessage)
      return { data: null, error: errorMessage }
    } finally {
      setLoading(false)
    }
  }

  const updateClass = async (classId: string, updates: UpdateClassData) => {
    if (!hasPermission('classes', 'update')) {
      Alert.alert('Permission Denied', 'You do not have permission to update classes')
      return { data: null, error: 'Permission denied' }
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

      Alert.alert('Success', 'Class updated successfully')
      return { data, error: null }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update class'
      setError(errorMessage)
      Alert.alert('Error', errorMessage)
      return { data: null, error: errorMessage }
    } finally {
      setLoading(false)
    }
  }

  const deleteClass = async (classId: string) => {
    if (!hasPermission('classes', 'delete')) {
      Alert.alert('Permission Denied', 'You do not have permission to delete classes')
      return { error: 'Permission denied' }
    }

    return new Promise<{ error: string | null }>((resolve) => {
      Alert.alert(
        'Confirm Delete',
        'Are you sure you want to delete this class? This action cannot be undone.',
        [
          {
            text: 'Cancel',
            style: 'cancel',
            onPress: () => resolve({ error: 'Cancelled' })
          },
          {
            text: 'Delete',
            style: 'destructive',
            onPress: async () => {
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

                Alert.alert('Success', 'Class deleted successfully')
                resolve({ error: null })
              } catch (err) {
                const errorMessage = err instanceof Error ? err.message : 'Failed to delete class'
                setError(errorMessage)
                Alert.alert('Error', errorMessage)
                resolve({ error: errorMessage })
              } finally {
                setLoading(false)
              }
            }
          }
        ]
      )
    })
  }

  const enrollStudent = async (classId: string, studentId: string) => {
    if (!hasPermission('classes', 'update')) {
      Alert.alert('Permission Denied', 'You do not have permission to enroll students')
      return { data: null, error: 'Permission denied' }
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

      Alert.alert('Success', 'Student enrolled successfully')
      return { data, error: null }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to enroll student'
      setError(errorMessage)
      Alert.alert('Error', errorMessage)
      return { data: null, error: errorMessage }
    } finally {
      setLoading(false)
    }
  }

  const unenrollStudent = async (classId: string, studentId: string) => {
    if (!hasPermission('classes', 'update')) {
      Alert.alert('Permission Denied', 'You do not have permission to unenroll students')
      return { error: 'Permission denied' }
    }

    return new Promise<{ error: string | null }>((resolve) => {
      Alert.alert(
        'Confirm Unenroll',
        'Are you sure you want to unenroll this student from the class?',
        [
          {
            text: 'Cancel',
            style: 'cancel',
            onPress: () => resolve({ error: 'Cancelled' })
          },
          {
            text: 'Unenroll',
            style: 'destructive',
            onPress: async () => {
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

                Alert.alert('Success', 'Student unenrolled successfully')
                resolve({ error: null })
              } catch (err) {
                const errorMessage = err instanceof Error ? err.message : 'Failed to unenroll student'
                setError(errorMessage)
                Alert.alert('Error', errorMessage)
                resolve({ error: errorMessage })
              } finally {
                setLoading(false)
              }
            }
          }
        ]
      )
    })
  }

  const refreshClasses = async () => {
    await fetchClasses(true)
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
    refreshing,

    // Actions
    fetchClasses,
    refreshClasses,
    createClass,
    updateClass,
    deleteClass,
    enrollStudent,
    unenrollStudent,

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
    autoFetch: !!user?.id,
    enableOffline: true
  })
}

// Specialized hook for student's classes
export function useStudentClasses() {
  const { user } = useAuth()
  return useClasses({ 
    studentId: user?.id,
    autoFetch: !!user?.id,
    enableOffline: true
  })
}
