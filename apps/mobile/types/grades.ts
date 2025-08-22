// Grade and Assessment Types for Mobile App

export interface GradeScale {
  id: string
  school_id: string
  name: string
  description?: string
  is_default: boolean
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface GradeScaleRange {
  id: string
  grade_scale_id: string
  min_percentage: number
  max_percentage: number
  grade_letter: string
  grade_points: number
  description?: string
  created_at: string
}

export interface ExamType {
  id: string
  school_id: string
  name: string
  description?: string
  weightage?: number
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface Exam {
  id: string
  school_id: string
  exam_type_id: string
  subject_id: string
  class_id: string
  name: string
  description?: string
  exam_date: string
  start_time?: string
  end_time?: string
  duration_minutes?: number
  max_marks: number
  pass_marks: number
  instructions?: string
  status: 'draft' | 'scheduled' | 'ongoing' | 'completed' | 'cancelled'
  allow_decimal_marks: boolean
  grade_entry_deadline?: string
  grades_published: boolean
  grades_published_at?: string
  created_by?: string
  created_at: string
  updated_at: string
  // Relations
  exam_type?: ExamType
  subject?: { id: string; name: string; code: string }
  class?: { id: string; name: string; section: string }
}

export interface ExamGrade {
  id: string
  exam_id: string
  student_id: string
  marks_obtained?: number
  is_absent: boolean
  is_exempted: boolean
  percentage?: number
  grade_letter?: string
  grade_points?: number
  is_pass?: boolean
  remarks?: string
  entered_by?: string
  entered_at?: string
  verified_by?: string
  verified_at?: string
  created_at: string
  updated_at: string
  // Relations
  student?: {
    id: string
    name: string
    roll_number: string
    admission_number: string
  }
  exam?: Exam
}

export interface AssignmentGrade {
  id: string
  assignment_id: string
  student_id: string
  submission_text?: string
  submission_files: any[]
  submission_links: any[]
  submitted_at?: string
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
  feedback_files: any[]
  status: 'submitted' | 'graded' | 'returned' | 'resubmitted'
  created_at: string
  updated_at: string
  // Relations
  student?: {
    id: string
    name: string
    roll_number: string
    admission_number: string
  }
  assignment?: {
    id: string
    title: string
    max_marks: number
    pass_marks: number
    assignment_type: string
    due_date: string
  }
}

export interface GradeBookEntry {
  student_id: string
  student_name: string
  roll_number: string
  admission_number: string
  assignments: {
    [assignmentId: string]: {
      marks_obtained?: number
      percentage?: number
      grade_letter?: string
      is_graded: boolean
      is_submitted: boolean
      is_late: boolean
    }
  }
  exams: {
    [examId: string]: {
      marks_obtained?: number
      percentage?: number
      grade_letter?: string
      is_absent: boolean
      is_exempted: boolean
      is_graded: boolean
    }
  }
  overall_percentage?: number
  overall_grade?: string
  overall_points?: number
}

export interface AssessmentCategory {
  type: 'assignment' | 'exam'
  name: string
  weightage: number
  items: (AssignmentGrade | ExamGrade)[]
}

export interface GradeCalculationConfig {
  assignment_weightage: number
  exam_weightage: number
  exam_type_weightages: {
    [examTypeId: string]: number
  }
  assignment_type_weightages: {
    homework: number
    quiz: number
    project: number
    test: number
    lab: number
    presentation: number
    essay: number
  }
}

export interface StudentProgress {
  student_id: string
  student_name: string
  roll_number: string
  subject_id: string
  subject_name: string
  class_id: string
  class_name: string
  current_percentage: number
  current_grade: string
  trend: 'improving' | 'declining' | 'stable'
  last_updated: string
  assessment_count: number
  graded_count: number
  pending_count: number
}

export interface GradeReport {
  student_id: string
  student_name: string
  roll_number: string
  class_name: string
  subject_name: string
  teacher_name: string
  report_period: {
    start_date: string
    end_date: string
  }
  assessments: {
    assignments: AssignmentGrade[]
    exams: ExamGrade[]
  }
  summary: {
    total_assessments: number
    graded_assessments: number
    average_percentage: number
    overall_grade: string
    overall_points: number
  }
  grade_distribution: {
    [gradeLevel: string]: number
  }
  generated_at: string
  generated_by: string
}

export interface GradeEntryForm {
  assessment_type: 'assignment' | 'exam'
  assessment_id: string
  student_grades: {
    student_id: string
    marks_obtained?: number
    is_absent?: boolean
    is_exempted?: boolean
    remarks?: string
  }[]
  bulk_feedback?: string
  save_as_draft: boolean
}

export interface GradeValidationResult {
  is_valid: boolean
  errors: {
    student_id: string
    field: string
    message: string
  }[]
  warnings: {
    student_id: string
    field: string
    message: string
  }[]
}
