import React, { useState, useEffect, useCallback } from 'react'
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  RefreshControl,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { useAuthStore } from '../../lib/stores/auth-store'
import { teacherApiService, Assignment } from '../../lib/api/teacher-api-service'
import { Exam, ExamType, AssignmentGrade } from '../../types/grades'

export default function TeacherGrades() {
  const { user } = useAuthStore()
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [activeTab, setActiveTab] = useState<'assignments' | 'exams' | 'overview'>('assignments')

  // Data states
  const [assignments, setAssignments] = useState<Assignment[]>([])
  const [exams, setExams] = useState<Exam[]>([])
  const [examTypes, setExamTypes] = useState<ExamType[]>([])
  const [classes, setClasses] = useState<Array<{ id: string; name: string; section: string }>>([])
  const [subjects, setSubjects] = useState<Array<{ id: string; name: string; code: string }>>([])

  // Filter states
  const [selectedClass, setSelectedClass] = useState<string>('')
  const [selectedSubject, setSelectedSubject] = useState<string>('')
  const [selectedExamType, setSelectedExamType] = useState<string>('')

  const loadData = useCallback(async (forceRefresh = false) => {
    try {
      setLoading(true)

      // Load basic data
      const [classesResponse, subjectsResponse, examTypesResponse] = await Promise.all([
        teacherApiService.getTeacherClasses(forceRefresh),
        teacherApiService.getTeacherAssignedSubjects(forceRefresh),
        teacherApiService.getExamTypes(forceRefresh)
      ])

      if (classesResponse.data) setClasses(classesResponse.data)
      if (subjectsResponse.data) setSubjects(subjectsResponse.data)
      if (examTypesResponse.data) setExamTypes(examTypesResponse.data)

      // Load assignments and exams
      await loadAssignmentsAndExams(forceRefresh)

    } catch (error) {
      console.error('Error loading grades data:', error)
      Alert.alert('Error', 'Failed to load grades data')
    } finally {
      setLoading(false)
    }
  }, [])

  const loadAssignmentsAndExams = useCallback(async (forceRefresh = false) => {
    try {
      const filters = {
        classId: selectedClass || undefined,
        subjectId: selectedSubject || undefined,
        status: 'published'
      }

      const examFilters = {
        ...filters,
        examTypeId: selectedExamType || undefined,
        status: 'completed'
      }

      const [assignmentsResponse, examsResponse] = await Promise.all([
        teacherApiService.getTeacherAssignments(filters, forceRefresh),
        teacherApiService.getTeacherExams(examFilters, forceRefresh)
      ])

      if (assignmentsResponse.data) {
        setAssignments(assignmentsResponse.data)
        console.log('📋 Loaded assignments for grading:', assignmentsResponse.data.length)
      }

      if (examsResponse.data) {
        setExams(examsResponse.data)
        console.log('📝 Loaded exams for grading:', examsResponse.data.length)
      }

    } catch (error) {
      console.error('Error loading assignments and exams:', error)
    }
  }, [selectedClass, selectedSubject, selectedExamType])

  const handleRefresh = useCallback(async () => {
    setRefreshing(true)
    await loadData(true)
    setRefreshing(false)
  }, [loadData])

  const handleAssignmentPress = (assignment: Assignment) => {
    Alert.alert(
      assignment.title,
      'What would you like to do?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'View Submissions',
          onPress: () => {
            // Navigate to assignment grading screen
            console.log('Navigate to assignment grading:', assignment.id)
          }
        },
        {
          text: 'Grade Book',
          onPress: () => {
            // Navigate to grade book for this assignment's class/subject
            console.log('Navigate to grade book:', assignment.class_id, assignment.subject_id)
          }
        }
      ]
    )
  }

  const handleExamPress = (exam: Exam) => {
    Alert.alert(
      exam.name,
      'What would you like to do?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Enter Grades',
          onPress: () => {
            // Navigate to exam grading screen
            console.log('Navigate to exam grading:', exam.id)
          }
        },
        {
          text: 'View Grades',
          onPress: () => {
            // Navigate to view exam grades
            console.log('Navigate to view exam grades:', exam.id)
          }
        }
      ]
    )
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'published': return '#22c55e'
      case 'completed': return '#3b82f6'
      case 'draft': return '#f59e0b'
      case 'scheduled': return '#8b5cf6'
      default: return '#6b7280'
    }
  }

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'homework': return 'book-outline'
      case 'quiz': return 'help-circle-outline'
      case 'test': return 'document-text-outline'
      case 'project': return 'construct-outline'
      case 'lab': return 'flask-outline'
      case 'presentation': return 'easel-outline'
      case 'essay': return 'create-outline'
      default: return 'document-outline'
    }
  }

  useEffect(() => {
    loadData()
  }, [loadData])

  useEffect(() => {
    if (!loading) {
      loadAssignmentsAndExams()
    }
  }, [selectedClass, selectedSubject, selectedExamType, loadAssignmentsAndExams])

  if (loading) {
    return (
      <SafeAreaView className="flex-1 bg-gray-50">
        <View className="flex-1 justify-center items-center">
          <ActivityIndicator size="large" color="#3b82f6" />
          <Text className="text-gray-600 font-rubik mt-4">Loading grades...</Text>
        </View>
      </SafeAreaView>
    )
  }

  return (
    <SafeAreaView className="flex-1 bg-gray-50">
      <ScrollView
        className="flex-1"
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
      >
        <View className="p-6">
          {/* Header */}
          <View className="mb-6">
            <Text className="text-2xl font-rubik-bold text-gray-800 mb-2">
              Grades & Assessment
            </Text>
            <Text className="text-sm font-rubik text-gray-600">
              Manage assignments and track student performance
            </Text>
          </View>

          {/* Tab Navigation */}
          <View className="mb-6">
            <View className="bg-white rounded-xl p-1 shadow-soft">
              <View className="flex-row">
                {(['assignments', 'exams', 'overview'] as const).map((tab) => (
                  <TouchableOpacity
                    key={tab}
                    onPress={() => setActiveTab(tab)}
                    className={`flex-1 py-3 px-4 rounded-lg ${
                      activeTab === tab ? 'bg-blue-500' : 'bg-transparent'
                    }`}
                  >
                    <Text
                      className={`text-center font-rubik-medium capitalize ${
                        activeTab === tab ? 'text-white' : 'text-gray-600'
                      }`}
                    >
                      {tab}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </View>

          {/* Filters */}
          <View className="mb-4">
            <ScrollView horizontal showsHorizontalScrollIndicator={false} className="flex-row">
              {/* Class Filter */}
              <TouchableOpacity
                className="mr-2 px-3 py-2 bg-gray-100 rounded-lg min-w-0"
                onPress={() => {
                  Alert.alert('Select Class', 'Choose a class to filter', [
                    { text: 'All Classes', onPress: () => setSelectedClass('') },
                    ...classes.map(cls => ({
                      text: `${cls.name} - ${cls.section}`,
                      onPress: () => setSelectedClass(cls.id)
                    }))
                  ])
                }}
              >
                <Text className="font-rubik text-sm text-gray-700" numberOfLines={1}>
                  {selectedClass ?
                    `${classes.find(c => c.id === selectedClass)?.name} - ${classes.find(c => c.id === selectedClass)?.section}` :
                    'All Classes'
                  }
                </Text>
              </TouchableOpacity>

              {/* Subject Filter */}
              <TouchableOpacity
                className="mr-2 px-3 py-2 bg-gray-100 rounded-lg min-w-0"
                onPress={() => {
                  Alert.alert('Select Subject', 'Choose a subject to filter', [
                    { text: 'All Subjects', onPress: () => setSelectedSubject('') },
                    ...subjects.map(subject => ({
                      text: `${subject.name} (${subject.code})`,
                      onPress: () => setSelectedSubject(subject.id)
                    }))
                  ])
                }}
              >
                <Text className="font-rubik text-sm text-gray-700" numberOfLines={1}>
                  {selectedSubject ?
                    subjects.find(s => s.id === selectedSubject)?.name :
                    'All Subjects'
                  }
                </Text>
              </TouchableOpacity>

              {/* Exam Type Filter (only for exams tab) */}
              {activeTab === 'exams' && (
                <TouchableOpacity
                  className="mr-2 px-3 py-2 bg-gray-100 rounded-lg min-w-0"
                  onPress={() => {
                    Alert.alert('Select Exam Type', 'Choose an exam type to filter', [
                      { text: 'All Types', onPress: () => setSelectedExamType('') },
                      ...examTypes.map(type => ({
                        text: type.name,
                        onPress: () => setSelectedExamType(type.id)
                      }))
                    ])
                  }}
                >
                  <Text className="font-rubik text-sm text-gray-700" numberOfLines={1}>
                    {selectedExamType ?
                      examTypes.find(t => t.id === selectedExamType)?.name :
                      'All Types'
                    }
                  </Text>
                </TouchableOpacity>
              )}
            </ScrollView>
          </View>

          {/* Content */}
          {activeTab === 'assignments' && (
            <View>
              <View className="flex-row items-center justify-between mb-4">
                <Text className="text-lg font-rubik-semibold text-gray-800">
                  Assignments to Grade
                </Text>
                <Text className="text-sm font-rubik text-gray-500">
                  {assignments.length} assignments
                </Text>
              </View>

              {assignments.length === 0 ? (
                <View className="bg-white rounded-xl p-8 items-center">
                  <Ionicons name="document-outline" size={48} color="#9ca3af" />
                  <Text className="text-lg font-rubik-medium text-gray-600 mt-4">
                    No assignments to grade
                  </Text>
                  <Text className="text-sm font-rubik text-gray-400 text-center mt-2">
                    Published assignments will appear here for grading
                  </Text>
                </View>
              ) : (
                assignments.map((assignment) => (
                  <TouchableOpacity
                    key={assignment.id}
                    className="bg-white rounded-xl p-4 shadow-soft mb-3"
                    onPress={() => handleAssignmentPress(assignment)}
                    activeOpacity={0.7}
                  >
                    <View className="flex-row items-start justify-between mb-3">
                      <View className="flex-1 mr-3">
                        <Text className="text-lg font-rubik-semibold text-gray-800 mb-1">
                          {assignment.title}
                        </Text>
                        <Text className="text-sm font-rubik text-gray-600 mb-2">
                          {classes.find(c => c.id === assignment.class_id)?.name} - {' '}
                          {classes.find(c => c.id === assignment.class_id)?.section} • {' '}
                          {subjects.find(s => s.id === assignment.subject_id)?.name}
                        </Text>
                      </View>
                      <View className="items-center">
                        <Ionicons
                          name={getTypeIcon(assignment.assignment_type)}
                          size={24}
                          color="#6b7280"
                        />
                        <Text className="text-xs font-rubik text-gray-500 mt-1 capitalize">
                          {assignment.assignment_type}
                        </Text>
                      </View>
                    </View>

                    <View className="flex-row items-center justify-between">
                      <View className="flex-row items-center">
                        <View
                          className="px-3 py-1 rounded-full mr-3"
                          style={{ backgroundColor: `${getStatusColor(assignment.status)}20` }}
                        >
                          <Text
                            className="text-xs font-rubik-medium capitalize"
                            style={{ color: getStatusColor(assignment.status) }}
                          >
                            {assignment.status}
                          </Text>
                        </View>
                        <Text className="text-xs font-rubik text-gray-500">
                          Due: {new Date(assignment.due_date).toLocaleDateString()}
                        </Text>
                      </View>
                      <Text className="text-sm font-rubik-semibold text-gray-700">
                        {assignment.max_marks} marks
                      </Text>
                    </View>
                  </TouchableOpacity>
                ))
              )}
            </View>
          )}

          {activeTab === 'exams' && (
            <View>
              <View className="flex-row items-center justify-between mb-4">
                <Text className="text-lg font-rubik-semibold text-gray-800">
                  Exams to Grade
                </Text>
                <Text className="text-sm font-rubik text-gray-500">
                  {exams.length} exams
                </Text>
              </View>

              {exams.length === 0 ? (
                <View className="bg-white rounded-xl p-8 items-center">
                  <Ionicons name="document-text-outline" size={48} color="#9ca3af" />
                  <Text className="text-lg font-rubik-medium text-gray-600 mt-4">
                    No exams to grade
                  </Text>
                  <Text className="text-sm font-rubik text-gray-400 text-center mt-2">
                    Completed exams will appear here for grading
                  </Text>
                </View>
              ) : (
                exams.map((exam) => (
                  <TouchableOpacity
                    key={exam.id}
                    className="bg-white rounded-xl p-4 shadow-soft mb-3"
                    onPress={() => handleExamPress(exam)}
                    activeOpacity={0.7}
                  >
                    <View className="flex-row items-start justify-between mb-3">
                      <View className="flex-1 mr-3">
                        <Text className="text-lg font-rubik-semibold text-gray-800 mb-1">
                          {exam.name}
                        </Text>
                        <Text className="text-sm font-rubik text-gray-600 mb-2">
                          {exam.class?.name} - {exam.class?.section} • {exam.subject?.name}
                        </Text>
                        <Text className="text-xs font-rubik text-gray-500">
                          {exam.exam_type?.name}
                        </Text>
                      </View>
                      <View className="items-center">
                        <Ionicons name="document-text-outline" size={24} color="#6b7280" />
                        <Text className="text-xs font-rubik text-gray-500 mt-1">
                          Exam
                        </Text>
                      </View>
                    </View>

                    <View className="flex-row items-center justify-between">
                      <View className="flex-row items-center">
                        <View
                          className="px-3 py-1 rounded-full mr-3"
                          style={{ backgroundColor: `${getStatusColor(exam.status)}20` }}
                        >
                          <Text
                            className="text-xs font-rubik-medium capitalize"
                            style={{ color: getStatusColor(exam.status) }}
                          >
                            {exam.status}
                          </Text>
                        </View>
                        <Text className="text-xs font-rubik text-gray-500">
                          Date: {new Date(exam.exam_date).toLocaleDateString()}
                        </Text>
                      </View>
                      <Text className="text-sm font-rubik-semibold text-gray-700">
                        {exam.max_marks} marks
                      </Text>
                    </View>
                  </TouchableOpacity>
                ))
              )}
            </View>
          )}

          {activeTab === 'overview' && (
            <View>
              <Text className="text-lg font-rubik-semibold text-gray-800 mb-4">
                Grading Overview
              </Text>

              <View className="bg-white rounded-xl p-6 mb-4">
                <Text className="text-base font-rubik-semibold text-gray-800 mb-4">
                  Quick Stats
                </Text>

                <View className="flex-row justify-between mb-3">
                  <Text className="font-rubik text-gray-600">Assignments to Grade:</Text>
                  <Text className="font-rubik-semibold text-blue-600">{assignments.length}</Text>
                </View>

                <View className="flex-row justify-between mb-3">
                  <Text className="font-rubik text-gray-600">Exams to Grade:</Text>
                  <Text className="font-rubik-semibold text-green-600">{exams.length}</Text>
                </View>

                <View className="flex-row justify-between">
                  <Text className="font-rubik text-gray-600">Total Classes:</Text>
                  <Text className="font-rubik-semibold text-purple-600">{classes.length}</Text>
                </View>
              </View>

              <TouchableOpacity className="bg-blue-500 rounded-xl p-4 mb-3">
                <View className="flex-row items-center justify-center">
                  <Ionicons name="grid-outline" size={20} color="white" />
                  <Text className="text-white font-rubik-semibold ml-2">
                    View Grade Book
                  </Text>
                </View>
              </TouchableOpacity>

              <TouchableOpacity className="bg-green-500 rounded-xl p-4">
                <View className="flex-row items-center justify-center">
                  <Ionicons name="document-text-outline" size={20} color="white" />
                  <Text className="text-white font-rubik-semibold ml-2">
                    Generate Reports
                  </Text>
                </View>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  )
}