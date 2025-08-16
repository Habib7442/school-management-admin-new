export type UserRole = 'admin' | 'sub-admin' | 'teacher' | 'student';
export type MobileUserRole = 'teacher' | 'student';

export interface User {
  id: string;
  email: string;
  role: UserRole;
  name: string;
  avatar_url?: string;
  phone?: string;
  created_at: string;
  updated_at: string;
}

export interface AuthUser {
  id: string;
  email: string;
  role: UserRole;
  name: string;
  avatar_url?: string;
  phone?: string;
  created_at: string;
  updated_at: string;
  onboarding_completed?: boolean;
  school_id?: string;
}

export interface RoleConfig {
  role: MobileUserRole;
  label: string;
  color: string;
  gradient: string[];
  icon: string;
  description: string;
}

export interface UserRoleDefinition {
  id: number;
  role_name: UserRole;
  display_name: string;
  description: string;
  permissions: Record<string, string[]>;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

// Class Management Types
export type ClassStatus = 'active' | 'inactive' | 'completed' | 'suspended';
export type EnrollmentStatus = 'active' | 'inactive' | 'completed' | 'dropped' | 'transferred';
export type DayOfWeek = 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday' | 'sunday';

export interface Subject {
  id: string;
  school_id: string;
  name: string;
  code: string;
  description?: string;
  grade_level?: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Class {
  id: string;
  school_id: string;
  name: string;
  grade_level: number;
  section: string;
  class_teacher_id?: string;
  room_number?: string;
  capacity: number;
  academic_year: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  // Computed fields
  teacher?: {
    id: string;
    name: string;
    email: string;
  };
  enrollment_count?: number;
  subjects?: Subject[];
  schedules?: ClassSchedule[];
}

export interface ClassSubject {
  id: string;
  class_id: string;
  subject_id: string;
  teacher_id?: string;
  created_at: string;
  updated_at: string;
  // Computed fields
  subject?: Subject;
  teacher?: {
    id: string;
    name: string;
    email: string;
  };
}

export interface ClassEnrollment {
  id: string;
  class_id: string;
  student_id: string;
  enrolled_at: string;
  status: EnrollmentStatus;
  roll_number?: number;
  created_at: string;
  updated_at: string;
  // Computed fields
  student?: {
    id: string;
    name: string;
    email: string;
    student_id?: string;
  };
  class?: Class;
}

export interface ClassSchedule {
  id: string;
  class_id: string;
  subject_id: string;
  teacher_id?: string;
  day_of_week: DayOfWeek;
  start_time: string; // HH:MM format
  end_time: string; // HH:MM format
  room_number?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  // Computed fields
  subject?: Subject;
  teacher?: {
    id: string;
    name: string;
    email: string;
  };
}

// Form Data Types
export interface CreateClassData {
  name: string;
  grade_level: number;
  section: string;
  class_teacher_id?: string;
  room_number?: string;
  capacity: number;
  academic_year: string;
  subject_ids?: string[];
}

export interface UpdateClassData {
  name?: string;
  grade_level?: number;
  section?: string;
  class_teacher_id?: string;
  room_number?: string;
  capacity?: number;
  academic_year?: string;
  is_active?: boolean;
}

export interface ClassFilters {
  search?: string;
  grade_level?: number;
  section?: string;
  teacher_id?: string;
  subject_id?: string;
  academic_year?: string;
  is_active?: boolean;
  has_teacher?: boolean;
  enrollment_status?: 'full' | 'available' | 'empty';
}

export interface ClassStats {
  total_classes: number;
  active_classes: number;
  total_students: number;
  average_class_size: number;
  classes_by_grade: Record<number, number>;
  teacher_workload: Array<{
    teacher_id: string;
    teacher_name: string;
    class_count: number;
    student_count: number;
  }>;
  capacity_utilization: {
    total_capacity: number;
    total_enrolled: number;
    utilization_percentage: number;
  };
}

// Auth Store Types
export interface AuthState {
  user: AuthUser | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  permissions: Record<string, string[]>;
}

export interface AuthResult {
  error?: string;
  requiresEmailConfirmation?: boolean;
}

export interface AuthActions {
  setUser: (user: AuthUser | null) => void;
  setLoading: (loading: boolean) => void;
  login: (email: string, password: string) => Promise<{ error?: string }>;
  register: (email: string, password: string, name: string, role: UserRole, schoolCode?: string) => Promise<AuthResult>;
  logout: () => Promise<void>;
  updateProfile: (updates: Partial<AuthUser>) => Promise<{ error?: string }>;
  checkPermission: (resource: string, action: string) => boolean;
  refreshSession?: () => Promise<boolean>;
}

export type AuthStore = AuthState & AuthActions;

// Admission Management Types
export type AdmissionStatus = 'pending' | 'interview_scheduled' | 'accepted' | 'rejected'
export type AdmissionType = 'manual' | 'admission_form'
export type Gender = 'male' | 'female' | 'other'

export interface AdmissionApplication {
  id: string
  full_name: string
  email: string
  phone?: string
  date_of_birth?: string
  gender?: Gender
  class_level: string
  address?: string
  parent_name?: string
  parent_phone?: string
  parent_email?: string
  photograph_url?: string
  documents: AdmissionDocument[]
  status: AdmissionStatus
  applied_date: string
  interview_date?: string
  interview_notes?: string
  decision_date?: string
  decided_by?: string
  school_id: string
  created_at: string
  updated_at: string
}

export interface AdmissionDocument {
  id: string
  name: string
  url: string
  type: string
  size: number
  uploaded_at: string
}

export interface AdmissionFormData {
  full_name: string
  email: string
  phone: string
  date_of_birth: string
  gender: Gender
  address: string
  parent_name: string
  parent_phone: string
  parent_email: string
  photograph?: File
  documents?: File[]
}

export interface AdmissionStats {
  total_applications: number
  pending_applications: number
  interview_scheduled: number
  accepted_applications: number
  rejected_applications: number
  applications_this_month: number
}

export interface InterviewScheduleData {
  interview_date: string
  interview_notes: string
}

export interface AdmissionDecisionData {
  status: 'accepted' | 'rejected'
  decision_notes?: string
}
