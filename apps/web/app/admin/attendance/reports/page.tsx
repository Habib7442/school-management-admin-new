'use client'

import { useEffect, useState } from 'react'
import AdminLayout from '@/components/admin/AdminLayout'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { useAuthStore } from '@/lib/stores/auth-store'
import { supabase } from '@/lib/supabase'
import { toast } from 'sonner'
import { Calendar, Download, TrendingUp, Users, UserCheck, UserX } from 'lucide-react'

interface AttendanceReport {
  date: string
  student_name: string
  student_id: string
  roll_number: number
  status: 'present' | 'absent'
  class_name: string
  section: string
}

interface AttendanceSummary {
  totalDays: number
  presentDays: number
  absentDays: number
  attendancePercentage: number
}

interface Class {
  id: string
  name: string
  section: string
  grade_level: number
}

export default function AttendanceReports() {
  const { user } = useAuthStore()
  const [loading, setLoading] = useState(false)
  const [classes, setClasses] = useState<Class[]>([])
  const [selectedClass, setSelectedClass] = useState<string>('')
  const [startDate, setStartDate] = useState<string>('')
  const [endDate, setEndDate] = useState<string>('')
  const [attendanceData, setAttendanceData] = useState<AttendanceReport[]>([])
  const [summary, setSummary] = useState<AttendanceSummary>({
    totalDays: 0,
    presentDays: 0,
    absentDays: 0,
    attendancePercentage: 0
  })

  // Set default date range (last 30 days)
  useEffect(() => {
    const today = new Date()
    const thirtyDaysAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000)
    
    setEndDate(today.toISOString().split('T')[0])
    setStartDate(thirtyDaysAgo.toISOString().split('T')[0])
  }, [])

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

  // Fetch attendance data
  const fetchAttendanceData = async () => {
    if (!selectedClass || !startDate || !endDate) {
      return
    }

    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('student_attendance')
        .select(`
          attendance_date,
          status,
          student_id,
          profiles!inner(name),
          students!inner(student_id, roll_number),
          classes!inner(name, section)
        `)
        .eq('class_id', selectedClass)
        .gte('attendance_date', startDate)
        .lte('attendance_date', endDate)
        .order('attendance_date', { ascending: false })
        .order('students.roll_number', { ascending: true })

      if (error) {
        console.error('Error fetching attendance data:', error)
        toast.error('Failed to load attendance data')
        return
      }

      const formattedData: AttendanceReport[] = (data || []).map(record => ({
        date: record.attendance_date,
        student_name: record.profiles.name,
        student_id: record.students.student_id || record.student_id,
        roll_number: record.students.roll_number,
        status: record.status,
        class_name: record.classes.name,
        section: record.classes.section
      }))

      setAttendanceData(formattedData)

      // Calculate summary
      const totalRecords = formattedData.length
      const presentRecords = formattedData.filter(record => record.status === 'present').length
      const absentRecords = totalRecords - presentRecords
      const attendancePercentage = totalRecords > 0 ? (presentRecords / totalRecords) * 100 : 0

      setSummary({
        totalDays: totalRecords,
        presentDays: presentRecords,
        absentDays: absentRecords,
        attendancePercentage: Math.round(attendancePercentage * 100) / 100
      })

    } catch (error) {
      console.error('Error fetching attendance data:', error)
      toast.error('Failed to load attendance data')
    } finally {
      setLoading(false)
    }
  }

  // Export attendance data to CSV
  const exportToCSV = () => {
    if (attendanceData.length === 0) {
      toast.error('No data to export')
      return
    }

    try {
      const headers = ['Date', 'Student Name', 'Student ID', 'Roll Number', 'Status', 'Class', 'Section']
      const csvContent = [
        headers.join(','),
        ...attendanceData.map(record => [
          record.date,
          `"${record.student_name}"`,
          `"${record.student_id}"`,
          record.roll_number,
          record.status,
          `"${record.class_name}"`,
          `"${record.section}"`
        ].join(','))
      ].join('\n')

      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
      const link = document.createElement('a')
      const url = URL.createObjectURL(blob)
      link.setAttribute('href', url)
      link.setAttribute('download', `attendance_report_${startDate}_to_${endDate}.csv`)
      link.style.visibility = 'hidden'
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      
      toast.success('Attendance report exported successfully')
    } catch (error) {
      console.error('Export error:', error)
      toast.error('Failed to export data')
    }
  }

  const selectedClassInfo = classes.find(cls => cls.id === selectedClass)

  return (
    <AdminLayout title="Attendance Reports">
      <div className="space-y-6">
        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="border-blue-200 bg-blue-50/50">
            <CardHeader className="pb-3">
              <CardDescription className="text-blue-600">Total Records</CardDescription>
              <div className="flex items-center justify-between">
                <CardTitle className="text-2xl font-bold text-blue-700">
                  {summary.totalDays}
                </CardTitle>
                <Calendar className="h-5 w-5 text-blue-600" />
              </div>
            </CardHeader>
          </Card>

          <Card className="border-green-200 bg-green-50/50">
            <CardHeader className="pb-3">
              <CardDescription className="text-green-600">Present Days</CardDescription>
              <div className="flex items-center justify-between">
                <CardTitle className="text-2xl font-bold text-green-700">
                  {summary.presentDays}
                </CardTitle>
                <UserCheck className="h-5 w-5 text-green-600" />
              </div>
            </CardHeader>
          </Card>

          <Card className="border-red-200 bg-red-50/50">
            <CardHeader className="pb-3">
              <CardDescription className="text-red-600">Absent Days</CardDescription>
              <div className="flex items-center justify-between">
                <CardTitle className="text-2xl font-bold text-red-700">
                  {summary.absentDays}
                </CardTitle>
                <UserX className="h-5 w-5 text-red-600" />
              </div>
            </CardHeader>
          </Card>

          <Card className="border-purple-200 bg-purple-50/50">
            <CardHeader className="pb-3">
              <CardDescription className="text-purple-600">Attendance Rate</CardDescription>
              <div className="flex items-center justify-between">
                <CardTitle className="text-2xl font-bold text-purple-700">
                  {summary.attendancePercentage}%
                </CardTitle>
                <TrendingUp className="h-5 w-5 text-purple-600" />
              </div>
            </CardHeader>
          </Card>
        </div>

        {/* Filters */}
        <Card>
          <CardHeader>
            <CardTitle>Generate Attendance Report</CardTitle>
            <CardDescription>
              Select class and date range to view attendance reports
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
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

              <div>
                <Label htmlFor="start-date">Start Date</Label>
                <Input
                  id="start-date"
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  max={new Date().toISOString().split('T')[0]}
                />
              </div>

              <div>
                <Label htmlFor="end-date">End Date</Label>
                <Input
                  id="end-date"
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  max={new Date().toISOString().split('T')[0]}
                />
              </div>

              <div className="flex items-end space-x-2">
                <Button onClick={fetchAttendanceData} disabled={!selectedClass || !startDate || !endDate || loading}>
                  {loading ? 'Loading...' : 'Generate Report'}
                </Button>
                <Button 
                  variant="outline" 
                  onClick={exportToCSV} 
                  disabled={attendanceData.length === 0}
                >
                  <Download className="h-4 w-4 mr-2" />
                  Export CSV
                </Button>
              </div>
            </div>

            {selectedClass && selectedClassInfo && (
              <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
                <h3 className="font-medium text-blue-900">
                  {selectedClassInfo.name} - Section {selectedClassInfo.section}
                </h3>
                <p className="text-sm text-blue-700">
                  Grade {selectedClassInfo.grade_level} • {startDate} to {endDate}
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Attendance Data Table */}
        {attendanceData.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Attendance Records</CardTitle>
              <CardDescription>
                Detailed attendance records for the selected period
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Student Name</TableHead>
                      <TableHead>Roll No.</TableHead>
                      <TableHead>Student ID</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {attendanceData.map((record, index) => (
                      <TableRow key={index}>
                        <TableCell>{new Date(record.date).toLocaleDateString()}</TableCell>
                        <TableCell className="font-medium">{record.student_name}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className="bg-gray-50 text-gray-700">
                            {record.roll_number || 'N/A'}
                          </Badge>
                        </TableCell>
                        <TableCell>{record.student_id}</TableCell>
                        <TableCell>
                          <Badge 
                            className={
                              record.status === 'present' 
                                ? 'bg-green-100 text-green-800 border-green-200' 
                                : 'bg-red-100 text-red-800 border-red-200'
                            }
                          >
                            {record.status}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </AdminLayout>
  )
}
