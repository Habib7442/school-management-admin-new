/**
 * Timetable Management Utilities
 * Helper functions for timetable operations, caching, and data processing
 */

import { Database } from '@/lib/supabase'

export type TimetableEntry = Database['public']['Tables']['timetables']['Row']
export type TimePeriod = Database['public']['Tables']['time_periods']['Row']
export type Room = Database['public']['Tables']['rooms']['Row']

// Day of week utilities
export const DAYS_OF_WEEK = [
  { value: 'monday', label: 'Monday', short: 'Mon' },
  { value: 'tuesday', label: 'Tuesday', short: 'Tue' },
  { value: 'wednesday', label: 'Wednesday', short: 'Wed' },
  { value: 'thursday', label: 'Thursday', short: 'Thu' },
  { value: 'friday', label: 'Friday', short: 'Fri' },
  { value: 'saturday', label: 'Saturday', short: 'Sat' },
  { value: 'sunday', label: 'Sunday', short: 'Sun' }
] as const

export const getDayName = (day: string, short = false) => {
  const dayObj = DAYS_OF_WEEK.find(d => d.value === day)
  return dayObj ? (short ? dayObj.short : dayObj.label) : day
}

// Time formatting utilities
export const formatTime = (time: string) => {
  try {
    const [hours, minutes] = time.split(':')
    const hour = parseInt(hours)
    const ampm = hour >= 12 ? 'PM' : 'AM'
    const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour
    return `${displayHour}:${minutes} ${ampm}`
  } catch {
    return time
  }
}

export const formatTimeRange = (startTime: string, endTime: string) => {
  return `${formatTime(startTime)} - ${formatTime(endTime)}`
}

// Timetable grouping utilities
export interface GroupedTimetable {
  [day: string]: {
    [periodId: string]: TimetableEntry[]
  }
}

export const groupTimetablesByDayAndPeriod = (
  timetables: any[],
  timePeriods: TimePeriod[]
): GroupedTimetable => {
  const grouped: GroupedTimetable = {}
  
  DAYS_OF_WEEK.forEach(({ value: day }) => {
    grouped[day] = {}
    timePeriods.forEach(period => {
      grouped[day][period.id] = timetables.filter(
        t => t.day_of_week === day && t.time_periods?.id === period.id
      )
    })
  })
  
  return grouped
}

// Conflict detection utilities
export interface TimetableConflict {
  type: 'class_double_booking' | 'teacher_double_booking' | 'room_double_booking'
  message: string
  conflicting_entries: any[]
  severity: 'high' | 'medium' | 'low'
}

export const detectConflicts = (
  timetables: any[],
  newEntry: Partial<TimetableEntry>
): TimetableConflict[] => {
  const conflicts: TimetableConflict[] = []
  
  if (!newEntry.day_of_week || !newEntry.time_period_id) {
    return conflicts
  }
  
  const conflictingEntries = timetables.filter(t => 
    t.day_of_week === newEntry.day_of_week &&
    t.time_period_id === newEntry.time_period_id &&
    t.id !== newEntry.id
  )
  
  // Check class conflicts
  if (newEntry.class_id) {
    const classConflicts = conflictingEntries.filter(t => t.class_id === newEntry.class_id)
    if (classConflicts.length > 0) {
      conflicts.push({
        type: 'class_double_booking',
        message: 'Class is already scheduled for this time slot',
        conflicting_entries: classConflicts,
        severity: 'high'
      })
    }
  }
  
  // Check teacher conflicts
  if (newEntry.teacher_id) {
    const teacherConflicts = conflictingEntries.filter(t => t.teacher_id === newEntry.teacher_id)
    if (teacherConflicts.length > 0) {
      conflicts.push({
        type: 'teacher_double_booking',
        message: 'Teacher is already assigned to another class at this time',
        conflicting_entries: teacherConflicts,
        severity: 'high'
      })
    }
  }
  
  // Check room conflicts
  if (newEntry.room_id) {
    const roomConflicts = conflictingEntries.filter(t => t.room_id === newEntry.room_id)
    if (roomConflicts.length > 0) {
      conflicts.push({
        type: 'room_double_booking',
        message: 'Room is already booked for another class at this time',
        conflicting_entries: roomConflicts,
        severity: 'medium'
      })
    }
  }
  
  return conflicts
}

// Teacher workload utilities
export interface TeacherWorkload {
  teacher_id: string
  teacher_name: string
  total_periods: number
  periods_by_day: { [day: string]: number }
  subjects: string[]
  classes: string[]
  workload_percentage: number
}

