import { useState, useEffect } from 'react'
import { View, Text, TouchableOpacity } from 'react-native'
import { supabase } from '../lib/supabase'

export default function SupabaseTest() {
  const [connectionStatus, setConnectionStatus] = useState<'testing' | 'connected' | 'error'>('testing')
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    testConnection()
  }, [])

  const testConnection = async () => {
    try {
      setConnectionStatus('testing')
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

  const getStatusColorClass = () => {
    switch (connectionStatus) {
      case 'testing': return 'bg-yellow-500'
      case 'connected': return 'bg-green-500'
      case 'error': return 'bg-red-500'
      default: return 'bg-gray-500'
    }
  }

  const getStatusText = () => {
    switch (connectionStatus) {
      case 'testing': return 'Testing connection...'
      case 'connected': return 'Connected to Supabase!'
      case 'error': return 'Connection failed'
      default: return 'Unknown status'
    }
  }

  return (
    <View className="p-4 border border-gray-200 rounded-lg m-4 bg-white">
      <Text className="text-lg font-rubik-semibold mb-2 text-gray-800">
        Supabase Connection Test
      </Text>
      <View className="flex-row items-center mb-2">
        <View className={`w-3 h-3 rounded-full mr-2 ${getStatusColorClass()}`} />
        <Text className="text-base font-rubik text-gray-700">
          {getStatusText()}
        </Text>
      </View>
      {error && (
        <Text className="text-sm font-rubik text-gray-600 mb-2">
          {error}
        </Text>
      )}
      <TouchableOpacity
        className="bg-blue-500 px-3 py-2 rounded-md self-start"
        onPress={testConnection}
      >
        <Text className="text-white text-sm font-rubik-medium">
          Test Again
        </Text>
      </TouchableOpacity>
    </View>
  )
}
