'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Calendar } from '@/components/ui/calendar'
import { useState } from 'react'

export default function StudentAttendance() {
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date())

  // Mock data - will be replaced with real data from database
  const attendanceStats = {
    totalDays: 120,
    presentDays: 114,
    absentDays: 6,
    lateArrivals: 3,
    attendanceRate: 95
  }

  const recentAttendance = [
    { date: '2025-01-15', status: 'present', time: '08:00 AM' },
    { date: '2025-01-14', status: 'present', time: '08:05 AM' },
    { date: '2025-01-13', status: 'absent', time: null, reason: 'Sick leave' },
    { date: '2025-01-12', status: 'present', time: '07:58 AM' },
    { date: '2025-01-11', status: 'late', time: '08:15 AM' },
    { date: '2025-01-10', status: 'present', time: '08:02 AM' },
    { date: '2025-01-09', status: 'present', time: '07:55 AM' }
  ]

  const monthlyAttendance = [
    { month: 'January', present: 15, absent: 1, late: 1, total: 17 },
    { month: 'December', present: 20, absent: 2, late: 0, total: 22 },
    { month: 'November', present: 21, absent: 1, late: 1, total: 23 },
    { month: 'October', present: 22, absent: 1, late: 0, total: 23 },
    { month: 'September', present: 20, absent: 1, late: 1, total: 22 }
  ]

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'present':
        return <Badge variant="default" className="bg-green-500">Present</Badge>
      case 'absent':
        return <Badge variant="destructive">Absent</Badge>
      case 'late':
        return <Badge variant="secondary" className="bg-yellow-500">Late</Badge>
      default:
        return <Badge variant="outline">{status}</Badge>
    }
  }

  const getAttendanceColor = (rate: number) => {
    if (rate >= 95) return 'text-green-600'
    if (rate >= 90) return 'text-blue-600'
    if (rate >= 85) return 'text-yellow-600'
    if (rate >= 80) return 'text-orange-600'
    return 'text-red-600'
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">My Attendance</h1>
          <p className="text-gray-500">Track your school attendance record</p>
        </div>
        <div className="text-right">
          <div className="text-sm text-gray-500">Attendance Rate</div>
          <div className={`text-2xl font-bold ${getAttendanceColor(attendanceStats.attendanceRate)}`}>
            {attendanceStats.attendanceRate}%
          </div>
        </div>
      </div>

      {/* Attendance Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Total Days</CardDescription>
            <CardTitle className="text-2xl font-bold text-blue-600">
              {attendanceStats.totalDays}
            </CardTitle>
          </CardHeader>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Present Days</CardDescription>
            <CardTitle className="text-2xl font-bold text-green-600">
              {attendanceStats.presentDays}
            </CardTitle>
          </CardHeader>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Absent Days</CardDescription>
            <CardTitle className="text-2xl font-bold text-red-600">
              {attendanceStats.absentDays}
            </CardTitle>
          </CardHeader>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Late Arrivals</CardDescription>
            <CardTitle className="text-2xl font-bold text-yellow-600">
              {attendanceStats.lateArrivals}
            </CardTitle>
          </CardHeader>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Attendance Progress */}
        <Card>
          <CardHeader>
            <CardTitle>Attendance Progress</CardTitle>
            <CardDescription>Your attendance performance this academic year</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <div className="flex justify-between text-sm mb-2">
                <span>Overall Attendance</span>
                <span>{attendanceStats.attendanceRate}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-3">
                <div 
                  className="h-3 rounded-full bg-green-500"
                  style={{ width: `${attendanceStats.attendanceRate}%` }}
                ></div>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4 pt-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">{attendanceStats.presentDays}</div>
                <div className="text-xs text-gray-500">Present</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-red-600">{attendanceStats.absentDays}</div>
                <div className="text-xs text-gray-500">Absent</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-yellow-600">{attendanceStats.lateArrivals}</div>
                <div className="text-xs text-gray-500">Late</div>
              </div>
            </div>

            {attendanceStats.attendanceRate >= 95 && (
              <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                <div className="flex items-center">
                  <span className="text-green-600 text-lg mr-2">🏆</span>
                  <div>
                    <div className="font-medium text-green-800">Excellent Attendance!</div>
                    <div className="text-sm text-green-600">Keep up the great work!</div>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Calendar View */}
        <Card>
          <CardHeader>
            <CardTitle>Attendance Calendar</CardTitle>
            <CardDescription>View attendance by date</CardDescription>
          </CardHeader>
          <CardContent>
            <Calendar
              mode="single"
              selected={selectedDate}
              onSelect={setSelectedDate}
              className="rounded-md border"
            />
            <div className="mt-4 space-y-2">
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                <span className="text-sm">Present</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                <span className="text-sm">Absent</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
                <span className="text-sm">Late</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Attendance */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Attendance</CardTitle>
          <CardDescription>Your attendance record for the past week</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {recentAttendance.map((record, index) => (
              <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                <div>
                  <div className="font-medium">
                    {new Date(record.date).toLocaleDateString('en-US', { 
                      weekday: 'long', 
                      year: 'numeric', 
                      month: 'short', 
                      day: 'numeric' 
                    })}
                  </div>
                  {record.reason && (
                    <div className="text-sm text-gray-500">Reason: {record.reason}</div>
                  )}
                </div>
                <div className="text-right">
                  {getStatusBadge(record.status)}
                  {record.time && (
                    <div className="text-sm text-gray-500 mt-1">
                      Arrived: {record.time}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Monthly Breakdown */}
      <Card>
        <CardHeader>
          <CardTitle>Monthly Breakdown</CardTitle>
          <CardDescription>Attendance summary by month</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {monthlyAttendance.map((month, index) => {
              const rate = Math.round((month.present / month.total) * 100)
              return (
                <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                  <div>
                    <div className="font-medium">{month.month}</div>
                    <div className="text-sm text-gray-500">
                      {month.present} present, {month.absent} absent, {month.late} late
                    </div>
                  </div>
                  <div className="text-right">
                    <div className={`font-bold ${getAttendanceColor(rate)}`}>{rate}%</div>
                    <div className="text-sm text-gray-500">{month.total} total days</div>
                  </div>
                </div>
              )
            })}
          </div>
        </CardContent>
      </Card>

      {/* Coming Soon Notice */}
      <Card className="border-dashed border-2 border-gray-300">
        <CardContent className="text-center py-8">
          <div className="text-4xl mb-4">📅</div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">Advanced Attendance Features Coming Soon</h3>
          <p className="text-gray-500 mb-4">
            Real-time attendance tracking, parent notifications, and detailed analytics are currently under development.
          </p>
          <div className="flex flex-wrap justify-center gap-2">
            <Badge variant="outline">Real-time Tracking</Badge>
            <Badge variant="outline">Parent Notifications</Badge>
            <Badge variant="outline">Attendance Alerts</Badge>
            <Badge variant="outline">Leave Requests</Badge>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
