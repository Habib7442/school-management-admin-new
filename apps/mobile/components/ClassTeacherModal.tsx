import React, { useState, useEffect } from 'react'
import {
  View,
  Text,
  Modal,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Dimensions,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { teacherApiService, ClassTeacherInfo, ClassStudentInfo } from '../lib/api/teacher-api-service'
import { useClassTeacherPermissions, CLASS_TEACHER_PERMISSIONS } from '../lib/permissions/classTeacherPermissions'
import StudentEditModal from './StudentEditModal'
import StudentEnrollmentModal from './StudentEnrollmentModal'
import TimetableManagementModal from './TimetableManagementModal'

interface ClassTeacherModalProps {
  visible: boolean
  onClose: () => void
  classId: string
  className: string
}

const { height: screenHeight } = Dimensions.get('window')

export default function ClassTeacherModal({ 
  visible, 
  onClose, 
  classId, 
  className 
}: ClassTeacherModalProps) {
  const [loading, setLoading] = useState(false)
  const [students, setStudents] = useState<ClassStudentInfo[]>([])
  const [teachers, setTeachers] = useState<ClassTeacherInfo[]>([])
  const [activeTab, setActiveTab] = useState<'students' | 'teachers'>('students')

  // Modal states
  const [editStudentModal, setEditStudentModal] = useState<{
    visible: boolean
    student: ClassStudentInfo | null
  }>({ visible: false, student: null })
  const [enrollmentModal, setEnrollmentModal] = useState(false)
  const [timetableModal, setTimetableModal] = useState(false)

  // Class teacher permissions
  const {
    isClassTeacher,
    canUpdateStudents,
    canEnrollStudents,
    canUpdateTimetable,
    canManageClass
  } = useClassTeacherPermissions(classId)

  useEffect(() => {
    if (visible && classId) {
      loadClassData()
    }
  }, [visible, classId])

  const loadClassData = async () => {
    try {
      setLoading(true)
      
      const [studentsResponse, teachersResponse] = await Promise.all([
        teacherApiService.getClassStudentsForClassTeacher(classId, true), // Force refresh
        teacherApiService.getClassTeachersWithSchedule(classId, true) // Force refresh
      ])

      if (studentsResponse.error) {
        console.error('❌ Students API error:', studentsResponse.error)
        Alert.alert('Error', studentsResponse.error)
      } else if (studentsResponse.data) {
        console.log('👥 Students data received:', JSON.stringify(studentsResponse.data, null, 2))
        setStudents(studentsResponse.data)
      }

      if (teachersResponse.error) {
        console.error('❌ Teachers API error:', teachersResponse.error)
        Alert.alert('Error', teachersResponse.error)
      } else if (teachersResponse.data) {
        console.log('👨‍🏫 Teachers data received:', JSON.stringify(teachersResponse.data, null, 2))
        setTeachers(teachersResponse.data)
      }
    } catch (error) {
      console.error('Error loading class data:', error)
      Alert.alert('Error', 'Failed to load class information')
    } finally {
      setLoading(false)
    }
  }

  // Modal handlers
  const handleEditStudent = (student: ClassStudentInfo) => {
    setEditStudentModal({ visible: true, student })
  }

  const handleStudentUpdated = (updatedStudent: ClassStudentInfo) => {
    setStudents(prev =>
      prev.map(student =>
        student.id === updatedStudent.id ? updatedStudent : student
      )
    )
    setEditStudentModal({ visible: false, student: null })
  }

  const handleStudentEnrolled = (newStudent: ClassStudentInfo) => {
    setStudents(prev => [...prev, newStudent])
    setEnrollmentModal(false)
  }

  const handleTimetableUpdated = () => {
    loadClassData() // Refresh the data to show updated teacher assignments
  }

  const formatDayName = (day: string) => {
    return day.charAt(0).toUpperCase() + day.slice(1)
  }

  const formatTime = (time: string) => {
    return new Date(`2000-01-01T${time}`).toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    })
  }

  const groupScheduleByDay = (schedule: ClassTeacherInfo['schedule']) => {
    const grouped: { [key: string]: typeof schedule } = {}
    schedule.forEach(item => {
      if (!grouped[item.day_of_week]) {
        grouped[item.day_of_week] = []
      }
      grouped[item.day_of_week].push(item)
    })
    
    // Sort by period order within each day
    Object.keys(grouped).forEach(day => {
      grouped[day].sort((a, b) => a.time_period.period_order - b.time_period.period_order)
    })
    
    return grouped
  }

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <SafeAreaView className="flex-1 bg-gray-50">
        {/* Header */}
        <View className="bg-white border-b border-gray-200 px-4 py-3">
          <View className="flex-row items-center justify-between">
            <View className="flex-1">
              <Text className="text-lg font-rubik-semibold text-gray-800">
                {className}
              </Text>
              <View className="flex-row items-center">
                <Text className="text-sm font-rubik text-gray-600">
                  Class Teacher Dashboard
                </Text>
                <ClassTeacherBadge classId={classId} />
              </View>
            </View>
            <TouchableOpacity
              onPress={onClose}
              className="w-8 h-8 items-center justify-center"
            >
              <Ionicons name="close" size={24} color="#6b7280" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Tab Navigation */}
        <View className="bg-white border-b border-gray-200">
          <View className="flex-row">
            <TouchableOpacity
              className={`flex-1 py-3 px-4 ${activeTab === 'students' ? 'border-b-2 border-blue-500' : ''}`}
              onPress={() => setActiveTab('students')}
            >
              <Text className={`text-center font-rubik-medium ${
                activeTab === 'students' ? 'text-blue-600' : 'text-gray-600'
              }`}>
                Students ({students.length})
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              className={`flex-1 py-3 px-4 ${activeTab === 'teachers' ? 'border-b-2 border-blue-500' : ''}`}
              onPress={() => setActiveTab('teachers')}
            >
              <Text className={`text-center font-rubik-medium ${
                activeTab === 'teachers' ? 'text-blue-600' : 'text-gray-600'
              }`}>
                Teachers ({teachers.length})
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Content */}
        <ScrollView className="flex-1 p-4">
          {loading ? (
            <View className="flex-1 items-center justify-center py-20">
              <ActivityIndicator size="large" color="#3b82f6" />
              <Text className="mt-4 text-gray-600 font-rubik">Loading...</Text>
            </View>
          ) : (
            <>
              {activeTab === 'students' && (
                <View className="space-y-3">
                  {students.length === 0 ? (
                    <View className="bg-white rounded-xl p-6 items-center">
                      <Ionicons name="people-outline" size={48} color="#9ca3af" />
                      <Text className="text-gray-500 font-rubik mt-2">No students found</Text>
                    </View>
                  ) : (
                    students.map((student) => (
                      <View key={student.id} className="bg-white rounded-xl p-4 shadow-soft">
                        <View className="flex-row items-center justify-between">
                          <View className="flex-1">
                            <Text className="text-lg font-rubik-semibold text-gray-800">
                              {student.name}
                            </Text>
                            {student.roll_number && (
                              <Text className="text-sm font-rubik text-gray-600">
                                Roll No: {student.roll_number}
                              </Text>
                            )}
                            {student.admission_number && (
                              <Text className="text-sm font-rubik text-gray-600">
                                Admission: {student.admission_number}
                              </Text>
                            )}
                          </View>
                          <View className="w-10 h-10 bg-blue-100 rounded-full items-center justify-center">
                            <Ionicons name="person" size={20} color="#3b82f6" />
                          </View>
                        </View>
                        
                        {(student.parent_name || student.parent_phone) && (
                          <View className="mt-3 pt-3 border-t border-gray-100">
                            <Text className="text-xs font-rubik-medium text-gray-500 mb-1">
                              PARENT CONTACT
                            </Text>
                            {student.parent_name && (
                              <Text className="text-sm font-rubik text-gray-700">
                                {student.parent_name}
                              </Text>
                            )}
                            {student.parent_phone && (
                              <Text className="text-sm font-rubik text-gray-600">
                                {student.parent_phone}
                              </Text>
                            )}
                          </View>
                        )}

                        {/* Class Teacher Actions */}
                        <ClassTeacherActions
                          student={student}
                          classId={classId}
                          canUpdateStudents={canUpdateStudents}
                          onEditStudent={handleEditStudent}
                        />
                      </View>
                    ))
                  )}
                </View>
              )}

              {activeTab === 'teachers' && (
                <View className="space-y-4">
                  {teachers.length === 0 ? (
                    <View className="bg-white rounded-xl p-6 items-center">
                      <Ionicons name="school-outline" size={48} color="#9ca3af" />
                      <Text className="text-gray-500 font-rubik mt-2">No teachers assigned</Text>
                    </View>
                  ) : (
                    teachers.map((teacher) => {
                      const groupedSchedule = groupScheduleByDay(teacher.schedule)
                      return (
                        <View key={`${teacher.id}_${teacher.subject.id}`} className="bg-white rounded-xl p-4 shadow-soft">
                          <View className="flex-row items-start justify-between mb-3">
                            <View className="flex-1">
                              <Text className="text-lg font-rubik-semibold text-gray-800">
                                {teacher.name}
                              </Text>
                              <Text className="text-sm font-rubik text-gray-600">
                                {teacher.email}
                              </Text>
                            </View>
                            <View className="bg-green-100 px-3 py-1 rounded-full">
                              <Text className="text-xs font-rubik-medium text-green-700">
                                {teacher.subject.name}
                              </Text>
                            </View>
                          </View>

                          <View className="mt-3 pt-3 border-t border-gray-100">
                            <Text className="text-xs font-rubik-medium text-gray-500 mb-2">
                              SCHEDULE
                            </Text>
                            <View className="space-y-2">
                              {Object.entries(groupedSchedule).map(([day, periods]) => (
                                <View key={day} className="flex-row items-start">
                                  <Text className="text-sm font-rubik-medium text-gray-700 w-24 flex-shrink-0">
                                    {formatDayName(day)}
                                  </Text>
                                  <View className="flex-1 flex-wrap">
                                    <Text className="text-sm font-rubik text-gray-600">
                                      {periods.map((period, index) =>
                                        `${formatTime(period.time_period.start_time)} - ${formatTime(period.time_period.end_time)}`
                                      ).join(', ')}
                                    </Text>
                                  </View>
                                </View>
                              ))}
                            </View>
                          </View>
                        </View>
                      )
                    })
                  )}
                </View>
              )}
            </>
          )}
        </ScrollView>

        {/* Floating Action Button for Class Teachers */}
        <ClassTeacherFloatingActions
          classId={classId}
          activeTab={activeTab}
          canEnrollStudents={canEnrollStudents}
          canUpdateTimetable={canUpdateTimetable}
          onStudentAdded={() => loadClassData()}
          onEnrollStudent={() => setEnrollmentModal(true)}
          onManageTimetable={() => setTimetableModal(true)}
        />
      </SafeAreaView>

      {/* Student Edit Modal */}
      {editStudentModal.student && (
        <StudentEditModal
          visible={editStudentModal.visible}
          onClose={() => setEditStudentModal({ visible: false, student: null })}
          student={editStudentModal.student}
          onStudentUpdated={handleStudentUpdated}
        />
      )}

      {/* Student Enrollment Modal */}
      <StudentEnrollmentModal
        visible={enrollmentModal}
        onClose={() => setEnrollmentModal(false)}
        classId={classId}
        className={className}
        onStudentEnrolled={handleStudentEnrolled}
      />

      {/* Timetable Management Modal */}
      <TimetableManagementModal
        visible={timetableModal}
        onClose={() => setTimetableModal(false)}
        classId={classId}
        className={className}
        onTimetableUpdated={handleTimetableUpdated}
      />
    </Modal>
  )
}

