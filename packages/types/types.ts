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

export interface Class {
  id: string;
  name: string;
  description?: string;
  subject: string;
  grade_level: string;
  teacher_id?: string;
  max_students: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface ClassEnrollment {
  id: string;
  class_id: string;
  student_id: string;
  enrolled_at: string;
  status: 'active' | 'inactive' | 'completed';
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
  register: (email: string, password: string, name: string, role: UserRole) => Promise<AuthResult>;
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
  class: string
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
