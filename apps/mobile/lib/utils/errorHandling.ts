import { Alert } from 'react-native'

// Error types
export interface AppError {
  code: string
  message: string
  details?: any
}

// Common error codes
export const ERROR_CODES = {
  NETWORK_ERROR: 'NETWORK_ERROR',
  AUTH_ERROR: 'AUTH_ERROR',
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  PERMISSION_ERROR: 'PERMISSION_ERROR',
  SERVER_ERROR: 'SERVER_ERROR',
  UNKNOWN_ERROR: 'UNKNOWN_ERROR',
} as const

// Error messages
export const ERROR_MESSAGES = {
  [ERROR_CODES.NETWORK_ERROR]: 'Network connection failed. Please check your internet connection and try again.',
  [ERROR_CODES.AUTH_ERROR]: 'Authentication failed. Please check your credentials and try again.',
  [ERROR_CODES.VALIDATION_ERROR]: 'Please check your input and try again.',
  [ERROR_CODES.PERMISSION_ERROR]: 'You do not have permission to perform this action.',
  [ERROR_CODES.SERVER_ERROR]: 'Server error occurred. Please try again later.',
  [ERROR_CODES.UNKNOWN_ERROR]: 'An unexpected error occurred. Please try again.',
} as const

// Parse Supabase errors
export const parseSupabaseError = (error: any): AppError => {
  if (!error) {
    return {
      code: ERROR_CODES.UNKNOWN_ERROR,
      message: ERROR_MESSAGES[ERROR_CODES.UNKNOWN_ERROR],
    }
  }

  // Handle auth errors
  if (error.message) {
    const message = error.message.toLowerCase()
    
    if (message.includes('invalid login credentials') || 
        message.includes('invalid email or password')) {
      return {
        code: ERROR_CODES.AUTH_ERROR,
        message: 'Invalid email or password. Please check your credentials and try again.',
        details: error,
      }
    }
    
    if (message.includes('email not confirmed')) {
      return {
        code: ERROR_CODES.AUTH_ERROR,
        message: 'Please verify your email address before signing in.',
        details: error,
      }
    }
    
    if (message.includes('user already registered')) {
      return {
        code: ERROR_CODES.VALIDATION_ERROR,
        message: 'An account with this email already exists. Please sign in instead.',
        details: error,
      }
    }
    
    if (message.includes('password should be at least')) {
      return {
        code: ERROR_CODES.VALIDATION_ERROR,
        message: 'Password must be at least 6 characters long.',
        details: error,
      }
    }
    
    if (message.includes('invalid email')) {
      return {
        code: ERROR_CODES.VALIDATION_ERROR,
        message: 'Please enter a valid email address.',
        details: error,
      }
    }
    
    if (message.includes('network') || message.includes('fetch')) {
      return {
        code: ERROR_CODES.NETWORK_ERROR,
        message: ERROR_MESSAGES[ERROR_CODES.NETWORK_ERROR],
        details: error,
      }
    }
    
    if (message.includes('permission') || message.includes('unauthorized')) {
      return {
        code: ERROR_CODES.PERMISSION_ERROR,
        message: ERROR_MESSAGES[ERROR_CODES.PERMISSION_ERROR],
        details: error,
      }
    }
  }

  // Handle HTTP status codes
  if (error.status) {
    switch (error.status) {
      case 400:
        return {
          code: ERROR_CODES.VALIDATION_ERROR,
          message: 'Invalid request. Please check your input and try again.',
          details: error,
        }
      case 401:
        return {
          code: ERROR_CODES.AUTH_ERROR,
          message: 'Authentication required. Please sign in and try again.',
          details: error,
        }
      case 403:
        return {
          code: ERROR_CODES.PERMISSION_ERROR,
          message: ERROR_MESSAGES[ERROR_CODES.PERMISSION_ERROR],
          details: error,
        }
      case 404:
        return {
          code: ERROR_CODES.VALIDATION_ERROR,
          message: 'The requested resource was not found.',
          details: error,
        }
      case 500:
      case 502:
      case 503:
        return {
          code: ERROR_CODES.SERVER_ERROR,
          message: ERROR_MESSAGES[ERROR_CODES.SERVER_ERROR],
          details: error,
        }
    }
  }

  // Default error
  return {
    code: ERROR_CODES.UNKNOWN_ERROR,
    message: error.message || ERROR_MESSAGES[ERROR_CODES.UNKNOWN_ERROR],
    details: error,
  }
}

// Show error alert
export const showErrorAlert = (error: AppError | string, title = 'Error') => {
  const message = typeof error === 'string' ? error : error.message
  
  Alert.alert(title, message, [
    {
      text: 'OK',
      style: 'default',
    },
  ])
}

// Show success alert
export const showSuccessAlert = (message: string, title = 'Success') => {
  Alert.alert(title, message, [
    {
      text: 'OK',
      style: 'default',
    },
  ])
}

// Show confirmation alert
export const showConfirmAlert = (
  message: string,
  onConfirm: () => void,
  onCancel?: () => void,
  title = 'Confirm'
) => {
  Alert.alert(
    title,
    message,
    [
      {
        text: 'Cancel',
        style: 'cancel',
        onPress: onCancel,
      },
      {
        text: 'OK',
        style: 'default',
        onPress: onConfirm,
      },
    ]
  )
}

// Log error for debugging
export const logError = (error: any, context?: string) => {
  const timestamp = new Date().toISOString()
  const logMessage = `[${timestamp}] ${context ? `${context}: ` : ''}${
    error.message || error
  }`
  
  console.error(logMessage, error)
  
  // In production, you might want to send this to a logging service
  // like Sentry, LogRocket, or Firebase Crashlytics
}

// Handle async operations with error handling
export const handleAsyncOperation = async <T>(
  operation: () => Promise<T>,
  errorContext?: string
): Promise<{ data?: T; error?: AppError }> => {
  try {
    const data = await operation()
    return { data }
  } catch (error) {
    const appError = parseSupabaseError(error)
    logError(error, errorContext)
    return { error: appError }
  }
}

// Retry mechanism for failed operations
export const retryOperation = async <T>(
  operation: () => Promise<T>,
  maxRetries = 3,
  delay = 1000
): Promise<T> => {
  let lastError: any
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await operation()
    } catch (error) {
      lastError = error
      
      if (attempt === maxRetries) {
        throw error
      }
      
      // Wait before retrying
      await new Promise(resolve => setTimeout(resolve, delay * attempt))
    }
  }
  
  throw lastError
}
