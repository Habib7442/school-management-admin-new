import React, { useState, useEffect } from 'react'
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Alert,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { useNavigation } from '@react-navigation/native'
import { useAuthStore } from '../../lib/stores/auth-store'
import { teacherApiService, TeacherClass } from '../../lib/api/teacher-api-service'
import ClassTeacherModal from '../../components/ClassTeacherModal'



export default function TeacherClasses() {
  const { user } = useAuthStore()
  const navigation = useNavigation()
  const [refreshing, setRefreshing] = useState(false)
  const [loading, setLoading] = useState(true)
  const [classes, setClasses] = useState<TeacherClass[]>([])
  const [showClassTeacherModal, setShowClassTeacherModal] = useState(false)
  const [selectedClass, setSelectedClass] = useState<TeacherClass | null>(null)

  useEffect(() => {
    loadClasses(true) // Force refresh to see new debugging
  }, [])

  const loadClasses = async (forceRefresh = false) => {
    try {
      setLoading(true)
      console.log('🔄 Loading classes with forceRefresh:', forceRefresh)

      // Clear cache if force refresh
      if (forceRefresh) {
        console.log('🗑️ Clearing cache for fresh data')
      }

      const response = await teacherApiService.getTeacherClasses(forceRefresh)

      if (response.error) {
        Alert.alert('Error', response.error)
        return
      }

      if (response.data) {
        console.log('📚 Classes data received:', JSON.stringify(response.data, null, 2))
        setClasses(response.data)
      }
    } catch (error) {
      console.error('Error loading classes:', error)
      Alert.alert('Error', 'Failed to load classes')
    } finally {
      setLoading(false)
    }
  }

  const onRefresh = async () => {
    setRefreshing(true)
    await loadClasses(true) // Force refresh
    setRefreshing(false)
  }

  const handleClassPress = (classItem: TeacherClass) => {
    // Show class teacher dashboard if this teacher is the class teacher
    setSelectedClass(classItem)
    setShowClassTeacherModal(true)
  }

  const handleViewStudents = (classItem: TeacherClass) => {
    setSelectedClass(classItem)
    setShowClassTeacherModal(true)
  }

  const handleTakeAttendance = (classItem: TeacherClass) => {
    // Navigate directly to attendance tab
    navigation.navigate('attendance' as never)
  }

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
        <View className="flex-1 p-6">
          {/* Header */}
          <View className="mb-6">
            <Text className="text-2xl font-rubik-bold text-gray-800 mb-2">
              My Classes
            </Text>
            <Text className="text-sm font-rubik text-gray-600">
              Manage your assigned classes and students
            </Text>
          </View>

          {/* Stats Cards */}
          <View className="mb-6">
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
                    {classes.reduce((sum, cls) => {
                      console.log(`📊 Class ${cls.name} student_count:`, cls.student_count)
                      return sum + (cls.student_count || 0)
                    }, 0)}
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
          <View>
            <Text className="text-lg font-rubik-semibold text-gray-800 mb-4">
              Your Classes
            </Text>

            <View className="space-y-4">
            {classes.map((classItem) => (
              <TouchableOpacity
                key={classItem.id}
                className="bg-white rounded-xl p-4 shadow-soft"
                activeOpacity={0.7}
                onPress={() => handleClassPress(classItem)}
              >
                <View className="flex-row items-start justify-between mb-3">
                  <View className="flex-1">
                    <Text className="text-lg font-rubik-semibold text-gray-800 mb-1">
                      {classItem.name}
                    </Text>
                    <Text className="text-sm font-rubik text-gray-600">
                      Grade {classItem.grade_level} • Section {classItem.section}
                    </Text>
                  </View>
                  <View
                    className="px-3 py-1 rounded-full"
                    style={{ backgroundColor: `#3b82f620` }}
                  >
                    <Text
                      className="text-xs font-rubik-medium"
                      style={{ color: '#3b82f6' }}
                    >
                      {classItem.student_count || 0} Students
                    </Text>
                  </View>
                </View>

                <View className="space-y-2">
                  <View className="flex-row items-center">
                    <Ionicons name="people-outline" size={16} color="#6b7280" />
                    <Text className="ml-2 text-sm font-rubik text-gray-600">
                      {classItem.student_count || 0} students
                    </Text>
                  </View>

                  <View className="flex-row items-center">
                    <Ionicons name="calendar-outline" size={16} color="#6b7280" />
                    <Text className="ml-2 text-sm font-rubik text-gray-600">
                      Academic Year: {classItem.academic_year}
                    </Text>
                  </View>

                  {classItem.room_number && (
                    <View className="flex-row items-center">
                      <Ionicons name="location-outline" size={16} color="#6b7280" />
                      <Text className="ml-2 text-sm font-rubik text-gray-600">
                        {classItem.room_number}
                      </Text>
                    </View>
                  )}
                </View>

                <View className="flex-row mt-4 space-x-3">
                  <TouchableOpacity
                    className="flex-1 bg-blue-50 rounded-lg py-2 px-3"
                    onPress={() => handleViewStudents(classItem)}
                  >
                    <Text className="text-center text-sm font-rubik-medium text-blue-600">
                      Class Dashboard
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    className="flex-1 bg-green-50 rounded-lg py-2 px-3"
                    onPress={() => handleTakeAttendance(classItem)}
                  >
                    <Text className="text-center text-sm font-rubik-medium text-green-600">
                      Take Attendance
                    </Text>
                  </TouchableOpacity>
                </View>
              </TouchableOpacity>
            ))}
            </View>
          </View>
        </View>
      </ScrollView>

      {/* Class Teacher Modal */}
      {selectedClass && (
        <ClassTeacherModal
          visible={showClassTeacherModal}
          onClose={() => {
            setShowClassTeacherModal(false)
            setSelectedClass(null)
          }}
          classId={selectedClass.id}
          className={selectedClass.name}
        />
      )}
    </SafeAreaView>
  )
}
