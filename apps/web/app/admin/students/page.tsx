'use client'

import { useEffect, useState } from 'react'
import AdminLayout from '@/components/admin/AdminLayout'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { useAuthStore } from '@/lib/stores/auth-store'
import { supabase } from '@/lib/supabase'
import { toast } from 'sonner'
import { Search, Filter, Download, Eye, Edit, UserPlus, X } from 'lucide-react'
import EditStudentModal from '@/components/admin/EditStudentModal'
import EnrollStudentModal from '@/components/admin/EnrollStudentModal'

interface Student {
  id: string
  name: string
  email: string
  student_id?: string
  phone?: string
  date_of_birth?: string
  address?: string
  emergency_contact?: string
  emergency_phone?: string
  created_at: string
  onboarding_completed: boolean
  class_enrollment?: {
    class_name: string
    section: string
    roll_number?: number
    status: string
  }
}

interface StudentStats {
  totalStudents: number
  enrolledStudents: number
  unenrolledStudents: number
  activeStudents: number
}

export default function StudentManagement() {
  const { user } = useAuthStore()
  const [students, setStudents] = useState<Student[]>([])
  const [stats, setStats] = useState<StudentStats>({
    totalStudents: 0,
    enrolledStudents: 0,
    unenrolledStudents: 0,
    activeStudents: 0
  })
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [classFilter, setClassFilter] = useState<string>('all')
  const [availableClasses, setAvailableClasses] = useState<any[]>([])

  // Modal states
  const [showViewModal, setShowViewModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [showEnrollModal, setShowEnrollModal] = useState(false)
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null)

  useEffect(() => {
    if (user?.school_id) {
      fetchStudents()
      fetchAvailableClasses()
    }
  }, [user])

  const fetchStudents = async () => {
    try {
      setLoading(true)

      // Get all student profiles with their student records and enrollments
      const { data: studentsData, error } = await supabase
        .from('profiles')
        .select(`
          id,
          name,
          email,
          phone,
          created_at,
          onboarding_completed,
          students (
            student_id,
            admission_number,
            date_of_birth,
            address,
            parent_name,
            parent_phone,
            emergency_contact_name,
            emergency_contact_phone,
            class_id,
            roll_number,
            is_active,
            classes (
              name,
              section,
              grade_level
            )
          )
        `)
        .eq('role', 'student')
        .eq('school_id', user.school_id)
        .order('created_at', { ascending: false })

      if (error) {
        console.error('Error fetching students:', error)
        toast.error('Failed to load students')
        return
      }

      // Also get enrollment data from class_enrollments table
      const { data: enrollmentData, error: enrollmentError } = await supabase
        .from('class_enrollments')
        .select(`
          student_id,
          roll_number,
          status,
          classes (
            name,
            section
          )
        `)

      if (enrollmentError) {
        console.error('Error fetching enrollments:', enrollmentError)
      }

      // Transform the data
      const allStudents: Student[] = studentsData?.map(profile => {
        const studentRecord = profile.students?.[0]
        const enrollment = enrollmentData?.find(e => e.student_id === profile.id)

        return {
          id: profile.id,
          name: profile.name,
          email: profile.email,
          student_id: studentRecord?.student_id || studentRecord?.admission_number,
          phone: profile.phone,
          date_of_birth: studentRecord?.date_of_birth,
          address: studentRecord?.address,
          emergency_contact: studentRecord?.emergency_contact_name,
          emergency_phone: studentRecord?.emergency_contact_phone,
          created_at: profile.created_at,
          onboarding_completed: profile.onboarding_completed,
          class_enrollment: enrollment ? {
            class_name: enrollment.classes?.name || '',
            section: enrollment.classes?.section || '',
            roll_number: enrollment.roll_number,
            status: enrollment.status
          } : (studentRecord?.classes ? {
            class_name: studentRecord.classes.name,
            section: studentRecord.classes.section,
            roll_number: studentRecord.roll_number,
            status: studentRecord.is_active ? 'active' : 'inactive'
          } : undefined)
        }
      }) || []

      setStudents(allStudents)

      // Calculate stats
      const totalStudents = allStudents.length
      const enrolledStudents = allStudents.filter(s => s.class_enrollment).length
      const unenrolledStudents = totalStudents - enrolledStudents
      const activeStudents = allStudents.filter(s => s.class_enrollment?.status === 'active').length

      setStats({
        totalStudents,
        enrolledStudents,
        unenrolledStudents,
        activeStudents
      })

    } catch (error) {
      console.error('Error fetching students:', error)
      toast.error('Failed to load student data')
    } finally {
      setLoading(false)
    }
  }

  const fetchAvailableClasses = async () => {
    try {
      const { data: classes, error } = await supabase
        .from('classes')
        .select('id, name, section, grade_level')
        .eq('school_id', user.school_id)
        .eq('is_active', true)
        .order('grade_level')
        .order('section')

      if (error) {
        console.error('Error fetching classes:', error)
        return
      }

      setAvailableClasses(classes || [])
    } catch (error) {
      console.error('Error fetching classes:', error)
    }
  }

  const filteredStudents = students.filter(student => {
    const matchesSearch = student.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         student.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (student.student_id && student.student_id.toLowerCase().includes(searchTerm.toLowerCase()))

    const matchesStatus = statusFilter === 'all' || 
                         (statusFilter === 'enrolled' && student.class_enrollment) ||
                         (statusFilter === 'unenrolled' && !student.class_enrollment) ||
                         (statusFilter === 'active' && student.class_enrollment?.status === 'active')

    const matchesClass = classFilter === 'all' || 
                        (student.class_enrollment?.class_name === classFilter)

    return matchesSearch && matchesStatus && matchesClass
  })

  const handleExportData = () => {
    try {
      // Create CSV content
      const headers = ['Name', 'Email', 'Student ID', 'Phone', 'Date of Birth', 'Class', 'Section', 'Roll Number', 'Status', 'Address', 'Emergency Contact', 'Emergency Phone']
      const csvContent = [
        headers.join(','),
        ...filteredStudents.map(student => [
          `"${student.name}"`,
          `"${student.email}"`,
          `"${student.student_id || ''}"`,
          `"${student.phone || ''}"`,
          `"${student.date_of_birth || ''}"`,
          `"${student.class_enrollment?.class_name || ''}"`,
          `"${student.class_enrollment?.section || ''}"`,
          `"${student.class_enrollment?.roll_number || ''}"`,
          `"${student.class_enrollment?.status || 'Not Enrolled'}"`,
          `"${student.address || ''}"`,
          `"${student.emergency_contact || ''}"`,
          `"${student.emergency_phone || ''}"`
        ].join(','))
      ].join('\n')

      // Create and download file
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
      const link = document.createElement('a')
      const url = URL.createObjectURL(blob)
      link.setAttribute('href', url)
      link.setAttribute('download', `students_export_${new Date().toISOString().split('T')[0]}.csv`)
      link.style.visibility = 'hidden'
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)

      toast.success(`Exported ${filteredStudents.length} students to CSV`)
    } catch (error) {
      console.error('Export error:', error)
      toast.error('Failed to export data')
    }
  }



  if (loading) {
    return (
      <AdminLayout title="Student Management">
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            {[...Array(4)].map((_, i) => (
              <Card key={i} className="animate-pulse">
                <CardHeader className="pb-3">
                  <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                  <div className="h-8 bg-gray-200 rounded w-1/2"></div>
                </CardHeader>
              </Card>
            ))}
          </div>
        </div>
      </AdminLayout>
    )
  }

  return (
    <AdminLayout title="Student Management">
      <div className="space-y-6">
      {/* Header Actions */}
      <div className="flex items-center justify-between">
        <div className="text-sm text-gray-600">
          <p>To create new students, use the <strong>User Management</strong> section.</p>
        </div>
        <div className="flex space-x-2">
          <Button variant="outline" size="sm" onClick={handleExportData}>
            <Download className="h-4 w-4 mr-2" />
            Export Data
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card className="border-blue-200 bg-blue-50/50">
          <CardHeader className="pb-3">
            <CardDescription className="text-blue-600">Total Students</CardDescription>
            <div className="flex items-center justify-between">
              <CardTitle className="text-2xl font-bold text-blue-700">
                {stats.totalStudents}
              </CardTitle>
              <Badge variant="outline" className="bg-blue-100 text-blue-700 border-blue-300">
                All
              </Badge>
            </div>
          </CardHeader>
        </Card>

        <Card className="border-green-200 bg-green-50/50">
          <CardHeader className="pb-3">
            <CardDescription className="text-green-600">Enrolled Students</CardDescription>
            <div className="flex items-center justify-between">
              <CardTitle className="text-2xl font-bold text-green-700">
                {stats.enrolledStudents}
              </CardTitle>
              <Badge className="bg-green-100 text-green-800 border-green-200">
                Enrolled
              </Badge>
            </div>
          </CardHeader>
        </Card>

        <Card className="border-yellow-200 bg-yellow-50/50">
          <CardHeader className="pb-3">
            <CardDescription className="text-yellow-600">Unenrolled Students</CardDescription>
            <div className="flex items-center justify-between">
              <CardTitle className="text-2xl font-bold text-yellow-700">
                {stats.unenrolledStudents}
              </CardTitle>
              <Badge variant="outline" className="bg-yellow-100 text-yellow-800 border-yellow-300">
                Pending
              </Badge>
            </div>
          </CardHeader>
        </Card>

        <Card className="border-purple-200 bg-purple-50/50">
          <CardHeader className="pb-3">
            <CardDescription className="text-purple-600">Active Enrollments</CardDescription>
            <div className="flex items-center justify-between">
              <CardTitle className="text-2xl font-bold text-purple-700">
                {stats.activeStudents}
              </CardTitle>
              <Badge className="bg-purple-100 text-purple-800 border-purple-200">
                Active
              </Badge>
            </div>
          </CardHeader>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Search & Filter Students</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  placeholder="Search by name, email, or student ID..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full md:w-48">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Students</SelectItem>
                <SelectItem value="enrolled">Enrolled</SelectItem>
                <SelectItem value="unenrolled">Unenrolled</SelectItem>
                <SelectItem value="active">Active</SelectItem>
              </SelectContent>
            </Select>
            <Select value={classFilter} onValueChange={setClassFilter}>
              <SelectTrigger className="w-full md:w-48">
                <SelectValue placeholder="Filter by class" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Classes</SelectItem>
                {availableClasses.map((cls) => (
                  <SelectItem key={cls.id} value={cls.name}>
                    {cls.name} - {cls.section}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Students List */}
      <Card>
        <CardHeader>
          <CardTitle>Students ({filteredStudents.length})</CardTitle>
          <CardDescription>Manage student information and enrollments</CardDescription>
        </CardHeader>
        <CardContent>
          {filteredStudents.length > 0 ? (
            <div className="space-y-4">
              {filteredStudents.map((student) => (
                <div key={student.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3">
                      <div>
                        <h3 className="font-medium">{student.name}</h3>
                        <p className="text-sm text-gray-600">{student.email}</p>
                        {student.student_id && (
                          <p className="text-xs text-gray-500">ID: {student.student_id}</p>
                        )}
                      </div>
                    </div>
                    <div className="mt-2 flex items-center space-x-4 text-sm text-gray-500">
                      {student.phone && <span>📞 {student.phone}</span>}
                      {student.date_of_birth && (
                        <span>🎂 {new Date(student.date_of_birth).toLocaleDateString()}</span>
                      )}
                      <span>📅 Joined {new Date(student.created_at).toLocaleDateString()}</span>
                    </div>
                  </div>
                  <div className="flex items-center space-x-4">
                    <div className="text-right">
                      {student.class_enrollment ? (
                        <div className="space-y-2">
                          <div className="flex items-center justify-end gap-2">
                            <Badge variant="default" className="bg-blue-100 text-blue-800 border-blue-200">
                              {student.class_enrollment.class_name}
                            </Badge>
                            <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-300">
                              Section {student.class_enrollment.section}
                            </Badge>
                          </div>
                          {student.class_enrollment.roll_number && (
                            <p className="text-xs text-gray-500">
                              Roll: {student.class_enrollment.roll_number}
                            </p>
                          )}
                          <Badge
                            variant={student.class_enrollment.status === 'active' ? 'default' : 'secondary'}
                            className={
                              student.class_enrollment.status === 'active'
                                ? 'bg-green-100 text-green-800 border-green-200'
                                : 'bg-yellow-100 text-yellow-800 border-yellow-200'
                            }
                          >
                            {student.class_enrollment.status}
                          </Badge>
                        </div>
                      ) : (
                        <Badge variant="outline" className="bg-gray-50 text-gray-600 border-gray-300">
                          Not Enrolled
                        </Badge>
                      )}
                    </div>
                    <div className="flex space-x-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setSelectedStudent(student)
                          setShowViewModal(true)
                        }}
                      >
                        <Eye className="h-4 w-4 mr-1" />
                        View
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setSelectedStudent(student)
                          setShowEditModal(true)
                        }}
                      >
                        <Edit className="h-4 w-4 mr-1" />
                        Edit
                      </Button>
                      {!student.class_enrollment && (
                        <Button
                          size="sm"
                          onClick={() => {
                            setSelectedStudent(student)
                            setShowEnrollModal(true)
                          }}
                        >
                          <UserPlus className="h-4 w-4 mr-1" />
                          Enroll
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <div className="text-4xl mb-4">🎓</div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">No Students Found</h3>
              <p className="text-gray-500 mb-4">
                {searchTerm || statusFilter !== 'all' || classFilter !== 'all'
                  ? 'No students match your current filters.'
                  : 'No students found. Students can be created through User Management.'}
              </p>
            </div>
          )}
        </CardContent>
      </Card>
      </div>



      {/* View Student Modal */}
      {showViewModal && selectedStudent && (
        <ViewStudentModal
          student={selectedStudent}
          onClose={() => {
            setShowViewModal(false)
            setSelectedStudent(null)
          }}
        />
      )}

      {/* Edit Student Modal */}
      {showEditModal && selectedStudent && (
        <EditStudentModal
          student={selectedStudent}
          onClose={() => {
            setShowEditModal(false)
            setSelectedStudent(null)
          }}
          onStudentUpdated={() => {
            fetchStudents()
            setShowEditModal(false)
            setSelectedStudent(null)
          }}
          availableClasses={availableClasses}
        />
      )}

      {/* Enroll Student Modal */}
      {showEnrollModal && selectedStudent && (
        <EnrollStudentModal
          student={selectedStudent}
          onClose={() => {
            setShowEnrollModal(false)
            setSelectedStudent(null)
          }}
          onStudentEnrolled={() => {
            fetchStudents()
            setShowEnrollModal(false)
            setSelectedStudent(null)
          }}
          availableClasses={availableClasses}
        />
      )}
    </AdminLayout>
  )
}







// View Student Modal Component
function ViewStudentModal({
  student,
  onClose
}: {
  student: Student
  onClose: () => void
}) {
  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Student Details</DialogTitle>
          <DialogDescription>
            Complete information for {student.name}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Basic Information */}
          <div>
            <h3 className="font-medium text-lg mb-3">Basic Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label className="text-sm font-medium text-gray-500">Full Name</Label>
                <p className="text-sm">{student.name}</p>
              </div>
              <div>
                <Label className="text-sm font-medium text-gray-500">Email</Label>
                <p className="text-sm">{student.email}</p>
              </div>
              <div>
                <Label className="text-sm font-medium text-gray-500">Phone</Label>
                <p className="text-sm">{student.phone || 'Not provided'}</p>
              </div>
              <div>
                <Label className="text-sm font-medium text-gray-500">Student ID</Label>
                <p className="text-sm">{student.student_id || 'Not assigned'}</p>
              </div>
              <div>
                <Label className="text-sm font-medium text-gray-500">Date of Birth</Label>
                <p className="text-sm">
                  {student.date_of_birth
                    ? new Date(student.date_of_birth).toLocaleDateString()
                    : 'Not provided'
                  }
                </p>
              </div>
              <div>
                <Label className="text-sm font-medium text-gray-500">Joined</Label>
                <p className="text-sm">{new Date(student.created_at).toLocaleDateString()}</p>
              </div>
            </div>
            {student.address && (
              <div className="mt-4">
                <Label className="text-sm font-medium text-gray-500">Address</Label>
                <p className="text-sm">{student.address}</p>
              </div>
            )}
          </div>

          {/* Class Information */}
          <div className="border-t pt-4">
            <h3 className="font-medium text-lg mb-3">Class Information</h3>
            {student.class_enrollment ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm font-medium text-gray-500">Class</Label>
                  <p className="text-sm">{student.class_enrollment.class_name}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-gray-500">Section</Label>
                  <p className="text-sm">{student.class_enrollment.section}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-gray-500">Roll Number</Label>
                  <p className="text-sm">{student.class_enrollment.roll_number || 'Not assigned'}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-gray-500">Status</Label>
                  <div className="mt-1">
                    <Badge
                      variant={student.class_enrollment.status === 'active' ? 'default' : 'secondary'}
                      className={
                        student.class_enrollment.status === 'active'
                          ? 'bg-green-100 text-green-800 border-green-200'
                          : student.class_enrollment.status === 'inactive'
                          ? 'bg-red-100 text-red-800 border-red-200'
                          : 'bg-yellow-100 text-yellow-800 border-yellow-200'
                      }
                    >
                      {student.class_enrollment.status}
                    </Badge>
                  </div>
                </div>
              </div>
            ) : (
              <p className="text-sm text-gray-500">Student is not enrolled in any class</p>
            )}
          </div>

          {/* Contact Information */}
          <div className="border-t pt-4">
            <h3 className="font-medium text-lg mb-3">Emergency Contact</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label className="text-sm font-medium text-gray-500">Emergency Contact</Label>
                <p className="text-sm">{student.emergency_contact || 'Not provided'}</p>
              </div>
              <div>
                <Label className="text-sm font-medium text-gray-500">Emergency Phone</Label>
                <p className="text-sm">{student.emergency_phone || 'Not provided'}</p>
              </div>
            </div>
          </div>

          {/* Account Status */}
          <div className="border-t pt-4">
            <h3 className="font-medium text-lg mb-3">Account Status</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label className="text-sm font-medium text-gray-500">Onboarding Status</Label>
                <div className="mt-1">
                  <Badge
                    variant={student.onboarding_completed ? 'default' : 'secondary'}
                    className={
                      student.onboarding_completed
                        ? 'bg-green-100 text-green-800 border-green-200'
                        : 'bg-yellow-100 text-yellow-800 border-yellow-200'
                    }
                  >
                    {student.onboarding_completed ? 'Completed' : 'Pending'}
                  </Badge>
                </div>
              </div>
              <div>
                <Label className="text-sm font-medium text-gray-500">Account Created</Label>
                <p className="text-sm">{new Date(student.created_at).toLocaleDateString()}</p>
              </div>
            </div>
          </div>
        </div>

        <div className="flex justify-end pt-4">
          <Button onClick={onClose}>Close</Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
