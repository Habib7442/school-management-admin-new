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
  class_level: string
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

// Extended student type to include admission fields
export interface StudentWithAdmission {
  id: string
  email: string
  name: string
  phone?: string
  school_id: string
  is_active: boolean
  student_avatar_url?: string
  admission_id?: string
  admission_type: AdmissionType
  created_at: string
  updated_at: string
  admission?: AdmissionApplication
}
