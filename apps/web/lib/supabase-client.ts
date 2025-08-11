'use client'

import { createBrowserClient } from '@supabase/ssr'
import type { Database } from './supabase'

// Create a single instance of the Supabase client for client-side use
export const createClient = () => {
  return createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}

// Export a singleton instance for convenience
export const supabase = createClient()
