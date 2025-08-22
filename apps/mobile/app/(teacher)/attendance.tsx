import React, { useState, useEffect } from 'react'
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { teacherApiService } from '../../lib/api/teacher-api-service'
import { useClassTeacherPermissions } from '../../lib/permissions/classTeacherPermissions'
import EnhancedAttendanceRegistry from '../../components/EnhancedAttendanceRegistry'

interface TeacherClass {
  id: string
  name: string
  section: string
  grade_level: number
  student_count: number
}

interface AttendanceSession {
  id: string
  className: string
  date: string
  time: string
  totalStudents: number
  presentStudents: number
  status: 'completed' | 'pending' | 'missed'
}

export default function TeacherAttendance() {
  const [loading, setLoading] = useState(false)
  const [historyLoading, setHistoryLoading] = useState(false)
  const [selectedTab, setSelectedTab] = useState<'today' | 'history'>('today')
  const [classes, setClasses] = useState<TeacherClass[]>([])
  const [selectedClass, setSelectedClass] = useState<TeacherClass | null>(null)
  const [attendanceHistory, setAttendanceHistory] = useState<any[]>([])
  const [historyError, setHistoryError] = useState<string | null>(null)

  // Class teacher permissions
  const {
    isClassTeacher,
    canUpdateStudents,
    canEnrollStudents,
    canUpdateTimetable,
    canManageClass
  } = useClassTeacherPermissions()

  useEffect(() => {
    if (selectedTab === 'today') {
      loadClasses()
    } else if (selectedTab === 'history') {
      loadAttendanceHistory()
    }
  }, [selectedTab])

  useEffect(() => {
    // Load initial data
    loadClasses()
  }, [])

  const loadClasses = async () => {
    setLoading(true)
    try {
      console.log('📚 Loading classes for attendance...')
      const response = await teacherApiService.getTeacherClassesForAttendance()

      console.log('📚 Attendance classes response:', response)

      if (response.error) {
        console.error('❌ Error loading classes:', response.error)
        Alert.alert('Error', response.error)
        return
      }

      if (response.data) {
        // Transform the data to match our interface
        const classesData = response.data.map(cls => ({
          id: cls.id,
          name: cls.name,
          section: cls.section || '',
          grade_level: cls.grade_level || 0,
          student_count: cls.student_count || 0
        }))
        console.log('📚 Transformed classes data:', classesData)
        setClasses(classesData)
      } else {
        console.log('📚 No classes data received')
        setClasses([])
      }
    } catch (error) {
      console.error('❌ Exception loading classes:', error)
      Alert.alert('Error', 'Failed to load classes')
    } finally {
      setLoading(false)
    }
  }

  const loadAttendanceHistory = async () => {
    setHistoryLoading(true)
    setHistoryError(null)
    try {
      console.log('📚 Loading attendance history...')
      const response = await teacherApiService.getAttendanceHistory(true) // Force refresh

      console.log('📚 Attendance history response:', response)

      if (response.error) {
        console.error('❌ Error loading attendance history:', response.error)
        setHistoryError(response.error)
        return
      }

      if (response.data) {
        console.log('📚 Attendance history data length:', response.data.length)
        console.log('📚 First record:', response.data[0])
        setAttendanceHistory(response.data)
      } else {
        console.log('📚 No attendance history data received')
        setAttendanceHistory([])
      }
    } catch (error) {
      console.error('❌ Exception loading attendance history:', error)
      setHistoryError('Failed to load attendance history')
    } finally {
      setHistoryLoading(false)
    }
  }



  const handleClassSelect = async (classData: TeacherClass) => {
    // Check if user has permissions for this class
    const hasPermission = await canUpdateStudents(classData.id)

    if (!hasPermission) {
      Alert.alert(
        'Access Denied',
        'You do not have permission to manage attendance for this class.',
        [{ text: 'OK' }]
      )
      return
    }

    setSelectedClass(classData)
  }

  const handleAttendanceSaved = () => {
    Alert.alert(
      'Success',
      'Attendance has been saved successfully!',
      [
        {
          text: 'Continue',
          onPress: () => {
            // Stay on the same screen to allow further edits
          }
        },
        {
          text: 'Back to Classes',
          onPress: () => setSelectedClass(null)
        }
      ]
    )
  }

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

  // If a class is selected, show the Enhanced Attendance Registry
  if (selectedClass) {
    return (
      <View className="flex-1">
        {/* Back Button - Reduced padding */}
        <SafeAreaView className="bg-white">
          <View className="flex-row items-center px-4 py-2 border-b border-gray-200">
            <TouchableOpacity
              onPress={() => setSelectedClass(null)}
              className="mr-3"
            >
              <Ionicons name="arrow-back" size={24} color="#374151" />
            </TouchableOpacity>
            <Text className="text-lg font-rubik-semibold text-gray-800">
              Back to Classes
            </Text>
          </View>
        </SafeAreaView>

        <EnhancedAttendanceRegistry
          classId={selectedClass.id}
          className={`${selectedClass.name} ${selectedClass.section ? `- Section ${selectedClass.section}` : ''}`}
          onAttendanceSaved={handleAttendanceSaved}
        />
      </View>
    )
  }

  return (
    <SafeAreaView className="flex-1 bg-gray-50">
      <ScrollView className="flex-1">
        <View className="p-6">
          {/* Header */}
          <View className="mb-6">
            <Text className="text-2xl font-rubik-bold text-gray-800 mb-2">
              Attendance
            </Text>
            <Text className="text-sm font-rubik text-gray-600">
              Track and manage student attendance
            </Text>
          </View>

          {/* Tab Selector */}
          <View className="mb-6">
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
                  Today&apos;s Classes
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
          {/* Content */}
          <View>
          {selectedTab === 'today' ? (
            <View className="space-y-4">
              <Text className="text-lg font-rubik-semibold text-gray-800 mb-2">
                Your Classes
              </Text>

              {loading ? (
                <View className="items-center justify-center py-8">
                  <ActivityIndicator size="large" color="#3b82f6" />
                  <Text className="text-gray-600 font-rubik mt-2">Loading classes...</Text>
                </View>
              ) : classes.length === 0 ? (
                <View className="items-center justify-center py-8">
                  <Ionicons name="school-outline" size={64} color="#d1d5db" />
                  <Text className="text-lg font-rubik-semibold text-gray-800 mt-4 text-center">
                    No Classes Found
                  </Text>
                  <Text className="text-sm font-rubik text-gray-600 mt-2 text-center px-8">
                    You don&apos;t have any classes assigned for attendance management.{'\n'}
                    Make sure you are assigned as a class teacher or have classes in your timetable.
                  </Text>
                  <TouchableOpacity
                    className="mt-4 bg-blue-100 px-6 py-3 rounded-lg"
                    onPress={async () => {
                      try {
                        await teacherApiService.getTeacherClassesForAttendance(true) // Force refresh
                        loadClasses()
                      } catch (error) {
                        console.error('Force refresh error:', error)
                        loadClasses()
                      }
                    }}
                  >
                    <Text className="text-blue-600 font-rubik-medium">Refresh Classes</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                classes.map((classData) => (
                  <TouchableOpacity
                    key={classData.id}
                    className="bg-white rounded-xl p-4 shadow-soft"
                    activeOpacity={0.7}
                    onPress={() => handleClassSelect(classData)}
                  >
                    <View className="flex-row items-start justify-between mb-3">
                      <View className="flex-1">
                        <Text className="text-lg font-rubik-semibold text-gray-800 mb-1">
                          {classData.name}
                        </Text>
                        <View className="flex-row items-center mt-1">
                          <View className="bg-blue-100 px-2 py-1 rounded-full mr-2">
                            <Text className="text-xs font-rubik-medium text-blue-700">
                              Grade {classData.grade_level}
                            </Text>
                          </View>
                          {classData.section && (
                            <View className="bg-green-100 px-2 py-1 rounded-full">
                              <Text className="text-xs font-rubik-medium text-green-700">
                                Section {classData.section}
                              </Text>
                            </View>
                          )}
                        </View>
                      </View>
                      <View className="flex-row items-center">
                        <Ionicons
                          name="time"
                          size={20}
                          color="#f59e0b"
                        />
                        <Text
                          className="ml-1 text-sm font-rubik-medium"
                          style={{ color: "#f59e0b" }}
                        >
                          Ready
                        </Text>
                      </View>
                    </View>

                    <View className="flex-row items-center justify-between mb-4">
                      <View className="flex-row items-center">
                        <Ionicons name="people-outline" size={16} color="#6b7280" />
                        <Text className="ml-2 text-sm font-rubik text-gray-600">
                          {classData.student_count || 0} students
                        </Text>
                      </View>
                    </View>

                    <View className="bg-blue-500 rounded-lg py-3 px-4">
                      <Text className="text-center text-white font-rubik-medium">
                        Take Attendance
                      </Text>
                    </View>
                  </TouchableOpacity>
                ))
              )}
            </View>
          ) : (
            <View className="space-y-4">
              <View className="flex-row items-center justify-between mb-2">
                <Text className="text-lg font-rubik-semibold text-gray-800">
                  Attendance History
                </Text>
                <TouchableOpacity
                  className="bg-blue-100 px-3 py-2 rounded-lg"
                  onPress={() => loadAttendanceHistory()}
                  disabled={historyLoading}
                >
                  <Text className="text-blue-600 font-rubik-medium text-sm">
                    {historyLoading ? 'Loading...' : 'Refresh'}
                  </Text>
                </TouchableOpacity>
              </View>

              {historyLoading ? (
                <View className="items-center justify-center py-8">
                  <ActivityIndicator size="large" color="#3b82f6" />
                  <Text className="text-gray-600 font-rubik mt-2">Loading history...</Text>
                </View>
              ) : historyError ? (
                <View className="items-center justify-center py-8">
                  <Ionicons name="alert-circle-outline" size={64} color="#ef4444" />
                  <Text className="text-lg font-rubik-semibold text-gray-800 mt-4 text-center">
                    Error Loading History
                  </Text>
                  <Text className="text-sm font-rubik text-gray-600 mt-2 text-center px-8">
                    {historyError}
                  </Text>
                  <TouchableOpacity
                    className="mt-4 bg-blue-100 px-6 py-3 rounded-lg"
                    onPress={() => loadAttendanceHistory()}
                  >
                    <Text className="text-blue-600 font-rubik-medium">Retry</Text>
                  </TouchableOpacity>
                </View>
              ) : attendanceHistory.length === 0 ? (
                <View className="items-center justify-center py-8">
                  <Ionicons name="time-outline" size={64} color="#d1d5db" />
                  <Text className="text-lg font-rubik-semibold text-gray-800 mt-4 text-center">
                    No Attendance Records
                  </Text>
                  <Text className="text-sm font-rubik text-gray-600 mt-2 text-center px-8">
                    No attendance has been taken yet. Start by taking attendance for your classes.
                  </Text>
                  <TouchableOpacity
                    className="mt-4 bg-blue-100 px-6 py-3 rounded-lg"
                    onPress={() => setSelectedTab('today')}
                  >
                    <Text className="text-blue-600 font-rubik-medium">Take Attendance Now</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                attendanceHistory.map((record) => (
                  <View key={record.id} className="bg-white rounded-lg p-4 shadow-sm border border-gray-100">
                    <View className="flex-row items-center justify-between mb-3">
                      <View>
                        <Text className="text-lg font-rubik-semibold text-gray-800">
                          {record.class.name}
                        </Text>
                        <Text className="text-sm font-rubik text-gray-600">
                          Grade {record.class.grade_level} - Section {record.class.section}
                        </Text>
                      </View>
                      <View className="items-end">
                        <Text className="text-sm font-rubik-medium text-gray-800">
                          {new Date(record.date).toLocaleDateString('en-US', {
                            weekday: 'short',
                            month: 'short',
                            day: 'numeric'
                          })}
                        </Text>
                        <View className={`px-2 py-1 rounded-full ${
                          record.attendancePercentage >= 80 ? 'bg-green-100' :
                          record.attendancePercentage >= 60 ? 'bg-yellow-100' : 'bg-red-100'
                        }`}>
                          <Text className={`text-xs font-rubik-medium ${
                            record.attendancePercentage >= 80 ? 'text-green-700' :
                            record.attendancePercentage >= 60 ? 'text-yellow-700' : 'text-red-700'
                          }`}>
                            {record.attendancePercentage}%
                          </Text>
                        </View>
                      </View>
                    </View>

                    <View className="flex-row items-center justify-between">
                      <View className="flex-row items-center space-x-4">
                        <View className="flex-row items-center">
                          <View className="w-3 h-3 bg-green-500 rounded-full mr-2" />
                          <Text className="text-sm font-rubik text-gray-600">
                            {record.presentCount} Present
                          </Text>
                        </View>
                        <View className="flex-row items-center">
                          <View className="w-3 h-3 bg-red-500 rounded-full mr-2" />
                          <Text className="text-sm font-rubik text-gray-600">
                            {record.absentCount} Absent
                          </Text>
                        </View>
                      </View>
                      <Text className="text-sm font-rubik text-gray-500">
                        Total: {record.totalStudents}
                      </Text>
                    </View>
                  </View>
                ))
              )}
            </View>
          )}
          </View>
        </View>
        </View>

        
      </ScrollView>
    </SafeAreaView>
  )
}
