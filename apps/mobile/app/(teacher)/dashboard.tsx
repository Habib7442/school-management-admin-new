import React from 'react'
import { View, Text, SafeAreaView, TouchableOpacity } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { router, Redirect } from 'expo-router'
import { useAuthStore } from '../../lib/stores/auth-store'
import Button from '../../components/ui/Button'

export default function TeacherDashboard() {
  const { user, isAuthenticated, logout } = useAuthStore()

  // Redirect if not authenticated or not a teacher
  if (!isAuthenticated || !user) {
    return <Redirect href="/(auth)/login" />
  }

  if (user.role !== 'teacher') {
    return <Redirect href="/(auth)/login" />
  }



  return (
    <SafeAreaView className="flex-1 bg-gray-50">
      <View className="flex-1 p-6">
        {/* Header */}
        <View className="mb-8">
          <Text className="text-2xl font-rubik-bold text-gray-800">
            Welcome back,
          </Text>
          <Text className="text-lg font-rubik text-primary-600">
            {user.name}
          </Text>
        </View>

        {/* Role Badge */}
        <View className="bg-primary-100 rounded-xl p-4 mb-6">
          <View className="flex-row items-center">
            <View className="w-12 h-12 bg-primary-500 rounded-full items-center justify-center mr-4">
              <Ionicons name="school" size={24} color="white" />
            </View>
            <View>
              <Text className="text-lg font-rubik-semibold text-gray-800">
                Teacher Portal
              </Text>
              <Text className="text-sm font-rubik text-gray-600">
                Manage your classes and students
              </Text>
            </View>
          </View>
        </View>

        {/* Quick Actions */}
        <View className="bg-white rounded-2xl p-6 shadow-soft mb-6">
          <Text className="text-lg font-rubik-semibold text-gray-800 mb-4">
            Quick Actions
          </Text>
          
          <View className="space-y-3">
            <TouchableOpacity className="flex-row items-center p-4 bg-gray-50 rounded-xl">
              <Ionicons name="people-outline" size={24} color="#3b82f6" />
              <Text className="ml-3 text-base font-rubik-medium text-gray-800">
                View My Classes
              </Text>
            </TouchableOpacity>
            
            <TouchableOpacity className="flex-row items-center p-4 bg-gray-50 rounded-xl">
              <Ionicons name="checkmark-circle-outline" size={24} color="#22c55e" />
              <Text className="ml-3 text-base font-rubik-medium text-gray-800">
                Take Attendance
              </Text>
            </TouchableOpacity>
            
            <TouchableOpacity className="flex-row items-center p-4 bg-gray-50 rounded-xl">
              <Ionicons name="document-text-outline" size={24} color="#f59e0b" />
              <Text className="ml-3 text-base font-rubik-medium text-gray-800">
                Grade Assignments
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* User Info */}
        <View className="bg-white rounded-2xl p-6 shadow-soft">
          <Text className="text-lg font-rubik-semibold text-gray-800 mb-4">
            Account Information
          </Text>
          
          <View className="space-y-3">
            <View className="flex-row justify-between">
              <Text className="text-sm font-rubik text-gray-600">Email</Text>
              <Text className="text-sm font-rubik-medium text-gray-800">{user.email}</Text>
            </View>
            
            <View className="flex-row justify-between">
              <Text className="text-sm font-rubik text-gray-600">Role</Text>
              <Text className="text-sm font-rubik-medium text-gray-800 capitalize">{user.role}</Text>
            </View>
            
            {user.school_id && (
              <View className="flex-row justify-between">
                <Text className="text-sm font-rubik text-gray-600">School ID</Text>
                <Text className="text-sm font-rubik-medium text-gray-800">{user.school_id}</Text>
              </View>
            )}
          </View>
        </View>
      </View>
    </SafeAreaView>
  )
}
