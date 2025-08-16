'use client'

import { useState, useEffect, useMemo } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
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
import { useDebouncedSearch } from '@/hooks/useDebounce'
import { apiService } from '@/lib/api/OptimizedApiService'
import { toast } from 'sonner'
import { Search, Users, UserCheck, Loader2 } from 'lucide-react'

interface Student {
  id: string
  name: string
  email: string
  student_id?: string
  admission_number?: string
  section?: string
  roll_number?: number
  class_id?: string
  is_enrolled?: boolean
  has_class_assignment?: boolean
  is_assigned_to_other_class?: boolean
  assigned_class_id?: string
}

interface Class {
  id: string
  name: string
  grade_level: number
  section: string
  academic_year: string
  max_students: number
  enrollment_count: number
}

interface StudentAssignmentModalProps {
  classData: Class
  onClose: () => void
  onAssignmentComplete: () => void
}

export function StudentAssignmentModal({
  classData,
  onClose,
  onAssignmentComplete
}: StudentAssignmentModalProps) {
  const [allStudents, setAllStudents] = useState<Student[]>([])
  const [selectedStudents, setSelectedStudents] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(true)
  const [assigning, setAssigning] = useState(false)
  const [showOnlyUnassigned, setShowOnlyUnassigned] = useState(true)
  const [classesMap, setClassesMap] = useState<Map<string, string>>(new Map())
  const [confirmDialog, setConfirmDialog] = useState<{
    open: boolean
    studentId: string
    studentName: string
    currentClassName: string
    currentClassId: string
  }>({
    open: false,
    studentId: '',
    studentName: '',
    currentClassName: '',
    currentClassId: ''
  })

  const { user } = useAuthStore()

  // Optimized search with debouncing and caching
  const {
    query: searchQuery,
    setQuery: setSearchQuery,
    results: searchResults,
    loading: searchLoading,
    clearSearch
  } = useDebouncedSearch(
    async (query: string) => {
      console.log(`🔍 Searching students for: "${query}"`)
      const response = await apiService.search<Student>('profiles', 'name', query, {
        filters: {
          role: 'student',
          school_id: user?.school_id
        },
        select: `
          id,
          name,
          email,
          students (
            student_id,
            admission_number,
            class_id,
            section,
            roll_number
          )
        `,
        pageSize: 100,
        cache: true,
        cacheTTL: 2 * 60 * 1000, // 2 minutes for search results
        tags: [`students-search-${user?.school_id}`]
      })

      // Process search results
      return response.data.map(student => {
        const studentData = (student as any).students?.[0]
        return {
          id: student.id,
          name: (student as any).name || '',
          email: (student as any).email || '',
          student_id: studentData?.student_id,
          admission_number: studentData?.admission_number,
          section: studentData?.section,
          roll_number: studentData?.roll_number,
          class_id: studentData?.class_id,
          is_enrolled: false // Will be updated when we check enrollments
        }
      })
    },
    300, // 300ms debounce
    2 // minimum query length
  )

  useEffect(() => {
    fetchStudents()
  }, [])

  const fetchClassesMap = async () => {
    try {
      const { data: classes, error } = await supabase
        .from('classes')
        .select('id, name, grade_level, section')

      if (error) throw error

      const classMap = new Map<string, string>()
      classes?.forEach(cls => {
        classMap.set(cls.id, `${cls.name}`)
      })
      setClassesMap(classMap)
    } catch (error) {
      console.error('Error fetching classes:', error)
    }
  }

  const fetchStudents = async () => {
    try {
      setLoading(true)

      console.log('🔄 Fetching students with optimized API')

      // Fetch classes map first
      await fetchClassesMap()

      // Clear cache to ensure fresh data
      apiService.invalidateCache([`students-${user?.school_id}`, `enrollments-${classData.id}`])

      // Use direct Supabase queries for debugging
      const [studentsResponse, enrollmentsResponse] = await Promise.all([
        supabase
          .from('profiles')
          .select(`
            id,
            name,
            email,
            students (
              student_id,
              admission_number,
              class_id,
              section,
              roll_number
            )
          `)
          .eq('role', 'student')
          .eq('school_id', user?.school_id)
          .order('name'),

        supabase
          .from('class_enrollments')
          .select('student_id')
          .eq('class_id', classData.id)
          .eq('status', 'active')
      ])

      if (studentsResponse.error) throw studentsResponse.error
      if (enrollmentsResponse.error) throw enrollmentsResponse.error

      const enrolledStudentIds = new Set(enrollmentsResponse.data.map((e: any) => e.student_id))

      console.log('🔍 Fetching student data for class:', classData.name)

      const processedStudents: Student[] = studentsResponse.data.map((student: any) => {
        // Handle different possible data structures
        const studentData = student.students?.[0] || student.students || null
        const isEnrolledInClass = enrolledStudentIds.has(student.id)

        // Ensure we're comparing the right data types (both as strings)
        const studentClassId = studentData?.class_id ? String(studentData.class_id) : null
        const currentClassId = String(classData.id)

        const hasAnyClassAssignment = studentClassId != null
        const isAssignedToThisClass = studentClassId === currentClassId
        const isAssignedToOtherClass = hasAnyClassAssignment && !isAssignedToThisClass

        // Debug logging for Joyin
        if (student.name === 'Joyin') {
          console.log(`🔍 JOYIN DEBUG:`, {
            studentId: student.id,
            studentData: studentData,
            rawClassId: studentData?.class_id,
            studentClassId: studentClassId,
            currentClassId: currentClassId,
            hasAnyClassAssignment,
            isAssignedToThisClass,
            isAssignedToOtherClass
          })
        }


        return {
          id: student.id,
          name: student.name || '',
          email: student.email || '',
          student_id: studentData?.student_id,
          admission_number: studentData?.admission_number,
          section: studentData?.section,
          roll_number: studentData?.roll_number,
          class_id: studentClassId,
          // Student is enrolled if they have enrollment record OR assigned to this specific class
          is_enrolled: isEnrolledInClass || isAssignedToThisClass,
          // Track if student has any class assignment (for reassignment logic)
          has_class_assignment: hasAnyClassAssignment,
          // Track if assigned to a different class (for reassignment UI)
          is_assigned_to_other_class: isAssignedToOtherClass,
          assigned_class_id: studentClassId
        }
      })

      setAllStudents(processedStudents)
      console.log(`✅ Fetched ${processedStudents.length} students`)
      console.log('Student data:', processedStudents.map(s => ({
        name: s.name,
        class_id: s.class_id,
        has_class_assignment: s.has_class_assignment,
        is_enrolled: s.is_enrolled
      })))
    } catch (error) {
      console.error('Error fetching students:', error)
      toast.error('Failed to load students')
    } finally {
      setLoading(false)
    }
  }

  // Memoized filtered students for better performance
  const filteredStudents = useMemo(() => {
    // Use search results if there's a search query, otherwise use all students
    const studentsToFilter = searchQuery.trim() ? searchResults : allStudents

    // Filter by enrollment status
    if (showOnlyUnassigned) {
      // Show only students who have NO class assignment at all
      return studentsToFilter.filter(student => !student.has_class_assignment)
    }

    // Show all students when filter is unchecked
    return studentsToFilter
  }, [searchQuery, searchResults, allStudents, showOnlyUnassigned])

  const handleStudentToggle = (studentId: string) => {
    const newSelected = new Set(selectedStudents)
    if (newSelected.has(studentId)) {
      newSelected.delete(studentId)
    } else {
      newSelected.add(studentId)
    }
    setSelectedStudents(newSelected)
  }

  const handleSelectAll = () => {
    if (selectedStudents.size === filteredStudents.length) {
      setSelectedStudents(new Set())
    } else {
      setSelectedStudents(new Set(filteredStudents.map(s => s.id)))
    }
  }

  const handleReassignStudent = (studentId: string, currentClassId: string) => {
    const student = allStudents.find(s => s.id === studentId)
    const currentClassName = classesMap.get(currentClassId) || 'Unknown Class'

    setConfirmDialog({
      open: true,
      studentId,
      studentName: student?.name || 'Unknown Student',
      currentClassName,
      currentClassId
    })
  }

  const confirmReassignment = async () => {
    const { studentId, currentClassId } = confirmDialog

    try {
      setAssigning(true)
      setConfirmDialog(prev => ({ ...prev, open: false }))

      // Remove from current class
      const { error: removeError } = await supabase
        .from('students')
        .update({ class_id: null })
        .eq('id', studentId)

      if (removeError) throw removeError

      // Remove from current class enrollments
      const { error: enrollmentError } = await supabase
        .from('class_enrollments')
        .delete()
        .eq('student_id', studentId)
        .eq('class_id', currentClassId)

      if (enrollmentError) throw enrollmentError

      // Add to selected students for assignment to new class
      setSelectedStudents(new Set([studentId]))

      toast.success(`${confirmDialog.studentName} removed from ${confirmDialog.currentClassName}. Now assign to new class.`)

      // Refresh students list
      await fetchStudents()

      // Reset assigning state after successful operation
      setAssigning(false)
    } catch (error) {
      console.error('Error reassigning student:', error)
      toast.error('Failed to reassign student')
      setAssigning(false)
    }
  }

  const handleAssignStudents = async () => {
    if (selectedStudents.size === 0) {
      toast.error('Please select at least one student')
      return
    }

    // Check capacity
    const availableSpots = classData.max_students - classData.enrollment_count
    if (selectedStudents.size > availableSpots) {
      toast.error(`Class capacity exceeded. Only ${availableSpots} spots available.`)
      return
    }

    try {
      setAssigning(true)

      console.log('🚀 Assigning', selectedStudents.size, 'students to', classData.name)

      // Create or update enrollment records
      const enrollments = Array.from(selectedStudents).map(studentId => ({
        class_id: classData.id,
        student_id: studentId,
        status: 'active'
      }))

      const { error: enrollmentError } = await supabase
        .from('class_enrollments')
        .upsert(enrollments, {
          onConflict: 'class_id,student_id'
        })

      if (enrollmentError) {
        console.error('Enrollment error:', enrollmentError)
        throw enrollmentError
      }

      // Update students table with class_id
      const { error: updateError } = await supabase
        .from('students')
        .update({ class_id: classData.id })
        .in('id', Array.from(selectedStudents))

      if (updateError) {
        console.error('Update error:', updateError)
        throw updateError
      }

      console.log('✅ Assignment completed successfully')

      // Invalidate relevant caches
      apiService.invalidateCache([
        `students-${user?.school_id}`,
        `enrollments-${classData.id}`,
        `students-search-${user?.school_id}`
      ])

      // Refresh the student list to show updated assignments
      await fetchStudents()

      toast.success('Students assigned successfully', {
        description: `${selectedStudents.size} student(s) assigned to ${classData.name}`
      })

      onAssignmentComplete()
      onClose()
    } catch (error) {
      console.error('Error assigning students:', error)
      toast.error('Failed to assign students', {
        description: error instanceof Error ? error.message : 'Unknown error occurred'
      })
    } finally {
      setAssigning(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-4xl max-h-[90vh] flex flex-col">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Users className="h-5 w-5" />
            <span>Assign Students to Class</span>
          </CardTitle>
          <CardDescription>
            Assign students to {classData.name} - Grade {classData.grade_level}{classData.section} ({classData.academic_year})
            <br />
            <span className="text-sm text-gray-600">
              Capacity: {classData.enrollment_count}/{classData.max_students} students
            </span>
            <br />
            <span className="text-sm text-blue-600 font-medium">
              💡 This is the primary way to assign students to classes. Use User Management only for basic student details.
            </span>
          </CardDescription>
        </CardHeader>
        <CardContent className="flex-1 overflow-hidden flex flex-col space-y-4">
          {/* Search and Filters */}
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <Input
                placeholder="Search students by name, email, ID, or admission number..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox
                id="unassigned-only"
                checked={showOnlyUnassigned}
                onCheckedChange={setShowOnlyUnassigned}
              />
              <Label htmlFor="unassigned-only" className="text-sm">
                Show only students without any class assignment
              </Label>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                apiService.invalidateCache([
                  `students-${user?.school_id}`,
                  `enrollments-${classData.id}`,
                  `students-search-${user?.school_id}`
                ])
                fetchStudents()
              }}
              disabled={loading}
            >
              Refresh
            </Button>
          </div>

          {/* Selection Controls */}
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Button
                variant="outline"
                size="sm"
                onClick={handleSelectAll}
                disabled={filteredStudents.length === 0}
              >
                {selectedStudents.size === filteredStudents.length ? 'Deselect All' : 'Select All'}
              </Button>
              <span className="text-sm text-gray-600">
                {selectedStudents.size} of {filteredStudents.length} students selected
              </span>
            </div>
            <Badge variant="outline">
              Available spots: {classData.max_students - classData.enrollment_count}
            </Badge>
          </div>

          {/* Students List */}
          <div className="flex-1 overflow-y-auto border rounded-lg">
            {loading || searchLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin mr-2" />
                <span>{loading ? 'Loading students...' : 'Searching...'}</span>
              </div>
            ) : filteredStudents.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <div className="mb-2">
                  {searchQuery.trim() ? 'No students match your search criteria' :
                   allStudents.length === 0 ? 'No students found' :
                   showOnlyUnassigned ? 'No unassigned students available' :
                   'No students available'}
                </div>
                {showOnlyUnassigned && allStudents.length > 0 && (
                  <div className="text-sm">
                    Uncheck "Show only students without any class assignment" to see students assigned to other classes who can be reassigned.
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-2 p-4">
                {filteredStudents.map((student) => {
                  const isDisabled = student.is_enrolled || student.is_assigned_to_other_class
                  const canBeSelected = !isDisabled

                  return (
                    <div
                      key={student.id}
                      className={`flex items-center space-x-3 p-3 border rounded-lg ${
                        selectedStudents.has(student.id) ? 'bg-blue-50 border-blue-200' : ''
                      } ${isDisabled ? 'opacity-50' : 'cursor-pointer hover:bg-gray-50'}`}
                      onClick={() => canBeSelected && handleStudentToggle(student.id)}
                    >
                      <Checkbox
                        checked={selectedStudents.has(student.id)}
                        disabled={isDisabled}
                        onCheckedChange={() => canBeSelected && handleStudentToggle(student.id)}
                      />
                      <div className="flex-1">
                        <div className="flex items-center space-x-2">
                          <span className="font-medium">{student.name}</span>
                          {student.is_enrolled && (
                            <Badge variant="secondary" className="text-xs">
                              Already Enrolled
                            </Badge>
                          )}
                          {student.is_assigned_to_other_class && (
                            <Badge variant="outline" className="text-xs text-orange-600 border-orange-200">
                              Assigned to {classesMap.get(student.assigned_class_id!) || 'Another Class'}
                            </Badge>
                          )}
                          {!student.has_class_assignment && (
                            <Badge variant="outline" className="text-xs text-green-600 border-green-200">
                              Unassigned
                            </Badge>
                          )}
                        </div>
                        <div className="text-sm text-gray-600">
                          {student.email}
                          {student.student_id && ` • ID: ${student.student_id}`}
                          {student.admission_number && ` • Admission: ${student.admission_number}`}
                          {student.section && ` • Section: ${student.section}`}
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        {student.is_assigned_to_other_class && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation()
                              handleReassignStudent(student.id, student.assigned_class_id!)
                            }}
                            disabled={assigning}
                            className="text-xs"
                          >
                            Reassign
                          </Button>
                        )}
                        {selectedStudents.has(student.id) && (
                          <UserCheck className="h-5 w-5 text-blue-600" />
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end space-x-2 pt-4 border-t">
            <Button variant="outline" onClick={onClose} disabled={assigning}>
              Cancel
            </Button>
            <Button
              onClick={handleAssignStudents}
              disabled={selectedStudents.size === 0 || assigning}
              className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
            >
              {assigning ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Assigning...
                </>
              ) : (
                `Assign ${selectedStudents.size} Student${selectedStudents.size !== 1 ? 's' : ''}`
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Reassignment Confirmation Dialog */}
      <AlertDialog open={confirmDialog.open} onOpenChange={(open) => setConfirmDialog(prev => ({ ...prev, open }))}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Reassign Student</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to remove "{confirmDialog.studentName}" from "{confirmDialog.currentClassName}"
              and assign them to "{classData.name} - Grade {classData.grade_level}{classData.section}"?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmReassignment} className="bg-orange-600 hover:bg-orange-700">
              Reassign Student
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
