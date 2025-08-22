/**
 * Jest setup file for React Native mobile app tests
 * Global test configuration and mocks
 */

import 'react-native-gesture-handler/jestSetup'

// Mock React Native modules
jest.mock('react-native/Libraries/Animated/NativeAnimatedHelper')

// Mock AsyncStorage
jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
)

// Mock NetInfo
jest.mock('@react-native-community/netinfo', () => ({
  addEventListener: jest.fn(() => jest.fn()),
  fetch: jest.fn(() => Promise.resolve({ isConnected: true })),
}))

// Mock Expo Router
jest.mock('expo-router', () => ({
  router: {
    push: jest.fn(),
    replace: jest.fn(),
    back: jest.fn(),
    canGoBack: jest.fn(() => true),
  },
  useRouter: () => ({
    push: jest.fn(),
    replace: jest.fn(),
    back: jest.fn(),
    canGoBack: jest.fn(() => true),
  }),
  useLocalSearchParams: () => ({}),
  useGlobalSearchParams: () => ({}),
  Redirect: ({ href }: { href: string }) => null,
}))

// Mock Expo Vector Icons
jest.mock('@expo/vector-icons', () => ({
  Ionicons: 'Ionicons',
  MaterialIcons: 'MaterialIcons',
  FontAwesome: 'FontAwesome',
}))

// Mock React Native Safe Area Context
jest.mock('react-native-safe-area-context', () => ({
  SafeAreaView: ({ children }: { children: React.ReactNode }) => children,
  SafeAreaProvider: ({ children }: { children: React.ReactNode }) => children,
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}))

// Mock React Native Reanimated
jest.mock('react-native-reanimated', () => {
  const Reanimated = require('react-native-reanimated/mock')
  Reanimated.default.call = () => {}
  return Reanimated
})

// Mock Supabase
jest.mock('../lib/supabase', () => ({
  supabase: {
    auth: {
      getUser: jest.fn(),
      getSession: jest.fn(),
      signInWithPassword: jest.fn(),
      signOut: jest.fn(),
      refreshSession: jest.fn(),
      onAuthStateChange: jest.fn(() => ({
        data: { subscription: { unsubscribe: jest.fn() } },
      })),
    },
    from: jest.fn(() => ({
      select: jest.fn().mockReturnThis(),
      insert: jest.fn().mockReturnThis(),
      update: jest.fn().mockReturnThis(),
      delete: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      gte: jest.fn().mockReturnThis(),
      lte: jest.fn().mockReturnThis(),
      order: jest.fn().mockReturnThis(),
      single: jest.fn(),
      then: jest.fn(),
    })),
  },
}))

// Mock Alert
jest.mock('react-native', () => {
  const RN = jest.requireActual('react-native')
  return {
    ...RN,
    Alert: {
      alert: jest.fn(),
    },
  }
})

// Global test utilities
global.console = {
  ...console,
  // Suppress console.log in tests unless explicitly needed
  log: jest.fn(),
  debug: jest.fn(),
  info: jest.fn(),
  warn: console.warn,
  error: console.error,
}

// Mock timers
jest.useFakeTimers()

// Global test data
export const mockTeacherUser = {
  id: 'teacher-123',
  email: 'teacher@school.com',
  name: 'John Doe',
  role: 'teacher',
  school_id: 'school-123',
  phone: '+1234567890',
  avatar_url: null,
  onboarding_completed: true,
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z',
}

export const mockStudentUser = {
  id: 'student-123',
  email: 'student@school.com',
  name: 'Jane Smith',
  role: 'student',
  school_id: 'school-123',
  phone: '+1234567891',
  avatar_url: null,
  onboarding_completed: true,
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z',
}

export const mockClass = {
  id: 'class-123',
  name: 'Mathematics 10A',
  grade_level: 10,
  section: 'A',
  room_number: 'Room 201',
  capacity: 30,
  academic_year: '2024-25',
  student_count: 28,
  class_teacher_id: 'teacher-123',
  school_id: 'school-123',
  is_active: true,
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z',
}

export const mockAssignment = {
  id: 'assignment-123',
  title: 'Algebra Homework',
  description: 'Complete exercises 1-10',
  instructions: 'Show all work and explain your reasoning',
  assignment_type: 'homework',
  difficulty_level: 'medium',
  estimated_duration_minutes: 60,
  assigned_date: '2024-01-01',
  due_date: '2024-01-15',
  due_time: '23:59:00',
  late_submission_allowed: true,
  late_penalty_percentage: 10,
  max_marks: 100,
  pass_marks: 40,
  grading_rubric: 'Standard grading rubric',
  auto_grade: false,
  attachment_urls: [],
  resource_links: [],
  status: 'published',
  is_visible_to_students: true,
  submission_type: 'file',
  max_file_size_mb: 10,
  allowed_file_types: ['pdf', 'doc', 'docx'],
  teacher_id: 'teacher-123',
  class_id: 'class-123',
  subject_id: 'subject-123',
  school_id: 'school-123',
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z',
}

export const mockSubmission = {
  id: 'submission-123',
  assignment_id: 'assignment-123',
  student_id: 'student-123',
  submission_text: 'My homework submission',
  submission_files: ['homework.pdf'],
  submission_links: [],
  submitted_at: '2024-01-10T10:00:00Z',
  is_late: false,
  late_days: 0,
  marks_obtained: 85,
  grade_letter: 'B',
  grade_percentage: 85,
  is_graded: true,
  graded_at: '2024-01-12T14:00:00Z',
  graded_by: 'teacher-123',
  teacher_feedback: 'Good work! Keep it up.',
  teacher_comments: 'Well organized and clear explanations.',
  feedback_files: [],
  status: 'graded',
  created_at: '2024-01-10T10:00:00Z',
  updated_at: '2024-01-12T14:00:00Z',
}

export const mockLessonPlan = {
  id: 'lesson-123',
  title: 'Introduction to Algebra',
  description: 'Basic algebraic concepts and operations',
  lesson_date: '2024-01-15',
  duration_minutes: 45,
  curriculum_topic: 'Algebra Basics',
  learning_objectives: ['Understand variables', 'Solve simple equations'],
  prerequisites: ['Basic arithmetic'],
  lesson_outline: 'Introduction, examples, practice, summary',
  activities: [
    { name: 'Introduction', duration: 10 },
    { name: 'Examples', duration: 15 },
    { name: 'Practice', duration: 15 },
    { name: 'Summary', duration: 5 },
  ],
  materials_needed: ['Whiteboard', 'Textbook', 'Worksheets'],
  homework_assigned: 'Complete exercises 1-5',
  assessment_methods: ['Observation', 'Exit ticket'],
  success_criteria: 'Students can solve basic equations',
  differentiation_strategies: 'Visual aids for visual learners',
  resource_links: [],
  attachment_urls: [],
  status: 'planned',
  completion_notes: null,
  actual_duration_minutes: null,
  is_template: false,
  is_shared: false,
  shared_with: [],
  teacher_id: 'teacher-123',
  class_id: 'class-123',
  subject_id: 'subject-123',
  school_id: 'school-123',
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z',
}

// Test helpers
export const createMockApiResponse = <T>(data: T, error: string | null = null) => ({
  data: error ? null : data,
  error,
  fromCache: false,
})

export const createMockCachedResponse = <T>(data: T) => ({
  data,
  error: null,
  fromCache: true,
})

// Cleanup after each test
afterEach(() => {
  jest.clearAllMocks()
  jest.clearAllTimers()
})
