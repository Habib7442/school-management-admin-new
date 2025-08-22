// Validation utilities for forms

export interface ValidationResult {
  isValid: boolean
  errors: string[]
}

export interface FieldValidationResult {
  isValid: boolean
  error?: string
}

// Email validation
export const validateEmail = (email: string): FieldValidationResult => {
  if (!email.trim()) {
    return { isValid: false, error: 'Email is required' }
  }
  
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  if (!emailRegex.test(email)) {
    return { isValid: false, error: 'Please enter a valid email address' }
  }
  
  return { isValid: true }
}

// Password validation
export const validatePassword = (password: string): ValidationResult => {
  const errors: string[] = []
  
  if (!password) {
    errors.push('Password is required')
    return { isValid: false, errors }
  }
  
  if (password.length < 6) {
    errors.push('Password must be at least 6 characters long')
  }
  
  if (!/[A-Z]/.test(password)) {
    errors.push('Password must contain at least one uppercase letter')
  }
  
  if (!/[a-z]/.test(password)) {
    errors.push('Password must contain at least one lowercase letter')
  }
  
  if (!/\d/.test(password)) {
    errors.push('Password must contain at least one number')
  }
  
  if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
    errors.push('Password must contain at least one special character')
  }
  
  return {
    isValid: errors.length === 0,
    errors
  }
}

