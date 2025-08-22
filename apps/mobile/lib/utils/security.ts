/**
 * Security utilities for the mobile app
 * Implements enterprise-level security measures
 */

import { Alert } from 'react-native'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { supabase } from '../supabase'

// Security configuration
const SECURITY_CONFIG = {
  MAX_LOGIN_ATTEMPTS: 5,
  LOCKOUT_DURATION: 15 * 60 * 1000, // 15 minutes
  SESSION_TIMEOUT: 30 * 60 * 1000, // 30 minutes
  RATE_LIMIT_WINDOW: 60 * 1000, // 1 minute
  MAX_REQUESTS_PER_WINDOW: 100,
  SENSITIVE_DATA_ENCRYPTION_KEY: 'school-management-key-2024',
}

interface SecurityEvent {
  type: 'login_attempt' | 'failed_login' | 'suspicious_activity' | 'data_access' | 'permission_denied'
  userId?: string
  timestamp: number
  details: any
  severity: 'low' | 'medium' | 'high' | 'critical'
}

interface RateLimitEntry {
  count: number
  windowStart: number
}

class SecurityManager {
  private rateLimitMap = new Map<string, RateLimitEntry>()
  private securityEvents: SecurityEvent[] = []

  /**
   * Log security events for monitoring
   */
  private logSecurityEvent(event: SecurityEvent): void {
    this.securityEvents.push(event)
    
    // Keep only last 1000 events
    if (this.securityEvents.length > 1000) {
      this.securityEvents = this.securityEvents.slice(-1000)
    }

    // Log to console in development
    if (__DEV__) {
      console.log('🔒 Security Event:', event)
    }

    // In production, send to security monitoring service
    if (event.severity === 'critical' || event.severity === 'high') {
      this.handleHighSeverityEvent(event)
    }
  }

  /**
   * Handle high severity security events
   */
  private handleHighSeverityEvent(event: SecurityEvent): void {
    // In production, this would:
    // 1. Send alert to security team
    // 2. Log to security information and event management (SIEM) system
    // 3. Potentially trigger automated responses
    
    console.warn('🚨 High severity security event:', event)
    
    if (event.type === 'suspicious_activity') {
      Alert.alert(
        'Security Alert',
        'Suspicious activity detected. Please contact support if you did not perform this action.',
        [{ text: 'OK' }]
      )
    }
  }

  /**
   * Rate limiting implementation
   */
  checkRateLimit(identifier: string): boolean {
    const now = Date.now()
    const entry = this.rateLimitMap.get(identifier)

    if (!entry) {
      this.rateLimitMap.set(identifier, { count: 1, windowStart: now })
      return true
    }

    // Check if we're in a new window
    if (now - entry.windowStart > SECURITY_CONFIG.RATE_LIMIT_WINDOW) {
      this.rateLimitMap.set(identifier, { count: 1, windowStart: now })
      return true
    }

    // Check if we've exceeded the limit
    if (entry.count >= SECURITY_CONFIG.MAX_REQUESTS_PER_WINDOW) {
      this.logSecurityEvent({
        type: 'suspicious_activity',
        timestamp: now,
        details: { identifier, requestCount: entry.count },
        severity: 'medium'
      })
      return false
    }

    // Increment counter
    entry.count++
    return true
  }

