import type { User } from '@supabase/supabase-js'
import type { UserRole } from '@repo/types'

// Enhanced user profile with security fields
export interface UserProfile {
  id: string
  email: string
  name: string
  role: UserRole
  created_at: string
  updated_at: string
  last_sign_in_at?: string
  email_confirmed_at?: string
  is_active: boolean
  failed_login_attempts?: number
  locked_until?: string
}

// Authentication state
export interface AuthState {
  user: UserProfile | null
  isAuthenticated: boolean
  isLoading: boolean
  isInitialized: boolean
  sessionExpiresAt: Date | null
  lastActivity: Date | null
}

// Authentication operation results
export interface AuthResult {
  success: boolean
  error?: string
  user?: UserProfile
  requiresEmailConfirmation?: boolean
}

// Session management
export interface SessionInfo {
  accessToken: string
  refreshToken: string
  expiresAt: Date
  user: UserProfile
}

// Security settings
export interface SecuritySettings {
  maxFailedAttempts: number
  lockoutDuration: number // in minutes
  sessionTimeout: number // in minutes
  requireEmailConfirmation: boolean
  passwordMinLength: number
  passwordRequireSpecialChars: boolean
}

// Authentication events for logging
export type AuthEvent = 
  | 'sign_in_attempt'
  | 'sign_in_success'
  | 'sign_in_failure'
  | 'sign_up_attempt'
  | 'sign_up_success'
  | 'sign_up_failure'
  | 'sign_out'
  | 'session_refresh'
  | 'session_expired'
  | 'password_reset_request'
  | 'password_reset_success'
  | 'account_locked'
  | 'account_unlocked'

// Rate limiting
export interface RateLimitInfo {
  attempts: number
  resetTime: Date
  isLimited: boolean
}

// Security audit log entry
export interface SecurityAuditLog {
  id: string
  user_id?: string
  event: AuthEvent
  ip_address: string
  user_agent: string
  timestamp: Date
  success: boolean
  details?: Record<string, any>
}

// Password validation result
export interface PasswordValidation {
  isValid: boolean
  errors: string[]
  strength: 'weak' | 'medium' | 'strong'
  score: number
}

// Two-factor authentication (for future implementation)
export interface TwoFactorAuth {
  enabled: boolean
  method: 'sms' | 'email' | 'authenticator'
  backup_codes?: string[]
}

// Device information for session tracking
export interface DeviceInfo {
  id: string
  name: string
  type: 'desktop' | 'mobile' | 'tablet'
  browser: string
  os: string
  last_used: Date
  is_current: boolean
}

// Enhanced authentication context
export interface AuthContextValue extends AuthState {
  // Authentication actions
  signIn: (email: string, password: string, rememberMe?: boolean) => Promise<AuthResult>
  signUp: (email: string, password: string, name: string, role: UserRole) => Promise<AuthResult>
  signOut: () => Promise<void>
  refreshSession: () => Promise<boolean>
  
  // Password management
  resetPassword: (email: string) => Promise<AuthResult>
  updatePassword: (newPassword: string) => Promise<AuthResult>
  validatePassword: (password: string) => PasswordValidation
  
  // Session management
  extendSession: () => void
  checkSessionValidity: () => boolean
  getSessionTimeRemaining: () => number
  
  // Security features
  checkAccountLockStatus: (email: string) => Promise<RateLimitInfo>
  reportSecurityEvent: (event: AuthEvent, details?: Record<string, any>) => void
  
  // User management
  updateProfile: (updates: Partial<UserProfile>) => Promise<AuthResult>
  deleteAccount: () => Promise<AuthResult>
  
  // Utility functions
  hasRole: (role: UserRole | UserRole[]) => boolean
  hasPermission: (permission: string) => boolean
  isSessionExpiringSoon: () => boolean
}
