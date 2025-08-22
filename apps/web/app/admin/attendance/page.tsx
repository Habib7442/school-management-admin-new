'use client'

import { useEffect, useState } from 'react'
import AdminLayout from '@/components/admin/AdminLayout'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Checkbox } from '@/components/ui/checkbox'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { useAuthStore } from '@/lib/stores/auth-store'
import { supabase } from '@/lib/supabase'
import { toast } from 'sonner'
import { Calendar, Users, UserCheck, UserX, Search, Save, CheckCircle, XCircle, BookOpen, ArrowRight } from 'lucide-react'
import Link from 'next/link'

interface Student {
  id: string
  name: string
  email: string
  student_id?: string
  roll_number?: number
  class_enrollment?: {
    class_id: string
    class_name: string
    section: string
    roll_number?: number
  }
}

interface AttendanceRecord {
  student_id: string
  status: 'present' | 'absent'
}

interface Class {
  id: string
  name: string
  section: string
  grade_level: number
}

interface AttendanceStats {
  totalStudents: number
  presentCount: number
  absentCount: number
  unmarkedCount: number
}

export default function AttendanceManagement() {
  const { user } = useAuthStore()
  const [loading, setLoading] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [classes, setClasses] = useState<Class[]>([])
  const [students, setStudents] = useState<Student[]>([])
  const [selectedClass, setSelectedClass] = useState<string>('')
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0])
  const [searchTerm, setSearchTerm] = useState('')
  const [attendance, setAttendance] = useState<Record<string, 'present' | 'absent' | undefined>>({})
  const [existingAttendance, setExistingAttendance] = useState<boolean>(false)
  const [showConfirmDialog, setShowConfirmDialog] = useState(false)
  const [stats, setStats] = useState<AttendanceStats>({
    totalStudents: 0,
    presentCount: 0,
    absentCount: 0,
    unmarkedCount: 0
  })

  // Fetch available classes
  useEffect(() => {
    const fetchClasses = async () => {
      try {
        const { data, error } = await supabase
          .from('classes')
          .select('id, name, section, grade_level')
          .eq('school_id', user?.school_id)
          .order('grade_level', { ascending: true })
          .order('name', { ascending: true })
          .order('section', { ascending: true })

        if (error) {
          console.error('Error fetching classes:', error)
          toast.error('Failed to load classes')
          return
        }

        setClasses(data || [])
      } catch (error) {
        console.error('Error fetching classes:', error)
        toast.error('Failed to load classes')
      }
    }

    if (user?.school_id) {
      fetchClasses()
    }
  }, [user?.school_id])

  // Fetch students for selected class
  useEffect(() => {
    const fetchStudents = async () => {
      if (!selectedClass) {
        setStudents([])
        return
      }

      try {
        setLoading(true)
        const { data, error } = await supabase
          .from('class_enrollments')
          .select(`
            student_id,
            roll_number,
            class_id,
            students!inner(
              id,
              student_id,
              roll_number,
              profiles!inner(name, email)
            ),
            classes!inner(name, section)
          `)
          .eq('class_id', selectedClass)
          .eq('status', 'active')
          .eq('students.is_active', true)
          .order('roll_number', { ascending: true })

        if (error) {
          console.error('Error fetching students:', error)
          toast.error('Failed to load students')
          return
        }

        const formattedStudents: Student[] = (data || []).map(enrollment => ({
          id: enrollment.students.id,
          name: enrollment.students.profiles.name,
          email: enrollment.students.profiles.email,
          student_id: enrollment.students.student_id,
          roll_number: enrollment.roll_number,
          class_enrollment: {
            class_id: enrollment.class_id,
            class_name: enrollment.classes.name,
            section: enrollment.classes.section,
            roll_number: enrollment.roll_number
          }
        }))

        setStudents(formattedStudents)
        
        // Reset attendance when students change
        setAttendance({})
        
        // Check if attendance already exists for this date and class
        await checkExistingAttendance(selectedClass, selectedDate)
        
      } catch (error) {
        console.error('Error fetching students:', error)
        toast.error('Failed to load students')
      } finally {
        setLoading(false)
      }
    }

    fetchStudents()
  }, [selectedClass, selectedDate])

  // Check for existing attendance
  const checkExistingAttendance = async (classId: string, date: string) => {
    try {
      const { data, error } = await supabase
        .from('student_attendance')
        .select('student_id, status')
        .eq('class_id', classId)
        .eq('attendance_date', date)

      if (error) {
        console.error('Error checking existing attendance:', error)
        return
      }

      if (data && data.length > 0) {
        setExistingAttendance(true)
        const existingAttendanceMap: Record<string, 'present' | 'absent'> = {}
        data.forEach(record => {
          existingAttendanceMap[record.student_id] = record.status
        })
        setAttendance(existingAttendanceMap)
      } else {
        setExistingAttendance(false)
        setAttendance({})
      }
    } catch (error) {
      console.error('Error checking existing attendance:', error)
    }
  }

  // Update stats when attendance changes
  useEffect(() => {
    const presentCount = Object.values(attendance).filter(status => status === 'present').length
    const absentCount = Object.values(attendance).filter(status => status === 'absent').length
    const unmarkedCount = students.length - presentCount - absentCount

    setStats({
      totalStudents: students.length,
      presentCount,
      absentCount,
      unmarkedCount
    })
  }, [attendance, students])

  // Handle attendance change
  const handleAttendanceChange = (studentId: string, status: 'present' | 'absent') => {
    setAttendance(prev => ({
      ...prev,
      [studentId]: status
    }))
  }

  // Mark all students as present
  const markAllPresent = () => {
    const newAttendance: Record<string, 'present' | 'absent'> = {}
    filteredStudents.forEach(student => {
      newAttendance[student.id] = 'present'
    })
    setAttendance(prev => ({ ...prev, ...newAttendance }))
    toast.success('Marked all students as present')
  }

  // Mark all students as absent
  const markAllAbsent = () => {
    const newAttendance: Record<string, 'present' | 'absent'> = {}
    filteredStudents.forEach(student => {
      newAttendance[student.id] = 'absent'
    })
    setAttendance(prev => ({ ...prev, ...newAttendance }))
    toast.success('Marked all students as absent')
  }

  // Filter students based on search term
  const filteredStudents = students.filter(student =>
    student.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    student.student_id?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    student.roll_number?.toString().includes(searchTerm)
  )

  // Validate form before submission
  const validateForm = (): boolean => {
    if (!selectedClass) {
      toast.error('Please select a class')
      return false
    }

    if (!selectedDate) {
      toast.error('Please select a date')
      return false
    }

    if (new Date(selectedDate) > new Date()) {
      toast.error('Cannot mark attendance for future dates')
      return false
    }

    const unmarkedStudents = filteredStudents.filter(student => !attendance[student.id])
    if (unmarkedStudents.length > 0) {
      toast.error(`Please mark attendance for all students. ${unmarkedStudents.length} students unmarked.`)
      return false
    }

    return true
  }

  // Submit attendance
  const submitAttendance = async () => {
    if (!validateForm()) return

    try {
      setSubmitting(true)

      // Prepare attendance records
      const attendanceRecords = Object.entries(attendance).map(([studentId, status]) => ({
        student_id: studentId,
        class_id: selectedClass,
        attendance_date: selectedDate,
        status: status!,
        marked_by: user?.id,
        school_id: user?.school_id
      }))

      if (existingAttendance) {
        // Update existing records
        for (const record of attendanceRecords) {
          const { error } = await supabase
            .from('student_attendance')
            .update({
              status: record.status,
              marked_by: record.marked_by,
              updated_at: new Date().toISOString()
            })
            .eq('student_id', record.student_id)
            .eq('class_id', record.class_id)
            .eq('attendance_date', record.attendance_date)

          if (error) {
            console.error('Error updating attendance:', error)
            toast.error('Failed to update attendance')
            return
          }
        }
        toast.success('Attendance updated successfully!')
      } else {
        // Insert new records
        const { error } = await supabase
          .from('student_attendance')
          .insert(attendanceRecords)

        if (error) {
          console.error('Error saving attendance:', error)
          toast.error('Failed to save attendance')
          return
        }
        toast.success('Attendance saved successfully!')
      }

      setExistingAttendance(true)
      setShowConfirmDialog(false)
    } catch (error) {
      console.error('Error submitting attendance:', error)
      toast.error('Failed to submit attendance')
    } finally {
      setSubmitting(false)
    }
  }

  const selectedClassInfo = classes.find(cls => cls.id === selectedClass)

  return (
    <AdminLayout title="Attendance Management">
      <div className="space-y-6">
        {/* Enhanced Attendance Registry Card */}
        <Card className="border-purple-200 bg-gradient-to-r from-purple-50 to-blue-50">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <div className="p-3 bg-purple-100 rounded-lg">
                  <BookOpen className="h-6 w-6 text-purple-600" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">Enhanced Attendance Registry</h3>
                  <p className="text-sm text-gray-600">
                    Simple tabular attendance marking system - like a traditional school registry
                  </p>
                  <div className="flex items-center space-x-4 mt-2">
                    <div className="flex items-center text-xs text-gray-500">
                      <CheckCircle className="h-3 w-3 mr-1 text-green-500" />
                      Quick bulk actions
                    </div>
                    <div className="flex items-center text-xs text-gray-500">
                      <Users className="h-3 w-3 mr-1 text-blue-500" />
                      Real-time stats
                    </div>
                    <div className="flex items-center text-xs text-gray-500">
                      <Search className="h-3 w-3 mr-1 text-purple-500" />
                      Search & filter
                    </div>
                  </div>
                </div>
              </div>
              <Link href="/admin/attendance/enhanced">
                <Button className="bg-purple-600 hover:bg-purple-700">
                  Try Enhanced Registry
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>

        {/* Header with Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="border-blue-200 bg-blue-50/50">
            <CardHeader className="pb-3">
              <CardDescription className="text-blue-600">Total Students</CardDescription>
              <div className="flex items-center justify-between">
                <CardTitle className="text-2xl font-bold text-blue-700">
                  {stats.totalStudents}
                </CardTitle>
                <Users className="h-5 w-5 text-blue-600" />
              </div>
            </CardHeader>
          </Card>

          <Card className="border-green-200 bg-green-50/50">
            <CardHeader className="pb-3">
              <CardDescription className="text-green-600">Present</CardDescription>
              <div className="flex items-center justify-between">
                <CardTitle className="text-2xl font-bold text-green-700">
                  {stats.presentCount}
                </CardTitle>
                <UserCheck className="h-5 w-5 text-green-600" />
              </div>
            </CardHeader>
          </Card>

          <Card className="border-red-200 bg-red-50/50">
            <CardHeader className="pb-3">
              <CardDescription className="text-red-600">Absent</CardDescription>
              <div className="flex items-center justify-between">
                <CardTitle className="text-2xl font-bold text-red-700">
                  {stats.absentCount}
                </CardTitle>
                <UserX className="h-5 w-5 text-red-600" />
              </div>
            </CardHeader>
          </Card>

          <Card className="border-yellow-200 bg-yellow-50/50">
            <CardHeader className="pb-3">
              <CardDescription className="text-yellow-600">Unmarked</CardDescription>
              <div className="flex items-center justify-between">
                <CardTitle className="text-2xl font-bold text-yellow-700">
                  {stats.unmarkedCount}
                </CardTitle>
                <Calendar className="h-5 w-5 text-yellow-600" />
              </div>
            </CardHeader>
          </Card>
        </div>

        {/* Filters and Controls */}
        <Card>
          <CardHeader>
            <CardTitle>Mark Attendance</CardTitle>
            <CardDescription>
              Select class, section, and date to mark student attendance
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="class-select">Class & Section</Label>
                <Select value={selectedClass} onValueChange={setSelectedClass}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select class and section" />
                  </SelectTrigger>
                  <SelectContent>
                    {classes.map((cls) => (
                      <SelectItem key={cls.id} value={cls.id}>
                        {cls.name} - Section {cls.section} (Grade {cls.grade_level})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="date-select">Attendance Date</Label>
                <Input
                  id="date-select"
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  max={new Date().toISOString().split('T')[0]}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="search">Search Students</Label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    id="search"
                    placeholder="Search by name, ID, or roll number"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
            </div>

            {selectedClass && selectedClassInfo && (
              <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg border border-blue-200">
                <div>
                  <h3 className="font-medium text-blue-900">
                    {selectedClassInfo.name} - Section {selectedClassInfo.section}
                  </h3>
                  <p className="text-sm text-blue-700">
                    Grade {selectedClassInfo.grade_level} • {new Date(selectedDate).toLocaleDateString()}
                  </p>
                  {existingAttendance && (
                    <Badge className="mt-1 bg-yellow-100 text-yellow-800 border-yellow-200">
                      Attendance already marked for this date
                    </Badge>
                  )}
                </div>
                <div className="flex space-x-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={markAllPresent}
                    disabled={loading || filteredStudents.length === 0}
                    className="bg-green-50 text-green-700 border-green-200 hover:bg-green-100"
                  >
                    <CheckCircle className="h-4 w-4 mr-1" />
                    Mark All Present
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={markAllAbsent}
                    disabled={loading || filteredStudents.length === 0}
                    className="bg-red-50 text-red-700 border-red-200 hover:bg-red-100"
                  >
                    <XCircle className="h-4 w-4 mr-1" />
                    Mark All Absent
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Attendance Table */}
        {selectedClass && (
          <Card>
            <CardHeader>
              <CardTitle>Student Attendance Registry</CardTitle>
              <CardDescription>
                Mark attendance for each student. Only one option (Present or Absent) can be selected per student.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="text-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                    <p className="mt-2 text-gray-600">Loading students...</p>
                  </div>
                </div>
              ) : filteredStudents.length === 0 ? (
                <div className="text-center py-8">
                  <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No Students Found</h3>
                  <p className="text-gray-600">
                    {students.length === 0
                      ? 'No students are enrolled in the selected class.'
                      : 'No students match your search criteria.'
                    }
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-16">S.No.</TableHead>
                        <TableHead>Student Name</TableHead>
                        <TableHead className="w-24">Roll No.</TableHead>
                        <TableHead className="w-24 text-center">Present</TableHead>
                        <TableHead className="w-24 text-center">Absent</TableHead>
                        <TableHead className="w-24 text-center">Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredStudents.map((student, index) => (
                        <TableRow key={student.id} className="hover:bg-gray-50">
                          <TableCell className="font-medium">{index + 1}</TableCell>
                          <TableCell>
                            <div>
                              <p className="font-medium">{student.name}</p>
                              {student.student_id && (
                                <p className="text-xs text-gray-500">ID: {student.student_id}</p>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className="bg-gray-50 text-gray-700">
                              {student.roll_number || 'N/A'}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-center">
                            <Checkbox
                              checked={attendance[student.id] === 'present'}
                              onCheckedChange={(checked) => {
                                if (checked) {
                                  handleAttendanceChange(student.id, 'present')
                                }
                              }}
                              className="data-[state=checked]:bg-green-600 data-[state=checked]:border-green-600"
                            />
                          </TableCell>
                          <TableCell className="text-center">
                            <Checkbox
                              checked={attendance[student.id] === 'absent'}
                              onCheckedChange={(checked) => {
                                if (checked) {
                                  handleAttendanceChange(student.id, 'absent')
                                }
                              }}
                              className="data-[state=checked]:bg-red-600 data-[state=checked]:border-red-600"
                            />
                          </TableCell>
                          <TableCell className="text-center">
                            {attendance[student.id] === 'present' && (
                              <Badge className="bg-green-100 text-green-800 border-green-200">
                                Present
                              </Badge>
                            )}
                            {attendance[student.id] === 'absent' && (
                              <Badge className="bg-red-100 text-red-800 border-red-200">
                                Absent
                              </Badge>
                            )}
                            {!attendance[student.id] && (
                              <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200">
                                Unmarked
                              </Badge>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}

              {filteredStudents.length > 0 && (
                <div className="flex items-center justify-between mt-6 pt-4 border-t">
                  <div className="text-sm text-gray-600">
                    Showing {filteredStudents.length} of {students.length} students
                  </div>
                  <Button
                    onClick={() => setShowConfirmDialog(true)}
                    disabled={stats.unmarkedCount > 0 || submitting}
                    className="bg-blue-600 hover:bg-blue-700"
                  >
                    <Save className="h-4 w-4 mr-2" />
                    {existingAttendance ? 'Update Attendance' : 'Save Attendance'}
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Confirmation Dialog */}
        {showConfirmDialog && (
          <Dialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Confirm Attendance Submission</DialogTitle>
                <DialogDescription>
                  Are you sure you want to {existingAttendance ? 'update' : 'save'} attendance for{' '}
                  <strong>{selectedClassInfo?.name} - Section {selectedClassInfo?.section}</strong> on{' '}
                  <strong>{new Date(selectedDate).toLocaleDateString()}</strong>?
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4">
                <div className="grid grid-cols-3 gap-4 text-center">
                  <div className="p-3 bg-green-50 rounded-lg border border-green-200">
                    <p className="text-2xl font-bold text-green-700">{stats.presentCount}</p>
                    <p className="text-sm text-green-600">Present</p>
                  </div>
                  <div className="p-3 bg-red-50 rounded-lg border border-red-200">
                    <p className="text-2xl font-bold text-red-700">{stats.absentCount}</p>
                    <p className="text-sm text-red-600">Absent</p>
                  </div>
                  <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
                    <p className="text-2xl font-bold text-blue-700">{stats.totalStudents}</p>
                    <p className="text-sm text-blue-600">Total</p>
                  </div>
                </div>

                <div className="flex justify-end space-x-2">
                  <Button variant="outline" onClick={() => setShowConfirmDialog(false)}>
                    Cancel
                  </Button>
                  <Button onClick={submitAttendance} disabled={submitting}>
                    {submitting ? 'Submitting...' : existingAttendance ? 'Update Attendance' : 'Save Attendance'}
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </div>
    </AdminLayout>
  )
}
