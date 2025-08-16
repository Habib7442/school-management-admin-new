'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { useAuthStore } from '@/lib/stores/auth-store'
import { supabase } from '@/lib/supabase'
import { toast } from 'sonner'
import Link from 'next/link'

interface StudentStats {
  enrolledClasses: number
  totalSubjects: number
  attendanceRate: number
  pendingAssignments: number
}

interface RecentActivity {
  id: string
  type: 'assignment' | 'grade' | 'announcement'
  title: string
  description: string
  date: string
  status?: string
}

interface UpcomingClass {
  id: string
  className: string
  subject: string
  teacher: string
  time: string
  room?: string
}

export default function StudentDashboard() {
  const { user } = useAuthStore()
  const [stats, setStats] = useState<StudentStats>({
    enrolledClasses: 0,
    totalSubjects: 0,
    attendanceRate: 0,
    pendingAssignments: 0
  })
  const [recentActivity, setRecentActivity] = useState<RecentActivity[]>([])
  const [upcomingClasses, setUpcomingClasses] = useState<UpcomingClass[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (user?.id) {
      fetchDashboardData()
    }
  }, [user])

  const fetchDashboardData = async () => {
    try {
      setLoading(true)

      // Fetch student's enrolled classes
      const { data: enrollments, error: enrollmentsError } = await supabase
        .from('class_enrollments')
        .select(`
          id,
          status,
          class_id,
          classes (
            id,
            name,
            grade_level,
            section,
            teacher_id,
            profiles!classes_teacher_id_fkey (
              name
            )
          )
        `)
        .eq('student_id', user.id)
        .eq('status', 'active')

      if (enrollmentsError) {
        console.error('Error fetching enrollments:', enrollmentsError)
        toast.error('Failed to load class information')
        return
      }

      // Calculate stats
      const enrolledClasses = enrollments?.length || 0
      
      setStats({
        enrolledClasses,
        totalSubjects: enrolledClasses * 6, // Estimate 6 subjects per class
        attendanceRate: 95, // Placeholder - will implement actual attendance tracking
        pendingAssignments: 3 // Placeholder - will implement actual assignment tracking
      })

      // Mock recent activity (will be replaced with real data)
      setRecentActivity([
        {
          id: '1',
          type: 'assignment',
          title: 'Math Homework Due',
          description: 'Complete exercises 1-15 from Chapter 3',
          date: '2025-01-15',
          status: 'pending'
        },
        {
          id: '2',
          type: 'grade',
          title: 'Science Quiz Result',
          description: 'You scored 85% on the Chemistry quiz',
          date: '2025-01-14',
          status: 'completed'
        },
        {
          id: '3',
          type: 'announcement',
          title: 'School Holiday Notice',
          description: 'School will be closed on January 20th',
          date: '2025-01-13'
        }
      ])

      // Mock upcoming classes (will be replaced with real schedule data)
      setUpcomingClasses([
        {
          id: '1',
          className: 'Mathematics',
          subject: 'Algebra',
          teacher: 'Mr. Smith',
          time: '09:00 AM',
          room: 'Room 101'
        },
        {
          id: '2',
          className: 'Science',
          subject: 'Chemistry',
          teacher: 'Ms. Johnson',
          time: '10:30 AM',
          room: 'Lab 2'
        },
        {
          id: '3',
          className: 'English',
          subject: 'Literature',
          teacher: 'Mrs. Brown',
          time: '02:00 PM',
          room: 'Room 205'
        }
      ])

    } catch (error) {
      console.error('Error fetching dashboard data:', error)
      toast.error('Failed to load dashboard data')
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
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
    )
  }

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="border-l-4 border-l-blue-500">
          <CardHeader className="pb-3">
            <CardDescription>Enrolled Classes</CardDescription>
            <CardTitle className="text-2xl font-bold text-blue-600">
              {stats.enrolledClasses}
            </CardTitle>
          </CardHeader>
        </Card>

        <Card className="border-l-4 border-l-green-500">
          <CardHeader className="pb-3">
            <CardDescription>Total Subjects</CardDescription>
            <CardTitle className="text-2xl font-bold text-green-600">
              {stats.totalSubjects}
            </CardTitle>
          </CardHeader>
        </Card>

        <Card className="border-l-4 border-l-yellow-500">
          <CardHeader className="pb-3">
            <CardDescription>Attendance Rate</CardDescription>
            <CardTitle className="text-2xl font-bold text-yellow-600">
              {stats.attendanceRate}%
            </CardTitle>
          </CardHeader>
        </Card>

        <Card className="border-l-4 border-l-red-500">
          <CardHeader className="pb-3">
            <CardDescription>Pending Assignments</CardDescription>
            <CardTitle className="text-2xl font-bold text-red-600">
              {stats.pendingAssignments}
            </CardTitle>
          </CardHeader>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Today's Schedule */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              Today's Classes
              <Link href="/student/schedule">
                <Button variant="outline" size="sm">View Full Schedule</Button>
              </Link>
            </CardTitle>
            <CardDescription>Your classes for today</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {upcomingClasses.map((class_) => (
                <div key={class_.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div>
                    <div className="font-medium">{class_.className}</div>
                    <div className="text-sm text-gray-600">{class_.subject} • {class_.teacher}</div>
                    <div className="text-xs text-gray-500">{class_.room}</div>
                  </div>
                  <div className="text-right">
                    <div className="font-medium text-blue-600">{class_.time}</div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Recent Activity */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
            <CardDescription>Latest updates and notifications</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {recentActivity.map((activity) => (
                <div key={activity.id} className="flex items-start space-x-3 p-3 bg-gray-50 rounded-lg">
                  <div className="flex-shrink-0">
                    {activity.type === 'assignment' && <span className="text-lg">📝</span>}
                    {activity.type === 'grade' && <span className="text-lg">📊</span>}
                    {activity.type === 'announcement' && <span className="text-lg">📢</span>}
                  </div>
                  <div className="flex-1">
                    <div className="font-medium">{activity.title}</div>
                    <div className="text-sm text-gray-600">{activity.description}</div>
                    <div className="text-xs text-gray-500 mt-1">{activity.date}</div>
                  </div>
                  {activity.status && (
                    <Badge variant={activity.status === 'pending' ? 'destructive' : 'default'}>
                      {activity.status}
                    </Badge>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
          <CardDescription>Frequently used features</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Link href="/student/classes">
              <Button variant="outline" className="w-full h-20 flex flex-col items-center justify-center space-y-2">
                <span className="text-2xl">📚</span>
                <span className="text-sm">My Classes</span>
              </Button>
            </Link>
            <Link href="/student/assignments">
              <Button variant="outline" className="w-full h-20 flex flex-col items-center justify-center space-y-2">
                <span className="text-2xl">📝</span>
                <span className="text-sm">Assignments</span>
              </Button>
            </Link>
            <Link href="/student/grades">
              <Button variant="outline" className="w-full h-20 flex flex-col items-center justify-center space-y-2">
                <span className="text-2xl">📊</span>
                <span className="text-sm">Grades</span>
              </Button>
            </Link>
            <Link href="/student/profile">
              <Button variant="outline" className="w-full h-20 flex flex-col items-center justify-center space-y-2">
                <span className="text-2xl">👤</span>
                <span className="text-sm">Profile</span>
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
