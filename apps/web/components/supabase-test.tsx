'use client'

import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

export default function SupabaseTest() {
  const [connectionStatus, setConnectionStatus] = useState<'testing' | 'connected' | 'error'>('testing')
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    testConnection()
  }, [])

  const testConnection = async () => {
    try {
      // Test basic connection
      const { data, error } = await supabase.from('profiles').select('count').limit(1)
      
      if (error) {
        // If table doesn't exist, that's still a successful connection
        if (error.message.includes('relation "public.profiles" does not exist')) {
          setConnectionStatus('connected')
          setError('Connected! (profiles table not created yet)')
        } else {
          setConnectionStatus('error')
          setError(error.message)
        }
      } else {
        setConnectionStatus('connected')
        setError(null)
      }
    } catch (err) {
      setConnectionStatus('error')
      setError(err instanceof Error ? err.message : 'Unknown error')
    }
  }

  return (
    <div className="p-4 border rounded-lg">
      <h3 className="text-lg font-semibold mb-2">Supabase Connection Test</h3>
      <div className="flex items-center gap-2">
        <div className={`w-3 h-3 rounded-full ${
          connectionStatus === 'testing' ? 'bg-yellow-500' :
          connectionStatus === 'connected' ? 'bg-green-500' : 'bg-red-500'
        }`} />
        <span>
          {connectionStatus === 'testing' && 'Testing connection...'}
          {connectionStatus === 'connected' && 'Connected to Supabase!'}
          {connectionStatus === 'error' && 'Connection failed'}
        </span>
      </div>
      {error && (
        <p className="text-sm text-gray-600 mt-2">{error}</p>
      )}
      <button 
        onClick={testConnection}
        className="mt-2 px-3 py-1 bg-blue-500 text-white rounded text-sm hover:bg-blue-600"
      >
        Test Again
      </button>
    </div>
  )
}
