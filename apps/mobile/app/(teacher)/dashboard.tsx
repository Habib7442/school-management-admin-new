import React, { useState, useEffect } from 'react'
import { View, Text, TouchableOpacity, ScrollView, Alert, RefreshControl } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { router, Redirect, Link } from 'expo-router'
import { useAuthStore } from '../../lib/stores/auth-store'
import { teacherApiService } from '../../lib/api/teacher-api-service'

interface DashboardStats {
  totalClasses: number
  totalStudents: number
  pendingAssignments: number
  todayAttendance: number
  upcomingLessons: number
}

interface UpcomingClass {
  id: string
  name: string
  subject: string
  time: string
  room: string
}

export default function TeacherDashboard() {
  const { user, isAuthenticated, logout } = useAuthStore()
  const [refreshing, setRefreshing] = useState(false)
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState<DashboardStats>({
    totalClasses: 0,
    totalStudents: 0,
    pendingAssignments: 0,
    todayAttendance: 0,
    upcomingLessons: 0
  })
  const [upcomingClasses, setUpcomingClasses] = useState<UpcomingClass[]>([])

  useEffect(() => {
    loadDashboardData()
  }, [])

  // Redirect if not authenticated or not a teacher
  if (!isAuthenticated || !user) {
    return <Redirect href="/(auth)/login" />
  }

  if (user.role !== 'teacher') {
    return <Redirect href="/(auth)/login" />
  }

  const loadDashboardData = async () => {
    try {
      setLoading(true)

      // Load teacher's classes
      const classesResponse = await teacherApiService.getTeacherClasses()
      if (classesResponse.data) {
        const totalStudents = classesResponse.data.reduce((sum, cls) => sum + (cls.student_count || 0), 0)

        setStats(prev => ({
          ...prev,
          totalClasses: classesResponse.data?.length || 0,
          totalStudents
        }))

        // Mock upcoming classes for now - in real app, this would come from timetable
        setUpcomingClasses([
          {
            id: '1',
            name: classesResponse.data[0]?.name || 'Class 10A',
            subject: 'Mathematics',
            time: '10:00 AM',
            room: 'Room 201'
          },
          {
            id: '2',
            name: classesResponse.data[1]?.name || 'Class 10B',
            subject: 'Mathematics',
            time: '2:00 PM',
            room: 'Room 203'
          }
        ])
      }

      // Load pending assignments count
      const assignmentsResponse = await teacherApiService.getTeacherAssignments({ status: 'published' })
      if (assignmentsResponse.data) {
        setStats(prev => ({
          ...prev,
          pendingAssignments: assignmentsResponse.data?.length || 0
        }))
      }

    } catch (error) {
      console.error('Error loading dashboard data:', error)
      Alert.alert('Error', 'Failed to load dashboard data')
    } finally {
      setLoading(false)
    }
  }

  const onRefresh = async () => {
    setRefreshing(true)
    await loadDashboardData()
    setRefreshing(false)
  }



  return (
    <SafeAreaView className="flex-1 bg-gray-50">
      <ScrollView
        className="flex-1"
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        <View className="p-6">
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

        {/* Stats Cards */}
        <View className="mb-6">
          <View className="flex-row mb-3">
            <View className="flex-1 bg-white rounded-xl p-4 shadow-soft mr-2">
              <View className="flex-row items-center justify-between">
                <View className="flex-1 mr-2">
                  <Text className="text-2xl font-rubik-bold text-blue-600">
                    {stats.totalClasses}
                  </Text>
                  <Text className="text-sm font-rubik text-gray-600">
                    My Classes
                  </Text>
                </View>
                <View className="w-10 h-10 bg-blue-100 rounded-full items-center justify-center flex-shrink-0">
                  <Ionicons name="school" size={18} color="#3b82f6" />
                </View>
              </View>
            </View>

            <View className="flex-1 bg-white rounded-xl p-4 shadow-soft ml-2">
              <View className="flex-row items-center justify-between">
                <View className="flex-1 mr-2">
                  <Text className="text-2xl font-rubik-bold text-green-600">
                    {stats.totalStudents}
                  </Text>
                  <Text className="text-sm font-rubik text-gray-600">
                    Students
                  </Text>
                </View>
                <View className="w-10 h-10 bg-green-100 rounded-full items-center justify-center flex-shrink-0">
                  <Ionicons name="people" size={18} color="#22c55e" />
                </View>
              </View>
            </View>
          </View>

          <View className="flex-row">
            <View className="flex-1 bg-white rounded-xl p-4 shadow-soft mr-2">
              <View className="flex-row items-center justify-between">
                <View className="flex-1 mr-2">
                  <Text className="text-2xl font-rubik-bold text-orange-600">
                    {stats.pendingAssignments}
                  </Text>
                  <Text className="text-sm font-rubik text-gray-600">
                    Assignments
                  </Text>
                </View>
                <View className="w-10 h-10 bg-orange-100 rounded-full items-center justify-center flex-shrink-0">
                  <Ionicons name="document-text" size={18} color="#f59e0b" />
                </View>
              </View>
            </View>

            <View className="flex-1 bg-white rounded-xl p-4 shadow-soft ml-2">
              <View className="flex-row items-center justify-between">
                <View className="flex-1 mr-2">
                  <Text className="text-2xl font-rubik-bold text-purple-600">
                    {stats.todayAttendance}
                  </Text>
                  <Text className="text-sm font-rubik text-gray-600">
                    Today's Attendance
                  </Text>
                </View>
                <View className="w-10 h-10 bg-purple-100 rounded-full items-center justify-center flex-shrink-0">
                  <Ionicons name="checkmark-circle" size={18} color="#8b5cf6" />
                </View>
              </View>
            </View>
          </View>
        </View>

        {/* Quick Actions */}
        <View className="bg-white rounded-2xl p-6 shadow-soft mb-6">
          <Text className="text-lg font-rubik-semibold text-gray-800 mb-4">
            Quick Actions
          </Text>

          <View className="space-y-3">
            <Link href="/(teacher)/classes" asChild>
              <TouchableOpacity className="flex-row items-center p-4 bg-gray-50 rounded-xl">
                <View className="w-8 h-8 items-center justify-center mr-3 flex-shrink-0">
                  <Ionicons name="people-outline" size={22} color="#3b82f6" />
                </View>
                <Text className="text-base font-rubik-medium text-gray-800 flex-1">
                  View My Classes
                </Text>
              </TouchableOpacity>
            </Link>

            <Link href="/(teacher)/attendance" asChild>
              <TouchableOpacity className="flex-row items-center p-4 bg-gray-50 rounded-xl">
                <View className="w-8 h-8 items-center justify-center mr-3 flex-shrink-0">
                  <Ionicons name="checkmark-circle-outline" size={22} color="#22c55e" />
                </View>
                <Text className="text-base font-rubik-medium text-gray-800 flex-1">
                  Take Attendance
                </Text>
              </TouchableOpacity>
            </Link>

            <Link href="/(teacher)/grades" asChild>
              <TouchableOpacity className="flex-row items-center p-4 bg-gray-50 rounded-xl">
                <View className="w-8 h-8 items-center justify-center mr-3 flex-shrink-0">
                  <Ionicons name="document-text-outline" size={22} color="#f59e0b" />
                </View>
                <Text className="text-base font-rubik-medium text-gray-800 flex-1">
                  Grade Assignments
                </Text>
              </TouchableOpacity>
            </Link>

            <TouchableOpacity
              className="flex-row items-center p-4 bg-gray-50 rounded-xl"
              onPress={() => router.push('/lesson-planning')}
            >
              <View className="w-8 h-8 items-center justify-center mr-3 flex-shrink-0">
                <Ionicons name="book-outline" size={22} color="#8b5cf6" />
              </View>
              <Text className="text-base font-rubik-medium text-gray-800 flex-1">
                Lesson Planning
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Today's Schedule */}
        {upcomingClasses.length > 0 && (
          <View className="bg-white rounded-2xl p-6 shadow-soft mb-6">
            <Text className="text-lg font-rubik-semibold text-gray-800 mb-4">
              Today&apos;s Schedule
            </Text>

            <View className="space-y-3">
              {upcomingClasses.map((classItem) => (
                <View key={classItem.id} className="flex-row items-center p-3 bg-gray-50 rounded-xl">
                  <View className="w-12 h-12 bg-blue-100 rounded-full items-center justify-center mr-3">
                    <Ionicons name="time" size={20} color="#3b82f6" />
                  </View>
                  <View className="flex-1">
                    <Text className="text-base font-rubik-semibold text-gray-800">
                      {classItem.name} - {classItem.subject}
                    </Text>
                    <Text className="text-sm font-rubik text-gray-600">
                      {classItem.time} • {classItem.room}
                    </Text>
                  </View>
                </View>
              ))}
            </View>
          </View>
        )}


        </View>
      </ScrollView>
    </SafeAreaView>
  )
}