  /**
   * Track login attempts and implement account lockout
   */
  async trackLoginAttempt(email: string, success: boolean): Promise<boolean> {
    const key = `login_attempts_${email}`
    const now = Date.now()

    try {
      const data = await AsyncStorage.getItem(key)
      let attempts = data ? JSON.parse(data) : { count: 0, lastAttempt: 0, lockedUntil: 0 }

      // Check if account is currently locked
      if (attempts.lockedUntil > now) {
        const remainingTime = Math.ceil((attempts.lockedUntil - now) / 60000)
        Alert.alert(
          'Account Locked',
          `Too many failed login attempts. Please try again in ${remainingTime} minutes.`,
          [{ text: 'OK' }]
        )
        return false
      }

      if (success) {
        // Reset attempts on successful login
        await AsyncStorage.removeItem(key)
        this.logSecurityEvent({
          type: 'login_attempt',
          timestamp: now,
          details: { email, success: true },
          severity: 'low'
        })
        return true
      } else {
        // Increment failed attempts
        attempts.count++
        attempts.lastAttempt = now

        if (attempts.count >= SECURITY_CONFIG.MAX_LOGIN_ATTEMPTS) {
          attempts.lockedUntil = now + SECURITY_CONFIG.LOCKOUT_DURATION
          
          this.logSecurityEvent({
            type: 'failed_login',
            timestamp: now,
            details: { email, attemptCount: attempts.count, locked: true },
            severity: 'high'
          })

          Alert.alert(
            'Account Locked',
            `Too many failed login attempts. Your account has been locked for ${SECURITY_CONFIG.LOCKOUT_DURATION / 60000} minutes.`,
            [{ text: 'OK' }]
          )
        } else {
          this.logSecurityEvent({
            type: 'failed_login',
            timestamp: now,
            details: { email, attemptCount: attempts.count },
            severity: 'medium'
          })
        }

        await AsyncStorage.setItem(key, JSON.stringify(attempts))
        return attempts.lockedUntil <= now
      }
    } catch (error) {
      console.error('Error tracking login attempt:', error)
      return true
    }
  }

  /**
   * Validate user permissions for specific actions
   */
  validatePermission(userRole: string, requiredPermission: string): boolean {
    const rolePermissions = {
      admin: ['*'], // Admin has all permissions
      'sub-admin': [
        'view_students', 'manage_students', 'view_teachers', 'manage_classes',
        'view_assignments', 'view_grades', 'view_attendance', 'manage_announcements'
      ],
      teacher: [
        'view_students', 'view_classes', 'manage_assignments', 'manage_grades',
        'manage_attendance', 'create_behavioral_notes', 'view_lesson_plans',
        'manage_lesson_plans'
      ],
      student: [
        'view_assignments', 'submit_assignments', 'view_grades', 'view_attendance',
        'view_announcements'
      ]
    }

    const permissions = rolePermissions[userRole as keyof typeof rolePermissions] || []
    
    if (permissions.includes('*') || permissions.includes(requiredPermission)) {
      return true
    }

    this.logSecurityEvent({
      type: 'permission_denied',
      timestamp: Date.now(),
      details: { userRole, requiredPermission },
      severity: 'medium'
    })

    return false
  }

