'use client'

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import { Badge } from '@/components/ui/badge'
import { 
  Save, 
  Search, 
  Calendar, 
  Users, 
  UserCheck, 
  UserX, 
  CheckCircle2,
  XCircle,
  Clock,
  RefreshCw
} from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { toast } from 'sonner'
import { useAuthStore } from '@/lib/stores/auth-store'

interface Student {
  id: string
  name: string
  roll_number: number | null
  admission_number: string | null
  class_id: string
}

interface Class {
  id: string
  name: string
  section: string
  grade_level: number
  student_count: number
}

interface AttendanceRecord {
  student_id: string
  status: 'present' | 'absent' | undefined
}

interface AttendanceStats {
  totalStudents: number
  presentCount: number
  absentCount: number
  unmarkedCount: number
}

export default function EnhancedAttendanceRegistry() {
  const { user } = useAuthStore()
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [classes, setClasses] = useState<Class[]>([])
  const [students, setStudents] = useState<Student[]>([])
  const [selectedClass, setSelectedClass] = useState<string>('')
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0])
  const [searchTerm, setSearchTerm] = useState('')
  const [attendance, setAttendance] = useState<Record<string, 'present' | 'absent' | undefined>>({})
  const [existingAttendance, setExistingAttendance] = useState<boolean>(false)

  useEffect(() => {
    fetchClasses()
  }, [])

  useEffect(() => {
    if (selectedClass) {
      fetchStudents(selectedClass)
      checkExistingAttendance(selectedClass, selectedDate)
    }
  }, [selectedClass, selectedDate])

  const fetchClasses = async () => {
    try {
      const { data, error } = await supabase
        .from('classes')
        .select(`
          id,
          name,
          section,
          grade_level,
          students!inner(count)
        `)
        .eq('school_id', user?.school_id)
        .order('grade_level')
        .order('section')

      if (error) throw error

      // Transform the data to include student count
      const classesWithCount = await Promise.all(
        (data || []).map(async (cls) => {
          const { count } = await supabase
            .from('students')
            .select('*', { count: 'exact', head: true })
            .eq('class_id', cls.id)
            .eq('is_active', true)

          return {
            ...cls,
            student_count: count || 0
          }
        })
      )

      setClasses(classesWithCount)
    } catch (error) {
      console.error('Error fetching classes:', error)
      toast.error('Failed to load classes')
    }
  }

  const fetchStudents = async (classId: string) => {
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('students')
        .select(`
          id,
          roll_number,
          admission_number,
          class_id,
          profiles!inner(
            name
          )
        `)
        .eq('class_id', classId)
        .eq('is_active', true)
        .order('roll_number', { nullsLast: true })

      if (error) throw error

      const studentsData = (data || []).map((student: any) => ({
        id: student.id,
        name: student.profiles.name,
        roll_number: student.roll_number,
        admission_number: student.admission_number,
        class_id: student.class_id
      }))

      setStudents(studentsData)
    } catch (error) {
      console.error('Error fetching students:', error)
      toast.error('Failed to load students')
    } finally {
      setLoading(false)
    }
  }

  const checkExistingAttendance = async (classId: string, date: string) => {
    try {
      const { data, error } = await supabase
        .from('student_attendance')
        .select('student_id, status')
        .eq('class_id', classId)
        .eq('attendance_date', date)

      if (error) throw error

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

  const handleAttendanceChange = (studentId: string, status: 'present' | 'absent') => {
    setAttendance(prev => ({
      ...prev,
      [studentId]: prev[studentId] === status ? undefined : status
    }))
  }

  const markAllPresent = () => {
    const allPresentAttendance: Record<string, 'present'> = {}
    filteredStudents.forEach(student => {
      allPresentAttendance[student.id] = 'present'
    })
    setAttendance(allPresentAttendance)
  }

  const markAllAbsent = () => {
    const allAbsentAttendance: Record<string, 'absent'> = {}
    filteredStudents.forEach(student => {
      allAbsentAttendance[student.id] = 'absent'
    })
    setAttendance(allAbsentAttendance)
  }

  const clearAll = () => {
    setAttendance({})
  }

  const saveAttendance = async () => {
    if (!selectedClass || !selectedDate) {
      toast.error('Please select a class and date')
      return
    }

    // Check if all students have attendance marked
    const unmarkedStudents = filteredStudents.filter(student => !attendance[student.id])
    if (unmarkedStudents.length > 0) {
      toast.error(`Please mark attendance for all students. ${unmarkedStudents.length} students unmarked.`)
      return
    }

    setSaving(true)
    try {
      const attendanceRecords = Object.entries(attendance).map(([studentId, status]) => ({
        student_id: studentId,
        class_id: selectedClass,
        school_id: user?.school_id,
        attendance_date: selectedDate,
        status: status!,
        marked_by: user?.id
      }))

      if (existingAttendance) {
        // Delete existing records first
        await supabase
          .from('student_attendance')
          .delete()
          .eq('class_id', selectedClass)
          .eq('attendance_date', selectedDate)
      }

      // Insert new records
      const { error } = await supabase
        .from('student_attendance')
        .insert(attendanceRecords)

      if (error) throw error

      toast.success(`Attendance ${existingAttendance ? 'updated' : 'saved'} successfully!`)
      setExistingAttendance(true)
    } catch (error) {
      console.error('Error saving attendance:', error)
      toast.error('Failed to save attendance')
    } finally {
      setSaving(false)
    }
  }

  const filteredStudents = students.filter(student =>
    student.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    student.roll_number?.toString().includes(searchTerm) ||
    student.admission_number?.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const attendanceStats: AttendanceStats = {
    totalStudents: filteredStudents.length,
    presentCount: filteredStudents.filter(student => attendance[student.id] === 'present').length,
    absentCount: filteredStudents.filter(student => attendance[student.id] === 'absent').length,
    unmarkedCount: filteredStudents.filter(student => !attendance[student.id]).length
  }

  const selectedClassName = classes.find(cls => cls.id === selectedClass)?.name || ''

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Users className="h-5 w-5 mr-2" />
            Enhanced Attendance Registry
          </CardTitle>
          <CardDescription>
            Simple tabular attendance marking system - like a traditional school registry
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Class and Date Selection */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label htmlFor="class-select">Select Class</Label>
              <Select value={selectedClass} onValueChange={setSelectedClass}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose a class" />
                </SelectTrigger>
                <SelectContent>
                  {classes.map((cls) => (
                    <SelectItem key={cls.id} value={cls.id}>
                      {cls.name} ({cls.student_count} students)
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="date-select">Attendance Date</Label>
              <Input
                id="date-select"
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                max={new Date().toISOString().split('T')[0]}
              />
            </div>

            <div>
              <Label htmlFor="search">Search Students</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  id="search"
                  placeholder="Name, roll no, admission no..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
          </div>

          {/* Attendance Stats */}
          {selectedClass && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-blue-50 p-3 rounded-lg text-center">
                <div className="text-2xl font-bold text-blue-600">{attendanceStats.totalStudents}</div>
                <div className="text-sm text-blue-700">Total Students</div>
              </div>
              <div className="bg-green-50 p-3 rounded-lg text-center">
                <div className="text-2xl font-bold text-green-600">{attendanceStats.presentCount}</div>
                <div className="text-sm text-green-700">Present</div>
              </div>
              <div className="bg-red-50 p-3 rounded-lg text-center">
                <div className="text-2xl font-bold text-red-600">{attendanceStats.absentCount}</div>
                <div className="text-sm text-red-700">Absent</div>
              </div>
              <div className="bg-yellow-50 p-3 rounded-lg text-center">
                <div className="text-2xl font-bold text-yellow-600">{attendanceStats.unmarkedCount}</div>
                <div className="text-sm text-yellow-700">Unmarked</div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Attendance Registry Table */}
      {selectedClass && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Attendance Registry - {selectedClassName}</CardTitle>
                <CardDescription>
                  Date: {new Date(selectedDate).toLocaleDateString('en-US', {
                    weekday: 'long',
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                  })}
                  {existingAttendance && (
                    <Badge variant="secondary" className="ml-2">
                      <Clock className="h-3 w-3 mr-1" />
                      Previously Marked
                    </Badge>
                  )}
                </CardDescription>
              </div>

              {/* Quick Action Buttons */}
              <div className="flex space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={markAllPresent}
                  className="text-green-600 border-green-200 hover:bg-green-50"
                >
                  <UserCheck className="h-4 w-4 mr-1" />
                  All Present
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={markAllAbsent}
                  className="text-red-600 border-red-200 hover:bg-red-50"
                >
                  <UserX className="h-4 w-4 mr-1" />
                  All Absent
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={clearAll}
                  className="text-gray-600 border-gray-200 hover:bg-gray-50"
                >
                  <RefreshCw className="h-4 w-4 mr-1" />
                  Clear All
                </Button>
              </div>
            </div>
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
                <p className="text-gray-500">
                  {searchTerm ? 'No students match your search criteria.' : 'No students enrolled in this class.'}
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {/* Table Header */}
                <div className="bg-gray-50 rounded-lg p-4">
                  <div className="grid grid-cols-12 gap-4 font-medium text-gray-700">
                    <div className="col-span-1 text-center">S.No</div>
                    <div className="col-span-2 text-center">Roll No</div>
                    <div className="col-span-4">Student Name</div>
                    <div className="col-span-2 text-center">Present</div>
                    <div className="col-span-2 text-center">Absent</div>
                    <div className="col-span-1 text-center">Status</div>
                  </div>
                </div>

                {/* Student Rows */}
                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {filteredStudents.map((student, index) => {
                    const studentAttendance = attendance[student.id]
                    return (
                      <div
                        key={student.id}
                        className={`grid grid-cols-12 gap-4 p-3 rounded-lg border transition-colors ${
                          studentAttendance === 'present'
                            ? 'bg-green-50 border-green-200'
                            : studentAttendance === 'absent'
                            ? 'bg-red-50 border-red-200'
                            : 'bg-white border-gray-200 hover:bg-gray-50'
                        }`}
                      >
                        {/* Serial Number */}
                        <div className="col-span-1 text-center font-medium text-gray-600">
                          {index + 1}
                        </div>

                        {/* Roll Number */}
                        <div className="col-span-2 text-center">
                          <Badge variant="outline" className="text-xs">
                            {student.roll_number || 'N/A'}
                          </Badge>
                        </div>

                        {/* Student Name */}
                        <div className="col-span-4">
                          <div className="font-medium text-gray-900">{student.name}</div>
                          {student.admission_number && (
                            <div className="text-xs text-gray-500">
                              Admission: {student.admission_number}
                            </div>
                          )}
                        </div>

                        {/* Present Checkbox */}
                        <div className="col-span-2 flex justify-center">
                          <div className="flex items-center space-x-2">
                            <Checkbox
                              id={`present-${student.id}`}
                              checked={studentAttendance === 'present'}
                              onCheckedChange={() => handleAttendanceChange(student.id, 'present')}
                              className="data-[state=checked]:bg-green-600 data-[state=checked]:border-green-600"
                            />
                            <Label
                              htmlFor={`present-${student.id}`}
                              className="text-sm font-medium text-green-700 cursor-pointer"
                            >
                              Present
                            </Label>
                          </div>
                        </div>

                        {/* Absent Checkbox */}
                        <div className="col-span-2 flex justify-center">
                          <div className="flex items-center space-x-2">
                            <Checkbox
                              id={`absent-${student.id}`}
                              checked={studentAttendance === 'absent'}
                              onCheckedChange={() => handleAttendanceChange(student.id, 'absent')}
                              className="data-[state=checked]:bg-red-600 data-[state=checked]:border-red-600"
                            />
                            <Label
                              htmlFor={`absent-${student.id}`}
                              className="text-sm font-medium text-red-700 cursor-pointer"
                            >
                              Absent
                            </Label>
                          </div>
                        </div>

                        {/* Status Indicator */}
                        <div className="col-span-1 flex justify-center">
                          {studentAttendance === 'present' && (
                            <CheckCircle2 className="h-5 w-5 text-green-600" />
                          )}
                          {studentAttendance === 'absent' && (
                            <XCircle className="h-5 w-5 text-red-600" />
                          )}
                          {!studentAttendance && (
                            <div className="h-5 w-5 rounded-full border-2 border-gray-300" />
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>

                {/* Save Button */}
                <div className="flex justify-end pt-4 border-t">
                  <Button
                    onClick={saveAttendance}
                    disabled={saving || attendanceStats.unmarkedCount > 0}
                    className="min-w-32"
                  >
                    {saving ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                        Saving...
                      </>
                    ) : (
                      <>
                        <Save className="h-4 w-4 mr-2" />
                        {existingAttendance ? 'Update Attendance' : 'Save Attendance'}
                      </>
                    )}
                  </Button>
                </div>

                {attendanceStats.unmarkedCount > 0 && (
                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                    <div className="flex items-center">
                      <div className="h-4 w-4 bg-yellow-400 rounded-full mr-2"></div>
                      <span className="text-sm text-yellow-800">
                        Please mark attendance for all students before saving.
                        <strong> {attendanceStats.unmarkedCount} students</strong> still need to be marked.
                      </span>
                    </div>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  )
}
