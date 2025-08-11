import { useCallback } from 'react'
import { useAuthStore } from '@/lib/stores/auth-store'

export type SecurityEvent = 
  | 'login_attempt'
  | 'login_success' 
  | 'login_failure'
  | 'logout'
  | 'session_refresh'
  | 'session_expired'
  | 'password_change'
  | 'profile_update'
  | 'suspicious_activity'
  | 'rate_limit_exceeded'
  | 'unauthorized_access'

interface SecurityAuditEntry {
  event: SecurityEvent
  userId?: string
  email?: string
  ipAddress: string
  userAgent: string
  timestamp: Date
  success: boolean
  details?: Record<string, any>
  riskLevel: 'low' | 'medium' | 'high' | 'critical'
}

export function useSecurityAudit() {
  const { user } = useAuthStore()

  // Get client information for audit logging
  const getClientInfo = useCallback(() => {
    return {
      userAgent: navigator.userAgent,
      language: navigator.language,
      platform: navigator.platform,
      cookieEnabled: navigator.cookieEnabled,
      onLine: navigator.onLine,
      screen: {
        width: screen.width,
        height: screen.height,
        colorDepth: screen.colorDepth
      },
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      timestamp: new Date().toISOString()
    }
  }, [])

  // Get IP address (in production, this would be done server-side)
  const getIPAddress = useCallback(async (): Promise<string> => {
    try {
      // In production, get this from server-side or use a service
      // For now, return a placeholder
      return 'client-ip-hidden'
    } catch (error) {
      return 'unknown'
    }
  }, [])

  // Determine risk level based on event and context
  const calculateRiskLevel = useCallback((
    event: SecurityEvent, 
    success: boolean, 
    details?: Record<string, any>
  ): SecurityAuditEntry['riskLevel'] => {
    // Failed authentication attempts
    if ((event === 'login_failure' || event === 'unauthorized_access') && !success) {
      const attempts = details?.attempts || 1
      if (attempts >= 5) return 'critical'
      if (attempts >= 3) return 'high'
      return 'medium'
    }

    // Rate limiting
    if (event === 'rate_limit_exceeded') {
      return 'high'
    }

    // Suspicious activity
    if (event === 'suspicious_activity') {
      return details?.severity || 'medium'
    }

    // Session issues
    if (event === 'session_expired' && details?.forced) {
      return 'medium'
    }

    // Password changes
    if (event === 'password_change') {
      return success ? 'low' : 'medium'
    }

    // Default risk levels
    const riskMap: Record<SecurityEvent, SecurityAuditEntry['riskLevel']> = {
      login_attempt: 'low',
      login_success: 'low',
      login_failure: 'medium',
      logout: 'low',
      session_refresh: 'low',
      session_expired: 'low',
      password_change: 'low',
      profile_update: 'low',
      suspicious_activity: 'medium',
      rate_limit_exceeded: 'high',
      unauthorized_access: 'high'
    }

    return riskMap[event] || 'low'
  }, [])

  // Log security event
  const logSecurityEvent = useCallback(async (
    event: SecurityEvent,
    success: boolean = true,
    details?: Record<string, any>
  ) => {
    try {
      const ipAddress = await getIPAddress()
      const clientInfo = getClientInfo()
      const riskLevel = calculateRiskLevel(event, success, details)

      const auditEntry: SecurityAuditEntry = {
        event,
        userId: user?.id,
        email: user?.email,
        ipAddress,
        userAgent: clientInfo.userAgent,
        timestamp: new Date(),
        success,
        details: {
          ...details,
          clientInfo
        },
        riskLevel
      }

      // Log to console (in production, send to security monitoring service)
      console.log('🔒 Security Audit Log:', auditEntry)

      // In production, send to security monitoring service
      // await securityMonitoringService.logEvent(auditEntry)

      // Store critical events locally for immediate analysis
      if (riskLevel === 'critical' || riskLevel === 'high') {
        const criticalEvents = JSON.parse(
          localStorage.getItem('security_critical_events') || '[]'
        )
        criticalEvents.push(auditEntry)
        
        // Keep only last 50 critical events
        if (criticalEvents.length > 50) {
          criticalEvents.splice(0, criticalEvents.length - 50)
        }
        
        localStorage.setItem('security_critical_events', JSON.stringify(criticalEvents))
      }

      return auditEntry
    } catch (error) {
      console.error('Failed to log security event:', error)
    }
  }, [user, getIPAddress, getClientInfo, calculateRiskLevel])

  // Detect suspicious activity patterns
  const detectSuspiciousActivity = useCallback((
    event: SecurityEvent,
    details?: Record<string, any>
  ) => {
    try {
      const recentEvents = JSON.parse(
        localStorage.getItem('security_critical_events') || '[]'
      )

      // Check for rapid failed login attempts
      if (event === 'login_failure') {
        const recentFailures = recentEvents.filter((e: SecurityAuditEntry) => 
          e.event === 'login_failure' && 
          new Date().getTime() - new Date(e.timestamp).getTime() < 5 * 60 * 1000 // 5 minutes
        )

        if (recentFailures.length >= 3) {
          logSecurityEvent('suspicious_activity', false, {
            pattern: 'rapid_failed_logins',
            count: recentFailures.length,
            severity: 'high'
          })
        }
      }

      // Check for unusual access patterns
      if (event === 'login_success') {
        const clientInfo = getClientInfo()
        const lastLogin = recentEvents
          .filter((e: SecurityAuditEntry) => e.event === 'login_success')
          .sort((a: SecurityAuditEntry, b: SecurityAuditEntry) => 
            new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
          )[0]

        if (lastLogin && lastLogin.details?.clientInfo) {
          const lastClientInfo = lastLogin.details.clientInfo
          
          // Different browser/platform
          if (lastClientInfo.platform !== clientInfo.platform ||
              lastClientInfo.userAgent !== clientInfo.userAgent) {
            logSecurityEvent('suspicious_activity', true, {
              pattern: 'device_change',
              previousDevice: lastClientInfo,
              currentDevice: clientInfo,
              severity: 'medium'
            })
          }

          // Different timezone
          if (lastClientInfo.timezone !== clientInfo.timezone) {
            logSecurityEvent('suspicious_activity', true, {
              pattern: 'location_change',
              previousTimezone: lastClientInfo.timezone,
              currentTimezone: clientInfo.timezone,
              severity: 'medium'
            })
          }
        }
      }
    } catch (error) {
      console.error('Error detecting suspicious activity:', error)
    }
  }, [logSecurityEvent, getClientInfo])

  // Get security summary
  const getSecuritySummary = useCallback(() => {
    try {
      const criticalEvents = JSON.parse(
        localStorage.getItem('security_critical_events') || '[]'
      )

      const last24Hours = criticalEvents.filter((e: SecurityAuditEntry) =>
        new Date().getTime() - new Date(e.timestamp).getTime() < 24 * 60 * 60 * 1000
      )

      const summary = {
        totalCriticalEvents: criticalEvents.length,
        last24Hours: last24Hours.length,
        riskLevels: {
          critical: criticalEvents.filter((e: SecurityAuditEntry) => e.riskLevel === 'critical').length,
          high: criticalEvents.filter((e: SecurityAuditEntry) => e.riskLevel === 'high').length,
          medium: criticalEvents.filter((e: SecurityAuditEntry) => e.riskLevel === 'medium').length,
          low: criticalEvents.filter((e: SecurityAuditEntry) => e.riskLevel === 'low').length
        },
        recentEvents: last24Hours.slice(-10) // Last 10 events
      }

      return summary
    } catch (error) {
      console.error('Error getting security summary:', error)
      return null
    }
  }, [])

  // Clear security logs (admin function)
  const clearSecurityLogs = useCallback(() => {
    try {
      localStorage.removeItem('security_critical_events')
      console.log('Security logs cleared')
    } catch (error) {
      console.error('Error clearing security logs:', error)
    }
  }, [])

  return {
    logSecurityEvent,
    detectSuspiciousActivity,
    getSecuritySummary,
    clearSecurityLogs
  }
}
