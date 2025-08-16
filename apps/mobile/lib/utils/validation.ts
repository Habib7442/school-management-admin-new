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
