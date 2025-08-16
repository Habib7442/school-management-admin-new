'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { useAuthStore } from '@/lib/stores/auth-store'
import { supabase } from '@/lib/supabase'
import { toast } from 'sonner'

interface EnrolledClass {
  id: string
  class_id: string
  roll_number?: number
  status: string
  enrolled_at: string
  class: {
    id: string
    name: string
    grade_level: number
    section: string
    academic_year: string
    max_students: number
    description?: string
    teacher: {
      id: string
      name: string
      email: string
    }
  }
  subjects?: Subject[]
  classmates?: Classmate[]
}

interface Subject {
  id: string
  name: string
  code: string
  description?: string
  teacher?: {
    name: string
    email: string
  }
}

interface Classmate {
  id: string
  name: string
  roll_number?: number
  student_id?: string
}

export default function StudentClasses() {
  const { user } = useAuthStore()
  const [enrolledClasses, setEnrolledClasses] = useState<EnrolledClass[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedClass, setSelectedClass] = useState<string | null>(null)

  useEffect(() => {
    if (user?.id) {
      fetchEnrolledClasses()
    }
  }, [user])

  const fetchEnrolledClasses = async () => {
    try {
      setLoading(true)

      const { data: enrollments, error } = await supabase
        .from('class_enrollments')
        .select(`
          id,
          class_id,
          roll_number,
          status,
          enrolled_at,
          classes (
            id,
            name,
            grade_level,
            section,
            academic_year,
            max_students,
            description,
            teacher_id,
            profiles!classes_teacher_id_fkey (
              id,
              name,
              email
            )
          )
        `)
        .eq('student_id', user.id)
        .order('enrolled_at', { ascending: false })

      if (error) {
        console.error('Error fetching enrollments:', error)
        toast.error('Failed to load classes')
        return
      }

      // Transform the data to match our interface
      const transformedClasses: EnrolledClass[] = enrollments?.map(enrollment => ({
        id: enrollment.id,
        class_id: enrollment.class_id,
        roll_number: enrollment.roll_number,
        status: enrollment.status,
        enrolled_at: enrollment.enrolled_at,
        class: {
          id: enrollment.classes.id,
          name: enrollment.classes.name,
          grade_level: enrollment.classes.grade_level,
          section: enrollment.classes.section,
          academic_year: enrollment.classes.academic_year,
          max_students: enrollment.classes.max_students,
          description: enrollment.classes.description,
          teacher: {
            id: enrollment.classes.profiles?.id || '',
            name: enrollment.classes.profiles?.name || 'Not assigned',
            email: enrollment.classes.profiles?.email || ''
          }
        }
      })) || []

      setEnrolledClasses(transformedClasses)

      // Fetch subjects and classmates for each class
      for (const enrollment of transformedClasses) {
        await fetchClassDetails(enrollment.class_id)
      }

    } catch (error) {
      console.error('Error fetching enrolled classes:', error)
      toast.error('Failed to load class information')
    } finally {
      setLoading(false)
    }
  }

  const fetchClassDetails = async (classId: string) => {
    try {
      // Fetch subjects for this class
      const { data: subjects, error: subjectsError } = await supabase
        .from('class_subjects')
        .select(`
          subjects (
            id,
            name,
            code,
            description
          )
        `)
        .eq('class_id', classId)

      if (subjectsError) {
        console.error('Error fetching subjects:', subjectsError)
      }

      // Fetch classmates
      const { data: classmates, error: classmatesError } = await supabase
        .from('class_enrollments')
        .select(`
          roll_number,
          profiles!class_enrollments_student_id_fkey (
            id,
            name,
            student_id
          )
        `)
        .eq('class_id', classId)
        .eq('status', 'active')
        .neq('student_id', user.id)

      if (classmatesError) {
        console.error('Error fetching classmates:', classmatesError)
      }

      // Update the enrolled classes with the fetched details
      setEnrolledClasses(prev => prev.map(enrollment => {
        if (enrollment.class_id === classId) {
          return {
            ...enrollment,
            subjects: subjects?.map(s => s.subjects).filter(Boolean) || [],
            classmates: classmates?.map(c => ({
              id: c.profiles?.id || '',
              name: c.profiles?.name || '',
              roll_number: c.roll_number,
              student_id: c.profiles?.student_id
            })) || []
          }
        }
        return enrollment
      }))

    } catch (error) {
      console.error('Error fetching class details:', error)
    }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {[...Array(2)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardHeader>
                <div className="h-6 bg-gray-200 rounded w-3/4"></div>
                <div className="h-4 bg-gray-200 rounded w-1/2"></div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {[...Array(4)].map((_, j) => (
                    <div key={j} className="h-4 bg-gray-200 rounded"></div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    )
  }

  if (enrolledClasses.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="text-6xl mb-4">📚</div>
        <h3 className="text-lg font-medium text-gray-900 mb-2">No Classes Enrolled</h3>
        <p className="text-gray-500 mb-4">You are not currently enrolled in any classes.</p>
        <p className="text-sm text-gray-400">Contact your school administrator for enrollment assistance.</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">My Classes</h1>
          <p className="text-gray-500">Classes you are currently enrolled in</p>
        </div>
        <Badge variant="outline" className="text-sm">
          {enrolledClasses.length} {enrolledClasses.length === 1 ? 'Class' : 'Classes'}
        </Badge>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {enrolledClasses.map((enrollment) => (
          <Card key={enrollment.id} className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <div className="flex items-start justify-between">
                <div>
                  <CardTitle className="text-lg">{enrollment.class.name}</CardTitle>
                  <CardDescription>
                    Grade {enrollment.class.grade_level} • Section {enrollment.class.section}
                  </CardDescription>
                </div>
                <Badge variant={enrollment.status === 'active' ? 'default' : 'secondary'}>
                  {enrollment.status}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Class Info */}
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-gray-500">Academic Year:</span>
                  <div className="font-medium">{enrollment.class.academic_year}</div>
                </div>
                <div>
                  <span className="text-gray-500">Roll Number:</span>
                  <div className="font-medium">{enrollment.roll_number || 'Not assigned'}</div>
                </div>
              </div>

              {/* Class Teacher */}
              <div>
                <span className="text-gray-500 text-sm">Class Teacher:</span>
                <div className="font-medium">{enrollment.class.teacher.name}</div>
                <div className="text-sm text-gray-600">{enrollment.class.teacher.email}</div>
              </div>

              {/* Subjects */}
              {enrollment.subjects && enrollment.subjects.length > 0 && (
                <div>
                  <span className="text-gray-500 text-sm">Subjects:</span>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {enrollment.subjects.slice(0, 3).map((subject) => (
                      <Badge key={subject.id} variant="outline" className="text-xs">
                        {subject.name}
                      </Badge>
                    ))}
                    {enrollment.subjects.length > 3 && (
                      <Badge variant="outline" className="text-xs">
                        +{enrollment.subjects.length - 3} more
                      </Badge>
                    )}
                  </div>
                </div>
              )}

              {/* Class Stats */}
              <div className="flex items-center justify-between pt-2 border-t">
                <div className="text-sm text-gray-500">
                  {enrollment.classmates?.length || 0} classmates
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setSelectedClass(
                    selectedClass === enrollment.class_id ? null : enrollment.class_id
                  )}
                >
                  {selectedClass === enrollment.class_id ? 'Hide Details' : 'View Details'}
                </Button>
              </div>

              {/* Expanded Details */}
              {selectedClass === enrollment.class_id && (
                <div className="mt-4 pt-4 border-t space-y-4">
                  {/* All Subjects */}
                  {enrollment.subjects && enrollment.subjects.length > 0 && (
                    <div>
                      <h4 className="font-medium text-sm mb-2">All Subjects</h4>
                      <div className="grid grid-cols-1 gap-2">
                        {enrollment.subjects.map((subject) => (
                          <div key={subject.id} className="p-2 bg-gray-50 rounded text-sm">
                            <div className="font-medium">{subject.name}</div>
                            {subject.code && (
                              <div className="text-gray-500">Code: {subject.code}</div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Classmates */}
                  {enrollment.classmates && enrollment.classmates.length > 0 && (
                    <div>
                      <h4 className="font-medium text-sm mb-2">
                        Classmates ({enrollment.classmates.length})
                      </h4>
                      <div className="grid grid-cols-1 gap-1 max-h-32 overflow-y-auto">
                        {enrollment.classmates.map((classmate) => (
                          <div key={classmate.id} className="flex items-center justify-between p-2 bg-gray-50 rounded text-sm">
                            <span>{classmate.name}</span>
                            {classmate.roll_number && (
                              <span className="text-gray-500">Roll: {classmate.roll_number}</span>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Class Description */}
                  {enrollment.class.description && (
                    <div>
                      <h4 className="font-medium text-sm mb-2">Description</h4>
                      <p className="text-sm text-gray-600">{enrollment.class.description}</p>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
