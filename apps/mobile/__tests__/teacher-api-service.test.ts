/**
 * Test suite for Teacher API Service
 * Comprehensive tests for all teacher-related operations
 */

import { teacherApiService } from '../lib/api/teacher-api-service'
import { supabase } from '../lib/supabase'
import { fallbackCacheManager } from '../lib/cache/fallback-cache-manager'

// Mock dependencies
jest.mock('../lib/supabase', () => ({
  supabase: {
    from: jest.fn(),
    auth: {
      getUser: jest.fn(),
    },
  },
}))

jest.mock('../lib/cache/fallback-cache-manager', () => ({
  fallbackCacheManager: {
    get: jest.fn(),
    set: jest.fn(),
    remove: jest.fn(),
    clearUserCache: jest.fn(),
    getStats: jest.fn(),
  },
}))

// Mock data
const mockTeacher = {
  id: 'teacher-123',
  name: 'John Doe',
  email: 'john.doe@school.com',
  role: 'teacher',
  school_id: 'school-123',
}

const mockClasses = [
  {
    id: 'class-1',
    name: 'Mathematics 10A',
    grade_level: 10,
    section: 'A',
    room_number: 'Room 201',
    capacity: 30,
    academic_year: '2024-25',
    student_count: 28,
  },
  {
    id: 'class-2',
    name: 'Mathematics 10B',
    grade_level: 10,
    section: 'B',
    room_number: 'Room 202',
    capacity: 30,
    academic_year: '2024-25',
    student_count: 25,
  },
]

const mockAssignments = [
  {
    id: 'assignment-1',
    title: 'Algebra Homework',
    description: 'Complete exercises 1-10',
    assignment_type: 'homework',
    difficulty_level: 'medium',
    due_date: '2024-01-15',
    max_marks: 100,
    status: 'published',
    is_visible_to_students: true,
    class_id: 'class-1',
    subject_id: 'subject-1',
    teacher_id: 'teacher-123',
    school_id: 'school-123',
  },
]

const mockStudents = [
  {
    id: 'student-1',
    roll_number: 1,
    admission_number: 'ADM001',
    class_id: 'class-1',
    section: 'A',
    parent_name: 'Jane Smith',
    parent_phone: '+1234567890',
    parent_email: 'jane.smith@email.com',
    is_active: true,
    profiles: {
      id: 'student-1',
      name: 'Alice Smith',
      email: 'alice.smith@email.com',
    },
  },
]

