import { useEffect, useCallback, useRef } from 'react'
import { useAuthStore } from '@/lib/stores/auth-store'
import { toast } from 'sonner'

interface SessionManagerOptions {
  warningThreshold?: number // minutes before expiry to show warning
  autoRefresh?: boolean
  onSessionExpired?: () => void
  onSessionWarning?: (minutesRemaining: number) => void
}

export function useSessionManager(options: SessionManagerOptions = {}) {
  const {
    warningThreshold = 5, // 5 minutes default
    autoRefresh = true,
    onSessionExpired,
    onSessionWarning
  } = options

  const { user, refreshSession, logout } = useAuthStore()
  const warningShownRef = useRef(false)
  const refreshTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  // Check session validity and time remaining
  const checkSession = useCallback(async () => {
    if (!user) return

    try {
      // Get current session from Supabase
      const { supabase } = await import('@/lib/supabase')
      const { data: { session }, error } = await supabase.auth.getSession()

      if (error || !session) {
        console.log('No valid session found')
        if (onSessionExpired) {
          onSessionExpired()
        } else {
          toast.error('Session expired', {
            description: 'Please sign in again',
            duration: 5000
          })
          await logout()
        }
        return
      }

      // Calculate time until expiry
      const expiresAt = new Date(session.expires_at! * 1000)
      const now = new Date()
      const timeUntilExpiry = expiresAt.getTime() - now.getTime()
      const minutesUntilExpiry = Math.floor(timeUntilExpiry / (1000 * 60))

      // Show warning if approaching expiry
      if (minutesUntilExpiry <= warningThreshold && minutesUntilExpiry > 0 && !warningShownRef.current) {
        warningShownRef.current = true
        
        if (onSessionWarning) {
          onSessionWarning(minutesUntilExpiry)
        } else {
          toast.warning('Session expiring soon', {
            description: `Your session will expire in ${minutesUntilExpiry} minutes. Click to extend.`,
            duration: 10000,
            action: {
              label: 'Extend Session',
              onClick: async () => {
                const success = await refreshSession()
                if (success) {
                  toast.success('Session extended successfully')
                  warningShownRef.current = false
                } else {
                  toast.error('Failed to extend session')
                }
              }
            }
          })
        }
      }

      // Auto-refresh if enabled and within refresh window
      if (autoRefresh && minutesUntilExpiry <= warningThreshold && minutesUntilExpiry > 2) {
        console.log('Auto-refreshing session...')
        const success = await refreshSession()
        if (success) {
          console.log('Session auto-refreshed successfully')
          warningShownRef.current = false
        } else {
          console.error('Auto-refresh failed')
        }
      }

      // Session expired
      if (minutesUntilExpiry <= 0) {
        console.log('Session has expired')
        if (onSessionExpired) {
          onSessionExpired()
        } else {
          toast.error('Session expired', {
            description: 'Please sign in again',
            duration: 5000
          })
          await logout()
        }
      }

    } catch (error) {
      console.error('Session check error:', error)
    }
  }, [user, warningThreshold, autoRefresh, onSessionExpired, onSessionWarning, refreshSession, logout])

  // Manual session refresh
  const extendSession = useCallback(async () => {
    try {
      const success = await refreshSession()
      if (success) {
        toast.success('Session extended successfully')
        warningShownRef.current = false
        return true
      } else {
        toast.error('Failed to extend session')
        return false
      }
    } catch (error) {
      console.error('Session extension error:', error)
      toast.error('Failed to extend session')
      return false
    }
  }, [refreshSession])

  // Get session time remaining
  const getSessionTimeRemaining = useCallback(async () => {
    try {
      const { supabase } = await import('@/lib/supabase')
      const { data: { session } } = await supabase.auth.getSession()
      
      if (!session) return 0

      const expiresAt = new Date(session.expires_at! * 1000)
      const now = new Date()
      const timeUntilExpiry = expiresAt.getTime() - now.getTime()
      
      return Math.max(0, Math.floor(timeUntilExpiry / (1000 * 60))) // minutes
    } catch (error) {
      console.error('Error getting session time:', error)
      return 0
    }
  }, [])

  // Setup periodic session checks
  useEffect(() => {
    if (!user) {
      // Clear any existing timeouts
      if (refreshTimeoutRef.current) {
        clearTimeout(refreshTimeoutRef.current)
        refreshTimeoutRef.current = null
      }
      return
    }

    // Initial check
    checkSession()

    // Setup periodic checks every 2 minutes
    const interval = setInterval(checkSession, 2 * 60 * 1000)

    return () => {
      clearInterval(interval)
      if (refreshTimeoutRef.current) {
        clearTimeout(refreshTimeoutRef.current)
        refreshTimeoutRef.current = null
      }
    }
  }, [user, checkSession])

  // Activity tracking for session extension
  useEffect(() => {
    if (!user) return

    const handleActivity = () => {
      // Reset warning flag on user activity
      warningShownRef.current = false
    }

    // Track user activity
    const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart', 'click']
    events.forEach(event => {
      document.addEventListener(event, handleActivity, { passive: true })
    })

    return () => {
      events.forEach(event => {
        document.removeEventListener(event, handleActivity)
      })
    }
  }, [user])

  return {
    extendSession,
    getSessionTimeRemaining,
    checkSession
  }
}
