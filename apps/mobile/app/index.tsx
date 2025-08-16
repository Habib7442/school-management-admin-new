import React from 'react'
import { View, Text, SafeAreaView } from 'react-native'
import { Redirect } from 'expo-router'
import { useAuthStore } from '../lib/stores/auth-store'
import { Ionicons } from '@expo/vector-icons'

export default function IndexScreen() {
  const { user, isAuthenticated, isLoading } = useAuthStore()

  // Type-safe components
  const Icon = Ionicons as any

  // Show loading screen while auth is being determined
  if (isLoading) {
    return (
      <SafeAreaView className="flex-1 bg-white">
        <View className="flex-1 justify-center items-center px-6">
          <View className="w-20 h-20 rounded-full bg-primary-100 items-center justify-center mb-6">
            <Icon name="school" size={40} color="#3b82f6" />
          </View>

          <View className="w-8 h-8 bg-primary-500 rounded-full mb-4 opacity-75" />

          <Text className="text-xl font-rubik-semibold text-gray-800 mb-2">
            School Management
          </Text>
          <Text className="text-gray-600 font-rubik text-center">
            Loading your dashboard...
          </Text>
        </View>
      </SafeAreaView>
    )
  }

  // Redirect based on authentication state and user role
  if (!isAuthenticated || !user) {
    return <Redirect href="/(auth)/login" />
  }

  // Redirect based on user role
  switch (user.role) {
    case 'teacher':
      return <Redirect href="/(teacher)/dashboard" />
    case 'student':
      return <Redirect href="/(student)/dashboard" />
    default:
      // Unsupported role for mobile app
      return <Redirect href="/(auth)/login" />
  }
}
