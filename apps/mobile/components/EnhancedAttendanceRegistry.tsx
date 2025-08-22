import React, { useState, useEffect } from 'react'
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Alert,
  TextInput,
  ActivityIndicator,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import {
  teacherApiService,
  ClassStudentInfo
} from '../lib/api/teacher-api-service'
import { useAuthStore } from '../lib/stores/auth-store'

interface EnhancedAttendanceRegistryProps {
  classId: string
  className: string
  onAttendanceSaved: () => void
}

interface AttendanceStats {
  totalStudents: number
  presentCount: number
  absentCount: number
  unmarkedCount: number
}

export default function EnhancedAttendanceRegistry({
  classId,
  className,
  onAttendanceSaved
}: EnhancedAttendanceRegistryProps) {
  const { user } = useAuthStore()
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [students, setStudents] = useState<ClassStudentInfo[]>([])
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0])
  const [searchTerm, setSearchTerm] = useState('')
  const [attendance, setAttendance] = useState<Record<string, 'present' | 'absent' | undefined>>({})
  const [existingAttendance, setExistingAttendance] = useState<boolean>(false)

  useEffect(() => {
    loadStudents()
  }, [classId])

  useEffect(() => {
    if (students.length > 0) {
      checkExistingAttendance()
    }
  }, [selectedDate, students])

  const loadStudents = async () => {
    setLoading(true)
    try {
      // Try the attendance registry function first, then fallback to regular class students
      let response = await teacherApiService.getStudentsForAttendanceRegistry(classId)

      // If no students found, try the regular class students function
      if (!response.data || response.data.length === 0) {
        console.log('📋 Trying regular class students function as fallback')
        response = await teacherApiService.getClassStudents(classId)
      }

      if (response.error) {
        Alert.alert('Error', response.error)
        return
      }

      if (response.data) {
        console.log('📋 Loaded students:', response.data.length)
        setStudents(response.data)
      }
    } catch (error) {
      console.error('❌ Error loading students:', error)
      Alert.alert('Error', 'Failed to load students')
    } finally {
      setLoading(false)
    }
  }

  const checkExistingAttendance = async () => {
    try {
      const response = await teacherApiService.getExistingAttendance(classId, selectedDate)
      
      if (response.error) {
        console.error('Error checking existing attendance:', response.error)
        return
      }

      if (response.data && Object.keys(response.data).length > 0) {
        setExistingAttendance(true)
        setAttendance(response.data)
      } else {
        setExistingAttendance(false)
        setAttendance({})
      }
    } catch (error) {
      console.error('Error checking existing attendance:', error)
    }
  }

  const handleAttendanceChange = (studentId: string, status: 'present' | 'absent') => {
    setAttendance(prev => ({
      ...prev,
      [studentId]: prev[studentId] === status ? undefined : status
    }))
  }

  const markAllPresent = () => {
    const allPresentAttendance: Record<string, 'present'> = {}
    filteredStudents.forEach(student => {
      allPresentAttendance[student.id] = 'present'
    })
    setAttendance(allPresentAttendance)
  }

  const markAllAbsent = () => {
    const allAbsentAttendance: Record<string, 'absent'> = {}
    filteredStudents.forEach(student => {
      allAbsentAttendance[student.id] = 'absent'
    })
    setAttendance(allAbsentAttendance)
  }

  const clearAll = () => {
    setAttendance({})
  }

  const saveAttendance = async () => {
    // Check if all students have attendance marked
    const unmarkedStudents = filteredStudents.filter(student => !attendance[student.id])
    if (unmarkedStudents.length > 0) {
      Alert.alert(
        'Incomplete Attendance',
        `Please mark attendance for all students. ${unmarkedStudents.length} students are still unmarked.`,
        [{ text: 'OK' }]
      )
      return
    }

    setSaving(true)
    try {
      // Filter out undefined values
      const validAttendance: Record<string, 'present' | 'absent'> = {}
      Object.entries(attendance).forEach(([studentId, status]) => {
        if (status) {
          validAttendance[studentId] = status
        }
      })

      const response = await teacherApiService.saveAttendanceRecords(
        classId,
        selectedDate,
        validAttendance,
        user?.id || '',
        user?.school_id || ''
      )

      if (response.error) {
        Alert.alert('Error', response.error)
        return
      }

      Alert.alert(
        'Success',
        `Attendance ${existingAttendance ? 'updated' : 'saved'} successfully!`,
        [{ text: 'OK', onPress: onAttendanceSaved }]
      )
      setExistingAttendance(true)
    } catch (error) {
      Alert.alert('Error', 'Failed to save attendance. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  const filteredStudents = students.filter(student =>
    student.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    student.roll_number?.toString().includes(searchTerm) ||
    student.admission_number?.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const attendanceStats: AttendanceStats = {
    totalStudents: filteredStudents.length,
    presentCount: filteredStudents.filter(student => attendance[student.id] === 'present').length,
    absentCount: filteredStudents.filter(student => attendance[student.id] === 'absent').length,
    unmarkedCount: filteredStudents.filter(student => !attendance[student.id]).length
  }

  return (
    <SafeAreaView className="flex-1 bg-white">
      {/* Header - Reduced padding */}
      <View className="px-4 py-2 border-b border-gray-200">
        <Text className="text-xl font-rubik-semibold text-gray-800 mb-1">
          Attendance Registry
        </Text>
        <Text className="text-sm font-rubik text-gray-600">
          {className} - {new Date(selectedDate).toLocaleDateString('en-US', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric'
          })}
        </Text>
        {existingAttendance && (
          <View className="mt-2 bg-blue-50 px-2 py-1 rounded-full self-start">
            <Text className="text-xs font-rubik-medium text-blue-700">
              Previously Marked
            </Text>
          </View>
        )}
      </View>

      {/* Date Selection - Reduced padding */}
      <View className="px-4 py-2 bg-gray-50">
        <Text className="text-sm font-rubik-medium text-gray-700 mb-2">
          Attendance Date
        </Text>
        <TextInput
          value={selectedDate}
          onChangeText={setSelectedDate}
          placeholder="YYYY-MM-DD"
          className="border border-gray-300 rounded-lg px-3 py-2 font-rubik bg-white"
        />
      </View>

      {/* Search - Reduced padding */}
      <View className="px-4 py-2">
        <View className="relative">
          <Ionicons
            name="search"
            size={16}
            color="#6b7280"
            style={{ position: 'absolute', left: 12, top: 12, zIndex: 1 }}
          />
          <TextInput
            value={searchTerm}
            onChangeText={setSearchTerm}
            placeholder="Search students..."
            className="border border-gray-300 rounded-lg pl-10 pr-3 py-2 font-rubik"
          />
        </View>
      </View>

      {/* Stats - Reduced padding and height */}
      <View className="px-4 py-2">
        <View className="flex-row space-x-2">
          <View className="flex-1 bg-blue-50 p-2 rounded-lg items-center">
            <Text className="text-lg font-rubik-bold text-blue-600">
              {attendanceStats.totalStudents}
            </Text>
            <Text className="text-xs font-rubik text-blue-700">Total</Text>
          </View>
          <View className="flex-1 bg-green-50 p-2 rounded-lg items-center">
            <Text className="text-lg font-rubik-bold text-green-600">
              {attendanceStats.presentCount}
            </Text>
            <Text className="text-xs font-rubik text-green-700">Present</Text>
          </View>
          <View className="flex-1 bg-red-50 p-2 rounded-lg items-center">
            <Text className="text-lg font-rubik-bold text-red-600">
              {attendanceStats.absentCount}
            </Text>
            <Text className="text-xs font-rubik text-red-700">Absent</Text>
          </View>
          <View className="flex-1 bg-yellow-50 p-2 rounded-lg items-center">
            <Text className="text-lg font-rubik-bold text-yellow-600">
              {attendanceStats.unmarkedCount}
            </Text>
            <Text className="text-xs font-rubik text-yellow-700">Unmarked</Text>
          </View>
        </View>
      </View>

      {/* Quick Actions - Reduced padding and height */}
      <View className="px-4 py-2">
        <View className="flex-row space-x-2">
          <TouchableOpacity
            onPress={markAllPresent}
            className="flex-1 bg-green-50 border border-green-200 rounded-lg py-2 px-2"
          >
            <Text className="text-center text-green-700 font-rubik-medium text-sm">
              All Present
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={markAllAbsent}
            className="flex-1 bg-red-50 border border-red-200 rounded-lg py-2 px-2"
          >
            <Text className="text-center text-red-700 font-rubik-medium text-sm">
              All Absent
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={clearAll}
            className="flex-1 bg-gray-50 border border-gray-200 rounded-lg py-2 px-2"
          >
            <Text className="text-center text-gray-700 font-rubik-medium text-sm">
              Clear All
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {loading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#3b82f6" />
          <Text className="text-gray-600 font-rubik mt-2">Loading students...</Text>
        </View>
      ) : (
        <View className="flex-1">
          {/* Table Header */}
          <View className="bg-gray-50 rounded-lg p-3 mx-4 mb-2">
            <View className="flex-row items-center">
              <Text className="flex-1 text-xs font-rubik-medium text-gray-700">Student</Text>
              <Text className="w-20 text-center text-xs font-rubik-medium text-gray-700">Present</Text>
              <Text className="w-20 text-center text-xs font-rubik-medium text-gray-700">Absent</Text>
            </View>
          </View>

          {/* Student List - Increased height and better scrolling */}
          <ScrollView
            className="flex-1 px-4"
            showsVerticalScrollIndicator={true}
            contentContainerStyle={{ paddingBottom: 20 }}
          >
            {filteredStudents.length === 0 ? (
              <View className="items-center justify-center py-12">
                <Ionicons name="people-outline" size={64} color="#d1d5db" style={{}} />
                <Text className="text-lg font-rubik-semibold text-gray-800 mt-4 text-center">
                  No Students Found
                </Text>
                <Text className="text-sm font-rubik text-gray-600 mt-2 text-center px-8">
                  {searchTerm
                    ? 'No students match your search criteria.'
                    : 'No students are currently enrolled in this class. Please check with the admin to add students to this class.'}
                </Text>
              </View>
            ) : (
              filteredStudents.map((student, index) => {
                const studentAttendance = attendance[student.id]
                return (
                  <View
                    key={student.id}
                    className={`flex-row items-center p-3 mb-2 rounded-lg border ${
                      studentAttendance === 'present'
                        ? 'bg-green-50 border-green-200'
                        : studentAttendance === 'absent'
                        ? 'bg-red-50 border-red-200'
                        : 'bg-white border-gray-200'
                    }`}
                  >
                    {/* Student Info */}
                    <View className="flex-1">
                      <Text className="font-rubik-medium text-gray-900">
                        {index + 1}. {student.name}
                      </Text>
                      <Text className="text-xs font-rubik text-gray-600">
                        Roll: {student.roll_number || 'N/A'}
                        {student.admission_number && ` • ${student.admission_number}`}
                      </Text>
                    </View>

                    {/* Present Button */}
                    <TouchableOpacity
                      onPress={() => handleAttendanceChange(student.id, 'present')}
                      className={`w-16 h-8 rounded-lg border-2 items-center justify-center mx-1 ${
                        studentAttendance === 'present'
                          ? 'bg-green-600 border-green-600'
                          : 'bg-white border-green-300'
                      }`}
                    >
                      <Ionicons
                        name={studentAttendance === 'present' ? 'checkmark' : 'checkmark-outline'}
                        size={16}
                        color={studentAttendance === 'present' ? 'white' : '#10b981'}
                      />
                    </TouchableOpacity>

                    {/* Absent Button */}
                    <TouchableOpacity
                      onPress={() => handleAttendanceChange(student.id, 'absent')}
                      className={`w-16 h-8 rounded-lg border-2 items-center justify-center mx-1 ${
                        studentAttendance === 'absent'
                          ? 'bg-red-600 border-red-600'
                          : 'bg-white border-red-300'
                      }`}
                    >
                      <Ionicons
                        name={studentAttendance === 'absent' ? 'close' : 'close-outline'}
                        size={16}
                        color={studentAttendance === 'absent' ? 'white' : '#ef4444'}
                      />
                    </TouchableOpacity>
                  </View>
                )
              })
            )}
          </ScrollView>
        </View>
      )}

      {/* Save Button */}
      <View className="p-4 border-t border-gray-200">
        <TouchableOpacity
          onPress={saveAttendance}
          disabled={saving || attendanceStats.unmarkedCount > 0}
          className={`rounded-lg p-4 ${
            saving || attendanceStats.unmarkedCount > 0
              ? 'bg-gray-300'
              : 'bg-blue-600'
          }`}
        >
          {saving ? (
            <View className="flex-row items-center justify-center">
              <ActivityIndicator size="small" color="white" />
              <Text className="text-white font-rubik-medium ml-2">Saving...</Text>
            </View>
          ) : (
            <Text className="text-white font-rubik-medium text-center">
              {existingAttendance ? 'Update Attendance' : 'Save Attendance'}
            </Text>
          )}
        </TouchableOpacity>

        {attendanceStats.unmarkedCount > 0 && (
          <View className="mt-2 bg-yellow-50 border border-yellow-200 rounded-lg p-3">
            <Text className="text-sm text-yellow-800 font-rubik text-center">
              Please mark attendance for all students. 
              <Text className="font-rubik-medium"> {attendanceStats.unmarkedCount} students</Text> still need to be marked.
            </Text>
          </View>
        )}
      </View>
    </SafeAreaView>
  )
}
