import React, { useEffect } from 'react'
import { View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { router } from 'expo-router'
import { useAuthStore } from '@/lib/stores/auth-store'
import LoginScreen from './(auth)/login'

export default function IndexScreen() {
  const { user, isAuthenticated, isLoading } = useAuthStore()

  useEffect(() => {
    if (!isLoading && isAuthenticated && user) {
      // Redirect based on user role
      switch (user.role) {
        case 'admin':
        case 'sub-admin':
          router.replace('/admin-dashboard' as any)
          break
        case 'teacher':
          router.replace('/teacher-dashboard' as any)
          break
        case 'student':
          router.replace('/student-dashboard' as any)
          break
        default:
          router.replace('/(tabs)' as any)
          break
      }
    }
  }, [isAuthenticated, user, isLoading])

  // Show loading state while checking authentication
  if (isLoading) {
    return (
      <SafeAreaView className="flex-1 bg-gradient-to-br from-primary-50 to-secondary-50">
        <View className="flex-1 justify-center items-center">
          <View className="w-8 h-8 border-2 border-primary-600 border-t-transparent rounded-full animate-spin mb-4" />
          <View className="text-gray-600">Loading...</View>
        </View>
      </SafeAreaView>
    )
  }

  // Show login form for unauthenticated users
  if (!isAuthenticated) {
    return <LoginScreen />
  }

  // This should rarely be reached due to the redirect effect above
  return <LoginScreen />
}
