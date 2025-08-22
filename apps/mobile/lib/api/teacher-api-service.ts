/**
 * Teacher API Service for Mobile App
 * Comprehensive API service for all teacher-related operations
 */

import { supabase } from '../supabase'
import { fallbackCacheManager, CACHE_CONFIGS } from '../cache/fallback-cache-manager'
import {
  GradeScale,
  GradeScaleRange,
  ExamType,
  Exam,
  ExamGrade,
  AssignmentGrade,
  GradeBookEntry,
  StudentProgress,
  GradeReport,
  GradeEntryForm,
  GradeValidationResult,
  GradeCalculationConfig
} from '../../types/grades'

// Lesson Planning Types
export interface LessonPlan {
  id: string
  school_id: string
  teacher_id: string
  class_id: string
  subject_id: string
  title: string
  description?: string
  lesson_date: string
  duration_minutes: number
  curriculum_topic?: string
  learning_objectives: string[]
  prerequisites: string[]
  lesson_outline?: string
  activities: LessonActivity[]
  materials_needed: string[]
  homework_assigned?: string
  assessment_methods: string[]
  success_criteria?: string
  differentiation_strategies?: string
  resource_links: string[]
  attachment_urls: string[]
  status: 'planned' | 'in_progress' | 'completed' | 'cancelled'
  completion_notes?: string
  actual_duration_minutes?: number
  is_template: boolean
  is_shared: boolean
  shared_with: string[]
  created_at: string
  updated_at: string
  // Joined data
  classes?: { name: string; section?: string }
  subjects?: { name: string; code: string }
}

export interface LessonResource {
  id: string
  type: 'document' | 'video' | 'link' | 'image' | 'audio' | 'presentation'
  title: string
  url?: string
  description?: string
  file_size?: number
  duration?: number
}

export interface LessonActivity {
  id: string
  title: string
  description: string
  duration_minutes: number
  activity_type: 'individual' | 'group' | 'whole_class' | 'pair_work'
  materials_needed: string[]
}

export interface CurriculumTopic {
  id: string
  subject_id: string
  title: string
  description?: string
  grade_level: number
  unit_number?: number
  learning_objectives: string[]
  is_active: boolean
}

export interface LessonPlanFilters {
  classId?: string
  subjectId?: string
  status?: LessonPlan['status']
  dateFrom?: string
  dateTo?: string
  curriculumTopic?: string
}

export interface LessonPlanStats {
  totalLessons: number
  completedLessons: number
  upcomingLessons: number
  curriculumProgress: number
}

// Types for teacher operations
export interface Assignment {
  id: string
  school_id: string
  teacher_id: string
  class_id: string
  subject_id: string
  title: string
  description?: string
  instructions?: string
  assignment_type: 'homework' | 'project' | 'quiz' | 'test' | 'lab' | 'presentation' | 'essay' | 'research'
  difficulty_level: 'easy' | 'medium' | 'hard'
  estimated_duration_minutes?: number
  assigned_date: string
  due_date: string
  due_time?: string
  late_submission_allowed: boolean
  late_penalty_percentage: number
  max_marks: number
  pass_marks: number
  grading_rubric?: string
  auto_grade: boolean
  attachment_urls: string[]
  resource_links: string[]
  status: 'draft' | 'published' | 'completed' | 'archived'
  is_visible_to_students: boolean
  submission_type: 'file' | 'text' | 'link' | 'multiple'
  max_file_size_mb: number
  allowed_file_types: string[]
  created_at: string
  updated_at: string
}

export interface AssignmentSubmission {
  id: string
  assignment_id: string
  student_id: string
  submission_text?: string
  submission_files: string[]
  submission_links: string[]
  submitted_at: string
  is_late: boolean
  late_days: number
  marks_obtained?: number
  grade_letter?: string
  grade_percentage?: number
  is_graded: boolean
  graded_at?: string
  graded_by?: string
  teacher_feedback?: string
  teacher_comments?: string
  feedback_files: string[]
  status: 'draft' | 'submitted' | 'graded' | 'returned' | 'resubmitted'
  created_at: string
  updated_at: string
  // Joined data
  student?: {
    id: string
    name: string
    roll_number?: number
  }
  assignment?: {
    title: string
    max_marks: number
  }
}

export interface LessonPlan {
  id: string
  school_id: string
  teacher_id: string
  class_id: string
  subject_id: string
  title: string
  description?: string
  lesson_date: string
  duration_minutes: number
  curriculum_topic?: string
  learning_objectives: string[]
  prerequisites: string[]
  lesson_outline?: string
  activities: any[]
  materials_needed: string[]
  homework_assigned?: string
  assessment_methods: string[]
  success_criteria?: string
  differentiation_strategies?: string
  resource_links: string[]
  attachment_urls: string[]
  status: 'planned' | 'in_progress' | 'completed' | 'cancelled'
  completion_notes?: string
  actual_duration_minutes?: number
  is_template: boolean
  is_shared: boolean
  shared_with: string[]
  created_at: string
  updated_at: string
}

export interface BehavioralNote {
  id: string
  school_id: string
  student_id: string
  teacher_id: string
  class_id?: string
  note_date: string
  note_time: string
  incident_type: 'positive' | 'negative' | 'neutral' | 'achievement' | 'concern' | 'improvement'
  category?: string
  severity_level: 'low' | 'medium' | 'high' | 'critical'
  title: string
  description: string
  context?: string
  action_taken?: string
  follow_up_required: boolean
  follow_up_date?: string
  follow_up_notes?: string
  visible_to_parents: boolean
  parent_notified: boolean
  parent_notification_date?: string
  requires_admin_review: boolean
  admin_reviewed: boolean
  admin_reviewed_by?: string
  admin_review_date?: string
  admin_comments?: string
  created_at: string
  updated_at: string
  // Joined data
  student?: {
    id: string
    name: string
    roll_number?: number
  }
}

export interface TeacherClass {
  id: string
  name: string
  grade_level?: number
  section?: string
  room_number?: string
  capacity: number
  academic_year: string
  student_count?: number
  subjects?: Array<{
    id: string
    name: string
    code: string
  }>
}

export interface ClassTeacherInfo {
  id: string
  name: string
  email: string
  subject: {
    id: string
    name: string
    code: string
  }
  schedule: Array<{
    day_of_week: string
    time_period: {
      id: string
      name: string
      start_time: string
      end_time: string
      period_order: number
    }
  }>
}

export interface ClassStudentInfo {
  id: string
  name: string
  email?: string
  roll_number?: number
  admission_number?: string
  parent_name?: string
  parent_phone?: string
}

export interface StudentUpdateData {
  name?: string
  email?: string
  roll_number?: number | null
  admission_number?: string | null
  parent_name?: string | null
  parent_phone?: string | null
  parent_email?: string | null
  date_of_birth?: string | null
  gender?: string | null
}

export interface StudentEnrollmentData {
  name: string
  email: string
  roll_number?: number | null
  admission_number?: string | null
  parent_name: string
  parent_phone: string
  parent_email?: string | null
  date_of_birth?: string | null
  gender?: string | null
  class_id: string
}

export interface TimetableEntry {
  id?: string
  class_id: string
  teacher_id: string
  subject_id: string
  day_of_week: string
  time_period_id: string
  is_active: boolean
}

export interface TimetableUpdateData {
  teacher_id?: string
  subject_id?: string
  day_of_week?: string
  time_period_id?: string
  is_active?: boolean
}

export interface ClassTimetableView {
  day_of_week: string
  periods: {
    time_period_id: string
    time_period_name: string
    start_time: string
    end_time: string
    period_order: number
    teacher_id?: string
    teacher_name?: string
    subject_id?: string
    subject_name?: string
    subject_code?: string
    timetable_id?: string
  }[]
}

export interface TeacherStudent {
  id: string
  name: string
  email?: string
  roll_number?: number
  admission_number?: string
  class_id: string
  section?: string
  parent_name?: string
  parent_phone?: string
  parent_email?: string
  is_active: boolean
  // Additional computed fields
  attendance_percentage?: number
  current_grade?: number
  behavioral_notes_count?: number
}

interface ApiResponse<T> {
  data: T | null
  error: string | null
  fromCache: boolean
}

class TeacherApiService {
  private currentUser: any = null

  constructor() {
    this.initializeUser()
  }

