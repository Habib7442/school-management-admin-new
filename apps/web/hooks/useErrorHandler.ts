import { useCallback } from 'react'
import { toast } from 'sonner'
import { AuthError } from '@supabase/supabase-js'

// Error types for comprehensive handling
export interface AppError {
  type: 'auth' | 'network' | 'validation' | 'api' | 'session' | 'unknown'
  code?: string
  message: string
  details?: any
  timestamp: Date
  userMessage: string
  recoverable: boolean
}

// Error codes mapping for user-friendly messages
const ERROR_MESSAGES = {
  // Authentication errors
  'invalid_credentials': 'Invalid email or password. Please check your credentials and try again.',
  'email_not_confirmed': 'Please check your email and click the confirmation link before signing in.',
  'too_many_requests': 'Too many login attempts. Please wait a few minutes before trying again.',
  'weak_password': 'Password is too weak. Please use at least 8 characters with a mix of letters, numbers, and symbols.',
  'email_already_registered': 'An account with this email already exists. Please sign in instead.',
  'user_not_found': 'No account found with this email address.',
  'session_expired': 'Your session has expired. Please sign in again.',
  'unauthorized': 'You are not authorized to perform this action.',
  
  // Network errors
  'network_error': 'Network connection failed. Please check your internet connection and try again.',
  'timeout_error': 'Request timed out. Please try again.',
  'server_error': 'Server is temporarily unavailable. Please try again later.',
  
  // Validation errors
  'invalid_email': 'Please enter a valid email address.',
  'password_mismatch': 'Passwords do not match.',
  'required_field': 'This field is required.',
  
  // API errors
  'api_error': 'Something went wrong. Please try again.',
  'rate_limit': 'Too many requests. Please wait before trying again.',
  
  // Default
  'unknown_error': 'An unexpected error occurred. Please try again.'
} as const

export function useErrorHandler() {
  // Log error for debugging and monitoring
  const logError = useCallback((error: AppError) => {
    // In production, this would send to error monitoring service (e.g., Sentry)
    console.error('Application Error:', {
      type: error.type,
      code: error.code,
      message: error.message,
      details: error.details,
      timestamp: error.timestamp,
      userAgent: navigator.userAgent,
      url: window.location.href
    })
    
    // TODO: Send to error monitoring service
    // errorMonitoringService.captureError(error)
  }, [])

  // Parse Supabase auth errors
  const parseAuthError = useCallback((error: AuthError): AppError => {
    const errorCode = error.message.toLowerCase()
    
    let type: AppError['type'] = 'auth'
    let code = 'unknown_error'
    let recoverable = true

    // Map specific auth error messages to codes
    if (errorCode.includes('invalid login credentials') || errorCode.includes('invalid email or password')) {
      code = 'invalid_credentials'
    } else if (errorCode.includes('email not confirmed')) {
      code = 'email_not_confirmed'
    } else if (errorCode.includes('too many requests')) {
      code = 'too_many_requests'
      recoverable = false
    } else if (errorCode.includes('weak password')) {
      code = 'weak_password'
    } else if (errorCode.includes('user already registered')) {
      code = 'email_already_registered'
    } else if (errorCode.includes('user not found')) {
      code = 'user_not_found'
    } else if (errorCode.includes('jwt expired') || errorCode.includes('session expired')) {
      code = 'session_expired'
      type = 'session'
    }

    return {
      type,
      code,
      message: error.message,
      details: error,
      timestamp: new Date(),
      userMessage: ERROR_MESSAGES[code as keyof typeof ERROR_MESSAGES] || ERROR_MESSAGES.unknown_error,
      recoverable
    }
  }, [])

  // Parse network errors
  const parseNetworkError = useCallback((error: any): AppError => {
    let code = 'network_error'
    
    if (error.name === 'TimeoutError' || error.code === 'TIMEOUT') {
      code = 'timeout_error'
    } else if (error.status >= 500) {
      code = 'server_error'
    } else if (error.status === 429) {
      code = 'rate_limit'
    }

    return {
      type: 'network',
      code,
      message: error.message || 'Network error occurred',
      details: error,
      timestamp: new Date(),
      userMessage: ERROR_MESSAGES[code as keyof typeof ERROR_MESSAGES] || ERROR_MESSAGES.network_error,
      recoverable: true
    }
  }, [])

  // Main error handler
  const handleError = useCallback((error: any, context?: string): AppError => {
    let appError: AppError

    // Parse different error types
    if (error?.name === 'AuthError' || error?.message?.includes('auth')) {
      appError = parseAuthError(error)
    } else if (error?.name === 'NetworkError' || error?.code === 'NETWORK_ERROR') {
      appError = parseNetworkError(error)
    } else if (error?.name === 'ValidationError') {
      appError = {
        type: 'validation',
        code: 'validation_error',
        message: error.message,
        details: error,
        timestamp: new Date(),
        userMessage: error.message || ERROR_MESSAGES.required_field,
        recoverable: true
      }
    } else {
      // Generic error handling
      appError = {
        type: 'unknown',
        code: 'unknown_error',
        message: error?.message || 'Unknown error occurred',
        details: error,
        timestamp: new Date(),
        userMessage: ERROR_MESSAGES.unknown_error,
        recoverable: true
      }
    }

    // Add context if provided
    if (context) {
      appError.details = { ...appError.details, context }
    }

    // Log the error
    logError(appError)

    return appError
  }, [parseAuthError, parseNetworkError, logError])

  // Show error toast with appropriate styling
  const showErrorToast = useCallback((error: AppError) => {
    toast.error(error.userMessage, {
      description: error.recoverable ? 'Please try again' : 'Please contact support if this persists',
      duration: error.recoverable ? 5000 : 8000,
      action: error.recoverable ? {
        label: 'Retry',
        onClick: () => {
          // This would trigger a retry mechanism
          console.log('Retry requested for error:', error.code)
        }
      } : undefined
    })
  }, [])

  // Show success toast
  const showSuccessToast = useCallback((message: string, description?: string) => {
    toast.success(message, {
      description,
      duration: 4000
    })
  }, [])

  // Show loading toast
  const showLoadingToast = useCallback((message: string) => {
    return toast.loading(message)
  }, [])

  // Show info toast
  const showInfoToast = useCallback((message: string, description?: string) => {
    toast.info(message, {
      description,
      duration: 5000
    })
  }, [])

  // Dismiss toast
  const dismissToast = useCallback((toastId: string | number) => {
    toast.dismiss(toastId)
  }, [])

  return {
    handleError,
    showErrorToast,
    showSuccessToast,
    showLoadingToast,
    showInfoToast,
    dismissToast,
    logError
  }
}