  /**
   * Sanitize user input to prevent injection attacks
   */
  sanitizeInput(input: string): string {
    if (typeof input !== 'string') {
      return ''
    }

    return input
      .trim()
      .replace(/[<>]/g, '') // Remove potential HTML tags
      .replace(/['"]/g, '') // Remove quotes that could break SQL
      .replace(/[;&|`$]/g, '') // Remove command injection characters
      .substring(0, 1000) // Limit length
  }

  /**
   * Validate file uploads for security
   */
  validateFileUpload(file: { name: string; size: number; type?: string }): {
    isValid: boolean
    error?: string
  } {
    const allowedExtensions = [
      'jpg', 'jpeg', 'png', 'gif', 'pdf', 'doc', 'docx', 
      'xls', 'xlsx', 'ppt', 'pptx', 'txt', 'csv'
    ]
    
    const maxFileSize = 10 * 1024 * 1024 // 10MB
    const dangerousExtensions = [
      'exe', 'bat', 'cmd', 'com', 'pif', 'scr', 'vbs', 'js', 'jar', 'php', 'asp'
    ]

    // Check file size
    if (file.size > maxFileSize) {
      return { isValid: false, error: 'File size exceeds 10MB limit' }
    }

    // Check file extension
    const extension = file.name.split('.').pop()?.toLowerCase()
    if (!extension) {
      return { isValid: false, error: 'File must have a valid extension' }
    }

    if (dangerousExtensions.includes(extension)) {
      this.logSecurityEvent({
        type: 'suspicious_activity',
        timestamp: Date.now(),
        details: { fileName: file.name, reason: 'dangerous_extension' },
        severity: 'high'
      })
      return { isValid: false, error: 'File type not allowed for security reasons' }
    }

    if (!allowedExtensions.includes(extension)) {
      return { isValid: false, error: `File type .${extension} is not allowed` }
    }

    return { isValid: true }
  }

  /**
   * Check for suspicious activity patterns
   */
  detectSuspiciousActivity(userId: string, action: string): boolean {
    const recentEvents = this.securityEvents
      .filter(event => 
        event.userId === userId && 
        Date.now() - event.timestamp < 5 * 60 * 1000 // Last 5 minutes
      )

    // Check for rapid successive actions
    const rapidActions = recentEvents.filter(event => 
      event.details?.action === action &&
      Date.now() - event.timestamp < 30 * 1000 // Last 30 seconds
    )

    if (rapidActions.length > 10) {
      this.logSecurityEvent({
        type: 'suspicious_activity',
        userId,
        timestamp: Date.now(),
        details: { action, rapidActionCount: rapidActions.length },
        severity: 'high'
      })
      return true
    }

    return false
  }

  /**
   * Secure data storage with encryption
   */
  async secureStore(key: string, data: any): Promise<void> {
    try {
      // In production, implement proper encryption
      const encryptedData = this.simpleEncrypt(JSON.stringify(data))
      await AsyncStorage.setItem(`secure_${key}`, encryptedData)
    } catch (error) {
      console.error('Secure store error:', error)
      throw new Error('Failed to securely store data')
    }
  }

  /**
   * Retrieve securely stored data
   */
  async secureRetrieve(key: string): Promise<any> {
    try {
      const encryptedData = await AsyncStorage.getItem(`secure_${key}`)
      if (!encryptedData) return null
      
      const decryptedData = this.simpleDecrypt(encryptedData)
      return JSON.parse(decryptedData)
    } catch (error) {
      console.error('Secure retrieve error:', error)
      return null
    }
  }

  /**
   * Simple encryption (use proper encryption in production)
   */
  private simpleEncrypt(text: string): string {
    // This is a simple XOR cipher for demonstration
    // In production, use proper encryption libraries like crypto-js
    const key = SECURITY_CONFIG.SENSITIVE_DATA_ENCRYPTION_KEY
    let result = ''
    
    for (let i = 0; i < text.length; i++) {
      result += String.fromCharCode(
        text.charCodeAt(i) ^ key.charCodeAt(i % key.length)
      )
    }
    
    return btoa(result) // Base64 encode
  }

  /**
   * Simple decryption
   */
  private simpleDecrypt(encryptedText: string): string {
    try {
      const text = atob(encryptedText) // Base64 decode
      const key = SECURITY_CONFIG.SENSITIVE_DATA_ENCRYPTION_KEY
      let result = ''
      
      for (let i = 0; i < text.length; i++) {
        result += String.fromCharCode(
          text.charCodeAt(i) ^ key.charCodeAt(i % key.length)
        )
      }
      
      return result
    } catch (error) {
      throw new Error('Failed to decrypt data')
    }
  }

  /**
   * Get security statistics
   */
  getSecurityStats(): {
    totalEvents: number
    criticalEvents: number
    recentEvents: number
    rateLimitedRequests: number
  } {
    const now = Date.now()
    const recentThreshold = 24 * 60 * 60 * 1000 // 24 hours
    
    const recentEvents = this.securityEvents.filter(
      event => now - event.timestamp < recentThreshold
    )
    
    const criticalEvents = this.securityEvents.filter(
      event => event.severity === 'critical' || event.severity === 'high'
    )

    return {
      totalEvents: this.securityEvents.length,
      criticalEvents: criticalEvents.length,
      recentEvents: recentEvents.length,
      rateLimitedRequests: Array.from(this.rateLimitMap.values())
        .filter(entry => entry.count >= SECURITY_CONFIG.MAX_REQUESTS_PER_WINDOW)
        .length
    }
  }
}

// Export singleton instance
export const securityManager = new SecurityManager()

// Export security utilities
export { SECURITY_CONFIG }
export type { SecurityEvent }
