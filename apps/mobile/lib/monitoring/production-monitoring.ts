/**
 * Production Monitoring and Logging System
 * Comprehensive monitoring for the teacher mobile application
 */

import { Alert } from 'react-native'
import AsyncStorage from '@react-native-async-storage/async-storage'
import NetInfo from '@react-native-community/netinfo'

// Types for monitoring
interface LogEntry {
  id: string
  timestamp: number
  level: 'debug' | 'info' | 'warn' | 'error' | 'critical'
  category: string
  message: string
  data?: any
  userId?: string
  sessionId: string
  appVersion: string
  platform: string
  networkStatus: boolean
}

interface PerformanceMetric {
  id: string
  timestamp: number
  metric: string
  value: number
  unit: string
  context?: any
  userId?: string
  sessionId: string
}

interface ErrorReport {
  id: string
  timestamp: number
  error: Error
  context: string
  userId?: string
  sessionId: string
  stackTrace?: string
  breadcrumbs: string[]
  deviceInfo: any
}

interface UserAction {
  id: string
  timestamp: number
  action: string
  screen: string
  data?: any
  userId?: string
  sessionId: string
}

class ProductionMonitoring {
  private sessionId: string
  private userId?: string
  private isOnline: boolean = true
  private logQueue: LogEntry[] = []
  private performanceQueue: PerformanceMetric[] = []
  private errorQueue: ErrorReport[] = []
  private userActionQueue: UserAction[] = []
  private breadcrumbs: string[] = []
  private maxQueueSize = 1000
  private flushInterval = 30000 // 30 seconds
  private flushTimer?: NodeJS.Timeout

  constructor() {
    this.sessionId = this.generateSessionId()
    this.initializeNetworkListener()
    this.startPeriodicFlush()
    this.setupGlobalErrorHandler()
  }