// Name validation
export const validateName = (name: string): FieldValidationResult => {
  if (!name.trim()) {
    return { isValid: false, error: 'Name is required' }
  }
  
  if (name.trim().length < 2) {
    return { isValid: false, error: 'Name must be at least 2 characters long' }
  }
  
  if (name.trim().length > 50) {
    return { isValid: false, error: 'Name must be less than 50 characters' }
  }
  
  // Check for valid characters (letters, spaces, hyphens, apostrophes)
  const nameRegex = /^[a-zA-Z\s\-']+$/
  if (!nameRegex.test(name.trim())) {
    return { isValid: false, error: 'Name can only contain letters, spaces, hyphens, and apostrophes' }
  }
  
  return { isValid: true }
}

// School code validation
export const validateSchoolCode = (schoolCode: string): FieldValidationResult => {
  if (!schoolCode.trim()) {
    return { isValid: false, error: 'School code is required' }
  }
  
  if (schoolCode.trim().length < 4) {
    return { isValid: false, error: 'School code must be at least 4 characters long' }
  }
  
  if (schoolCode.trim().length > 10) {
    return { isValid: false, error: 'School code must be less than 10 characters' }
  }
  
  // Check for valid characters (alphanumeric only)
  const codeRegex = /^[A-Z0-9]+$/
  if (!codeRegex.test(schoolCode.trim().toUpperCase())) {
    return { isValid: false, error: 'School code can only contain letters and numbers' }
  }
  
  return { isValid: true }
}

// Phone number validation
export const validatePhone = (phone: string): FieldValidationResult => {
  if (!phone.trim()) {
    return { isValid: false, error: 'Phone number is required' }
  }
  
  // Remove all non-digit characters
  const cleanPhone = phone.replace(/\D/g, '')
  
  if (cleanPhone.length < 10) {
    return { isValid: false, error: 'Phone number must be at least 10 digits' }
  }
  
  if (cleanPhone.length > 15) {
    return { isValid: false, error: 'Phone number must be less than 15 digits' }
  }
  
  return { isValid: true }
}

// Confirm password validation
export const validateConfirmPassword = (password: string, confirmPassword: string): FieldValidationResult => {
  if (!confirmPassword) {
    return { isValid: false, error: 'Please confirm your password' }
  }
  
  if (password !== confirmPassword) {
    return { isValid: false, error: 'Passwords do not match' }
  }
  
  return { isValid: true }
}

// Generic required field validation
export const validateRequired = (value: string, fieldName: string): FieldValidationResult => {
  if (!value.trim()) {
    return { isValid: false, error: `${fieldName} is required` }
  }
  
  return { isValid: true }
}

// Validate multiple fields at once
export const validateFields = (validations: (() => FieldValidationResult)[]): ValidationResult => {
  const errors: string[] = []
  
  validations.forEach(validation => {
    const result = validation()
    if (!result.isValid && result.error) {
      errors.push(result.error)
    }
  })
  
  return {
    isValid: errors.length === 0,
    errors
  }
}

// Format phone number for display
export const formatPhoneNumber = (phone: string): string => {
  const cleanPhone = phone.replace(/\D/g, '')
  
  if (cleanPhone.length === 10) {
    return `(${cleanPhone.slice(0, 3)}) ${cleanPhone.slice(3, 6)}-${cleanPhone.slice(6)}`
  }
  
  return phone
}

// Clean and format school code
export const formatSchoolCode = (code: string): string => {
  return code.trim().toUpperCase().replace(/[^A-Z0-9]/g, '')
}

// Password strength indicator
export const getPasswordStrength = (password: string): {
  score: number
  label: string
  color: string
} => {
  let score = 0
  
  if (password.length >= 6) score++
  if (/[A-Z]/.test(password)) score++
  if (/[a-z]/.test(password)) score++
  if (/\d/.test(password)) score++
  if (/[!@#$%^&*(),.?":{}|<>]/.test(password)) score++
  
  const strengthMap = {
    0: { label: 'Very Weak', color: '#ef4444' },
    1: { label: 'Weak', color: '#f97316' },
    2: { label: 'Fair', color: '#f59e0b' },
    3: { label: 'Good', color: '#22c55e' },
    4: { label: 'Strong', color: '#16a34a' },
    5: { label: 'Very Strong', color: '#15803d' },
  }
  
  return {
    score,
    ...strengthMap[score as keyof typeof strengthMap]
  }
}

// Teacher-specific validation functions

// Assignment validation
export const validateAssignmentTitle = (title: string): FieldValidationResult => {
  if (!title.trim()) {
    return { isValid: false, error: 'Assignment title is required' }
  }

  if (title.trim().length < 3) {
    return { isValid: false, error: 'Assignment title must be at least 3 characters long' }
  }

  if (title.trim().length > 255) {
    return { isValid: false, error: 'Assignment title must be less than 255 characters' }
  }

  return { isValid: true }
}

export const validateAssignmentType = (type: string): FieldValidationResult => {
  const validTypes = ['homework', 'project', 'quiz', 'test', 'lab', 'presentation', 'essay', 'research']

  if (!type) {
    return { isValid: false, error: 'Assignment type is required' }
  }

  if (!validTypes.includes(type.toLowerCase())) {
    return { isValid: false, error: 'Please select a valid assignment type' }
  }

  return { isValid: true }
}

export const validateGrade = (grade: string | number, maxGrade: number = 100): FieldValidationResult => {
  const numGrade = typeof grade === 'string' ? parseFloat(grade) : grade

  if (isNaN(numGrade)) {
    return { isValid: false, error: 'Grade must be a valid number' }
  }

  if (numGrade < 0) {
    return { isValid: false, error: 'Grade cannot be negative' }
  }

  if (numGrade > maxGrade) {
    return { isValid: false, error: `Grade cannot exceed ${maxGrade}` }
  }

  return { isValid: true }
}

export const validateDueDate = (date: string): FieldValidationResult => {
  if (!date) {
    return { isValid: false, error: 'Due date is required' }
  }

  const dueDate = new Date(date)
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  if (isNaN(dueDate.getTime())) {
    return { isValid: false, error: 'Please enter a valid date' }
  }

  if (dueDate < today) {
    return { isValid: false, error: 'Due date cannot be in the past' }
  }

  return { isValid: true }
}

// Behavioral note validation
export const validateBehavioralNote = (title: string, description: string): ValidationResult => {
  const errors: string[] = []

  if (!title.trim()) {
    errors.push('Note title is required')
  } else if (title.trim().length < 3) {
    errors.push('Note title must be at least 3 characters long')
  } else if (title.trim().length > 255) {
    errors.push('Note title must be less than 255 characters')
  }

  if (!description.trim()) {
    errors.push('Note description is required')
  } else if (description.trim().length < 10) {
    errors.push('Note description must be at least 10 characters long')
  } else if (description.trim().length > 1000) {
    errors.push('Note description must be less than 1000 characters')
  }

  return {
    isValid: errors.length === 0,
    errors
  }
}

export const validateIncidentType = (type: string): FieldValidationResult => {
  const validTypes = ['positive', 'negative', 'neutral', 'achievement', 'concern', 'improvement']

  if (!type) {
    return { isValid: false, error: 'Incident type is required' }
  }

  if (!validTypes.includes(type.toLowerCase())) {
    return { isValid: false, error: 'Please select a valid incident type' }
  }

  return { isValid: true }
}

export const validateSeverityLevel = (level: string): FieldValidationResult => {
  const validLevels = ['low', 'medium', 'high', 'critical']

  if (!level) {
    return { isValid: false, error: 'Severity level is required' }
  }

  if (!validLevels.includes(level.toLowerCase())) {
    return { isValid: false, error: 'Please select a valid severity level' }
  }

  return { isValid: true }
}

// Lesson plan validation
export const validateLessonPlan = (title: string, date: string, duration: string | number): ValidationResult => {
  const errors: string[] = []

  // Title validation
  if (!title.trim()) {
    errors.push('Lesson title is required')
  } else if (title.trim().length < 3) {
    errors.push('Lesson title must be at least 3 characters long')
  } else if (title.trim().length > 255) {
    errors.push('Lesson title must be less than 255 characters')
  }

  // Date validation
  if (!date) {
    errors.push('Lesson date is required')
  } else {
    const lessonDate = new Date(date)
    if (isNaN(lessonDate.getTime())) {
      errors.push('Please enter a valid lesson date')
    }
  }

  // Duration validation
  const numDuration = typeof duration === 'string' ? parseFloat(duration) : duration
  if (isNaN(numDuration)) {
    errors.push('Duration must be a valid number')
  } else if (numDuration < 15) {
    errors.push('Duration must be at least 15 minutes')
  } else if (numDuration > 300) {
    errors.push('Duration cannot exceed 300 minutes')
  }

  return {
    isValid: errors.length === 0,
    errors
  }
}

// Attendance validation
export const validateAttendanceStatus = (status: string): FieldValidationResult => {
  const validStatuses = ['present', 'absent', 'late', 'excused']

  if (!status) {
    return { isValid: false, error: 'Attendance status is required' }
  }

  if (!validStatuses.includes(status.toLowerCase())) {
    return { isValid: false, error: 'Please select a valid attendance status' }
  }

  return { isValid: true }
}

// File validation
export const validateFileSize = (fileSize: number, maxSizeMB: number = 10): FieldValidationResult => {
  const maxSizeBytes = maxSizeMB * 1024 * 1024

  if (fileSize > maxSizeBytes) {
    return { isValid: false, error: `File size cannot exceed ${maxSizeMB}MB` }
  }

  return { isValid: true }
}

export const validateFileType = (fileName: string, allowedTypes: string[]): FieldValidationResult => {
  const fileExtension = fileName.split('.').pop()?.toLowerCase()

  if (!fileExtension) {
    return { isValid: false, error: 'File must have a valid extension' }
  }

  if (!allowedTypes.includes(fileExtension)) {
    return { isValid: false, error: `File type .${fileExtension} is not allowed. Allowed types: ${allowedTypes.join(', ')}` }
  }

  return { isValid: true }
}