export const calculateTeacherWorkload = (
  timetables: any[],
  teachers: any[]
): TeacherWorkload[] => {
  const workloadMap = new Map<string, TeacherWorkload>()
  
  // Initialize workload for all teachers
  teachers.forEach(teacher => {
    workloadMap.set(teacher.id, {
      teacher_id: teacher.id,
      teacher_name: teacher.profiles?.name || 'Unknown',
      total_periods: 0,
      periods_by_day: {},
      subjects: [],
      classes: [],
      workload_percentage: 0
    })
  })
  
  // Calculate workload from timetables
  timetables.forEach(entry => {
    if (!entry.teacher_id) return
    
    const workload = workloadMap.get(entry.teacher_id)
    if (!workload) return
    
    workload.total_periods++
    workload.periods_by_day[entry.day_of_week] = 
      (workload.periods_by_day[entry.day_of_week] || 0) + 1
    
    // Add unique subjects and classes
    if (entry.subjects?.name && !workload.subjects.includes(entry.subjects.name)) {
      workload.subjects.push(entry.subjects.name)
    }
    
    const className = `${entry.classes?.name}-${entry.classes?.section}`
    if (!workload.classes.includes(className)) {
      workload.classes.push(className)
    }
    
    // Calculate percentage (assuming 40 periods per week as max)
    workload.workload_percentage = Math.round((workload.total_periods / 40) * 100)
  })
  
  return Array.from(workloadMap.values()).sort((a, b) => b.total_periods - a.total_periods)
}

// Room utilization utilities
export interface RoomUtilization {
  room_id: string
  room_name: string
  total_periods: number
  utilization_percentage: number
  periods_by_day: { [day: string]: number }
  peak_usage_day: string
}

export const calculateRoomUtilization = (
  timetables: any[],
  rooms: Room[],
  totalPeriodsPerWeek = 50 // 10 periods × 5 days
): RoomUtilization[] => {
  const utilizationMap = new Map<string, RoomUtilization>()
  
  // Initialize utilization for all rooms
  rooms.forEach(room => {
    utilizationMap.set(room.id, {
      room_id: room.id,
      room_name: room.name,
      total_periods: 0,
      utilization_percentage: 0,
      periods_by_day: {},
      peak_usage_day: ''
    })
  })
  
  // Calculate utilization from timetables
  timetables.forEach(entry => {
    if (!entry.room_id) return
    
    const utilization = utilizationMap.get(entry.room_id)
    if (!utilization) return
    
    utilization.total_periods++
    utilization.periods_by_day[entry.day_of_week] = 
      (utilization.periods_by_day[entry.day_of_week] || 0) + 1
  })
  
  // Calculate percentages and peak days
  utilizationMap.forEach(utilization => {
    utilization.utilization_percentage = 
      Math.round((utilization.total_periods / totalPeriodsPerWeek) * 100)
    
    // Find peak usage day
    let maxPeriods = 0
    let peakDay = ''
    Object.entries(utilization.periods_by_day).forEach(([day, periods]) => {
      if (periods > maxPeriods) {
        maxPeriods = periods
        peakDay = day
      }
    })
    utilization.peak_usage_day = peakDay
  })
  
  return Array.from(utilizationMap.values()).sort((a, b) => b.total_periods - a.total_periods)
}

// Export/Import utilities
export const exportTimetableToCSV = (timetables: any[]): string => {
  const headers = [
    'Day',
    'Time Period',
    'Start Time',
    'End Time',
    'Class',
    'Subject',
    'Teacher',
    'Room',
    'Notes'
  ]
  
  const rows = timetables.map(entry => [
    getDayName(entry.day_of_week),
    entry.time_periods?.name || '',
    entry.time_periods?.start_time || '',
    entry.time_periods?.end_time || '',
    `${entry.classes?.name}-${entry.classes?.section}` || '',
    entry.subjects?.name || '',
    entry.teachers?.profiles?.name || '',
    entry.rooms?.name || '',
    entry.notes || ''
  ])
  
  const csvContent = [headers, ...rows]
    .map(row => row.map(cell => `"${cell}"`).join(','))
    .join('\n')
  
  return csvContent
}

// Validation utilities
export const validateTimetableEntry = (entry: Partial<TimetableEntry>): string[] => {
  const errors: string[] = []
  
  if (!entry.academic_year_id) errors.push('Academic year is required')
  if (!entry.class_id) errors.push('Class is required')
  if (!entry.subject_id) errors.push('Subject is required')
  if (!entry.time_period_id) errors.push('Time period is required')
  if (!entry.day_of_week) errors.push('Day of week is required')
  
  if (entry.day_of_week && !DAYS_OF_WEEK.find(d => d.value === entry.day_of_week)) {
    errors.push('Invalid day of week')
  }
  
  return errors
}

// Caching utilities for Next.js
export const CACHE_TAGS = {
  TIMETABLES: 'timetables',
  TIME_PERIODS: 'time-periods',
  ROOMS: 'rooms',
  TEACHER_WORKLOAD: 'teacher-workload',
  CONFLICTS: 'conflicts'
} as const

export const getCacheKey = (type: keyof typeof CACHE_TAGS, ...params: string[]): string => {
  return [CACHE_TAGS[type], ...params].join(':')
}