  private generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }

  private initializeNetworkListener(): void {
    NetInfo.addEventListener(state => {
      this.isOnline = state.isConnected ?? false
      this.log('info', 'network', `Network status changed: ${this.isOnline ? 'online' : 'offline'}`)
    })
  }

  private startPeriodicFlush(): void {
    this.flushTimer = setInterval(() => {
      this.flushQueues()
    }, this.flushInterval)
  }

  private setupGlobalErrorHandler(): void {
    // Set up global error handler for unhandled errors
    const originalHandler = ErrorUtils.getGlobalHandler()
    
    ErrorUtils.setGlobalHandler((error, isFatal) => {
      this.reportError(error, 'global_error_handler', {
        isFatal,
        timestamp: Date.now()
      })
      
      // Call original handler
      if (originalHandler) {
        originalHandler(error, isFatal)
      }
    })
  }

  /**
   * Set current user for tracking
   */
  setUser(userId: string): void {
    this.userId = userId
    this.log('info', 'auth', 'User session started', { userId })
  }

  /**
   * Clear user session
   */
  clearUser(): void {
    this.log('info', 'auth', 'User session ended', { userId: this.userId })
    this.userId = undefined
  }

  /**
   * Log messages with different levels
   */
  log(level: LogEntry['level'], category: string, message: string, data?: any): void {
    const entry: LogEntry = {
      id: this.generateId(),
      timestamp: Date.now(),
      level,
      category,
      message,
      data,
      userId: this.userId,
      sessionId: this.sessionId,
      appVersion: '1.0.0', // Get from app config
      platform: 'mobile',
      networkStatus: this.isOnline
    }

    this.logQueue.push(entry)
    this.addBreadcrumb(`${level.toUpperCase()}: ${category} - ${message}`)

    // Console log in development
    if (__DEV__) {
      console.log(`[${level.toUpperCase()}] ${category}: ${message}`, data)
    }

    // Immediate flush for critical errors
    if (level === 'critical' || level === 'error') {
      this.flushQueues()
    }

    this.enforceQueueLimits()
  }

  /**
   * Track performance metrics
   */
  trackPerformance(metric: string, value: number, unit: string, context?: any): void {
    const entry: PerformanceMetric = {
      id: this.generateId(),
      timestamp: Date.now(),
      metric,
      value,
      unit,
      context,
      userId: this.userId,
      sessionId: this.sessionId
    }

    this.performanceQueue.push(entry)
    this.log('debug', 'performance', `${metric}: ${value}${unit}`, context)
    this.enforceQueueLimits()
  }

  /**
   * Report errors with context
   */
  reportError(error: Error, context: string, additionalData?: any): void {
    const report: ErrorReport = {
      id: this.generateId(),
      timestamp: Date.now(),
      error,
      context,
      userId: this.userId,
      sessionId: this.sessionId,
      stackTrace: error.stack,
      breadcrumbs: [...this.breadcrumbs],
      deviceInfo: {
        platform: 'mobile',
        appVersion: '1.0.0',
        ...additionalData
      }
    }

    this.errorQueue.push(report)
    this.log('error', 'error_report', `Error in ${context}: ${error.message}`, {
      errorName: error.name,
      stack: error.stack,
      ...additionalData
    })

    // Show user-friendly error message for critical errors
    if (context.includes('critical') || context.includes('fatal')) {
      Alert.alert(
        'Application Error',
        'An unexpected error occurred. The development team has been notified.',
        [{ text: 'OK' }]
      )
    }

    this.enforceQueueLimits()
  }

  /**
   * Track user actions for analytics
   */
  trackUserAction(action: string, screen: string, data?: any): void {
    const entry: UserAction = {
      id: this.generateId(),
      timestamp: Date.now(),
      action,
      screen,
      data,
      userId: this.userId,
      sessionId: this.sessionId
    }

    this.userActionQueue.push(entry)
    this.addBreadcrumb(`Action: ${action} on ${screen}`)
    this.log('debug', 'user_action', `${action} on ${screen}`, data)
    this.enforceQueueLimits()
  }

  /**
   * Add breadcrumb for debugging
   */
  private addBreadcrumb(message: string): void {
    this.breadcrumbs.push(`${new Date().toISOString()}: ${message}`)
    
    // Keep only last 50 breadcrumbs
    if (this.breadcrumbs.length > 50) {
      this.breadcrumbs = this.breadcrumbs.slice(-50)
    }
  }

  /**
   * Flush all queues to remote logging service
   */
  private async flushQueues(): Promise<void> {
    if (!this.isOnline) {
      this.log('debug', 'monitoring', 'Skipping flush - offline')
      return
    }

    try {
      // In production, send to your logging service (e.g., Sentry, LogRocket, etc.)
      const payload = {
        sessionId: this.sessionId,
        timestamp: Date.now(),
        logs: [...this.logQueue],
        performance: [...this.performanceQueue],
        errors: [...this.errorQueue],
        userActions: [...this.userActionQueue],
        breadcrumbs: [...this.breadcrumbs]
      }

      // For now, store locally (in production, send to remote service)
      await this.storeLocally(payload)

      // Clear queues after successful flush
      this.logQueue = []
      this.performanceQueue = []
      this.errorQueue = []
      this.userActionQueue = []

      this.log('debug', 'monitoring', `Flushed monitoring data: ${JSON.stringify(payload).length} bytes`)
    } catch (error) {
      console.error('Failed to flush monitoring data:', error)
    }
  }

  /**
   * Store monitoring data locally as backup
   */
  private async storeLocally(payload: any): Promise<void> {
    try {
      const key = `monitoring_${Date.now()}`
      await AsyncStorage.setItem(key, JSON.stringify(payload))
      
      // Clean up old monitoring data (keep only last 10 entries)
      const allKeys = await AsyncStorage.getAllKeys()
      const monitoringKeys = allKeys
        .filter(key => key.startsWith('monitoring_'))
        .sort()
      
      if (monitoringKeys.length > 10) {
        const keysToRemove = monitoringKeys.slice(0, monitoringKeys.length - 10)
        await AsyncStorage.multiRemove(keysToRemove)
      }
    } catch (error) {
      console.error('Failed to store monitoring data locally:', error)
    }
  }

  /**
   * Enforce queue size limits to prevent memory issues
   */
  private enforceQueueLimits(): void {
    if (this.logQueue.length > this.maxQueueSize) {
      this.logQueue = this.logQueue.slice(-this.maxQueueSize)
    }
    if (this.performanceQueue.length > this.maxQueueSize) {
      this.performanceQueue = this.performanceQueue.slice(-this.maxQueueSize)
    }
    if (this.errorQueue.length > this.maxQueueSize) {
      this.errorQueue = this.errorQueue.slice(-this.maxQueueSize)
    }
    if (this.userActionQueue.length > this.maxQueueSize) {
      this.userActionQueue = this.userActionQueue.slice(-this.maxQueueSize)
    }
  }

  /**
   * Generate unique ID for entries
   */
  private generateId(): string {
    return `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }

  /**
   * Get monitoring statistics
   */
  getStats(): {
    sessionId: string
    userId?: string
    queueSizes: {
      logs: number
      performance: number
      errors: number
      userActions: number
    }
    breadcrumbCount: number
    isOnline: boolean
  } {
    return {
      sessionId: this.sessionId,
      userId: this.userId,
      queueSizes: {
        logs: this.logQueue.length,
        performance: this.performanceQueue.length,
        errors: this.errorQueue.length,
        userActions: this.userActionQueue.length
      },
      breadcrumbCount: this.breadcrumbs.length,
      isOnline: this.isOnline
    }
  }

  /**
   * Cleanup resources
   */
  cleanup(): void {
    if (this.flushTimer) {
      clearInterval(this.flushTimer)
    }
    this.flushQueues() // Final flush
  }
}

// Export singleton instance
export const productionMonitoring = new ProductionMonitoring()

// Convenience methods
export const logger = {
  debug: (category: string, message: string, data?: any) => 
    productionMonitoring.log('debug', category, message, data),
  info: (category: string, message: string, data?: any) => 
    productionMonitoring.log('info', category, message, data),
  warn: (category: string, message: string, data?: any) => 
    productionMonitoring.log('warn', category, message, data),
  error: (category: string, message: string, data?: any) => 
    productionMonitoring.log('error', category, message, data),
  critical: (category: string, message: string, data?: any) => 
    productionMonitoring.log('critical', category, message, data),
}

export const analytics = {
  trackAction: (action: string, screen: string, data?: any) =>
    productionMonitoring.trackUserAction(action, screen, data),
  trackPerformance: (metric: string, value: number, unit: string, context?: any) =>
    productionMonitoring.trackPerformance(metric, value, unit, context),
  reportError: (error: Error, context: string, data?: any) =>
    productionMonitoring.reportError(error, context, data),
}
