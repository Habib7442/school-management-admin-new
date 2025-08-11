'use client'

import { useEffect } from 'react'
import { initializeAuth } from '@/lib/stores/auth-store'

export function AuthProvider({ children }: { children: React.ReactNode }) {
  // Initialize authentication on app start
  useEffect(() => {
    const init = async () => {
      try {
        console.log('Initializing auth...')
        await initializeAuth()
        console.log('Auth initialization completed')
      } catch (error) {
        console.error('Failed to initialize auth:', error)
      }
    }

    // Only initialize once
    init()
  }, [])

  return <>{children}</>
}
