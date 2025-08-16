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

interface AttendanceSession {
  id: string
  className: string
  date: string
  time: string
  totalStudents: number
  presentStudents: number
  status: 'completed' | 'pending' | 'missed'
}

interface Student {
  id: string
  name: string
  rollNumber: string
  status: 'present' | 'absent' | 'late'
}

export default function TeacherAttendance() {
  const [refreshing, setRefreshing] = useState(false)
  const [selectedTab, setSelectedTab] = useState<'today' | 'history'>('today')
  
  const [todayClasses] = useState<AttendanceSession[]>([
    {
      id: '1',
      className: 'Mathematics 10A',
      date: 'Today',
      time: '9:00 AM',
      totalStudents: 32,
      presentStudents: 0,
      status: 'pending'
    },
    {
      id: '2',
      className: 'Advanced Mathematics',
      date: 'Today',
      time: '2:00 PM',
      totalStudents: 24,
      presentStudents: 0,
      status: 'pending'
    }
  ])

  const [attendanceHistory] = useState<AttendanceSession[]>([
    {
      id: '3',
      className: 'Mathematics 10A',
      date: 'Yesterday',
      time: '9:00 AM',
      totalStudents: 32,
      presentStudents: 30,
      status: 'completed'
    },
    {
      id: '4',
      className: 'Mathematics 10B',
      date: 'Yesterday',
      time: '10:30 AM',
      totalStudents: 28,
      presentStudents: 26,
      status: 'completed'
    },
    {
      id: '5',
      className: 'Advanced Mathematics',
      date: 'Yesterday',
      time: '2:00 PM',
      totalStudents: 24,
      presentStudents: 22,
      status: 'completed'
    }
  ])

  const onRefresh = React.useCallback(() => {
    setRefreshing(true)
    setTimeout(() => {
      setRefreshing(false)
    }, 1000)
  }, [])

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return '#22c55e'
      case 'pending':
        return '#f59e0b'
      case 'missed':
        return '#ef4444'
      default:
        return '#6b7280'
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return 'checkmark-circle'
      case 'pending':
        return 'time'
      case 'missed':
        return 'close-circle'
      default:
        return 'help-circle'
    }
  }

  const getAttendancePercentage = (present: number, total: number) => {
    return total > 0 ? Math.round((present / total) * 100) : 0
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
            Attendance
          </Text>
          <Text className="text-sm font-rubik text-gray-600">
            Track and manage student attendance
          </Text>
        </View>

        {/* Tab Selector */}
        <View className="px-6 mb-6">
          <View className="bg-white rounded-xl p-1 shadow-soft">
            <View className="flex-row">
              <TouchableOpacity
                className={`flex-1 py-3 px-4 rounded-lg ${
                  selectedTab === 'today' ? 'bg-blue-500' : 'bg-transparent'
                }`}
                onPress={() => setSelectedTab('today')}
              >
                <Text
                  className={`text-center font-rubik-medium ${
                    selectedTab === 'today' ? 'text-white' : 'text-gray-600'
                  }`}
                >
                  Today's Classes
                </Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                className={`flex-1 py-3 px-4 rounded-lg ${
                  selectedTab === 'history' ? 'bg-blue-500' : 'bg-transparent'
                }`}
                onPress={() => setSelectedTab('history')}
              >
                <Text
                  className={`text-center font-rubik-medium ${
                    selectedTab === 'history' ? 'text-white' : 'text-gray-600'
                  }`}
                >
                  History
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* Content */}
        <View className="px-6 pb-6">
          {selectedTab === 'today' ? (
            <View className="space-y-4">
              <Text className="text-lg font-rubik-semibold text-gray-800 mb-2">
                Today's Classes
              </Text>
              
              {todayClasses.map((session) => (
                <TouchableOpacity
                  key={session.id}
                  className="bg-white rounded-xl p-4 shadow-soft"
                  activeOpacity={0.7}
                >
                  <View className="flex-row items-start justify-between mb-3">
                    <View className="flex-1">
                      <Text className="text-lg font-rubik-semibold text-gray-800 mb-1">
                        {session.className}
                      </Text>
                      <Text className="text-sm font-rubik text-gray-600">
                        {session.time}
                      </Text>
                    </View>
                    <View className="flex-row items-center">
                      <Ionicons
                        name={getStatusIcon(session.status)}
                        size={20}
                        color={getStatusColor(session.status)}
                      />
                      <Text
                        className="ml-1 text-sm font-rubik-medium capitalize"
                        style={{ color: getStatusColor(session.status) }}
                      >
                        {session.status}
                      </Text>
                    </View>
                  </View>

                  <View className="flex-row items-center justify-between mb-4">
                    <View className="flex-row items-center">
                      <Ionicons name="people-outline" size={16} color="#6b7280" />
                      <Text className="ml-2 text-sm font-rubik text-gray-600">
                        {session.totalStudents} students
                      </Text>
                    </View>
                  </View>

                  <TouchableOpacity className="bg-blue-500 rounded-lg py-3 px-4">
                    <Text className="text-center text-white font-rubik-medium">
                      {session.status === 'pending' ? 'Take Attendance' : 'View Attendance'}
                    </Text>
                  </TouchableOpacity>
                </TouchableOpacity>
              ))}
            </View>
          ) : (
            <View className="space-y-4">
              <Text className="text-lg font-rubik-semibold text-gray-800 mb-2">
                Attendance History
              </Text>
              
              {attendanceHistory.map((session) => (
                <TouchableOpacity
                  key={session.id}
                  className="bg-white rounded-xl p-4 shadow-soft"
                  activeOpacity={0.7}
                >
                  <View className="flex-row items-start justify-between mb-3">
                    <View className="flex-1">
                      <Text className="text-lg font-rubik-semibold text-gray-800 mb-1">
                        {session.className}
                      </Text>
                      <Text className="text-sm font-rubik text-gray-600">
                        {session.date} • {session.time}
                      </Text>
                    </View>
                    <View className="items-end">
                      <Text className="text-lg font-rubik-bold text-green-600">
                        {getAttendancePercentage(session.presentStudents, session.totalStudents)}%
                      </Text>
                      <Text className="text-xs font-rubik text-gray-500">
                        Attendance
                      </Text>
                    </View>
                  </View>

                  <View className="flex-row items-center justify-between">
                    <View className="flex-row items-center">
                      <Ionicons name="checkmark-circle" size={16} color="#22c55e" />
                      <Text className="ml-1 text-sm font-rubik text-gray-600">
                        {session.presentStudents} present
                      </Text>
                    </View>
                    
                    <View className="flex-row items-center">
                      <Ionicons name="close-circle" size={16} color="#ef4444" />
                      <Text className="ml-1 text-sm font-rubik text-gray-600">
                        {session.totalStudents - session.presentStudents} absent
                      </Text>
                    </View>
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  )
}