// Component for student-specific class teacher actions
function ClassTeacherActions({
  student,
  classId,
  canUpdateStudents,
  onEditStudent
}: {
  student: ClassStudentInfo
  classId: string
  canUpdateStudents: (classId?: string) => Promise<boolean>
  onEditStudent: (student: ClassStudentInfo) => void
}) {
  const [showActions, setShowActions] = useState(false)
  const [hasPermission, setHasPermission] = useState(false)

  useEffect(() => {
    const checkPermission = async () => {
      const permission = await canUpdateStudents(classId)
      setHasPermission(permission)
    }
    checkPermission()
  }, [canUpdateStudents, classId])

  if (!hasPermission) return null

  return (
    <View className="mt-3 pt-3 border-t border-gray-100">
      <TouchableOpacity
        onPress={() => setShowActions(!showActions)}
        className="flex-row items-center justify-between"
      >
        <Text className="text-xs font-rubik-medium text-blue-600">
          CLASS TEACHER ACTIONS
        </Text>
        <Ionicons
          name={showActions ? "chevron-up" : "chevron-down"}
          size={16}
          color="#3b82f6"
        />
      </TouchableOpacity>

      {showActions && (
        <View className="mt-2 flex-row space-x-2">
          <TouchableOpacity
            className="flex-1 bg-blue-50 rounded-lg p-2 flex-row items-center justify-center"
            onPress={() => onEditStudent(student)}
          >
            <Ionicons name="create-outline" size={16} color="#3b82f6" />
            <Text className="text-blue-600 font-rubik-medium text-xs ml-1">Edit</Text>
          </TouchableOpacity>

          <TouchableOpacity
            className="flex-1 bg-green-50 rounded-lg p-2 flex-row items-center justify-center"
            onPress={() => {
              Alert.alert(
                'Contact Parent',
                'Parent contact feature will be implemented here',
                [{ text: 'OK' }]
              )
            }}
          >
            <Ionicons name="call-outline" size={16} color="#10b981" />
            <Text className="text-green-600 font-rubik-medium text-xs ml-1">Contact</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  )
}

// Component for floating action buttons
function ClassTeacherFloatingActions({
  classId,
  activeTab,
  canEnrollStudents,
  canUpdateTimetable,
  onStudentAdded,
  onEnrollStudent,
  onManageTimetable
}: {
  classId: string
  activeTab: 'students' | 'teachers'
  canEnrollStudents: (classId?: string) => Promise<boolean>
  canUpdateTimetable: (classId?: string) => Promise<boolean>
  onStudentAdded: () => void
  onEnrollStudent: () => void
  onManageTimetable: () => void
}) {
  const [hasEnrollPermission, setHasEnrollPermission] = useState(false)
  const [hasTimetablePermission, setHasTimetablePermission] = useState(false)

  useEffect(() => {
    const checkPermissions = async () => {
      const [enrollPerm, timetablePerm] = await Promise.all([
        canEnrollStudents(classId),
        canUpdateTimetable(classId)
      ])
      setHasEnrollPermission(enrollPerm)
      setHasTimetablePermission(timetablePerm)
    }
    checkPermissions()
  }, [canEnrollStudents, canUpdateTimetable, classId])

  const showStudentActions = activeTab === 'students' && hasEnrollPermission
  const showTeacherActions = activeTab === 'teachers' && hasTimetablePermission

  if (!showStudentActions && !showTeacherActions) return null

  return (
    <View className="absolute bottom-6 right-6">
      {showStudentActions && (
        <TouchableOpacity
          className="bg-blue-600 w-14 h-14 rounded-full items-center justify-center shadow-lg"
          onPress={onEnrollStudent}
        >
          <Ionicons name="person-add" size={24} color="white" />
        </TouchableOpacity>
      )}

      {showTeacherActions && (
        <TouchableOpacity
          className="bg-green-600 w-14 h-14 rounded-full items-center justify-center shadow-lg"
          onPress={onManageTimetable}
        >
          <Ionicons name="calendar" size={24} color="white" />
        </TouchableOpacity>
      )}
    </View>
  )
}

// Component to show class teacher badge
function ClassTeacherBadge({ classId }: { classId: string }) {
  const { isClassTeacher } = useClassTeacherPermissions(classId)
  const [isClassTeacherResult, setIsClassTeacherResult] = useState(false)

  useEffect(() => {
    const checkClassTeacher = async () => {
      const result = await isClassTeacher(classId)
      setIsClassTeacherResult(result)
    }
    checkClassTeacher()
  }, [isClassTeacher, classId])

  if (!isClassTeacherResult) return null

  return (
    <View className="ml-2 bg-blue-100 px-2 py-1 rounded-full">
      <Text className="text-xs font-rubik-medium text-blue-700">
        Class Teacher
      </Text>
    </View>
  )
}
