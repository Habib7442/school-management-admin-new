'use client'

import { useState, useEffect, useMemo } from 'react'
import AdminLayout from '@/components/admin/AdminLayout'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/lib/stores/auth-store'
import { usePermissions } from '@/hooks/usePermissions'
import { toast } from 'sonner'
import { StudentAssignmentModal } from '@/components/admin/StudentAssignmentModal'
import type { Class, Subject, CreateClassData, UpdateClassData, ClassFilters } from '@repo/types'

// Cache configuration
const CACHE_DURATION = 5 * 60 * 1000 // 5 minutes
const CACHE_KEY = 'classes_management_data'

// Simple in-memory cache
let classesCache: {
  data: Class[]
  subjects: Subject[]
  timestamp: number
} | null = null

export default function ClassManagement() {
  const [classes, setClasses] = useState<Class[]>([])
  const [subjects, setSubjects] = useState<Subject[]>([])
  const [teachers, setTeachers] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState<Record<string, boolean>>({})
  const [lastFetch, setLastFetch] = useState<number>(0)

  // UI State
  const [activeTab, setActiveTab] = useState('overview')
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [showTeacherAssignModal, setShowTeacherAssignModal] = useState(false)
  const [showStudentAssignModal, setShowStudentAssignModal] = useState(false)
  const [selectedClass, setSelectedClass] = useState<Class | null>(null)
  const [classToDelete, setClassToDelete] = useState<Class | null>(null)

  // Filter State
  const [filters, setFilters] = useState<ClassFilters>({
    search: '',
    grade_level: undefined,
    section: undefined,
    teacher_id: undefined,
    academic_year: undefined,
    is_active: undefined, // Show all classes by default (active and inactive)
    has_teacher: undefined,
    enrollment_status: undefined
  })

  const { user } = useAuthStore()
  const { canCreateClasses, canUpdateClasses, canDeleteClasses } = usePermissions()

  // Initialize cache from localStorage and fetch data
  useEffect(() => {
    // Only fetch if we have user data
    if (!user?.school_id) {
      console.log('⏳ Waiting for user data...')
      return
    }

    try {
      const cachedData = localStorage.getItem(CACHE_KEY)
      if (cachedData) {
        const parsed = JSON.parse(cachedData)
        if (parsed.data && Array.isArray(parsed.data)) {
          const now = Date.now()
          if ((now - parsed.timestamp) < CACHE_DURATION) {
            classesCache = parsed
            console.log('📦 Initialized classes cache from localStorage')
          }
        }
      }
    } catch (e) {
      console.warn('Failed to initialize classes cache from localStorage:', e)
    }

    // Clear any stale cache and fetch fresh data
    console.log('🔄 Initial data fetch for school:', user.school_id)
    fetchData(true) // Force fresh fetch on mount
  }, [user?.school_id]) // Only re-run when school_id changes

  const fetchData = async (forceRefresh = false) => {
    console.log('🚀 fetchData called with forceRefresh:', forceRefresh)

    try {
      const now = Date.now()

      // Check if we have valid cached data and don't need to force refresh
      if (!forceRefresh && classesCache && (now - classesCache.timestamp) < CACHE_DURATION) {
        console.log('📦 Using cached classes data')
        setClasses(classesCache.data)
        setSubjects(classesCache.subjects)
        setLastFetch(classesCache.timestamp)
        setLoading(false)
        return
      }

      console.log('🔄 Fetching fresh classes data from API')
      setLoading(true)

      // Ensure we have user data
      if (!user?.school_id) {
        console.warn('No user or school_id available')
        setLoading(false)
        return
      }

      // Fetch classes with related data using optimized caching
      const classesResponse = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/classes?school_id=eq.${user.school_id}&order=grade_level.asc,section.asc&select=*`, {
        headers: {
          'apikey': process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
          'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`,
          'Content-Type': 'application/json'
        },
        // Use Next.js Data Cache with 5-minute revalidation
        next: {
          revalidate: 300, // 5 minutes
          tags: [`classes-${user.school_id}`] // Tag for targeted invalidation
        }
      })

      if (!classesResponse.ok) {
        throw new Error(`Failed to fetch classes: ${classesResponse.statusText}`)
      }

      const classesData = await classesResponse.json()

      // Remove old error handling as we're now using fetch

      // Fetch teacher data separately if needed
      let teacherData: Record<string, any> = {}
      if (classesData && classesData.length > 0) {
        const teacherIds = classesData
          .map(c => c.class_teacher_id || c.teacher_id) // Handle both column names
          .filter(Boolean)

        if (teacherIds.length > 0) {
          const { data: teachers } = await supabase
            .from('profiles')
            .select('id, name, email')
            .in('id', teacherIds)
            .eq('role', 'teacher')

          if (teachers) {
            teacherData = teachers.reduce((acc, teacher) => {
              acc[teacher.id] = teacher
              return acc
            }, {})
          }
        }
      }

      // Fetch subjects
      const { data: subjectsData, error: subjectsError } = await supabase
        .from('subjects')
        .select('*')
        .eq('school_id', user.school_id)
        .eq('is_active', true)
        .order('name')

      if (subjectsError) {
        console.error('Error fetching subjects:', subjectsError)
        throw subjectsError
      }

      // Fetch teachers
      const { data: teachersData, error: teachersError } = await supabase
        .from('profiles')
        .select('id, name, email')
        .eq('role', 'teacher')
        .eq('school_id', user.school_id)
        .order('name')

      if (teachersError) {
        console.error('Error fetching teachers:', teachersError)
        throw teachersError
      }

      // Get enrollment counts separately
      let enrollmentCounts: Record<string, number> = {}
      if (classesData && classesData.length > 0) {
        try {
          const { data: enrollments } = await supabase
            .from('class_enrollments')
            .select('class_id')
            .in('class_id', classesData.map(c => c.id))

          if (enrollments) {
            enrollmentCounts = enrollments.reduce((acc, enrollment) => {
              acc[enrollment.class_id] = (acc[enrollment.class_id] || 0) + 1
              return acc
            }, {} as Record<string, number>)
          }
        } catch (enrollmentError) {
          console.warn('Could not fetch enrollment counts:', enrollmentError)
          // Continue without enrollment counts
        }
      }

      // Transform classes data
      const transformedClasses = (classesData || []).map(classItem => ({
        ...classItem,
        teacher: teacherData[classItem.class_teacher_id || classItem.teacher_id] || null,
        enrollment_count: enrollmentCounts[classItem.id] || 0,
        subjects: [] // We'll add subjects later if needed
      }))

      console.log('✅ Successfully fetched data:', {
        classes: transformedClasses.length,
        subjects: subjectsData?.length || 0,
        teachers: teachersData?.length || 0
      })

      // Update cache
      classesCache = {
        data: transformedClasses,
        subjects: subjectsData || [],
        timestamp: now
      }

      setClasses(transformedClasses)
      setSubjects(subjectsData || [])
      setTeachers(teachersData || [])
      setLastFetch(now)

      // Store in localStorage as backup cache
      try {
        localStorage.setItem(CACHE_KEY, JSON.stringify({
          data: transformedClasses,
          subjects: subjectsData || [],
          timestamp: now
        }))
        console.log('💾 Classes cache stored in localStorage')
      } catch (e) {
        console.warn('Failed to store classes cache in localStorage:', e)
      }

    } catch (error) {
      console.error('❌ Error fetching data:', error)

      // Only show error toast if it's not a permission error
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      if (!errorMessage.includes('permission') && !errorMessage.includes('RLS')) {
        toast.error(`Failed to load data: ${errorMessage}`)
      }

      // Try to load from localStorage cache as fallback
      try {
        const cachedData = localStorage.getItem(CACHE_KEY)
        if (cachedData) {
          const parsed = JSON.parse(cachedData)
          if (parsed.data && Array.isArray(parsed.data)) {
            console.log('📦 Using localStorage fallback cache')
            setClasses(parsed.data)
            setSubjects(parsed.subjects || [])
            setTeachers([]) // Reset teachers on error
            setLastFetch(parsed.timestamp)
            toast.info('Showing cached data due to network error')
          }
        } else {
          // No cache available, set empty state
          setClasses([])
          setSubjects([])
          setTeachers([])
        }
      } catch (e) {
        console.warn('Failed to load fallback cache:', e)
        // Set empty state as final fallback
        setClasses([])
        setSubjects([])
        setTeachers([])
      }
    } finally {
      console.log('🏁 fetchData completed, setting loading to false')
      setLoading(false)
    }
  }

  // Memoized filtered classes for better performance
  const filteredClasses = useMemo(() => {
    return classes.filter(classItem => {
      // Search filter
      if (filters.search) {
        const searchTerm = filters.search.toLowerCase()
        const matchesSearch =
          classItem.name.toLowerCase().includes(searchTerm) ||
          classItem.section?.toLowerCase().includes(searchTerm) ||
          classItem.teacher?.name?.toLowerCase().includes(searchTerm) ||
          classItem.room_number?.toLowerCase().includes(searchTerm) ||
          classItem.subjects?.some(subject =>
            subject.name.toLowerCase().includes(searchTerm) ||
            subject.code.toLowerCase().includes(searchTerm)
          )
        if (!matchesSearch) return false
      }

      // Grade level filter
      if (filters.grade_level && classItem.grade_level !== filters.grade_level) {
        return false
      }

      // Section filter
      if (filters.section && classItem.section !== filters.section) {
        return false
      }

      // Teacher filter
      if (filters.teacher_id && classItem.class_teacher_id !== filters.teacher_id) {
        return false
      }

      // Academic year filter
      if (filters.academic_year && classItem.academic_year !== filters.academic_year) {
        return false
      }

      // Active status filter
      if (filters.is_active !== undefined && classItem.is_active !== filters.is_active) {
        return false
      }

      // Has teacher filter
      if (filters.has_teacher !== undefined) {
        const hasTeacher = !!classItem.class_teacher_id
        if (hasTeacher !== filters.has_teacher) return false
      }

      // Enrollment status filter
      if (filters.enrollment_status) {
        const enrollmentCount = classItem.enrollment_count || 0
        const capacity = classItem.capacity || classItem.max_students || 30

        switch (filters.enrollment_status) {
          case 'full':
            if (enrollmentCount < capacity) return false
            break
          case 'available':
            if (enrollmentCount === 0 || enrollmentCount >= capacity) return false
            break
          case 'empty':
            if (enrollmentCount > 0) return false
            break
        }
      }

      return true
    })
  }, [classes, filters])

  const getStatusColor = (isActive: boolean) => {
    return isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
  }

  const getEnrollmentStatusColor = (enrollmentCount: number, capacity: number) => {
    const percentage = (enrollmentCount / capacity) * 100
    if (percentage >= 100) return 'bg-red-100 text-red-800'
    if (percentage >= 80) return 'bg-yellow-100 text-yellow-800'
    if (percentage > 0) return 'bg-blue-100 text-blue-800'
    return 'bg-gray-100 text-gray-800'
  }

  // CRUD Operations
  const handleCreateClass = async (classData: CreateClassData) => {
    if (!canCreateClasses || !user?.school_id) {
      toast.error('Permission denied or missing school information')
      return { error: 'Permission denied' }
    }

    const actionKey = 'create-class'
    setActionLoading(prev => ({ ...prev, [actionKey]: true }))

    try {
      const { data, error } = await supabase
        .from('classes')
        .insert([{
          ...classData,
          school_id: user.school_id,
          max_students: classData.capacity || 30,
          is_active: true
        }])
        .select()
        .single()

      if (error) throw error

      toast.success('Class created successfully', {
        description: `${classData.name} - Grade ${classData.grade_level}${classData.section}`
      })

      setShowCreateModal(false)

      // Add a small delay before refresh to ensure data is committed
      setTimeout(() => {
        fetchData(true) // Force refresh
      }, 500)

      return { data, error: null }
    } catch (error) {
      console.error('Error creating class:', error)
      const errorMessage = error instanceof Error ? error.message : 'Failed to create class'
      toast.error('Failed to create class', {
        description: errorMessage
      })
      return { data: null, error: errorMessage }
    } finally {
      setActionLoading(prev => ({ ...prev, [actionKey]: false }))
    }
  }

  const handleUpdateClass = async (classId: string, updates: UpdateClassData) => {
    if (!canUpdateClasses) {
      toast.error('Permission denied')
      return { error: 'Permission denied' }
    }

    const actionKey = `update-${classId}`
    setActionLoading(prev => ({ ...prev, [actionKey]: true }))

    try {
      const { data, error } = await supabase
        .from('classes')
        .update(updates)
        .eq('id', classId)
        .select()
        .single()

      if (error) throw error

      toast.success('Class updated successfully')
      setShowEditModal(false)
      setSelectedClass(null)
      fetchData(true) // Force refresh
      return { data, error: null }
    } catch (error) {
      console.error('Error updating class:', error)
      const errorMessage = error instanceof Error ? error.message : 'Failed to update class'
      toast.error('Failed to update class', {
        description: errorMessage
      })
      return { data: null, error: errorMessage }
    } finally {
      setActionLoading(prev => ({ ...prev, [actionKey]: false }))
    }
  }

  const handleDeleteClass = async () => {
    if (!classToDelete || !canDeleteClasses) {
      toast.error('Permission denied')
      return
    }

    const actionKey = `delete-${classToDelete.id}`
    setActionLoading(prev => ({ ...prev, [actionKey]: true }))

    try {
      const { error } = await supabase
        .from('classes')
        .delete()
        .eq('id', classToDelete.id)

      if (error) throw error

      toast.success('Class deleted successfully', {
        description: `${classToDelete.name} has been removed`
      })

      setShowDeleteDialog(false)
      setClassToDelete(null)
      fetchData(true) // Force refresh
    } catch (error) {
      console.error('Error deleting class:', error)
      const errorMessage = error instanceof Error ? error.message : 'Failed to delete class'
      toast.error('Failed to delete class', {
        description: errorMessage
      })
    } finally {
      setActionLoading(prev => ({ ...prev, [actionKey]: false }))
    }
  }

  const handleAssignTeacher = async (classId: string, teacherId: string | null) => {
    if (!canUpdateClasses) {
      toast.error('Permission denied')
      return
    }

    const actionKey = `assign-teacher-${classId}`
    setActionLoading(prev => ({ ...prev, [actionKey]: true }))

    try {
      const { error } = await supabase
        .from('classes')
        .update({ class_teacher_id: teacherId })
        .eq('id', classId)

      if (error) throw error

      const teacherName = teacherId
        ? teachers.find(t => t.id === teacherId)?.name || 'Unknown Teacher'
        : 'No Teacher'

      toast.success('Teacher assignment updated', {
        description: `Class teacher set to: ${teacherName}`
      })

      setShowTeacherAssignModal(false)
      setSelectedClass(null)
      fetchData(true) // Force refresh
    } catch (error) {
      console.error('Error assigning teacher:', error)
      const errorMessage = error instanceof Error ? error.message : 'Failed to assign teacher'
      toast.error('Failed to assign teacher', {
        description: errorMessage
      })
    } finally {
      setActionLoading(prev => ({ ...prev, [actionKey]: false }))
    }
  }

  const handleToggleClassStatus = async (classItem: Class) => {
    if (!canUpdateClasses) {
      toast.error('Permission denied')
      return
    }

    const actionKey = `toggle-${classItem.id}`
    setActionLoading(prev => ({ ...prev, [actionKey]: true }))

    try {
      const newStatus = !classItem.is_active
      const { error } = await supabase
        .from('classes')
        .update({ is_active: newStatus })
        .eq('id', classItem.id)

      if (error) throw error

      toast.success(`Class ${newStatus ? 'activated' : 'deactivated'} successfully`, {
        description: `${classItem.name} is now ${newStatus ? 'active' : 'inactive'}`
      })

      fetchData(true) // Force refresh
    } catch (error) {
      console.error('Error toggling class status:', error)
      const errorMessage = error instanceof Error ? error.message : 'Failed to update class status'
      toast.error('Failed to update class status', {
        description: errorMessage
      })
    } finally {
      setActionLoading(prev => ({ ...prev, [actionKey]: false }))
    }
  }

  return (
    <AdminLayout title="Class Management">
      <div className="space-y-6">
        {/* Header Actions */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="flex flex-col sm:flex-row gap-4 flex-1">
            <div className="flex-1 max-w-sm">
              <Input
                placeholder="Search classes..."
                value={filters.search || ''}
                onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
                className="w-full"
              />
            </div>
            <Select
              value={filters.grade_level?.toString() || 'all'}
              onValueChange={(value) => setFilters(prev => ({
                ...prev,
                grade_level: value === 'all' ? undefined : parseInt(value)
              }))}
            >
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="All Grades" />
              </SelectTrigger>
              <SelectContent className="max-h-[300px] overflow-y-auto" position="popper" sideOffset={4}>
                <SelectItem value="all">All Grades</SelectItem>
                {Array.from({ length: 12 }, (_, i) => i + 1).map(grade => (
                  <SelectItem key={grade} value={grade.toString()}>
                    Grade {grade}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select
              value={filters.section || 'all'}
              onValueChange={(value) => setFilters(prev => ({
                ...prev,
                section: value === 'all' ? undefined : value
              }))}
            >
              <SelectTrigger className="w-[120px]">
                <SelectValue placeholder="All Sections" />
              </SelectTrigger>
              <SelectContent className="max-h-[200px] overflow-y-auto" position="popper" sideOffset={4}>
                <SelectItem value="all">All Sections</SelectItem>
                {['A', 'B', 'C', 'D', 'E'].map(section => (
                  <SelectItem key={section} value={section}>
                    Section {section}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Active/Inactive Filter */}
            <Select
              value={filters.is_active === undefined ? 'all' : filters.is_active ? 'active' : 'inactive'}
              onValueChange={(value) => setFilters(prev => ({
                ...prev,
                is_active: value === 'all' ? undefined : value === 'active'
              }))}
            >
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent className="max-h-[200px] overflow-y-auto" position="popper" sideOffset={4}>
                <SelectItem value="all">All Classes</SelectItem>
                <SelectItem value="active">Active Only</SelectItem>
                <SelectItem value="inactive">Inactive Only</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              onClick={() => {
                console.log('🔄 Manual refresh triggered')
                fetchData(true)
              }}
              disabled={loading}
              className="flex items-center space-x-2"
            >
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                  <span>Refreshing...</span>
                </>
              ) : (
                <>
                  <span>🔄</span>
                  <span>Refresh</span>
                </>
              )}
            </Button>
            {canCreateClasses && (
              <Button
                onClick={() => setShowCreateModal(true)}
                className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
              >
                Create Class
              </Button>
            )}
          </div>
        </div>

        {/* Main Content with Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="classes">Classes</TabsTrigger>
            <TabsTrigger value="teachers">Teacher Assignment</TabsTrigger>
            <TabsTrigger value="analytics">Analytics</TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-gray-600">Total Classes</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-blue-600">{classes.length}</div>
                  <p className="text-xs text-gray-500 mt-1">
                    {classes.filter(c => c.is_active).length} active
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-gray-600">Total Students</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-green-600">
                    {classes.reduce((sum, c) => sum + (c.enrollment_count || 0), 0)}
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    Across all classes
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-gray-600">Available Teachers</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-purple-600">{teachers.length}</div>
                  <p className="text-xs text-gray-500 mt-1">
                    {classes.filter(c => c.class_teacher_id).length} assigned
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-gray-600">Capacity Utilization</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-orange-600">
                    {classes.length > 0
                      ? Math.round((classes.reduce((sum, c) => sum + (c.enrollment_count || 0), 0) /
                          classes.reduce((sum, c) => sum + (c.max_students || 30), 0)) * 100)
                      : 0}%
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    Overall utilization
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Recent Classes */}
            <Card>
              <CardHeader>
                <CardTitle>Recent Classes</CardTitle>
                <CardDescription>Latest class additions and updates</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {classes.slice(0, 5).map((classItem) => (
                    <div key={classItem.id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-500 rounded-lg flex items-center justify-center text-white font-semibold">
                          {classItem.grade_level}
                        </div>
                        <div>
                          <p className="font-medium">{classItem.name}</p>
                          <p className="text-sm text-gray-500">
                            Grade {classItem.grade_level} • Section {classItem.section}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-medium">
                          {classItem.enrollment_count || 0}/{classItem.max_students || 30}
                        </p>
                        <p className="text-xs text-gray-500">
                          {classItem.teacher?.name || 'No teacher'}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Classes Tab */}
          <TabsContent value="classes" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {loading ? (
                <div className="col-span-full text-center py-8">Loading classes...</div>
              ) : filteredClasses.length === 0 ? (
                <div className="col-span-full text-center py-8 text-gray-500">
                  No classes found matching your criteria.
                </div>
              ) : (
                filteredClasses.map((classItem) => (
                  <Card key={classItem.id} className={`hover:shadow-lg transition-shadow ${!classItem.is_active ? 'opacity-75 border-gray-300' : ''}`}>
                    <CardHeader>
                      <div className="flex justify-between items-start">
                        <div>
                          <CardTitle className={`text-lg ${!classItem.is_active ? 'text-gray-600' : ''}`}>
                            {classItem.name}
                            {!classItem.is_active && <span className="text-red-500 ml-2">(Inactive)</span>}
                          </CardTitle>
                          <CardDescription>
                            Grade {classItem.grade_level} • Section {classItem.section}
                          </CardDescription>
                        </div>
                        <div className="flex flex-col items-end space-y-1">
                          <Badge variant={classItem.is_active ? "default" : "secondary"}
                                 className={classItem.is_active ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}>
                            {classItem.is_active ? 'Active' : 'Inactive'}
                          </Badge>
                          <Badge
                            variant="outline"
                            className={getEnrollmentStatusColor(
                              classItem.enrollment_count || 0,
                              classItem.max_students || 30
                            )}
                          >
                            {classItem.enrollment_count || 0}/{classItem.max_students || 30}
                          </Badge>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-gray-500">Class Teacher:</span>
                          <span className="font-medium">
                            {classItem.teacher?.name || 'Not assigned'}
                          </span>
                        </div>

                        {classItem.room_number && (
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-gray-500">Room:</span>
                            <span className="font-medium">{classItem.room_number}</span>
                          </div>
                        )}

                        <div className="flex items-center justify-between text-sm">
                          <span className="text-gray-500">Academic Year:</span>
                          <span className="font-medium">{classItem.academic_year}</span>
                        </div>

                        {classItem.subjects && classItem.subjects.length > 0 && (
                          <div>
                            <span className="text-sm text-gray-500">Subjects:</span>
                            <div className="flex flex-wrap gap-1 mt-1">
                              {classItem.subjects.slice(0, 3).map((subject) => (
                                <Badge key={subject.id} variant="outline" className="text-xs">
                                  {subject.code}
                                </Badge>
                              ))}
                              {classItem.subjects.length > 3 && (
                                <Badge variant="outline" className="text-xs">
                                  +{classItem.subjects.length - 3}
                                </Badge>
                              )}
                            </div>
                          </div>
                        )}

                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div
                            className="bg-blue-600 h-2 rounded-full"
                            style={{
                              width: `${Math.min(((classItem.enrollment_count || 0) / (classItem.max_students || 30)) * 100, 100)}%`
                            }}
                          ></div>
                        </div>

                        <div className="flex justify-end space-x-2 pt-2">
                          {canUpdateClasses && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setSelectedClass(classItem)
                                setShowEditModal(true)
                              }}
                            >
                              Edit
                            </Button>
                          )}
                          {canUpdateClasses && classItem.is_active && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setSelectedClass(classItem)
                                setShowStudentAssignModal(true)
                              }}
                              className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                            >
                              Assign Students
                            </Button>
                          )}
                          {canUpdateClasses && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleToggleClassStatus(classItem)}
                              disabled={actionLoading[`toggle-${classItem.id}`]}
                              className={classItem.is_active
                                ? "text-orange-600 hover:text-orange-700 hover:bg-orange-50"
                                : "text-green-600 hover:text-green-700 hover:bg-green-50"
                              }
                            >
                              {actionLoading[`toggle-${classItem.id}`] ? (
                                <div className="flex items-center space-x-1">
                                  <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-current"></div>
                                  <span>...</span>
                                </div>
                              ) : (
                                classItem.is_active ? 'Deactivate' : 'Activate'
                              )}
                            </Button>
                          )}
                          {canDeleteClasses && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setClassToDelete(classItem)
                                setShowDeleteDialog(true)
                              }}
                              className="text-red-600 hover:text-red-700 hover:bg-red-50"
                            >
                              Delete
                            </Button>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          </TabsContent>

          {/* Teacher Assignment Tab */}
          <TabsContent value="teachers" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Class Teacher Assignments</CardTitle>
                <CardDescription>
                  Manage class teacher assignments and view teacher workload
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {classes.map((classItem) => (
                    <div key={classItem.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex items-center space-x-4">
                        <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-purple-500 rounded-lg flex items-center justify-center text-white font-bold">
                          {classItem.grade_level}{classItem.section}
                        </div>
                        <div>
                          <h3 className="font-medium">{classItem.name}</h3>
                          <p className="text-sm text-gray-500">
                            Grade {classItem.grade_level} • Section {classItem.section} •
                            {classItem.enrollment_count || 0} students
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-3">
                        <div className="text-right">
                          <p className="font-medium">
                            {classItem.teacher?.name || 'No Teacher Assigned'}
                          </p>
                          {classItem.teacher && (
                            <p className="text-sm text-gray-500">{classItem.teacher.email}</p>
                          )}
                        </div>
                        {canUpdateClasses && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setSelectedClass(classItem)
                              setShowTeacherAssignModal(true)
                            }}
                            disabled={actionLoading[`assign-teacher-${classItem.id}`]}
                          >
                            {actionLoading[`assign-teacher-${classItem.id}`] ? (
                              <div className="flex items-center space-x-1">
                                <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-blue-600"></div>
                                <span>Updating...</span>
                              </div>
                            ) : (
                              classItem.teacher ? 'Reassign' : 'Assign'
                            )}
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Teacher Workload Summary */}
            <Card>
              <CardHeader>
                <CardTitle>Teacher Workload Summary</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {teachers.map((teacher) => {
                    const assignedClasses = classes.filter(c => c.class_teacher_id === teacher.id)
                    const totalStudents = assignedClasses.reduce((sum, c) => sum + (c.enrollment_count || 0), 0)

                    return (
                      <div key={teacher.id} className="flex items-center justify-between p-3 border rounded-lg">
                        <div className="flex items-center space-x-3">
                          <div className="w-10 h-10 bg-gradient-to-r from-green-500 to-blue-500 rounded-full flex items-center justify-center text-white font-semibold">
                            {teacher.name.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <p className="font-medium">{teacher.name}</p>
                            <p className="text-sm text-gray-500">{teacher.email}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="font-medium">
                            {assignedClasses.length} {assignedClasses.length === 1 ? 'Class' : 'Classes'}
                          </p>
                          <p className="text-sm text-gray-500">
                            {totalStudents} {totalStudents === 1 ? 'Student' : 'Students'}
                          </p>
                        </div>
                      </div>
                    )
                  })}
                  {teachers.length === 0 && (
                    <div className="text-center py-8 text-gray-500">
                      No teachers available for assignment
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Analytics Tab */}
          <TabsContent value="analytics" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Grade Distribution */}
              <Card>
                <CardHeader>
                  <CardTitle>Classes by Grade Level</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {Array.from({ length: 12 }, (_, i) => i + 1).map(grade => {
                      const gradeClasses = classes.filter(c => c.grade_level === grade)
                      const gradeStudents = gradeClasses.reduce((sum, c) => sum + (c.enrollment_count || 0), 0)

                      if (gradeClasses.length === 0) return null

                      return (
                        <div key={grade} className="flex items-center justify-between">
                          <span className="text-sm font-medium">Grade {grade}</span>
                          <div className="flex items-center space-x-2">
                            <span className="text-sm text-gray-500">
                              {gradeClasses.length} classes • {gradeStudents} students
                            </span>
                            <div className="w-20 bg-gray-200 rounded-full h-2">
                              <div
                                className="bg-blue-600 h-2 rounded-full"
                                style={{
                                  width: `${(gradeClasses.length / Math.max(classes.length, 1)) * 100}%`
                                }}
                              ></div>
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </CardContent>
              </Card>

              {/* Capacity Analysis */}
              <Card>
                <CardHeader>
                  <CardTitle>Capacity Analysis</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="text-center">
                      <div className="text-3xl font-bold text-blue-600">
                        {classes.length > 0
                          ? Math.round((classes.reduce((sum, c) => sum + (c.enrollment_count || 0), 0) /
                              classes.reduce((sum, c) => sum + (c.max_students || 30), 0)) * 100)
                          : 0}%
                      </div>
                      <p className="text-sm text-gray-500">Overall Utilization</p>
                    </div>

                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span>Total Capacity:</span>
                        <span className="font-medium">
                          {classes.reduce((sum, c) => sum + (c.max_students || 30), 0)}
                        </span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span>Current Enrollment:</span>
                        <span className="font-medium">
                          {classes.reduce((sum, c) => sum + (c.enrollment_count || 0), 0)}
                        </span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span>Available Seats:</span>
                        <span className="font-medium text-green-600">
                          {classes.reduce((sum, c) => sum + ((c.max_students || 30) - (c.enrollment_count || 0)), 0)}
                        </span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Class Status Overview */}
            <Card>
              <CardHeader>
                <CardTitle>Class Status Overview</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div className="text-center p-4 border rounded-lg">
                    <div className="text-2xl font-bold text-green-600">
                      {classes.filter(c => {
                        const utilization = (c.enrollment_count || 0) / (c.max_students || 30)
                        return utilization >= 0.8 && utilization < 1
                      }).length}
                    </div>
                    <div className="text-sm text-gray-500">Well Utilized (80-99%)</div>
                  </div>
                  <div className="text-center p-4 border rounded-lg">
                    <div className="text-2xl font-bold text-red-600">
                      {classes.filter(c => (c.enrollment_count || 0) >= (c.max_students || 30)).length}
                    </div>
                    <div className="text-sm text-gray-500">At Capacity (100%)</div>
                  </div>
                  <div className="text-center p-4 border rounded-lg">
                    <div className="text-2xl font-bold text-yellow-600">
                      {classes.filter(c => {
                        const utilization = (c.enrollment_count || 0) / (c.max_students || 30)
                        return utilization > 0 && utilization < 0.5
                      }).length}
                    </div>
                    <div className="text-sm text-gray-500">Under Utilized (&lt;50%)</div>
                  </div>
                  <div className="text-center p-4 border rounded-lg">
                    <div className="text-2xl font-bold text-gray-600">
                      {classes.filter(c => (c.enrollment_count || 0) === 0).length}
                    </div>
                    <div className="text-sm text-gray-500">Empty Classes</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="text-red-600">
              ⚠️ Delete Class
            </AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete{' '}
              <span className="font-semibold text-gray-900">
                {classToDelete?.name}
              </span>
              ? This action cannot be undone and will remove all associated data.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel
              onClick={() => {
                setShowDeleteDialog(false)
                setClassToDelete(null)
              }}
            >
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteClass}
              disabled={actionLoading[`delete-${classToDelete?.id}`]}
              className="bg-red-600 hover:bg-red-700 focus:ring-red-600"
            >
              {actionLoading[`delete-${classToDelete?.id}`] ? (
                <div className="flex items-center space-x-2">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  <span>Deleting...</span>
                </div>
              ) : (
                'Delete Class'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Create Class Modal */}
      {showCreateModal && (
        <CreateClassModal
          onClose={() => setShowCreateModal(false)}
          onSubmit={handleCreateClass}
          teachers={teachers}
          subjects={subjects}
          loading={actionLoading['create-class']}
        />
      )}

      {/* Edit Class Modal */}
      {showEditModal && selectedClass && (
        <EditClassModal
          classData={selectedClass}
          onClose={() => {
            setShowEditModal(false)
            setSelectedClass(null)
          }}
          onSubmit={(updates) => handleUpdateClass(selectedClass.id, updates)}
          teachers={teachers}
          subjects={subjects}
          loading={actionLoading[`update-${selectedClass.id}`]}
        />
      )}

      {/* Teacher Assignment Modal */}
      {showTeacherAssignModal && selectedClass && (
        <TeacherAssignmentModal
          classData={selectedClass}
          onClose={() => {
            setShowTeacherAssignModal(false)
            setSelectedClass(null)
          }}
          onSubmit={(teacherId) => handleAssignTeacher(selectedClass.id, teacherId)}
          teachers={teachers}
          loading={actionLoading[`assign-teacher-${selectedClass.id}`]}
        />
      )}

      {/* Student Assignment Modal */}
      {showStudentAssignModal && selectedClass && (
        <StudentAssignmentModal
          classData={selectedClass}
          onClose={() => {
            setShowStudentAssignModal(false)
            setSelectedClass(null)
          }}
          onAssignmentComplete={() => {
            fetchData(true) // Refresh data after assignment
          }}
        />
      )}
    </AdminLayout>
  )
}

// Modal Components
function CreateClassModal({
  onClose,
  onSubmit,
  teachers,
  subjects,
  loading
}: {
  onClose: () => void
  onSubmit: (data: CreateClassData) => Promise<any>
  teachers: any[]
  subjects: Subject[]
  loading: boolean
}) {
  const [formData, setFormData] = useState<CreateClassData>({
    name: '', // Will be auto-generated
    grade_level: 1,
    section: 'A',
    class_teacher_id: undefined,
    room_number: '',
    capacity: 30,
    academic_year: '2024-2025'
  })
  const [errors, setErrors] = useState<Record<string, string>>({})

  // Auto-generate class name based on grade and section
  const generateClassName = (grade: number, section: string) => {
    return `Grade ${grade} - Section ${section}`
  }

  const validateForm = () => {
    const newErrors: Record<string, string> = {}

    if (formData.grade_level < 1 || formData.grade_level > 12) {
      newErrors.grade_level = 'Grade level must be between 1 and 12'
    }
    if (!formData.section.trim()) {
      newErrors.section = 'Section is required'
    }
    if (formData.capacity < 1 || formData.capacity > 100) {
      newErrors.capacity = 'Capacity must be between 1 and 100'
    }
    if (!formData.academic_year.trim()) {
      newErrors.academic_year = 'Academic year is required'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!validateForm()) {
      return
    }

    try {
      // Auto-generate class name
      const classData = {
        ...formData,
        name: generateClassName(formData.grade_level, formData.section)
      }

      const result = await onSubmit(classData)
      if (!result.error) {
        onClose()
      }
    } catch (error) {
      console.error('Error creating class:', error)
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <Card className="w-full max-w-md mx-4 max-h-[90vh] overflow-y-auto">
        <CardHeader>
          <CardTitle>Create New Class</CardTitle>
          <CardDescription>Add a new class to the system</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Auto-generated class name preview */}
            <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
              <Label className="text-sm font-medium text-blue-800">Class Name (Auto-generated)</Label>
              <p className="text-blue-900 font-semibold">
                {generateClassName(formData.grade_level, formData.section)}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="grade_level">Grade Level *</Label>
                <Select
                  value={formData.grade_level.toString()}
                  onValueChange={(value) => setFormData({ ...formData, grade_level: parseInt(value) })}
                >
                  <SelectTrigger className={errors.grade_level ? 'border-red-500' : ''}>
                    <SelectValue placeholder="Select grade" />
                  </SelectTrigger>
                  <SelectContent>
                    {Array.from({ length: 12 }, (_, i) => i + 1).map(grade => (
                      <SelectItem key={grade} value={grade.toString()}>
                        Grade {grade}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.grade_level && <p className="text-sm text-red-500 mt-1">{errors.grade_level}</p>}
              </div>

              <div>
                <Label htmlFor="section">Section *</Label>
                <Select
                  value={formData.section}
                  onValueChange={(value) => setFormData({ ...formData, section: value })}
                >
                  <SelectTrigger className={errors.section ? 'border-red-500' : ''}>
                    <SelectValue placeholder="Select section" />
                  </SelectTrigger>
                  <SelectContent>
                    {['A', 'B', 'C', 'D', 'E', 'F'].map(section => (
                      <SelectItem key={section} value={section}>
                        Section {section}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.section && <p className="text-sm text-red-500 mt-1">{errors.section}</p>}
              </div>
            </div>

            <div>
              <Label htmlFor="class_teacher_id">Class Teacher (Optional)</Label>
              <Select
                value={formData.class_teacher_id || 'none'}
                onValueChange={(value) => setFormData({
                  ...formData,
                  class_teacher_id: value === 'none' ? undefined : value
                })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a teacher" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No teacher assigned</SelectItem>
                  {teachers.map(teacher => (
                    <SelectItem key={teacher.id} value={teacher.id}>
                      {teacher.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="room_number">Room Number</Label>
                <Input
                  id="room_number"
                  value={formData.room_number || ''}
                  onChange={(e) => setFormData({ ...formData, room_number: e.target.value })}
                  placeholder="e.g., 101, Lab-A"
                />
              </div>

              <div>
                <Label htmlFor="capacity">Capacity *</Label>
                <Input
                  id="capacity"
                  type="number"
                  value={formData.capacity}
                  onChange={(e) => setFormData({ ...formData, capacity: parseInt(e.target.value) || 30 })}
                  min="1"
                  max="100"
                  className={errors.capacity ? 'border-red-500' : ''}
                />
                {errors.capacity && <p className="text-sm text-red-500 mt-1">{errors.capacity}</p>}
              </div>
            </div>

            <div>
              <Label htmlFor="academic_year">Academic Year *</Label>
              <Input
                id="academic_year"
                value={formData.academic_year}
                onChange={(e) => setFormData({ ...formData, academic_year: e.target.value })}
                placeholder="e.g., 2024-2025"
                className={errors.academic_year ? 'border-red-500' : ''}
              />
              {errors.academic_year && <p className="text-sm text-red-500 mt-1">{errors.academic_year}</p>}
            </div>

            <div className="flex justify-end space-x-2 pt-4">
              <Button type="button" variant="outline" onClick={onClose}>
                Cancel
              </Button>
              <Button type="submit" disabled={loading}>
                {loading ? 'Creating...' : 'Create Class'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}

// Edit Class Modal Component
function EditClassModal({
  classData,
  onClose,
  onSubmit,
  teachers,
  subjects,
  loading
}: {
  classData: Class
  onClose: () => void
  onSubmit: (data: UpdateClassData) => Promise<any>
  teachers: any[]
  subjects: Subject[]
  loading: boolean
}) {
  const [formData, setFormData] = useState<UpdateClassData>({
    name: classData.name,
    grade_level: classData.grade_level,
    section: classData.section,
    class_teacher_id: classData.class_teacher_id,
    room_number: classData.room_number,
    capacity: classData.capacity || classData.max_students,
    academic_year: classData.academic_year,
    is_active: classData.is_active
  })
  const [errors, setErrors] = useState<Record<string, string>>({})

  const validateForm = () => {
    const newErrors: Record<string, string> = {}

    if (!formData.name?.trim()) {
      newErrors.name = 'Class name is required'
    }
    if (formData.grade_level && (formData.grade_level < 1 || formData.grade_level > 12)) {
      newErrors.grade_level = 'Grade level must be between 1 and 12'
    }
    if (formData.capacity && (formData.capacity < 1 || formData.capacity > 100)) {
      newErrors.capacity = 'Capacity must be between 1 and 100'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!validateForm()) {
      return
    }

    try {
      const result = await onSubmit(formData)
      if (!result.error) {
        onClose()
      }
    } catch (error) {
      console.error('Error updating class:', error)
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <Card className="w-full max-w-md mx-4 max-h-[90vh] overflow-y-auto">
        <CardHeader>
          <CardTitle>Edit Class</CardTitle>
          <CardDescription>Update class information</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="name">Class Name *</Label>
              <Input
                id="name"
                value={formData.name || ''}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className={errors.name ? 'border-red-500' : ''}
              />
              {errors.name && <p className="text-sm text-red-500 mt-1">{errors.name}</p>}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="grade_level">Grade Level</Label>
                <Select
                  value={formData.grade_level?.toString() || ''}
                  onValueChange={(value) => setFormData({ ...formData, grade_level: parseInt(value) })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select grade" />
                  </SelectTrigger>
                  <SelectContent>
                    {Array.from({ length: 12 }, (_, i) => i + 1).map(grade => (
                      <SelectItem key={grade} value={grade.toString()}>
                        Grade {grade}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="section">Section</Label>
                <Select
                  value={formData.section || ''}
                  onValueChange={(value) => setFormData({ ...formData, section: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select section" />
                  </SelectTrigger>
                  <SelectContent>
                    {['A', 'B', 'C', 'D', 'E', 'F'].map(section => (
                      <SelectItem key={section} value={section}>
                        Section {section}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label htmlFor="class_teacher_id">Class Teacher</Label>
              <Select
                value={formData.class_teacher_id || 'none'}
                onValueChange={(value) => setFormData({
                  ...formData,
                  class_teacher_id: value === 'none' ? undefined : value
                })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a teacher" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No teacher assigned</SelectItem>
                  {teachers.map(teacher => (
                    <SelectItem key={teacher.id} value={teacher.id}>
                      {teacher.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="room_number">Room Number</Label>
                <Input
                  id="room_number"
                  value={formData.room_number || ''}
                  onChange={(e) => setFormData({ ...formData, room_number: e.target.value })}
                />
              </div>

              <div>
                <Label htmlFor="capacity">Capacity</Label>
                <Input
                  id="capacity"
                  type="number"
                  value={formData.capacity || 30}
                  onChange={(e) => setFormData({ ...formData, capacity: parseInt(e.target.value) || 30 })}
                  min="1"
                  max="100"
                  className={errors.capacity ? 'border-red-500' : ''}
                />
                {errors.capacity && <p className="text-sm text-red-500 mt-1">{errors.capacity}</p>}
              </div>
            </div>

            <div>
              <Label htmlFor="academic_year">Academic Year</Label>
              <Input
                id="academic_year"
                value={formData.academic_year || ''}
                onChange={(e) => setFormData({ ...formData, academic_year: e.target.value })}
              />
            </div>

            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="is_active"
                checked={formData.is_active ?? true}
                onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                className="rounded border-gray-300"
              />
              <Label htmlFor="is_active">Active</Label>
            </div>

            <div className="flex justify-end space-x-2 pt-4">
              <Button type="button" variant="outline" onClick={onClose}>
                Cancel
              </Button>
              <Button type="submit" disabled={loading}>
                {loading ? 'Updating...' : 'Update Class'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}

// Teacher Assignment Modal Component
function TeacherAssignmentModal({
  classData,
  onClose,
  onSubmit,
  teachers,
  loading
}: {
  classData: Class
  onClose: () => void
  onSubmit: (teacherId: string | null) => Promise<void>
  teachers: any[]
  loading: boolean
}) {
  const [selectedTeacherId, setSelectedTeacherId] = useState<string | null>(
    classData.class_teacher_id || null
  )

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    try {
      await onSubmit(selectedTeacherId)
      onClose()
    } catch (error) {
      console.error('Error assigning teacher:', error)
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <Card className="w-full max-w-md mx-4">
        <CardHeader>
          <CardTitle>Assign Class Teacher</CardTitle>
          <CardDescription>
            Assign a teacher to {classData.name} - Grade {classData.grade_level}{classData.section}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="teacher">Select Teacher</Label>
              <Select
                value={selectedTeacherId || 'none'}
                onValueChange={(value) => setSelectedTeacherId(value === 'none' ? null : value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a teacher" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No teacher assigned</SelectItem>
                  {teachers.map(teacher => {
                    const assignedClasses = teachers.filter(t => t.id === teacher.id).length
                    return (
                      <SelectItem key={teacher.id} value={teacher.id}>
                        <div className="flex justify-between items-center w-full">
                          <span>{teacher.name}</span>
                          <span className="text-xs text-gray-500 ml-2">
                            {assignedClasses > 0 ? `${assignedClasses} classes` : 'Available'}
                          </span>
                        </div>
                      </SelectItem>
                    )
                  })}
                </SelectContent>
              </Select>
            </div>

            {selectedTeacherId && (
              <div className="p-3 bg-blue-50 rounded-lg">
                <p className="text-sm text-blue-800">
                  <strong>Selected:</strong> {teachers.find(t => t.id === selectedTeacherId)?.name}
                </p>
                <p className="text-xs text-blue-600 mt-1">
                  {teachers.find(t => t.id === selectedTeacherId)?.email}
                </p>
              </div>
            )}

            <div className="flex justify-end space-x-2 pt-4">
              <Button type="button" variant="outline" onClick={onClose}>
                Cancel
              </Button>
              <Button type="submit" disabled={loading}>
                {loading ? 'Assigning...' : 'Assign Teacher'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
