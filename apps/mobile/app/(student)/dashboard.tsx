import React, { useState } from 'react'
import { View, Text, ScrollView, TouchableOpacity, RefreshControl } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { Redirect } from 'expo-router'
import { useAuthStore } from '../../lib/stores/auth-store'

interface UpcomingClass {
  id: string
  subject: string
  teacher: string
  time: string
  room: string
  type: 'lecture' | 'lab' | 'tutorial'
}

interface Assignment {
  id: string
  title: string
  subject: string
  dueDate: string
  status: 'pending' | 'submitted' | 'graded'
}

export default function StudentDashboard() {
  const { user, isAuthenticated } = useAuthStore()
  const [refreshing, setRefreshing] = useState(false)

  // Redirect if not authenticated or not a student
  if (!isAuthenticated || !user) {
    return <Redirect href="/(auth)/login" />
  }

  if (user.role !== 'student') {
    return <Redirect href="/(auth)/login" />
  }

  const [upcomingClasses] = useState<UpcomingClass[]>([
    {
      id: '1',
      subject: 'Mathematics',
      teacher: 'Mr. Smith',
      time: '10:00 AM',
      room: 'Room 201',
      type: 'lecture'
    },
    {
      id: '2',
      subject: 'Physics',
      teacher: 'Dr. Johnson',
      time: '2:00 PM',
      room: 'Lab 3',
      type: 'lab'
    }
  ])

  const [recentAssignments] = useState<Assignment[]>([
    {
      id: '1',
      title: 'Algebra Quiz',
      subject: 'Mathematics',
      dueDate: 'Tomorrow',
      status: 'pending'
    },
    {
      id: '2',
      title: 'Physics Lab Report',
      subject: 'Physics',
      dueDate: 'Next Week',
      status: 'pending'
    }
  ])

  const onRefresh = React.useCallback(() => {
    setRefreshing(true)
    setTimeout(() => {
      setRefreshing(false)
    }, 1000)
  }, [])

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'lecture':
        return '#3b82f6'
      case 'lab':
        return '#22c55e'
      case 'tutorial':
        return '#f59e0b'
      default:
        return '#6b7280'
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return '#f59e0b'
      case 'submitted':
        return '#3b82f6'
      case 'graded':
        return '#22c55e'
      default:
        return '#6b7280'
    }
  }

  return (
    <SafeAreaView className="flex-1 bg-gray-50">
      <ScrollView
        className="flex-1"
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        <View className="flex-1 p-6">
          {/* Header */}
          <View className="mb-8">
            <Text className="text-2xl font-rubik-bold text-gray-800">
              Welcome back,
            </Text>
            <Text className="text-lg font-rubik text-green-600">
              {user.name}
            </Text>
          </View>

          {/* Stats Cards */}
          <View className="flex-row space-x-4 mb-6">
            <View className="flex-1 bg-white rounded-xl p-4 shadow-soft">
              <View className="flex-row items-center justify-between">
                <View>
                  <Text className="text-2xl font-rubik-bold text-gray-800">
                    {upcomingClasses.length}
                  </Text>
                  <Text className="text-sm font-rubik text-gray-600">
                    Today's Classes
                  </Text>
                </View>
                <View className="w-10 h-10 bg-blue-100 rounded-full items-center justify-center">
                  <Ionicons name="calendar" size={20} color="#3b82f6" />
                </View>
              </View>
            </View>

            <View className="flex-1 bg-white rounded-xl p-4 shadow-soft">
              <View className="flex-row items-center justify-between">
                <View>
                  <Text className="text-2xl font-rubik-bold text-gray-800">
                    {recentAssignments.filter(a => a.status === 'pending').length}
                  </Text>
                  <Text className="text-sm font-rubik text-gray-600">
                    Pending Tasks
                  </Text>
                </View>
                <View className="w-10 h-10 bg-orange-100 rounded-full items-center justify-center">
                  <Ionicons name="document-text" size={20} color="#f59e0b" />
                </View>
              </View>
            </View>
          </View>

          {/* Today's Classes */}
          <View className="mb-6">
            <Text className="text-lg font-rubik-semibold text-gray-800 mb-4">
              Today's Classes
            </Text>

            <View className="space-y-3">
              {upcomingClasses.map((classItem) => (
                <TouchableOpacity
                  key={classItem.id}
                  className="bg-white rounded-xl p-4 shadow-soft"
                  activeOpacity={0.7}
                >
                  <View className="flex-row items-center justify-between mb-2">
                    <Text className="text-lg font-rubik-semibold text-gray-800">
                      {classItem.subject}
                    </Text>
                    <View
                      className="px-2 py-1 rounded-full"
                      style={{ backgroundColor: `${getTypeColor(classItem.type)}20` }}
                    >
                      <Text
                        className="text-xs font-rubik-medium capitalize"
                        style={{ color: getTypeColor(classItem.type) }}
                      >
                        {classItem.type}
                      </Text>
                    </View>
                  </View>

                  <View className="space-y-1">
                    <View className="flex-row items-center">
                      <Ionicons name="person-outline" size={16} color="#6b7280" />
                      <Text className="ml-2 text-sm font-rubik text-gray-600">
                        {classItem.teacher}
                      </Text>
                    </View>

                    <View className="flex-row items-center">
                      <Ionicons name="time-outline" size={16} color="#6b7280" />
                      <Text className="ml-2 text-sm font-rubik text-gray-600">
                        {classItem.time}
                      </Text>
                    </View>

                    <View className="flex-row items-center">
                      <Ionicons name="location-outline" size={16} color="#6b7280" />
                      <Text className="ml-2 text-sm font-rubik text-gray-600">
                        {classItem.room}
                      </Text>
                    </View>
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Recent Assignments */}
          <View className="mb-6">
            <Text className="text-lg font-rubik-semibold text-gray-800 mb-4">
              Recent Assignments
            </Text>

            <View className="space-y-3">
              {recentAssignments.map((assignment) => (
                <TouchableOpacity
                  key={assignment.id}
                  className="bg-white rounded-xl p-4 shadow-soft"
                  activeOpacity={0.7}
                >
                  <View className="flex-row items-center justify-between mb-2">
                    <Text className="text-lg font-rubik-semibold text-gray-800">
                      {assignment.title}
                    </Text>
                    <View
                      className="px-2 py-1 rounded-full"
                      style={{ backgroundColor: `${getStatusColor(assignment.status)}20` }}
                    >
                      <Text
                        className="text-xs font-rubik-medium capitalize"
                        style={{ color: getStatusColor(assignment.status) }}
                      >
                        {assignment.status}
                      </Text>
                    </View>
                  </View>

                  <View className="flex-row items-center justify-between">
                    <Text className="text-sm font-rubik text-gray-600">
                      {assignment.subject}
                    </Text>
                    <Text className="text-sm font-rubik-medium text-gray-800">
                      Due: {assignment.dueDate}
                    </Text>
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Quick Actions */}
          <View className="bg-white rounded-xl p-6 shadow-soft">
            <Text className="text-lg font-rubik-semibold text-gray-800 mb-4">
              Quick Actions
            </Text>

            <View className="flex-row flex-wrap gap-3">
              <TouchableOpacity className="flex-1 min-w-[45%] bg-blue-50 rounded-lg p-4 items-center">
                <Ionicons name="calendar-outline" size={24} color="#3b82f6" />
                <Text className="mt-2 text-sm font-rubik-medium text-blue-600 text-center">
                  View Schedule
                </Text>
              </TouchableOpacity>

              <TouchableOpacity className="flex-1 min-w-[45%] bg-green-50 rounded-lg p-4 items-center">
                <Ionicons name="bar-chart-outline" size={24} color="#22c55e" />
                <Text className="mt-2 text-sm font-rubik-medium text-green-600 text-center">
                  Check Grades
                </Text>
              </TouchableOpacity>

              <TouchableOpacity className="flex-1 min-w-[45%] bg-orange-50 rounded-lg p-4 items-center">
                <Ionicons name="document-text-outline" size={24} color="#f59e0b" />
                <Text className="mt-2 text-sm font-rubik-medium text-orange-600 text-center">
                  Assignments
                </Text>
              </TouchableOpacity>

              <TouchableOpacity className="flex-1 min-w-[45%] bg-purple-50 rounded-lg p-4 items-center">
                <Ionicons name="library-outline" size={24} color="#8b5cf6" />
                <Text className="mt-2 text-sm font-rubik-medium text-purple-600 text-center">
                  Library
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  )
}
