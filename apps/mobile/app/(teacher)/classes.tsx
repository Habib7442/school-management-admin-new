import React, { useState } from 'react'
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { useAuthStore } from '../../lib/stores/auth-store'

interface ClassItem {
  id: string
  name: string
  subject: string
  grade: string
  studentCount: number
  schedule: string
  room: string
}

export default function TeacherClasses() {
  const { user } = useAuthStore()
  const [refreshing, setRefreshing] = useState(false)
  const [classes] = useState<ClassItem[]>([
    {
      id: '1',
      name: 'Mathematics 10A',
      subject: 'Mathematics',
      grade: '10th Grade',
      studentCount: 32,
      schedule: 'Mon, Wed, Fri - 9:00 AM',
      room: 'Room 201'
    },
    {
      id: '2',
      name: 'Mathematics 10B',
      subject: 'Mathematics',
      grade: '10th Grade',
      studentCount: 28,
      schedule: 'Tue, Thu - 10:30 AM',
      room: 'Room 203'
    },
    {
      id: '3',
      name: 'Advanced Mathematics',
      subject: 'Mathematics',
      grade: '11th Grade',
      studentCount: 24,
      schedule: 'Mon, Wed, Fri - 2:00 PM',
      room: 'Room 205'
    }
  ])

  const onRefresh = React.useCallback(() => {
    setRefreshing(true)
    // Simulate API call
    setTimeout(() => {
      setRefreshing(false)
    }, 1000)
  }, [])

  const getSubjectColor = (subject: string) => {
    switch (subject.toLowerCase()) {
      case 'mathematics':
        return '#3b82f6'
      case 'science':
        return '#22c55e'
      case 'english':
        return '#f59e0b'
      case 'history':
        return '#8b5cf6'
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
        {/* Header */}
        <View className="px-6 pt-6 pb-4">
          <Text className="text-2xl font-rubik-bold text-gray-800 mb-2">
            My Classes
          </Text>
          <Text className="text-sm font-rubik text-gray-600">
            Manage your assigned classes and students
          </Text>
        </View>

        {/* Stats Cards */}
        <View className="px-6 mb-6">
          <View className="flex-row space-x-4">
            <View className="flex-1 bg-white rounded-xl p-4 shadow-soft">
              <View className="flex-row items-center justify-between">
                <View>
                  <Text className="text-2xl font-rubik-bold text-gray-800">
                    {classes.length}
                  </Text>
                  <Text className="text-sm font-rubik text-gray-600">
                    Total Classes
                  </Text>
                </View>
                <View className="w-10 h-10 bg-blue-100 rounded-full items-center justify-center">
                  <Ionicons name="people" size={20} color="#3b82f6" />
                </View>
              </View>
            </View>

            <View className="flex-1 bg-white rounded-xl p-4 shadow-soft">
              <View className="flex-row items-center justify-between">
                <View>
                  <Text className="text-2xl font-rubik-bold text-gray-800">
                    {classes.reduce((sum, cls) => sum + cls.studentCount, 0)}
                  </Text>
                  <Text className="text-sm font-rubik text-gray-600">
                    Total Students
                  </Text>
                </View>
                <View className="w-10 h-10 bg-green-100 rounded-full items-center justify-center">
                  <Ionicons name="school" size={20} color="#22c55e" />
                </View>
              </View>
            </View>
          </View>
        </View>

        {/* Classes List */}
        <View className="px-6 pb-6">
          <Text className="text-lg font-rubik-semibold text-gray-800 mb-4">
            Your Classes
          </Text>
          
          <View className="space-y-4">
            {classes.map((classItem) => (
              <TouchableOpacity
                key={classItem.id}
                className="bg-white rounded-xl p-4 shadow-soft"
                activeOpacity={0.7}
              >
                <View className="flex-row items-start justify-between mb-3">
                  <View className="flex-1">
                    <Text className="text-lg font-rubik-semibold text-gray-800 mb-1">
                      {classItem.name}
                    </Text>
                    <Text className="text-sm font-rubik text-gray-600">
                      {classItem.grade}
                    </Text>
                  </View>
                  <View 
                    className="px-3 py-1 rounded-full"
                    style={{ backgroundColor: `${getSubjectColor(classItem.subject)}20` }}
                  >
                    <Text 
                      className="text-xs font-rubik-medium"
                      style={{ color: getSubjectColor(classItem.subject) }}
                    >
                      {classItem.subject}
                    </Text>
                  </View>
                </View>

                <View className="space-y-2">
                  <View className="flex-row items-center">
                    <Ionicons name="people-outline" size={16} color="#6b7280" />
                    <Text className="ml-2 text-sm font-rubik text-gray-600">
                      {classItem.studentCount} students
                    </Text>
                  </View>
                  
                  <View className="flex-row items-center">
                    <Ionicons name="time-outline" size={16} color="#6b7280" />
                    <Text className="ml-2 text-sm font-rubik text-gray-600">
                      {classItem.schedule}
                    </Text>
                  </View>
                  
                  <View className="flex-row items-center">
                    <Ionicons name="location-outline" size={16} color="#6b7280" />
                    <Text className="ml-2 text-sm font-rubik text-gray-600">
                      {classItem.room}
                    </Text>
                  </View>
                </View>

                <View className="flex-row mt-4 space-x-3">
                  <TouchableOpacity className="flex-1 bg-blue-50 rounded-lg py-2 px-3">
                    <Text className="text-center text-sm font-rubik-medium text-blue-600">
                      View Students
                    </Text>
                  </TouchableOpacity>
                  
                  <TouchableOpacity className="flex-1 bg-green-50 rounded-lg py-2 px-3">
                    <Text className="text-center text-sm font-rubik-medium text-green-600">
                      Take Attendance
                    </Text>
                  </TouchableOpacity>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  )
}
