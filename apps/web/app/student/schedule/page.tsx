'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { useAuthStore } from '@/lib/stores/auth-store'
import { supabase } from '@/lib/supabase'
import { toast } from 'sonner'

interface ScheduleItem {
  id: string
  day_of_week: string
  start_time: string
  end_time: string
  subject: string
  teacher: string
  room?: string
  class_name: string
}

interface DaySchedule {
  day: string
  classes: ScheduleItem[]
}

const DAYS_OF_WEEK = [
  'Monday',
  'Tuesday', 
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday'
]

export default function StudentSchedule() {
  const { user } = useAuthStore()
  const [schedule, setSchedule] = useState<DaySchedule[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedDay, setSelectedDay] = useState<string>('')

  useEffect(() => {
    // Set current day as default
    const today = new Date().toLocaleDateString('en-US', { weekday: 'long' })
    setSelectedDay(today)

    if (user?.id) {
      fetchSchedule()
    }
  }, [user])

  const fetchSchedule = async () => {
    try {
      setLoading(true)

      // First, get the student's enrolled classes
      const { data: enrollments, error: enrollmentError } = await supabase
        .from('class_enrollments')
        .select(`
          class_id,
          classes (
            id,
            name,
            grade_level,
            section
          )
        `)
        .eq('student_id', user.id)
        .eq('status', 'active')

      if (enrollmentError) {
        console.error('Error fetching enrollments:', enrollmentError)
        toast.error('Failed to load class enrollments')
        return
      }

      if (!enrollments || enrollments.length === 0) {
        setSchedule([])
        return
      }

      const classIds = enrollments.map(e => e.class_id)

      // Fetch schedule for enrolled classes
      const { data: scheduleData, error: scheduleError } = await supabase
        .from('class_schedules')
        .select(`
          id,
          day_of_week,
          start_time,
          end_time,
          room,
          class_id,
          subject_id,
          classes (
            name,
            grade_level,
            section,
            teacher_id,
            profiles!classes_teacher_id_fkey (
              name
            )
          ),
          subjects (
            name,
            code
          )
        `)
        .in('class_id', classIds)
        .order('day_of_week')
        .order('start_time')

      if (scheduleError) {
        console.error('Error fetching schedule:', scheduleError)
        toast.error('Failed to load schedule')
        return
      }

      // Transform and group by day
      const groupedSchedule: { [key: string]: ScheduleItem[] } = {}

      scheduleData?.forEach(item => {
        const scheduleItem: ScheduleItem = {
          id: item.id,
          day_of_week: item.day_of_week,
          start_time: item.start_time,
          end_time: item.end_time,
          subject: item.subjects?.name || 'Unknown Subject',
          teacher: item.classes?.profiles?.name || 'Unknown Teacher',
          room: item.room,
          class_name: item.classes?.name || 'Unknown Class'
        }

        if (!groupedSchedule[item.day_of_week]) {
          groupedSchedule[item.day_of_week] = []
        }
        groupedSchedule[item.day_of_week].push(scheduleItem)
      })

      // Convert to array format
      const scheduleArray: DaySchedule[] = DAYS_OF_WEEK.map(day => ({
        day,
        classes: groupedSchedule[day] || []
      }))

      setSchedule(scheduleArray)

    } catch (error) {
      console.error('Error fetching schedule:', error)
      toast.error('Failed to load schedule data')
    } finally {
      setLoading(false)
    }
  }

  const formatTime = (time: string) => {
    try {
      const [hours, minutes] = time.split(':')
      const hour = parseInt(hours)
      const ampm = hour >= 12 ? 'PM' : 'AM'
      const displayHour = hour % 12 || 12
      return `${displayHour}:${minutes} ${ampm}`
    } catch {
      return time
    }
  }

  const getCurrentDaySchedule = () => {
    return schedule.find(day => day.day === selectedDay) || { day: selectedDay, classes: [] }
  }

  const getTodaySchedule = () => {
    const today = new Date().toLocaleDateString('en-US', { weekday: 'long' })
    return schedule.find(day => day.day === today) || { day: today, classes: [] }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <Card className="animate-pulse">
          <CardHeader>
            <div className="h-6 bg-gray-200 rounded w-1/4"></div>
            <div className="h-4 bg-gray-200 rounded w-1/2"></div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="h-16 bg-gray-200 rounded"></div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  const todaySchedule = getTodaySchedule()
  const currentDaySchedule = getCurrentDaySchedule()

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">My Schedule</h1>
          <p className="text-gray-500">Your class timetable</p>
        </div>
        <Badge variant="outline">
          {schedule.reduce((total, day) => total + day.classes.length, 0)} classes this week
        </Badge>
      </div>

      {/* Today's Schedule */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            Today's Classes
            <Badge variant="default">
              {new Date().toLocaleDateString('en-US', { weekday: 'long' })}
            </Badge>
          </CardTitle>
          <CardDescription>Your schedule for today</CardDescription>
        </CardHeader>
        <CardContent>
          {todaySchedule.classes.length > 0 ? (
            <div className="space-y-3">
              {todaySchedule.classes.map((classItem) => (
                <div key={classItem.id} className="flex items-center justify-between p-3 bg-blue-50 rounded-lg border border-blue-200">
                  <div>
                    <div className="font-medium text-blue-900">{classItem.subject}</div>
                    <div className="text-sm text-blue-700">{classItem.teacher}</div>
                    <div className="text-xs text-blue-600">{classItem.class_name}</div>
                  </div>
                  <div className="text-right">
                    <div className="font-medium text-blue-900">
                      {formatTime(classItem.start_time)} - {formatTime(classItem.end_time)}
                    </div>
                    {classItem.room && (
                      <div className="text-sm text-blue-700">{classItem.room}</div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              <div className="text-4xl mb-2">🎉</div>
              <p>No classes scheduled for today!</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Day Selector */}
      <Card>
        <CardHeader>
          <CardTitle>Weekly Schedule</CardTitle>
          <CardDescription>Select a day to view the schedule</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2 mb-6">
            {DAYS_OF_WEEK.map((day) => {
              const daySchedule = schedule.find(s => s.day === day)
              const classCount = daySchedule?.classes.length || 0
              const isToday = day === new Date().toLocaleDateString('en-US', { weekday: 'long' })
              
              return (
                <Button
                  key={day}
                  variant={selectedDay === day ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setSelectedDay(day)}
                  className="relative"
                >
                  {day}
                  {isToday && (
                    <Badge variant="secondary" className="ml-2 text-xs">Today</Badge>
                  )}
                  {classCount > 0 && (
                    <Badge variant="outline" className="ml-2 text-xs">
                      {classCount}
                    </Badge>
                  )}
                </Button>
              )
            })}
          </div>

          {/* Selected Day Schedule */}
          <div>
            <h3 className="font-medium mb-4">{selectedDay} Schedule</h3>
            {currentDaySchedule.classes.length > 0 ? (
              <div className="space-y-3">
                {currentDaySchedule.classes.map((classItem) => (
                  <div key={classItem.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50">
                    <div className="flex-1">
                      <div className="font-medium">{classItem.subject}</div>
                      <div className="text-sm text-gray-600">{classItem.teacher}</div>
                      <div className="text-xs text-gray-500">{classItem.class_name}</div>
                    </div>
                    <div className="text-right">
                      <div className="font-medium">
                        {formatTime(classItem.start_time)} - {formatTime(classItem.end_time)}
                      </div>
                      {classItem.room && (
                        <div className="text-sm text-gray-600">{classItem.room}</div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                <div className="text-4xl mb-2">📅</div>
                <p>No classes scheduled for {selectedDay}</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Weekly Overview */}
      <Card>
        <CardHeader>
          <CardTitle>Weekly Overview</CardTitle>
          <CardDescription>Summary of all your classes this week</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {schedule.map((daySchedule) => (
              <div key={daySchedule.day} className="p-3 border rounded-lg">
                <div className="font-medium mb-2">{daySchedule.day}</div>
                <div className="text-sm text-gray-600">
                  {daySchedule.classes.length} {daySchedule.classes.length === 1 ? 'class' : 'classes'}
                </div>
                {daySchedule.classes.length > 0 && (
                  <div className="mt-2 space-y-1">
                    {daySchedule.classes.slice(0, 2).map((classItem) => (
                      <div key={classItem.id} className="text-xs text-gray-500">
                        {formatTime(classItem.start_time)} - {classItem.subject}
                      </div>
                    ))}
                    {daySchedule.classes.length > 2 && (
                      <div className="text-xs text-gray-400">
                        +{daySchedule.classes.length - 2} more
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