describe('TeacherApiService', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    
    // Mock auth user
    ;(supabase.auth.getUser as jest.Mock).mockResolvedValue({
      data: { user: { id: 'teacher-123' } },
    })
    
    // Mock profile fetch
    ;(supabase.from as jest.Mock).mockReturnValue({
      select: jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          single: jest.fn().mockResolvedValue({
            data: mockTeacher,
            error: null,
          }),
        }),
      }),
    })
  })

  describe('getTeacherClasses', () => {
    it('should fetch teacher classes successfully', async () => {
      // Mock cache miss
      ;(fallbackCacheManager.get as jest.Mock).mockResolvedValue(null)
      
      // Mock database response
      ;(supabase.from as jest.Mock).mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            order: jest.fn().mockResolvedValue({
              data: mockClasses,
              error: null,
            }),
          }),
        }),
      })

      const result = await teacherApiService.getTeacherClasses()

      expect(result.data).toEqual(mockClasses)
      expect(result.error).toBeNull()
      expect(result.fromCache).toBe(false)
      expect(fallbackCacheManager.set).toHaveBeenCalled()
    })

    it('should return cached data when available', async () => {
      // Mock cache hit
      ;(fallbackCacheManager.get as jest.Mock).mockResolvedValue(mockClasses)

      const result = await teacherApiService.getTeacherClasses()

      expect(result.data).toEqual(mockClasses)
      expect(result.error).toBeNull()
      expect(result.fromCache).toBe(true)
      expect(supabase.from).not.toHaveBeenCalled()
    })

    it('should handle database errors gracefully', async () => {
      // Mock cache miss
      ;(fallbackCacheManager.get as jest.Mock).mockResolvedValue(null)
      
      // Mock database error
      ;(supabase.from as jest.Mock).mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            order: jest.fn().mockResolvedValue({
              data: null,
              error: { message: 'Database connection failed' },
            }),
          }),
        }),
      })

      const result = await teacherApiService.getTeacherClasses()

      expect(result.data).toBeNull()
      expect(result.error).toBe('Database connection failed')
      expect(result.fromCache).toBe(false)
    })
  })

  describe('getClassStudents', () => {
    it('should fetch students for a class successfully', async () => {
      // Mock cache miss
      ;(fallbackCacheManager.get as jest.Mock).mockResolvedValue(null)
      
      // Mock database response
      ;(supabase.from as jest.Mock).mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            order: jest.fn().mockResolvedValue({
              data: mockStudents,
              error: null,
            }),
          }),
        }),
      })

      const result = await teacherApiService.getClassStudents('class-1')

      expect(result.data).toHaveLength(1)
      expect(result.data?.[0].name).toBe('Alice Smith')
      expect(result.error).toBeNull()
      expect(result.fromCache).toBe(false)
    })
  })

  describe('createAssignment', () => {
    it('should create assignment successfully', async () => {
      const newAssignment = {
        title: 'New Assignment',
        description: 'Test assignment',
        class_id: 'class-1',
        subject_id: 'subject-1',
        due_date: '2024-01-20',
        max_marks: 100,
        assignment_type: 'homework' as const,
      }

      // Mock database response
      ;(supabase.from as jest.Mock).mockReturnValue({
        insert: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: { ...newAssignment, id: 'assignment-new' },
              error: null,
            }),
          }),
        }),
      })

      const result = await teacherApiService.createAssignment(newAssignment)

      expect(result.data?.title).toBe('New Assignment')
      expect(result.error).toBeNull()
      expect(fallbackCacheManager.remove).toHaveBeenCalled()
    })

    it('should handle validation errors', async () => {
      const invalidAssignment = {
        title: '', // Invalid: empty title
        class_id: 'class-1',
        due_date: '2024-01-20',
      }

      // Mock database error
      ;(supabase.from as jest.Mock).mockReturnValue({
        insert: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: null,
              error: { message: 'Title is required' },
            }),
          }),
        }),
      })

      const result = await teacherApiService.createAssignment(invalidAssignment as any)

      expect(result.data).toBeNull()
      expect(result.error).toBe('Title is required')
    })
  })

  describe('gradeSubmission', () => {
    it('should grade submission successfully', async () => {
      const gradeData = {
        marks_obtained: 85,
        grade_letter: 'B',
        grade_percentage: 85,
        teacher_feedback: 'Good work!',
        teacher_comments: 'Keep it up',
      }

      // Mock database response
      ;(supabase.from as jest.Mock).mockReturnValue({
        update: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            select: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({
                data: { id: 'submission-1', ...gradeData, is_graded: true },
                error: null,
              }),
            }),
          }),
        }),
      })

      const result = await teacherApiService.gradeSubmission('submission-1', gradeData)

      expect(result.data?.marks_obtained).toBe(85)
      expect(result.data?.is_graded).toBe(true)
      expect(result.error).toBeNull()
    })
  })

  describe('markAttendance', () => {
    it('should mark attendance successfully', async () => {
      const attendanceData = [
        { student_id: 'student-1', status: 'present' as const },
        { student_id: 'student-2', status: 'absent' as const },
      ]

      // Mock delete operation
      ;(supabase.from as jest.Mock).mockReturnValueOnce({
        delete: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            eq: jest.fn().mockResolvedValue({ error: null }),
          }),
        }),
      })

      // Mock insert operation
      ;(supabase.from as jest.Mock).mockReturnValueOnce({
        insert: jest.fn().mockResolvedValue({ error: null }),
      })

      const result = await teacherApiService.markAttendance(
        'class-1',
        '2024-01-15',
        attendanceData
      )

      expect(result.data).toBe(true)
      expect(result.error).toBeNull()
    })
  })

  describe('Cache Management', () => {
    it('should preload critical data', async () => {
      // Mock successful API calls
      ;(fallbackCacheManager.get as jest.Mock).mockResolvedValue(null)
      ;(supabase.from as jest.Mock).mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            order: jest.fn().mockResolvedValue({
              data: mockClasses,
              error: null,
            }),
          }),
        }),
      })

      await teacherApiService.preloadCriticalData()

      // Verify that multiple API calls were made
      expect(supabase.from).toHaveBeenCalledTimes(3) // classes, assignments, lesson plans
    })

    it('should clear teacher cache', async () => {
      await teacherApiService.clearTeacherCache()

      expect(fallbackCacheManager.clearUserCache).toHaveBeenCalledWith('teacher-123')
    })

    it('should get cache statistics', async () => {
      const mockStats = {
        totalKeys: 10,
        cacheSize: '1.2 MB',
        isOnline: true,
        totalSizeBytes: 1200000,
        expiredKeys: 2,
      }

      ;(fallbackCacheManager.getStats as jest.Mock).mockResolvedValue(mockStats)

      const stats = await teacherApiService.getCacheStats()

      expect(stats).toEqual(mockStats)
    })
  })

  describe('Error Handling', () => {
    it('should handle network errors with retry logic', async () => {
      // Mock cache miss
      ;(fallbackCacheManager.get as jest.Mock).mockResolvedValue(null)
      
      // Mock network error
      ;(supabase.from as jest.Mock).mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            order: jest.fn().mockRejectedValue(new Error('Network error')),
          }),
        }),
      })

      const result = await teacherApiService.getTeacherClasses()

      expect(result.data).toBeNull()
      expect(result.error).toBe('Network error')
      expect(result.fromCache).toBe(false)
    })

    it('should handle authentication errors', async () => {
      // Mock auth error
      ;(supabase.auth.getUser as jest.Mock).mockResolvedValue({
        data: { user: null },
      })

      const result = await teacherApiService.getTeacherClasses()

      expect(result.data).toBeNull()
      expect(result.error).toContain('authentication')
    })
  })
})