  private async initializeUser() {
    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single()
      
      this.currentUser = profile
    }
  }

  private async cachedApiCall<T>(
    cacheKey: string,
    apiCall: () => Promise<T>,
    forceRefresh = false,
    cacheConfig = CACHE_CONFIGS.TEACHER_DATA
  ): Promise<ApiResponse<T>> {
    try {
      if (!forceRefresh) {
        const cached = await fallbackCacheManager.get<T>(
          cacheKey,
          cacheConfig,
          this.currentUser?.id,
          this.currentUser?.school_id
        )
        if (cached) {
          return { data: cached, error: null, fromCache: true }
        }
      }

      const data = await apiCall()
      await fallbackCacheManager.set(
        cacheKey,
        data,
        cacheConfig,
        this.currentUser?.id,
        this.currentUser?.school_id
      )
      return { data, error: null, fromCache: false }
    } catch (error) {
      console.error(`API call failed for ${cacheKey}:`, error)
      return { data: null, error: error instanceof Error ? error.message : 'Unknown error', fromCache: false }
    }
  }

  /**
   * Preload critical teacher data for offline use
   */
  async preloadCriticalData(): Promise<void> {
    if (!this.currentUser) {
      await this.initializeUser()
    }

    try {
      console.log('🚀 Preloading critical teacher data...')

      // Batch load critical data
      const criticalDataPromises = [
        this.getTeacherClasses(true),
        this.getTeacherAssignments({}, true),
        this.getLessonPlans({}, true),
      ]

      await Promise.allSettled(criticalDataPromises)
      console.log('✅ Critical teacher data preloaded')
    } catch (error) {
      console.error('Failed to preload critical data:', error)
    }
  }

  /**
   * Clear all teacher-related cache
   */
  async clearTeacherCache(): Promise<void> {
    if (!this.currentUser) return

    try {
      await fallbackCacheManager.clearUserCache(this.currentUser.id)
      console.log('🧹 Teacher cache cleared')
    } catch (error) {
      console.error('Failed to clear teacher cache:', error)
    }
  }

  /**
   * Get cache statistics for teacher data
   */
  async getCacheStats(): Promise<any> {
    try {
      return await fallbackCacheManager.getStats()
    } catch (error) {
      console.error('Failed to get cache stats:', error)
      return null
    }
  }

  /**
   * Get all classes where teacher teaches (based on timetable) for attendance
   */
  async getTeacherClassesForAttendance(forceRefresh = false): Promise<ApiResponse<TeacherClass[]>> {
    if (!this.currentUser) {
      await this.initializeUser()
    }

    return this.cachedApiCall(
      `teacher_attendance_classes_${this.currentUser?.id}`,
      async () => {
        // Get classes from timetable where teacher is assigned
        const { data: timetableClasses, error: timetableError } = await supabase
          .from('timetables')
          .select(`
            classes!inner(
              id,
              name,
              grade_level,
              section,
              room_number,
              capacity,
              academic_year
            )
          `)
          .eq('teacher_id', this.currentUser?.id)
          .eq('is_active', true)

        if (timetableError) {
          console.error('❌ Timetable query error:', timetableError)
          throw timetableError
        }

        // Also get classes where teacher is class teacher
        const { data: classTeacherClasses, error: classTeacherError } = await supabase
          .from('classes')
          .select(`
            id,
            name,
            grade_level,
            section,
            room_number,
            capacity,
            academic_year
          `)
          .eq('class_teacher_id', this.currentUser?.id)
          .eq('is_active', true)

        if (classTeacherError) {
          console.error('❌ Class teacher query error:', classTeacherError)
          throw classTeacherError
        }

        // Combine and deduplicate classes
        const allClasses = new Map<string, any>()

        // Add timetable classes
        timetableClasses?.forEach(entry => {
          const cls = entry.classes
          if (cls) {
            allClasses.set(cls.id, cls)
          }
        })

        // Add class teacher classes
        classTeacherClasses?.forEach(cls => {
          allClasses.set(cls.id, cls)
        })

        const uniqueClasses = Array.from(allClasses.values())
        const classIds = uniqueClasses.map(cls => cls.id)

        // Get student counts
        const { data: studentCounts, error: countError } = await supabase
          .from('students')
          .select('class_id')
          .in('class_id', classIds)
          .eq('is_active', true)

        if (countError) {
          console.error('❌ Student count query error:', countError)
          throw countError
        }

        // Count students per class
        const studentCountMap = studentCounts?.reduce((acc, student) => {
          acc[student.class_id] = (acc[student.class_id] || 0) + 1
          return acc
        }, {} as Record<string, number>) || {}

        const result = uniqueClasses.map(cls => ({
          ...cls,
          student_count: studentCountMap[cls.id] || 0
        })).sort((a, b) => a.name.localeCompare(b.name))

        console.log('📚 Teacher attendance classes:', result)
        return result
      },
      forceRefresh
    )
  }

  /**
   * Get teacher's classes with student counts (class teacher only)
   */
  async getTeacherClasses(forceRefresh = false): Promise<ApiResponse<TeacherClass[]>> {
    if (!this.currentUser) {
      await this.initializeUser()
    }

    return this.cachedApiCall(
      `teacher_classes_${this.currentUser?.id}`,
      async () => {
        const { data: classes, error } = await supabase
          .from('classes')
          .select(`
            id,
            name,
            grade_level,
            section,
            room_number,
            capacity,
            academic_year
          `)
          .eq('class_teacher_id', this.currentUser?.id)
          .eq('is_active', true)
          .order('name')

        if (error) throw error

        // Get student counts separately for better reliability
        const classIds = classes?.map(cls => cls.id) || []
        const { data: studentCounts, error: countError } = await supabase
          .from('students')
          .select('class_id')
          .in('class_id', classIds)
          .eq('is_active', true)

        if (countError) {
          console.error('❌ Student count query error:', countError)
          throw countError
        }

        // Count students per class
        const studentCountMap = studentCounts?.reduce((acc, student) => {
          acc[student.class_id] = (acc[student.class_id] || 0) + 1
          return acc
        }, {} as Record<string, number>) || {}

        console.log('📊 Student count map:', studentCountMap)

        const result = classes?.map(cls => ({
          ...cls,
          student_count: studentCountMap[cls.id] || 0
        })) || []

        console.log('📚 Final classes with student counts:', result)
        return result
      },
      forceRefresh
    )
  }

  /**
   * Get students for a specific class
   */
  async getClassStudents(classId: string, forceRefresh = false): Promise<ApiResponse<TeacherStudent[]>> {
    return this.cachedApiCall(
      `class_students_${classId}`,
      async () => {
        const { data: students, error } = await supabase
          .from('students')
          .select(`
            id,
            roll_number,
            admission_number,
            class_id,
            section,
            parent_name,
            parent_phone,
            parent_email,
            is_active,
            profiles!inner(
              id,
              name,
              email
            )
          `)
          .eq('class_id', classId)
          .eq('is_active', true)
          .order('roll_number')

        if (error) throw error

        return students?.map((student: any) => ({
          id: student.id,
          name: student.profiles.name,
          email: student.profiles.email,
          roll_number: student.roll_number,
          admission_number: student.admission_number,
          class_id: student.class_id,
          section: student.section,
          parent_name: student.parent_name,
          parent_phone: student.parent_phone,
          parent_email: student.parent_email,
          is_active: student.is_active
        })) || []
      },
      forceRefresh
    )
  }

  /**
   * Get students for a class (for class teachers)
   */
  async getClassStudentsForClassTeacher(classId: string, forceRefresh = false): Promise<ApiResponse<ClassStudentInfo[]>> {
    return this.cachedApiCall(
      `class_teacher_students_${classId}`,
      async () => {


        // Use raw SQL query to get student data with profile names
        const { data: students, error } = await supabase.rpc('get_class_students_with_profiles', {
          p_class_id: classId
        })

        if (error) {
          console.error('❌ Error fetching class students:', error)
          throw error
        }

        return students?.map((student: any) => ({
          id: student.id,
          name: student.profile_name || student.student_id || `Student ${student.roll_number || 'Unknown'}`,
          email: student.profile_email || student.parent_email || '',
          roll_number: student.roll_number,
          admission_number: student.admission_number,
          parent_name: student.parent_name,
          parent_phone: student.parent_phone
        })) || []
      },
      forceRefresh
    )
  }

  /**
   * Get teachers assigned to a class with their schedules (for class teachers)
   */
  async getClassTeachersWithSchedule(classId: string, forceRefresh = false): Promise<ApiResponse<ClassTeacherInfo[]>> {
    return this.cachedApiCall(
      `class_teachers_schedule_${classId}`,
      async () => {
        // Use database function to get all teachers with schedules
        const { data: timetables, error } = await supabase.rpc('get_class_teachers_with_schedule', {
          p_class_id: classId
        })

        if (error) throw error

        // Group by teacher and subject
        const teacherMap = new Map<string, ClassTeacherInfo>()

        timetables?.forEach((entry: any) => {
          const teacherId = entry.teacher_id
          const key = `${teacherId}_${entry.subject_id}`

          if (!teacherMap.has(key)) {
            teacherMap.set(key, {
              id: entry.teacher_id,
              name: entry.teacher_name,
              email: entry.teacher_email,
              subject: {
                id: entry.subject_id,
                name: entry.subject_name,
                code: entry.subject_code
              },
              schedule: []
            })
          }

          const teacher = teacherMap.get(key)!
          teacher.schedule.push({
            day_of_week: entry.day_of_week,
            time_period: {
              id: entry.time_period_id,
              name: entry.time_period_name,
              start_time: entry.start_time,
              end_time: entry.end_time,
              period_order: entry.period_order
            }
          })
        })

        return Array.from(teacherMap.values())
      },
      forceRefresh
    )
  }

  /**
   * Get teacher's assignments with filtering options
   */
  async getTeacherAssignments(
    filters: {
      classId?: string
      subjectId?: string
      status?: string
      dateFrom?: string
      dateTo?: string
    } = {},
    forceRefresh = false
  ): Promise<ApiResponse<Assignment[]>> {
    if (!this.currentUser) {
      await this.initializeUser()
    }

    const cacheKey = `teacher_assignments_${this.currentUser?.id}_${JSON.stringify(filters)}`

    return this.cachedApiCall(
      cacheKey,
      async () => {
        let query = supabase
          .from('assignments')
          .select(`
            *,
            classes(name),
            subjects(name, code)
          `)
          .eq('teacher_id', this.currentUser?.id)

        if (filters.classId) query = query.eq('class_id', filters.classId)
        if (filters.subjectId) query = query.eq('subject_id', filters.subjectId)
        if (filters.status) query = query.eq('status', filters.status)
        if (filters.dateFrom) query = query.gte('due_date', filters.dateFrom)
        if (filters.dateTo) query = query.lte('due_date', filters.dateTo)

        query = query.order('due_date', { ascending: false })

        const { data: assignments, error } = await query

        if (error) throw error
        return assignments || []
      },
      forceRefresh
    )
  }

  /**
   * Helper function to invalidate all assignment-related caches
   */
  private async invalidateAssignmentCaches(): Promise<void> {
    console.log('🗑️ Invalidating assignment caches for teacher:', this.currentUser?.id)

    // First try individual key removal for specific assignment caches
    const cacheKeysToRemove = [
      `teacher_assignments_${this.currentUser?.id}`,
      `teacher_assignments_${this.currentUser?.id}_{}`,
      `teacher_assignments_${this.currentUser?.id}_{"status":"all"}`,
      `teacher_assignments_${this.currentUser?.id}_{"status":"draft"}`,
      `teacher_assignments_${this.currentUser?.id}_{"status":"published"}`,
      `teacher_assignments_${this.currentUser?.id}_{"status":"completed"}`
    ]

    for (const key of cacheKeysToRemove) {
      console.log('🗑️ Removing cache key:', key)
      await fallbackCacheManager.remove(key, this.currentUser?.id, this.currentUser?.school_id)
    }

    // For more aggressive cache clearing, clear all user cache
    // This ensures any cache entries with complex keys are also removed
    if (this.currentUser?.id) {
      console.log('🧹 Clearing all user cache to ensure assignment cache is invalidated')
      await fallbackCacheManager.clearUserCache(this.currentUser.id)
    }

    console.log('✅ Assignment cache invalidation completed')
  }

  /**
   * Create a new assignment
   */
  async createAssignment(assignmentData: Partial<Assignment>): Promise<ApiResponse<Assignment>> {
    try {
      const { data: assignment, error } = await supabase
        .from('assignments')
        .insert({
          ...assignmentData,
          teacher_id: this.currentUser?.id,
          school_id: this.currentUser?.school_id
        })
        .select()
        .single()

      if (error) throw error

      // Invalidate all assignment-related caches
      await this.invalidateAssignmentCaches()

      return { data: assignment, error: null, fromCache: false }
    } catch (error) {
      return { data: null, error: error instanceof Error ? error.message : 'Failed to create assignment', fromCache: false }
    }
  }

  /**
   * Update an existing assignment
   */
  async updateAssignment(assignmentId: string, updates: Partial<Assignment>): Promise<ApiResponse<Assignment>> {
    try {
      const { data: assignment, error } = await supabase
        .from('assignments')
        .update({
          ...updates,
          updated_at: new Date().toISOString()
        })
        .eq('id', assignmentId)
        .eq('teacher_id', this.currentUser?.id)
        .select()
        .single()

      if (error) throw error

      // Invalidate all assignment-related caches
      await this.invalidateAssignmentCaches()

      return { data: assignment, error: null, fromCache: false }
    } catch (error) {
      return { data: null, error: error instanceof Error ? error.message : 'Failed to update assignment', fromCache: false }
    }
  }

  /**
   * Delete an assignment
   */
  async deleteAssignment(assignmentId: string): Promise<ApiResponse<boolean>> {
    try {
      const { error } = await supabase
        .from('assignments')
        .delete()
        .eq('id', assignmentId)
        .eq('teacher_id', this.currentUser?.id)

      if (error) throw error

      // Invalidate all assignment-related caches
      await this.invalidateAssignmentCaches()

      return { data: true, error: null, fromCache: false }
    } catch (error) {
      return { data: false, error: error instanceof Error ? error.message : 'Failed to delete assignment', fromCache: false }
    }
  }

  /**
   * Get submissions for a specific assignment
   */
  async getAssignmentSubmissions(assignmentId: string, forceRefresh = false): Promise<ApiResponse<AssignmentSubmission[]>> {
    return this.cachedApiCall(
      `assignment_submissions_${assignmentId}`,
      async () => {
        const { data: submissions, error } = await supabase
          .from('assignment_submissions')
          .select(`
            *,
            students!inner(
              id,
              roll_number,
              profiles!inner(
                id,
                name
              )
            ),
            assignments!inner(
              title,
              max_marks
            )
          `)
          .eq('assignment_id', assignmentId)
          .order('submitted_at', { ascending: false })

        if (error) throw error

        return submissions?.map(sub => ({
          ...sub,
          student: {
            id: sub.students.id,
            name: sub.students.profiles.name,
            roll_number: sub.students.roll_number
          },
          assignment: {
            title: sub.assignments.title,
            max_marks: sub.assignments.max_marks
          }
        })) || []
      },
      forceRefresh
    )
  }

  /**
   * Grade an assignment submission
   */
  async gradeSubmission(
    submissionId: string,
    gradeData: {
      marks_obtained: number
      grade_letter?: string
      grade_percentage?: number
      teacher_feedback?: string
      teacher_comments?: string
    }
  ): Promise<ApiResponse<AssignmentSubmission>> {
    try {
      const { data: submission, error } = await supabase
        .from('assignment_submissions')
        .update({
          ...gradeData,
          is_graded: true,
          graded_at: new Date().toISOString(),
          graded_by: this.currentUser?.id,
          status: 'graded',
          updated_at: new Date().toISOString()
        })
        .eq('id', submissionId)
        .select()
        .single()

      if (error) throw error

      // Invalidate related caches
      await fallbackCacheManager.remove(`assignment_submissions_`)

      return { data: submission, error: null, fromCache: false }
    } catch (error) {
      return { data: null, error: error instanceof Error ? error.message : 'Failed to grade submission', fromCache: false }
    }
  }

  /**
   * Get teacher's lesson plans
   */
  async getLessonPlans(
    filters: {
      classId?: string
      subjectId?: string
      dateFrom?: string
      dateTo?: string
      status?: string
    } = {},
    forceRefresh = false
  ): Promise<ApiResponse<LessonPlan[]>> {
    if (!this.currentUser) {
      await this.initializeUser()
    }

    const cacheKey = `lesson_plans_${this.currentUser?.id}_${JSON.stringify(filters)}`

    return this.cachedApiCall(
      cacheKey,
      async () => {
        let query = supabase
          .from('lesson_plans')
          .select(`
            *,
            classes(name),
            subjects(name, code)
          `)
          .eq('teacher_id', this.currentUser?.id)

        if (filters.classId) query = query.eq('class_id', filters.classId)
        if (filters.subjectId) query = query.eq('subject_id', filters.subjectId)
        if (filters.status) query = query.eq('status', filters.status)
        if (filters.dateFrom) query = query.gte('lesson_date', filters.dateFrom)
        if (filters.dateTo) query = query.lte('lesson_date', filters.dateTo)

        query = query.order('lesson_date', { ascending: false })

        const { data: lessonPlans, error } = await query

        if (error) throw error
        return lessonPlans || []
      },
      forceRefresh
    )
  }

  /**
   * Create a new lesson plan
   */
  async createLessonPlan(lessonPlanData: Partial<LessonPlan>): Promise<ApiResponse<LessonPlan>> {
    try {
      const { data: lessonPlan, error } = await supabase
        .from('lesson_plans')
        .insert({
          ...lessonPlanData,
          teacher_id: this.currentUser?.id,
          school_id: this.currentUser?.school_id
        })
        .select()
        .single()

      if (error) throw error

      // Invalidate cache
      await fallbackCacheManager.remove(`lesson_plans_${this.currentUser?.id}`)

      return { data: lessonPlan, error: null, fromCache: false }
    } catch (error) {
      return { data: null, error: error instanceof Error ? error.message : 'Failed to create lesson plan', fromCache: false }
    }
  }

  /**
   * Update a lesson plan
   */
  async updateLessonPlan(lessonPlanId: string, updates: Partial<LessonPlan>): Promise<ApiResponse<LessonPlan>> {
    try {
      const { data: lessonPlan, error } = await supabase
        .from('lesson_plans')
        .update({
          ...updates,
          updated_at: new Date().toISOString()
        })
        .eq('id', lessonPlanId)
        .eq('teacher_id', this.currentUser?.id)
        .select()
        .single()

      if (error) throw error

      // Invalidate cache
      await fallbackCacheManager.remove(`lesson_plans_${this.currentUser?.id}`)

      return { data: lessonPlan, error: null, fromCache: false }
    } catch (error) {
      return { data: null, error: error instanceof Error ? error.message : 'Failed to update lesson plan', fromCache: false }
    }
  }

  /**
   * Get behavioral notes for students
   */
  async getBehavioralNotes(
    filters: {
      studentId?: string
      classId?: string
      incidentType?: string
      dateFrom?: string
      dateTo?: string
    } = {},
    forceRefresh = false
  ): Promise<ApiResponse<BehavioralNote[]>> {
    if (!this.currentUser) {
      await this.initializeUser()
    }

    const cacheKey = `behavioral_notes_${this.currentUser?.id}_${JSON.stringify(filters)}`

    return this.cachedApiCall(
      cacheKey,
      async () => {
        let query = supabase
          .from('student_behavioral_notes')
          .select(`
            *,
            students!inner(
              id,
              roll_number,
              profiles!inner(
                id,
                name
              )
            )
          `)
          .eq('teacher_id', this.currentUser?.id)

        if (filters.studentId) query = query.eq('student_id', filters.studentId)
        if (filters.classId) query = query.eq('class_id', filters.classId)
        if (filters.incidentType) query = query.eq('incident_type', filters.incidentType)
        if (filters.dateFrom) query = query.gte('note_date', filters.dateFrom)
        if (filters.dateTo) query = query.lte('note_date', filters.dateTo)

        query = query.order('note_date', { ascending: false })

        const { data: notes, error } = await query

        if (error) throw error

        return notes?.map(note => ({
          ...note,
          student: {
            id: note.students.id,
            name: note.students.profiles.name,
            roll_number: note.students.roll_number
          }
        })) || []
      },
      forceRefresh
    )
  }

  /**
   * Create a behavioral note
   */
  async createBehavioralNote(noteData: Partial<BehavioralNote>): Promise<ApiResponse<BehavioralNote>> {
    try {
      const { data: note, error } = await supabase
        .from('student_behavioral_notes')
        .insert({
          ...noteData,
          teacher_id: this.currentUser?.id,
          school_id: this.currentUser?.school_id
        })
        .select()
        .single()

      if (error) throw error

      // Invalidate cache
      await fallbackCacheManager.remove(`behavioral_notes_${this.currentUser?.id}`)

      return { data: note, error: null, fromCache: false }
    } catch (error) {
      return { data: null, error: error instanceof Error ? error.message : 'Failed to create behavioral note', fromCache: false }
    }
  }

  /**
   * Mark attendance for a class
   */
  async markAttendance(
    classId: string,
    attendanceDate: string,
    attendanceData: Array<{
      student_id: string
      status: 'present' | 'absent'
    }>
  ): Promise<ApiResponse<boolean>> {
    try {
      // First, delete existing attendance for this date and class
      await supabase
        .from('student_attendance')
        .delete()
        .eq('class_id', classId)
        .eq('attendance_date', attendanceDate)

      // Insert new attendance records
      const attendanceRecords = attendanceData.map(record => ({
        ...record,
        class_id: classId,
        attendance_date: attendanceDate,
        school_id: this.currentUser?.school_id,
        marked_by: this.currentUser?.id
      }))

      const { error } = await supabase
        .from('student_attendance')
        .insert(attendanceRecords)

      if (error) throw error

      // Invalidate attendance cache
      await fallbackCacheManager.remove(`attendance_${classId}_${attendanceDate}`)

      return { data: true, error: null, fromCache: false }
    } catch (error) {
      return { data: false, error: error instanceof Error ? error.message : 'Failed to mark attendance', fromCache: false }
    }
  }

  /**
   * Get attendance for a class and date
   */
  async getAttendance(
    classId: string,
    attendanceDate: string,
    forceRefresh = false
  ): Promise<ApiResponse<Array<{
    student_id: string
    student_name: string
    roll_number?: number
    status: 'present' | 'absent'
  }>>> {
    return this.cachedApiCall(
      `attendance_${classId}_${attendanceDate}`,
      async () => {
        const { data: attendance, error } = await supabase
          .from('student_attendance')
          .select(`
            student_id,
            status,
            students!inner(
              roll_number,
              profiles!inner(
                name
              )
            )
          `)
          .eq('class_id', classId)
          .eq('attendance_date', attendanceDate)
          .order('students.roll_number')

        if (error) throw error

        return attendance?.map((record: any) => ({
          student_id: record.student_id,
          student_name: record.students.profiles.name,
          roll_number: record.students.roll_number,
          status: record.status
        })) || []
      },
      forceRefresh
    )
  }

  /**
   * Get attendance statistics for a class
   */
  async getAttendanceStats(
    classId: string,
    dateFrom: string,
    dateTo: string,
    forceRefresh = false
  ): Promise<ApiResponse<{
    totalDays: number
    averageAttendance: number
    studentStats: Array<{
      student_id: string
      student_name: string
      roll_number?: number
      present_days: number
      absent_days: number
      attendance_percentage: number
    }>
  }>> {
    return this.cachedApiCall(
      `attendance_stats_${classId}_${dateFrom}_${dateTo}`,
      async () => {
        const { data: attendance, error } = await supabase
          .from('student_attendance')
          .select(`
            student_id,
            status,
            attendance_date,
            students!inner(
              roll_number,
              profiles!inner(
                name
              )
            )
          `)
          .eq('class_id', classId)
          .gte('attendance_date', dateFrom)
          .lte('attendance_date', dateTo)

        if (error) throw error

        // Calculate statistics
        const studentMap = new Map()
        const allDates = new Set()

        attendance?.forEach((record: any) => {
          allDates.add(record.attendance_date)

          if (!studentMap.has(record.student_id)) {
            studentMap.set(record.student_id, {
              student_id: record.student_id,
              student_name: record.students.profiles.name,
              roll_number: record.students.roll_number,
              present_days: 0,
              absent_days: 0
            })
          }

          const student = studentMap.get(record.student_id)
          if (record.status === 'present') {
            student.present_days++
          } else {
            student.absent_days++
          }
        })

        const totalDays = allDates.size
        const studentStats = Array.from(studentMap.values()).map(student => ({
          ...student,
          attendance_percentage: totalDays > 0 ? (student.present_days / totalDays) * 100 : 0
        }))

        const averageAttendance = studentStats.length > 0
          ? studentStats.reduce((sum, student) => sum + student.attendance_percentage, 0) / studentStats.length
          : 0

        return {
          totalDays,
          averageAttendance,
          studentStats
        }
      },
      forceRefresh
    )
  }

  /**
   * Update student details (Class Teacher only)
   */
  async updateStudentDetails(studentId: string, updateData: StudentUpdateData): Promise<ApiResponse<ClassStudentInfo>> {
    try {
      console.log('📝 Updating student details:', studentId, updateData)

      // Prepare the update data for profiles table (name, email)
      const profileUpdates: any = {}
      if (updateData.name !== undefined) profileUpdates.name = updateData.name
      if (updateData.email !== undefined) profileUpdates.email = updateData.email

      // Prepare the update data for students table
      const studentUpdates: any = {}
      if (updateData.roll_number !== undefined) studentUpdates.roll_number = updateData.roll_number
      if (updateData.admission_number !== undefined) studentUpdates.admission_number = updateData.admission_number
      if (updateData.parent_name !== undefined) studentUpdates.parent_name = updateData.parent_name
      if (updateData.parent_phone !== undefined) studentUpdates.parent_phone = updateData.parent_phone
      if (updateData.parent_email !== undefined) studentUpdates.parent_email = updateData.parent_email
      if (updateData.date_of_birth !== undefined) studentUpdates.date_of_birth = updateData.date_of_birth
      if (updateData.gender !== undefined) studentUpdates.gender = updateData.gender

      // Update profiles table if needed
      if (Object.keys(profileUpdates).length > 0) {
        const { error: profileError } = await supabase
          .from('profiles')
          .update(profileUpdates)
          .eq('id', studentId)

        if (profileError) {
          console.error('❌ Error updating student profile:', profileError)
          return { data: null, error: profileError.message, fromCache: false }
        }
      }

      // Update students table if needed
      if (Object.keys(studentUpdates).length > 0) {
        const { error: studentError } = await supabase
          .from('students')
          .update(studentUpdates)
          .eq('id', studentId)

        if (studentError) {
          console.error('❌ Error updating student details:', studentError)
          return { data: null, error: studentError.message, fromCache: false }
        }
      }

      // Fetch updated student data
      const { data: updatedStudent, error: fetchError } = await supabase.rpc('get_class_students_with_profiles', {
        p_class_id: null // We'll filter by student ID instead
      })

      if (fetchError) {
        console.error('❌ Error fetching updated student:', fetchError)
        return { data: null, error: fetchError.message, fromCache: false }
      }

      const student = updatedStudent?.find((s: any) => s.id === studentId)
      if (!student) {
        return { data: null, error: 'Student not found after update', fromCache: false }
      }

      const result: ClassStudentInfo = {
        id: student.id,
        name: student.profile_name || student.student_id || 'Unknown',
        email: student.profile_email || student.parent_email || '',
        roll_number: student.roll_number,
        admission_number: student.admission_number,
        parent_name: student.parent_name,
        parent_phone: student.parent_phone
      }

      console.log('✅ Student updated successfully:', result)
      return { data: result, error: null, fromCache: false }
    } catch (error) {
      console.error('❌ Exception updating student:', error)
      return { data: null, error: 'Failed to update student details', fromCache: false }
    }
  }

  /**
   * Enroll new student to class (Class Teacher only)
   */
  async enrollStudentToClass(enrollmentData: StudentEnrollmentData): Promise<ApiResponse<ClassStudentInfo>> {
    try {
      console.log('👥 Enrolling new student:', enrollmentData)

      // First create the profile
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .insert({
          name: enrollmentData.name,
          email: enrollmentData.email,
          role: 'student'
        })
        .select()
        .single()

      if (profileError) {
        console.error('❌ Error creating student profile:', profileError)
        return { data: null, error: profileError.message, fromCache: false }
      }

      // Then create the student record
      const { data: student, error: studentError } = await supabase
        .from('students')
        .insert({
          id: profile.id,
          student_id: `STU${Date.now()}`, // Generate a unique student ID
          class_id: enrollmentData.class_id,
          roll_number: enrollmentData.roll_number,
          admission_number: enrollmentData.admission_number,
          parent_name: enrollmentData.parent_name,
          parent_phone: enrollmentData.parent_phone,
          parent_email: enrollmentData.parent_email,
          date_of_birth: enrollmentData.date_of_birth,
          gender: enrollmentData.gender,
          is_active: true
        })
        .select()
        .single()

      if (studentError) {
        console.error('❌ Error creating student record:', studentError)
        // Clean up the profile if student creation failed
        await supabase.from('profiles').delete().eq('id', profile.id)
        return { data: null, error: studentError.message, fromCache: false }
      }

      const result: ClassStudentInfo = {
        id: student.id,
        name: enrollmentData.name,
        email: enrollmentData.email,
        roll_number: enrollmentData.roll_number || undefined,
        admission_number: enrollmentData.admission_number || undefined,
        parent_name: enrollmentData.parent_name,
        parent_phone: enrollmentData.parent_phone
      }

      console.log('✅ Student enrolled successfully:', result)
      return { data: result, error: null, fromCache: false }
    } catch (error) {
      console.error('❌ Exception enrolling student:', error)
      return { data: null, error: 'Failed to enroll student', fromCache: false }
    }
  }

  /**
   * Get class timetable in a structured format (Class Teacher only)
   */
  async getClassTimetableStructured(classId: string): Promise<ApiResponse<ClassTimetableView[]>> {
    try {
      console.log('📅 Fetching structured timetable for class:', classId)

      // Get all time periods first
      const { data: timePeriods, error: timePeriodsError } = await supabase
        .from('time_periods')
        .select('*')
        .order('period_order')

      if (timePeriodsError) {
        console.error('❌ Error fetching time periods:', timePeriodsError)
        return { data: null, error: timePeriodsError.message, fromCache: false }
      }

      // Get timetable entries for the class
      const { data: timetableEntries, error: timetableError } = await supabase.rpc('get_class_teachers_with_schedule', {
        p_class_id: classId
      })

      if (timetableError) {
        console.error('❌ Error fetching timetable entries:', timetableError)
        return { data: null, error: timetableError.message, fromCache: false }
      }

      // Structure the data by day and period
      const daysOfWeek = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday']
      const structuredTimetable: ClassTimetableView[] = []

      for (const day of daysOfWeek) {
        const daySchedule: ClassTimetableView = {
          day_of_week: day,
          periods: []
        }

        for (const period of timePeriods) {
          const entry = timetableEntries?.find((t: any) =>
            t.day_of_week === day && t.time_period_id === period.id
          )

          daySchedule.periods.push({
            time_period_id: period.id,
            time_period_name: period.name,
            start_time: period.start_time,
            end_time: period.end_time,
            period_order: period.period_order,
            teacher_id: entry?.teacher_id,
            teacher_name: entry?.teacher_name,
            subject_id: entry?.subject_id,
            subject_name: entry?.subject_name,
            subject_code: entry?.subject_code,
            timetable_id: entry?.id
          })
        }

        structuredTimetable.push(daySchedule)
      }

      console.log('✅ Structured timetable fetched successfully')
      return { data: structuredTimetable, error: null, fromCache: false }
    } catch (error) {
      console.error('❌ Exception fetching structured timetable:', error)
      return { data: null, error: 'Failed to fetch timetable', fromCache: false }
    }
  }

  /**
   * Update timetable entry (Class Teacher only)
   */
  async updateTimetableEntry(
    timetableId: string,
    updateData: TimetableUpdateData
  ): Promise<ApiResponse<boolean>> {
    try {
      console.log('📝 Updating timetable entry:', timetableId, updateData)

      const { error } = await supabase
        .from('timetables')
        .update(updateData)
        .eq('id', timetableId)

      if (error) {
        console.error('❌ Error updating timetable entry:', error)
        return { data: null, error: error.message, fromCache: false }
      }

      console.log('✅ Timetable entry updated successfully')
      return { data: true, error: null, fromCache: false }
    } catch (error) {
      console.error('❌ Exception updating timetable entry:', error)
      return { data: null, error: 'Failed to update timetable entry', fromCache: false }
    }
  }

  /**
   * Create new timetable entry (Class Teacher only)
   */
  async createTimetableEntry(entryData: TimetableEntry): Promise<ApiResponse<string>> {
    try {
      console.log('➕ Creating new timetable entry:', entryData)

      const { data, error } = await supabase
        .from('timetables')
        .insert(entryData)
        .select('id')
        .single()

      if (error) {
        console.error('❌ Error creating timetable entry:', error)
        return { data: null, error: error.message, fromCache: false }
      }

      console.log('✅ Timetable entry created successfully:', data.id)
      return { data: data.id, error: null, fromCache: false }
    } catch (error) {
      console.error('❌ Exception creating timetable entry:', error)
      return { data: null, error: 'Failed to create timetable entry', fromCache: false }
    }
  }

  /**
   * Delete timetable entry (Class Teacher only)
   */
  async deleteTimetableEntry(timetableId: string): Promise<ApiResponse<boolean>> {
    try {
      console.log('🗑️ Deleting timetable entry:', timetableId)

      const { error } = await supabase
        .from('timetables')
        .update({ is_active: false })
        .eq('id', timetableId)

      if (error) {
        console.error('❌ Error deleting timetable entry:', error)
        return { data: null, error: error.message, fromCache: false }
      }

      console.log('✅ Timetable entry deleted successfully')
      return { data: true, error: null, fromCache: false }
    } catch (error) {
      console.error('❌ Exception deleting timetable entry:', error)
      return { data: null, error: 'Failed to delete timetable entry', fromCache: false }
    }
  }

  /**
   * Get subjects assigned to the current teacher
   */
  async getTeacherAssignedSubjects(forceRefresh = false): Promise<ApiResponse<Array<{ id: string; name: string; code: string }>>> {
    if (!this.currentUser) {
      await this.initializeUser()
    }

    return this.cachedApiCall(
      `teacher_assigned_subjects_${this.currentUser?.id}`,
      async () => {
        console.log('📚 Fetching subjects assigned to teacher:', this.currentUser?.id)

        const { data: timetableSubjects, error } = await supabase
          .from('timetables')
          .select(`
            subject_id,
            subjects!inner(
              id,
              name,
              code
            )
          `)
          .eq('teacher_id', this.currentUser?.id)
          .eq('is_active', true)

        if (error) {
          console.error('❌ Error fetching teacher assigned subjects:', error)
          throw error
        }

        // Extract unique subjects from timetable assignments
        const uniqueSubjects = new Map()
        timetableSubjects?.forEach((item: any) => {
          const subject = item.subjects
          if (subject && !uniqueSubjects.has(subject.id)) {
            uniqueSubjects.set(subject.id, {
              id: subject.id,
              name: subject.name,
              code: subject.code
            })
          }
        })

        const subjects = Array.from(uniqueSubjects.values())
        console.log('✅ Teacher assigned subjects fetched:', subjects.length, 'subjects')
        return subjects
      },
      forceRefresh
    )
  }

  /**
   * Get available teachers and subjects for timetable management
   */
  async getAvailableTeachersAndSubjects(): Promise<ApiResponse<{
    teachers: { id: string; name: string; email: string }[]
    subjects: { id: string; name: string; code: string }[]
  }>> {
    try {
      console.log('👥 Fetching available teachers and subjects')

      const [teachersResponse, subjectsResponse] = await Promise.all([
        supabase
          .from('profiles')
          .select('id, name, email')
          .eq('role', 'teacher'),
        supabase
          .from('subjects')
          .select('id, name, code')
          .eq('is_active', true)
          .order('name')
      ])

      if (teachersResponse.error) {
        console.error('❌ Error fetching teachers:', teachersResponse.error)
        return { data: null, error: teachersResponse.error.message, fromCache: false }
      }

      if (subjectsResponse.error) {
        console.error('❌ Error fetching subjects:', subjectsResponse.error)
        return { data: null, error: subjectsResponse.error.message, fromCache: false }
      }

      const result = {
        teachers: teachersResponse.data || [],
        subjects: subjectsResponse.data || []
      }

      console.log('✅ Teachers and subjects fetched successfully')
      return { data: result, error: null, fromCache: false }
    } catch (error) {
      console.error('❌ Exception fetching teachers and subjects:', error)
      return { data: null, error: 'Failed to fetch teachers and subjects', fromCache: false }
    }
  }

  /**
   * Enhanced Attendance Management APIs
   */

  /**
   * Get students for enhanced attendance registry
   */
  async getStudentsForAttendanceRegistry(classId: string): Promise<ApiResponse<ClassStudentInfo[]>> {
    try {
      console.log('📋 Fetching students for attendance registry:', classId)

      // Try using the database function first, fallback to direct query
      let data, error
      try {
        const result = await supabase.rpc('get_class_students_with_profiles', {
          p_class_id: classId
        })
        data = result.data
        error = result.error
        console.log('📋 Using database function result:', { data, error })
      } catch (rpcError) {
        console.log('📋 Database function not available, using direct query')
        // Fallback to direct query if function doesn't exist
        const result = await supabase
          .from('students')
          .select(`
            id,
            student_id,
            admission_number,
            roll_number,
            class_id,
            section,
            parent_name,
            parent_phone,
            parent_email,
            profiles!inner(
              name,
              email
            )
          `)
          .eq('class_id', classId)
          .eq('is_active', true)
          .order('roll_number', { nullsLast: true })

        data = result.data
        error = result.error
        console.log('📋 Using direct query result:', { data, error })
      }

      if (error) {
        console.error('❌ Error fetching students for attendance:', error)
        return { data: null, error: error.message, fromCache: false }
      }

      const students: ClassStudentInfo[] = (data || []).map((student: any) => ({
        id: student.id,
        name: student.profile_name || student.profiles?.name || student.student_id || 'Unknown',
        email: student.profile_email || student.profiles?.email || student.parent_email || '',
        roll_number: student.roll_number,
        admission_number: student.admission_number,
        parent_name: student.parent_name,
        parent_phone: student.parent_phone
      }))

      console.log('✅ Students for attendance registry fetched successfully:', students.length)
      console.log('📋 Student details:', students)
      return { data: students, error: null, fromCache: false }
    } catch (error) {
      console.error('❌ Exception fetching students for attendance:', error)
      return { data: null, error: 'Failed to fetch students for attendance', fromCache: false }
    }
  }

  /**
   * Get existing attendance for a specific date and class
   */
  async getExistingAttendance(classId: string, date: string): Promise<ApiResponse<Record<string, 'present' | 'absent'>>> {
    try {
      console.log('📅 Fetching existing attendance:', classId, date)

      const { data, error } = await supabase
        .from('student_attendance')
        .select('student_id, status')
        .eq('class_id', classId)
        .eq('attendance_date', date)

      if (error) {
        console.error('❌ Error fetching existing attendance:', error)
        return { data: null, error: error.message, fromCache: false }
      }

      const attendanceMap: Record<string, 'present' | 'absent'> = {}
      ;(data || []).forEach(record => {
        attendanceMap[record.student_id] = record.status
      })

      console.log('✅ Existing attendance fetched successfully:', Object.keys(attendanceMap).length, 'records')
      return { data: attendanceMap, error: null, fromCache: false }
    } catch (error) {
      console.error('❌ Exception fetching existing attendance:', error)
      return { data: null, error: 'Failed to fetch existing attendance', fromCache: false }
    }
  }

  /**
   * Save or update attendance records
   */
  async saveAttendanceRecords(
    classId: string,
    date: string,
    attendance: Record<string, 'present' | 'absent'>,
    teacherId: string,
    schoolId: string
  ): Promise<ApiResponse<boolean>> {
    try {
      console.log('💾 Saving attendance records:', classId, date, Object.keys(attendance).length, 'students')

      // Check if attendance already exists for this date
      const { data: existingRecords, error: checkError } = await supabase
        .from('student_attendance')
        .select('id')
        .eq('class_id', classId)
        .eq('attendance_date', date)

      if (checkError) {
        console.error('❌ Error checking existing attendance:', checkError)
        return { data: null, error: checkError.message, fromCache: false }
      }

      // If records exist, delete them first
      if (existingRecords && existingRecords.length > 0) {
        const { error: deleteError } = await supabase
          .from('student_attendance')
          .delete()
          .eq('class_id', classId)
          .eq('attendance_date', date)

        if (deleteError) {
          console.error('❌ Error deleting existing attendance:', deleteError)
          return { data: null, error: deleteError.message, fromCache: false }
        }
      }

      // Prepare attendance records for insertion
      const attendanceRecords = Object.entries(attendance).map(([studentId, status]) => ({
        student_id: studentId,
        class_id: classId,
        school_id: schoolId,
        attendance_date: date,
        status: status,
        marked_by: teacherId
      }))

      // Insert new attendance records
      const { error: insertError } = await supabase
        .from('student_attendance')
        .insert(attendanceRecords)

      if (insertError) {
        console.error('❌ Error inserting attendance:', insertError)
        return { data: null, error: insertError.message, fromCache: false }
      }

      console.log('✅ Attendance records saved successfully:', attendanceRecords.length, 'records')
      return { data: true, error: null, fromCache: false }
    } catch (error) {
      console.error('❌ Exception saving attendance records:', error)
      return { data: null, error: 'Failed to save attendance records', fromCache: false }
    }
  }

  /**
   * Get attendance statistics for a class and date range
   */
  async getAttendanceStatistics(
    classId: string,
    startDate: string,
    endDate: string
  ): Promise<ApiResponse<{
    totalDays: number
    totalStudents: number
    averageAttendance: number
    dailyStats: Array<{
      date: string
      presentCount: number
      absentCount: number
      totalStudents: number
      attendancePercentage: number
    }>
  }>> {
    try {
      console.log('📊 Fetching attendance statistics:', classId, startDate, endDate)

      const { data, error } = await supabase
        .from('student_attendance')
        .select('attendance_date, status, student_id')
        .eq('class_id', classId)
        .gte('attendance_date', startDate)
        .lte('attendance_date', endDate)
        .order('attendance_date')

      if (error) {
        console.error('❌ Error fetching attendance statistics:', error)
        return { data: null, error: error.message, fromCache: false }
      }

      // Get total students in class
      const studentsResponse = await this.getStudentsForAttendanceRegistry(classId)
      if (studentsResponse.error || !studentsResponse.data) {
        return { data: null, error: 'Failed to get student count', fromCache: false }
      }

      const totalStudents = studentsResponse.data.length

      // Group by date and calculate statistics
      const dailyStatsMap = new Map<string, { present: number; absent: number }>()

      ;(data || []).forEach(record => {
        const date = record.attendance_date
        if (!dailyStatsMap.has(date)) {
          dailyStatsMap.set(date, { present: 0, absent: 0 })
        }
        const dayStats = dailyStatsMap.get(date)!
        if (record.status === 'present') {
          dayStats.present++
        } else {
          dayStats.absent++
        }
      })

      const dailyStats = Array.from(dailyStatsMap.entries()).map(([date, stats]) => ({
        date,
        presentCount: stats.present,
        absentCount: stats.absent,
        totalStudents,
        attendancePercentage: totalStudents > 0 ? (stats.present / totalStudents) * 100 : 0
      }))

      const totalDays = dailyStats.length
      const averageAttendance = dailyStats.length > 0
        ? dailyStats.reduce((sum, day) => sum + day.attendancePercentage, 0) / dailyStats.length
        : 0

      const result = {
        totalDays,
        totalStudents,
        averageAttendance,
        dailyStats
      }

      console.log('✅ Attendance statistics fetched successfully')
      return { data: result, error: null, fromCache: false }
    } catch (error) {
      console.error('❌ Exception fetching attendance statistics:', error)
      return { data: null, error: 'Failed to fetch attendance statistics', fromCache: false }
    }
  }

  /**
   * Get attendance history for teacher's classes
   */
  async getAttendanceHistory(forceRefresh = false): Promise<ApiResponse<any[]>> {
    if (!this.currentUser) {
      await this.initializeUser()
    }

    return this.cachedApiCall(
      `teacher_attendance_history_${this.currentUser?.id}`,
      async () => {
        // Get class IDs where teacher teaches or is class teacher
        const teacherClassesResponse = await this.getTeacherClassesForAttendance()
        if (teacherClassesResponse.error || !teacherClassesResponse.data) {
          throw new Error('Failed to get teacher classes')
        }

        const classIds = teacherClassesResponse.data.map(cls => cls.id)
        if (classIds.length === 0) {
          return []
        }

        // Get attendance records for these classes
        const { data: attendanceRecords, error } = await supabase
          .from('student_attendance')
          .select(`
            id,
            attendance_date,
            status,
            created_at,
            student_id,
            class_id,
            classes!inner(
              id,
              name,
              grade_level,
              section
            )
          `)
          .in('class_id', classIds)
          .order('attendance_date', { ascending: false })
          .order('created_at', { ascending: false })

        if (error) {
          console.error('❌ Attendance history query error:', error)
          throw error
        }

        // Get student information for the attendance records
        const studentIds = [...new Set(attendanceRecords?.map(r => r.student_id) || [])]
        let studentsMap: Record<string, any> = {}

        if (studentIds.length > 0) {
          const { data: studentsData, error: studentsError } = await supabase
            .from('students')
            .select(`
              id,
              roll_number,
              profiles!inner(
                id,
                name
              )
            `)
            .in('id', studentIds)

          if (studentsError) {
            console.error('❌ Students query error:', studentsError)
            // Continue without student details
          } else {
            studentsMap = (studentsData || []).reduce((acc, student) => {
              acc[student.id] = student
              return acc
            }, {} as Record<string, any>)
          }
        }

        // Group by date and class
        const groupedRecords = attendanceRecords?.reduce((acc, record) => {
          const date = record.attendance_date
          const classInfo = record.classes
          const key = `${date}_${classInfo.id}`

          if (!acc[key]) {
            acc[key] = {
              id: key,
              date,
              class: classInfo,
              students: [],
              totalStudents: 0,
              presentCount: 0,
              absentCount: 0,
              attendancePercentage: 0
            }
          }

          const studentInfo = studentsMap[record.student_id]
          acc[key].students.push({
            id: record.student_id,
            name: studentInfo?.profiles?.name || 'Unknown Student',
            rollNumber: studentInfo?.roll_number || null,
            status: record.status
          })

          acc[key].totalStudents++
          if (record.status === 'present') {
            acc[key].presentCount++
          } else {
            acc[key].absentCount++
          }

          return acc
        }, {} as Record<string, any>) || {}

        // Calculate attendance percentages
        const result = Object.values(groupedRecords).map((record: any) => ({
          ...record,
          attendancePercentage: record.totalStudents > 0
            ? Math.round((record.presentCount / record.totalStudents) * 100)
            : 0
        }))

        console.log('📚 Attendance history:', result.length, 'records')
        console.log('📚 Sample record:', result[0])
        return result
      },
      forceRefresh
    )
  }

  // ==========================================
  // GRADES AND ASSESSMENT MANAGEMENT
  // ==========================================

  /**
   * Get grade scales for the school
   */
  async getGradeScales(forceRefresh = false): Promise<ApiResponse<GradeScale[]>> {
    if (!this.currentUser) {
      await this.initializeUser()
    }

    return this.cachedApiCall(
      `grade_scales_${this.currentUser?.school_id}`,
      async () => {
        const { data: gradeScales, error } = await supabase
          .from('grade_scales')
          .select('*')
          .eq('school_id', this.currentUser?.school_id)
          .eq('is_active', true)
          .order('is_default', { ascending: false })
          .order('name')

        if (error) throw error
        return gradeScales || []
      },
      CACHE_CONFIGS.SCHOOL_INFO,
      forceRefresh
    )
  }

  /**
   * Get grade scale ranges for a specific grade scale
   */
  async getGradeScaleRanges(gradeScaleId: string, forceRefresh = false): Promise<ApiResponse<GradeScaleRange[]>> {
    return this.cachedApiCall(
      `grade_scale_ranges_${gradeScaleId}`,
      async () => {
        const { data: ranges, error } = await supabase
          .from('grade_scale_ranges')
          .select('*')
          .eq('grade_scale_id', gradeScaleId)
          .order('min_percentage', { ascending: false })

        if (error) throw error
        return ranges || []
      },
      CACHE_CONFIGS.SCHOOL_INFO,
      forceRefresh
    )
  }

  /**
   * Get exam types for the school
   */
  async getExamTypes(forceRefresh = false): Promise<ApiResponse<ExamType[]>> {
    if (!this.currentUser) {
      await this.initializeUser()
    }

    return this.cachedApiCall(
      `exam_types_${this.currentUser?.school_id}`,
      async () => {
        const { data: examTypes, error } = await supabase
          .from('exam_types')
          .select('*')
          .eq('school_id', this.currentUser?.school_id)
          .eq('is_active', true)
          .order('name')

        if (error) throw error
        return examTypes || []
      },
      CACHE_CONFIGS.SCHOOL_INFO,
      forceRefresh
    )
  }

  /**
   * Get exams for teacher's subjects and classes
   */
  async getTeacherExams(
    filters: {
      classId?: string
      subjectId?: string
      examTypeId?: string
      status?: string
      dateFrom?: string
      dateTo?: string
    } = {},
    forceRefresh = false
  ): Promise<ApiResponse<Exam[]>> {
    if (!this.currentUser) {
      await this.initializeUser()
    }

    const cacheKey = `teacher_exams_${this.currentUser?.id}_${JSON.stringify(filters)}`

    return this.cachedApiCall(
      cacheKey,
      async () => {
        // First get teacher's assigned subjects and classes
        const teacherSubjectsResponse = await this.getTeacherAssignedSubjects()
        const teacherClassesResponse = await this.getTeacherClasses()

        if (teacherSubjectsResponse.error || teacherClassesResponse.error) {
          throw new Error('Failed to get teacher assignments')
        }

        const subjectIds = teacherSubjectsResponse.data?.map(s => s.id) || []
        const classIds = teacherClassesResponse.data?.map(c => c.id) || []

        let query = supabase
          .from('exams')
          .select(`
            *,
            exam_types(name, description, weightage),
            subjects(name, code),
            classes(name, section)
          `)
          .in('subject_id', subjectIds)
          .in('class_id', classIds)

        if (filters.classId) query = query.eq('class_id', filters.classId)
        if (filters.subjectId) query = query.eq('subject_id', filters.subjectId)
        if (filters.examTypeId) query = query.eq('exam_type_id', filters.examTypeId)
        if (filters.status) query = query.eq('status', filters.status)
        if (filters.dateFrom) query = query.gte('exam_date', filters.dateFrom)
        if (filters.dateTo) query = query.lte('exam_date', filters.dateTo)

        const { data: exams, error } = await query.order('exam_date', { ascending: false })

        if (error) throw error
        return exams || []
      },
      CACHE_CONFIGS.ASSIGNMENT_LIST,
      forceRefresh
    )
  }

  /**
   * Get assignment submissions for grading
   */
  async getAssignmentSubmissions(
    assignmentId: string,
    forceRefresh = false
  ): Promise<ApiResponse<AssignmentGrade[]>> {
    return this.cachedApiCall(
      `assignment_submissions_${assignmentId}`,
      async () => {
        const { data: submissions, error } = await supabase
          .from('assignment_submissions')
          .select(`
            *,
            students(
              id,
              name,
              roll_number,
              admission_number
            ),
            assignments(
              id,
              title,
              max_marks,
              pass_marks,
              assignment_type,
              due_date
            )
          `)
          .eq('assignment_id', assignmentId)
          .order('submitted_at', { ascending: false })

        if (error) throw error
        return submissions || []
      },
      CACHE_CONFIGS.ASSIGNMENT_LIST,
      forceRefresh
    )
  }

  /**
   * Get exam grades for a specific exam
   */
  async getExamGrades(
    examId: string,
    forceRefresh = false
  ): Promise<ApiResponse<ExamGrade[]>> {
    return this.cachedApiCall(
      `exam_grades_${examId}`,
      async () => {
        const { data: grades, error } = await supabase
          .from('exam_grades')
          .select(`
            *,
            students(
              id,
              name,
              roll_number,
              admission_number
            ),
            exams(
              id,
              name,
              max_marks,
              pass_marks,
              exam_date
            )
          `)
          .eq('exam_id', examId)
          .order('students(roll_number)')

        if (error) throw error
        return grades || []
      },
      CACHE_CONFIGS.ASSIGNMENT_LIST,
      forceRefresh
    )
  }

  /**
   * Submit grades for assignment submissions
   */
  async submitAssignmentGrades(
    assignmentId: string,
    grades: {
      submission_id: string
      marks_obtained?: number
      grade_letter?: string
      grade_percentage?: number
      teacher_feedback?: string
      teacher_comments?: string
    }[]
  ): Promise<ApiResponse<boolean>> {
    try {
      const updates = grades.map(grade => ({
        id: grade.submission_id,
        marks_obtained: grade.marks_obtained,
        grade_letter: grade.grade_letter,
        grade_percentage: grade.grade_percentage,
        teacher_feedback: grade.teacher_feedback,
        teacher_comments: grade.teacher_comments,
        is_graded: true,
        graded_at: new Date().toISOString(),
        graded_by: this.currentUser?.id,
        status: 'graded',
        updated_at: new Date().toISOString()
      }))

      const { error } = await supabase
        .from('assignment_submissions')
        .upsert(updates)

      if (error) throw error

      // Invalidate related caches
      await fallbackCacheManager.remove(`assignment_submissions_${assignmentId}`)
      await this.invalidateAssignmentCaches()

      return { data: true, error: null, fromCache: false }
    } catch (error) {
      return {
        data: false,
        error: error instanceof Error ? error.message : 'Failed to submit grades',
        fromCache: false
      }
    }
  }

  /**
   * Submit grades for exam
   */
  async submitExamGrades(
    examId: string,
    grades: {
      student_id: string
      marks_obtained?: number
      is_absent?: boolean
      is_exempted?: boolean
      remarks?: string
    }[]
  ): Promise<ApiResponse<boolean>> {
    try {
      // Get exam details for calculations
      const { data: exam, error: examError } = await supabase
        .from('exams')
        .select('max_marks, pass_marks')
        .eq('id', examId)
        .single()

      if (examError) throw examError

      const gradeEntries = grades.map(grade => {
        let percentage = null
        let grade_letter = null
        let grade_points = null
        let is_pass = null

        if (grade.marks_obtained !== undefined && !grade.is_absent && !grade.is_exempted) {
          percentage = (grade.marks_obtained / exam.max_marks) * 100
          is_pass = grade.marks_obtained >= exam.pass_marks
          // TODO: Calculate grade letter and points based on grade scale
        }

        return {
          exam_id: examId,
          student_id: grade.student_id,
          marks_obtained: grade.marks_obtained,
          is_absent: grade.is_absent || false,
          is_exempted: grade.is_exempted || false,
          percentage,
          grade_letter,
          grade_points,
          is_pass,
          remarks: grade.remarks,
          entered_by: this.currentUser?.id,
          entered_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }
      })

      const { error } = await supabase
        .from('exam_grades')
        .upsert(gradeEntries, { onConflict: 'exam_id,student_id' })

      if (error) throw error

      // Invalidate related caches
      await fallbackCacheManager.remove(`exam_grades_${examId}`)

      return { data: true, error: null, fromCache: false }
    } catch (error) {
      return {
        data: false,
        error: error instanceof Error ? error.message : 'Failed to submit exam grades',
        fromCache: false
      }
    }
  }

  /**
   * Calculate grade letter and points based on percentage and grade scale
   */
  async calculateGradeFromPercentage(
    percentage: number,
    gradeScaleId?: string
  ): Promise<{ grade_letter: string; grade_points: number } | null> {
    try {
      // Get default grade scale if not specified
      let scaleId = gradeScaleId
      if (!scaleId) {
        const scalesResponse = await this.getGradeScales()
        const defaultScale = scalesResponse.data?.find(scale => scale.is_default)
        if (!defaultScale) return null
        scaleId = defaultScale.id
      }

      const rangesResponse = await this.getGradeScaleRanges(scaleId)
      if (rangesResponse.error || !rangesResponse.data) return null

      const range = rangesResponse.data.find(
        r => percentage >= r.min_percentage && percentage <= r.max_percentage
      )

      return range ? {
        grade_letter: range.grade_letter,
        grade_points: range.grade_points
      } : null
    } catch (error) {
      console.error('Error calculating grade:', error)
      return null
    }
  }

  /**
   * Get grade book for a specific class and subject
   */
  async getGradeBook(
    classId: string,
    subjectId: string,
    forceRefresh = false
  ): Promise<ApiResponse<GradeBookEntry[]>> {
    const cacheKey = `grade_book_${classId}_${subjectId}`

    return this.cachedApiCall(
      cacheKey,
      async () => {
        // Get students in the class
        const { data: students, error: studentsError } = await supabase
          .from('students')
          .select('id, name, roll_number, admission_number')
          .eq('class_id', classId)
          .eq('is_active', true)
          .order('roll_number')

        if (studentsError) throw studentsError

        // Get assignments for this class and subject
        const assignmentsResponse = await this.getTeacherAssignments({
          classId,
          subjectId,
          status: 'published'
        })

        // Get exams for this class and subject
        const examsResponse = await this.getTeacherExams({
          classId,
          subjectId,
          status: 'completed'
        })

        const assignments = assignmentsResponse.data || []
        const exams = examsResponse.data || []

        // Build grade book entries
        const gradeBookEntries: GradeBookEntry[] = []

        for (const student of students) {
          const entry: GradeBookEntry = {
            student_id: student.id,
            student_name: student.name,
            roll_number: student.roll_number,
            admission_number: student.admission_number,
            assignments: {},
            exams: {}
          }

          // Get assignment submissions for this student
          for (const assignment of assignments) {
            const { data: submission } = await supabase
              .from('assignment_submissions')
              .select('*')
              .eq('assignment_id', assignment.id)
              .eq('student_id', student.id)
              .single()

            entry.assignments[assignment.id] = {
              marks_obtained: submission?.marks_obtained,
              percentage: submission?.grade_percentage,
              grade_letter: submission?.grade_letter,
              is_graded: submission?.is_graded || false,
              is_submitted: !!submission,
              is_late: submission?.is_late || false
            }
          }

          // Get exam grades for this student
          for (const exam of exams) {
            const { data: grade } = await supabase
              .from('exam_grades')
              .select('*')
              .eq('exam_id', exam.id)
              .eq('student_id', student.id)
              .single()

            entry.exams[exam.id] = {
              marks_obtained: grade?.marks_obtained,
              percentage: grade?.percentage,
              grade_letter: grade?.grade_letter,
              is_absent: grade?.is_absent || false,
              is_exempted: grade?.is_exempted || false,
              is_graded: !!grade
            }
          }

          gradeBookEntries.push(entry)
        }

        return gradeBookEntries
      },
      CACHE_CONFIGS.ASSIGNMENT_LIST,
      forceRefresh
    )
  }

  /**
   * Get student progress for teacher's subjects
   */
  async getStudentProgress(
    filters: {
      classId?: string
      subjectId?: string
      studentId?: string
    } = {},
    forceRefresh = false
  ): Promise<ApiResponse<StudentProgress[]>> {
    const cacheKey = `student_progress_${this.currentUser?.id}_${JSON.stringify(filters)}`

    return this.cachedApiCall(
      cacheKey,
      async () => {
        // This would involve complex calculations
        // For now, return empty array - implement based on specific requirements
        return []
      },
      CACHE_CONFIGS.ASSIGNMENT_LIST,
      forceRefresh
    )
  }

  /**
   * Generate grade report for a student
   */
  async generateGradeReport(
    studentId: string,
    classId: string,
    subjectId: string,
    reportPeriod: { start_date: string; end_date: string }
  ): Promise<ApiResponse<GradeReport>> {
    try {
      // Get student details
      const { data: student, error: studentError } = await supabase
        .from('students')
        .select(`
          id, name, roll_number, admission_number,
          classes(name, section)
        `)
        .eq('id', studentId)
        .single()

      if (studentError) throw studentError

      // Get subject details
      const { data: subject, error: subjectError } = await supabase
        .from('subjects')
        .select('name, code')
        .eq('id', subjectId)
        .single()

      if (subjectError) throw subjectError

      // Get teacher details
      const { data: teacher, error: teacherError } = await supabase
        .from('profiles')
        .select('name')
        .eq('id', this.currentUser?.id)
        .single()

      if (teacherError) throw teacherError

      // Get assignments and submissions in the period
      const { data: assignmentSubmissions, error: assignmentsError } = await supabase
        .from('assignment_submissions')
        .select(`
          *,
          assignments(*)
        `)
        .eq('student_id', studentId)
        .gte('assignments.assigned_date', reportPeriod.start_date)
        .lte('assignments.assigned_date', reportPeriod.end_date)

      if (assignmentsError) throw assignmentsError

      // Get exam grades in the period
      const { data: examGrades, error: examsError } = await supabase
        .from('exam_grades')
        .select(`
          *,
          exams(*)
        `)
        .eq('student_id', studentId)
        .gte('exams.exam_date', reportPeriod.start_date)
        .lte('exams.exam_date', reportPeriod.end_date)

      if (examsError) throw examGrades

      // Calculate summary statistics
      const totalAssessments = (assignmentSubmissions?.length || 0) + (examGrades?.length || 0)
      const gradedAssessments = (assignmentSubmissions?.filter(s => s.is_graded).length || 0) +
                               (examGrades?.filter(g => g.marks_obtained !== null).length || 0)

      const report: GradeReport = {
        student_id: studentId,
        student_name: student.name,
        roll_number: student.roll_number,
        class_name: `${student.classes.name} - ${student.classes.section}`,
        subject_name: subject.name,
        teacher_name: teacher.name,
        report_period: reportPeriod,
        assessments: {
          assignments: assignmentSubmissions || [],
          exams: examGrades || []
        },
        summary: {
          total_assessments: totalAssessments,
          graded_assessments: gradedAssessments,
          average_percentage: 0, // Calculate based on graded assessments
          overall_grade: 'N/A',
          overall_points: 0
        },
        grade_distribution: {},
        generated_at: new Date().toISOString(),
        generated_by: this.currentUser?.id || ''
      }

      return { data: report, error: null, fromCache: false }
    } catch (error) {
      return {
        data: null,
        error: error instanceof Error ? error.message : 'Failed to generate grade report',
        fromCache: false
      }
    }
  }

  // ==================== LESSON PLANNING METHODS ====================

  /**
   * Get lesson plans for the teacher with optional filters
   */
  async getLessonPlans(filters: LessonPlanFilters = {}, forceRefresh = false): Promise<ApiResponse<LessonPlan[]>> {
    if (!this.currentUser) {
      await this.initializeUser()
    }

    const cacheKey = `lesson_plans_${this.currentUser?.id}_${JSON.stringify(filters)}`

    return this.cachedApiCall(
      cacheKey,
      async () => {
        let query = supabase
          .from('lesson_plans')
          .select(`
            *,
            classes(name, section),
            subjects(name, code)
          `)
          .eq('teacher_id', this.currentUser?.id)
          .order('lesson_date', { ascending: false })

        // Apply filters
        if (filters.classId) {
          query = query.eq('class_id', filters.classId)
        }
        if (filters.subjectId) {
          query = query.eq('subject_id', filters.subjectId)
        }
        if (filters.status) {
          query = query.eq('status', filters.status)
        }
        if (filters.dateFrom) {
          query = query.gte('lesson_date', filters.dateFrom)
        }
        if (filters.dateTo) {
          query = query.lte('lesson_date', filters.dateTo)
        }

        const { data: lessons, error } = await query

        if (error) throw error

        return lessons || []
      },
      forceRefresh
    )
  }

  /**
   * Get a single lesson plan by ID
   */
  async getLessonPlan(lessonId: string, forceRefresh = false): Promise<ApiResponse<LessonPlan>> {
    const cacheKey = `lesson_plan_${lessonId}`

    return this.cachedApiCall(
      cacheKey,
      async () => {
        const { data: lesson, error } = await supabase
          .from('lesson_plans')
          .select(`
            *,
            classes(name, section),
            subjects(name, code)
          `)
          .eq('id', lessonId)
          .eq('teacher_id', this.currentUser?.id)
          .single()

        if (error) throw error

        return lesson
      },
      forceRefresh
    )
  }

  /**
   * Create a new lesson plan
   */
  async createLessonPlan(lessonData: Partial<LessonPlan>): Promise<ApiResponse<LessonPlan>> {
    try {
      const { data: lesson, error } = await supabase
        .from('lesson_plans')
        .insert({
          ...lessonData,
          teacher_id: this.currentUser?.id,
          school_id: this.currentUser?.school_id,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .select()
        .single()

      if (error) throw error

      // Invalidate lesson plan caches
      await this.invalidateLessonPlanCaches()

      return { data: lesson, error: null, fromCache: false }
    } catch (error) {
      return {
        data: null,
        error: error instanceof Error ? error.message : 'Failed to create lesson plan',
        fromCache: false
      }
    }
  }

  /**
   * Update an existing lesson plan
   */
  async updateLessonPlan(lessonId: string, updates: Partial<LessonPlan>): Promise<ApiResponse<LessonPlan>> {
    try {
      const { data: lesson, error } = await supabase
        .from('lesson_plans')
        .update({
          ...updates,
          updated_at: new Date().toISOString()
        })
        .eq('id', lessonId)
        .eq('teacher_id', this.currentUser?.id)
        .select()
        .single()

      if (error) throw error

      // Invalidate lesson plan caches
      await this.invalidateLessonPlanCaches()

      return { data: lesson, error: null, fromCache: false }
    } catch (error) {
      return {
        data: null,
        error: error instanceof Error ? error.message : 'Failed to update lesson plan',
        fromCache: false
      }
    }
  }

  /**
   * Delete a lesson plan
   */
  async deleteLessonPlan(lessonId: string): Promise<ApiResponse<boolean>> {
    try {
      const { error } = await supabase
        .from('lesson_plans')
        .delete()
        .eq('id', lessonId)
        .eq('teacher_id', this.currentUser?.id)

      if (error) throw error

      // Invalidate lesson plan caches
      await this.invalidateLessonPlanCaches()

      return { data: true, error: null, fromCache: false }
    } catch (error) {
      return {
        data: false,
        error: error instanceof Error ? error.message : 'Failed to delete lesson plan',
        fromCache: false
      }
    }
  }

  /**
   * Get curriculum topics for a subject
   */
  async getCurriculumTopics(subjectId: string, gradeLevel?: number, forceRefresh = false): Promise<ApiResponse<CurriculumTopic[]>> {
    const cacheKey = `curriculum_topics_${subjectId}_${gradeLevel || 'all'}`

    return this.cachedApiCall(
      cacheKey,
      async () => {
        let query = supabase
          .from('curriculum_topics')
          .select('*')
          .eq('subject_id', subjectId)
          .eq('is_active', true)
          .order('unit_number', { ascending: true })

        if (gradeLevel) {
          query = query.eq('grade_level', gradeLevel)
        }

        const { data: topics, error } = await query

        if (error) throw error

        return topics || []
      },
      forceRefresh
    )
  }

  /**
   * Get lesson planning statistics
   */
  async getLessonPlanStats(filters: LessonPlanFilters = {}, forceRefresh = false): Promise<ApiResponse<LessonPlanStats>> {
    const cacheKey = `lesson_plan_stats_${this.currentUser?.id}_${JSON.stringify(filters)}`

    return this.cachedApiCall(
      cacheKey,
      async () => {
        // Get all lessons for the teacher
        const lessonsResponse = await this.getLessonPlans(filters, true)
        const lessons = lessonsResponse.data || []

        const totalLessons = lessons.length
        const completedLessons = lessons.filter(l => l.status === 'completed').length
        const upcomingLessons = lessons.filter(l => {
          const lessonDate = new Date(l.lesson_date)
          const today = new Date()
          return lessonDate >= today && l.status === 'planned'
        }).length

        // Calculate curriculum progress (simplified)
        const curriculumProgress = totalLessons > 0 ? (completedLessons / totalLessons) * 100 : 0

        const stats: LessonPlanStats = {
          totalLessons,
          completedLessons,
          upcomingLessons,
          curriculumProgress: Math.round(curriculumProgress)
        }

        return stats
      },
      forceRefresh
    )
  }

  /**
   * Invalidate lesson plan related caches
   */
  private async invalidateLessonPlanCaches(): Promise<void> {
    if (!this.currentUser) return

    try {
      const patterns = [
        `lesson_plans_${this.currentUser.id}`,
        `lesson_plan_stats_${this.currentUser.id}`,
        'lesson_plan_'
      ]

      for (const pattern of patterns) {
        await fallbackCacheManager.removeByPattern(pattern)
      }

      console.log('🧹 Lesson plan caches invalidated')
    } catch (error) {
      console.error('Failed to invalidate lesson plan caches:', error)
    }
  }
}

// Export singleton instance
export const teacherApiService = new TeacherApiService()
