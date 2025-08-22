import React, { useState, useEffect, useCallback } from 'react'
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
import { useLocalSearchParams, useRouter } from 'expo-router'
import { teacherApiService } from '../../lib/api/teacher-api-service'
import { GradeBookEntry } from '../../types/grades'

export default function GradeBook() {
  const router = useRouter()
  const { classId, subjectId } = useLocalSearchParams<{ classId: string; subjectId: string }>()
  
  const [loading, setLoading] = useState(true)
  const [gradeBook, setGradeBook] = useState<GradeBookEntry[]>([])
  const [classInfo, setClassInfo] = useState<{ name: string; section: string } | null>(null)
  const [subjectInfo, setSubjectInfo] = useState<{ name: string; code: string } | null>(null)
  const [assignments, setAssignments] = useState<any[]>([])
  const [exams, setExams] = useState<any[]>([])

  const loadData = useCallback(async () => {
    if (!classId || !subjectId) return

    try {
      setLoading(true)

      // Load class and subject info
      const [classesResponse, subjectsResponse] = await Promise.all([
        teacherApiService.getTeacherClasses(),
        teacherApiService.getTeacherAssignedSubjects()
      ])

      const classData = classesResponse.data?.find(c => c.id === classId)
      const subjectData = subjectsResponse.data?.find(s => s.id === subjectId)

      if (classData) setClassInfo({ name: classData.name, section: classData.section })
      if (subjectData) setSubjectInfo({ name: subjectData.name, code: subjectData.code })

      // Load assignments and exams for this class/subject
      const [assignmentsResponse, examsResponse] = await Promise.all([
        teacherApiService.getTeacherAssignments({ classId, subjectId, status: 'published' }),
        teacherApiService.getTeacherExams({ classId, subjectId, status: 'completed' })
      ])

      if (assignmentsResponse.data) setAssignments(assignmentsResponse.data)
      if (examsResponse.data) setExams(examsResponse.data)

      // Load grade book
      const gradeBookResponse = await teacherApiService.getGradeBook(classId, subjectId)
      if (gradeBookResponse.data) {
        setGradeBook(gradeBookResponse.data)
        console.log('📊 Loaded grade book:', gradeBookResponse.data.length, 'students')
      }

    } catch (error) {
      console.error('Error loading grade book:', error)
      Alert.alert('Error', 'Failed to load grade book data')
    } finally {
      setLoading(false)
    }
  }, [classId, subjectId])

  const calculateOverallGrade = (entry: GradeBookEntry) => {
    const assignmentGrades = Object.values(entry.assignments)
      .filter(a => a.is_graded && a.percentage !== undefined)
      .map(a => a.percentage!)

    const examGrades = Object.values(entry.exams)
      .filter(e => e.is_graded && e.percentage !== undefined)
      .map(e => e.percentage!)

    const allGrades = [...assignmentGrades, ...examGrades]
    
    if (allGrades.length === 0) return null

    const average = allGrades.reduce((sum, grade) => sum + grade, 0) / allGrades.length
    return average
  }

  const getGradeColor = (percentage: number | null) => {
    if (percentage === null) return '#9ca3af'
    if (percentage >= 90) return '#22c55e'
    if (percentage >= 80) return '#3b82f6'
    if (percentage >= 70) return '#f59e0b'
    return '#ef4444'
  }

  const getGradeLetter = (percentage: number | null) => {
    if (percentage === null) return 'N/A'
    if (percentage >= 90) return 'A'
    if (percentage >= 80) return 'B'
    if (percentage >= 70) return 'C'
    if (percentage >= 60) return 'D'
    return 'F'
  }

  useEffect(() => {
    loadData()
  }, [loadData])

  if (loading) {
    return (
      <SafeAreaView className="flex-1 bg-gray-50">
        <View className="flex-1 justify-center items-center">
          <ActivityIndicator size="large" color="#3b82f6" />
          <Text className="text-gray-600 font-rubik mt-4">Loading grade book...</Text>
        </View>
      </SafeAreaView>
    )
  }

  return (
    <SafeAreaView className="flex-1 bg-gray-50">
      {/* Header */}
      <View className="bg-white px-6 py-4 border-b border-gray-200">
        <View className="flex-row items-center">
          <TouchableOpacity onPress={() => router.back()} className="mr-4">
            <Ionicons name="arrow-back" size={24} color="#374151" />
          </TouchableOpacity>
          <View className="flex-1">
            <Text className="text-xl font-rubik-bold text-gray-800">Grade Book</Text>
            <Text className="text-sm font-rubik text-gray-600">
              {classInfo?.name} - {classInfo?.section} • {subjectInfo?.name}
            </Text>
          </View>
          <TouchableOpacity className="ml-4">
            <Ionicons name="download-outline" size={24} color="#3b82f6" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Summary Stats */}
      <View className="bg-white mx-6 mt-4 rounded-xl p-4 shadow-soft">
        <Text className="text-base font-rubik-semibold text-gray-800 mb-3">
          Class Summary
        </Text>
        
        <View className="flex-row justify-between">
          <View className="items-center">
            <Text className="text-lg font-rubik-bold text-blue-600">{gradeBook.length}</Text>
            <Text className="text-xs font-rubik text-gray-500">Students</Text>
          </View>
          <View className="items-center">
            <Text className="text-lg font-rubik-bold text-green-600">{assignments.length}</Text>
            <Text className="text-xs font-rubik text-gray-500">Assignments</Text>
          </View>
          <View className="items-center">
            <Text className="text-lg font-rubik-bold text-purple-600">{exams.length}</Text>
            <Text className="text-xs font-rubik text-gray-500">Exams</Text>
          </View>
          <View className="items-center">
            <Text className="text-lg font-rubik-bold text-orange-600">
              {gradeBook.reduce((total, entry) => {
                const assignmentPending = Object.values(entry.assignments).filter(a => !a.is_graded).length
                const examPending = Object.values(entry.exams).filter(e => !e.is_graded).length
                return total + assignmentPending + examPending
              }, 0)}
            </Text>
            <Text className="text-xs font-rubik text-gray-500">Pending</Text>
          </View>
        </View>
      </View>

      {/* Grade Book Table */}
      <View className="flex-1 mx-6 mt-4">
        <Text className="text-lg font-rubik-semibold text-gray-800 mb-4">
          Student Grades
        </Text>

        {gradeBook.length === 0 ? (
          <View className="bg-white rounded-xl p-8 items-center">
            <Ionicons name="school-outline" size={48} color="#9ca3af" />
            <Text className="text-lg font-rubik-medium text-gray-600 mt-4">
              No students found
            </Text>
            <Text className="text-sm font-rubik text-gray-400 text-center mt-2">
              Students will appear here once enrolled in this class
            </Text>
          </View>
        ) : (
          <ScrollView className="bg-white rounded-xl shadow-soft" horizontal showsHorizontalScrollIndicator={false}>
            <View>
              {/* Header Row */}
              <View className="flex-row bg-gray-50 border-b border-gray-200">
                <View className="w-40 p-3 border-r border-gray-200">
                  <Text className="font-rubik-semibold text-gray-800 text-xs">Student</Text>
                </View>
                <View className="w-20 p-3 border-r border-gray-200">
                  <Text className="font-rubik-semibold text-gray-800 text-xs">Roll</Text>
                </View>
                
                {/* Assignment Columns */}
                {assignments.map((assignment, index) => (
                  <View key={assignment.id} className="w-24 p-3 border-r border-gray-200">
                    <Text className="font-rubik-semibold text-gray-800 text-xs" numberOfLines={2}>
                      {assignment.title}
                    </Text>
                    <Text className="font-rubik text-gray-500 text-xs">
                      ({assignment.max_marks}m)
                    </Text>
                  </View>
                ))}
                
                {/* Exam Columns */}
                {exams.map((exam, index) => (
                  <View key={exam.id} className="w-24 p-3 border-r border-gray-200">
                    <Text className="font-rubik-semibold text-gray-800 text-xs" numberOfLines={2}>
                      {exam.name}
                    </Text>
                    <Text className="font-rubik text-gray-500 text-xs">
                      ({exam.max_marks}m)
                    </Text>
                  </View>
                ))}
                
                {/* Overall Grade Column */}
                <View className="w-24 p-3">
                  <Text className="font-rubik-semibold text-gray-800 text-xs">Overall</Text>
                </View>
              </View>

              {/* Student Rows */}
              {gradeBook.map((entry, studentIndex) => {
                const overallGrade = calculateOverallGrade(entry)
                
                return (
                  <View key={entry.student_id} className="flex-row border-b border-gray-100">
                    {/* Student Info */}
                    <View className="w-40 p-3 border-r border-gray-200">
                      <Text className="font-rubik-medium text-gray-800 text-sm" numberOfLines={1}>
                        {entry.student_name}
                      </Text>
                    </View>
                    <View className="w-20 p-3 border-r border-gray-200">
                      <Text className="font-rubik text-gray-600 text-sm">
                        {entry.roll_number}
                      </Text>
                    </View>
                    
                    {/* Assignment Grades */}
                    {assignments.map((assignment) => {
                      const grade = entry.assignments[assignment.id]
                      return (
                        <View key={assignment.id} className="w-24 p-3 border-r border-gray-200 items-center">
                          {grade?.is_graded ? (
                            <View className="items-center">
                              <Text 
                                className="font-rubik-semibold text-sm"
                                style={{ color: getGradeColor(grade.percentage || null) }}
                              >
                                {grade.marks_obtained}
                              </Text>
                              <Text className="font-rubik text-xs text-gray-500">
                                {grade.grade_letter}
                              </Text>
                            </View>
                          ) : grade?.is_submitted ? (
                            <View className="items-center">
                              <Ionicons name="time-outline" size={16} color="#f59e0b" />
                              <Text className="font-rubik text-xs text-orange-500">Pending</Text>
                            </View>
                          ) : (
                            <View className="items-center">
                              <Text className="font-rubik text-xs text-gray-400">--</Text>
                            </View>
                          )}
                        </View>
                      )
                    })}
                    
                    {/* Exam Grades */}
                    {exams.map((exam) => {
                      const grade = entry.exams[exam.id]
                      return (
                        <View key={exam.id} className="w-24 p-3 border-r border-gray-200 items-center">
                          {grade?.is_graded ? (
                            <View className="items-center">
                              <Text 
                                className="font-rubik-semibold text-sm"
                                style={{ color: getGradeColor(grade.percentage || null) }}
                              >
                                {grade.marks_obtained}
                              </Text>
                              <Text className="font-rubik text-xs text-gray-500">
                                {grade.grade_letter}
                              </Text>
                            </View>
                          ) : grade?.is_absent ? (
                            <View className="items-center">
                              <Text className="font-rubik text-xs text-red-500">Absent</Text>
                            </View>
                          ) : grade?.is_exempted ? (
                            <View className="items-center">
                              <Text className="font-rubik text-xs text-blue-500">Exempt</Text>
                            </View>
                          ) : (
                            <View className="items-center">
                              <Text className="font-rubik text-xs text-gray-400">--</Text>
                            </View>
                          )}
                        </View>
                      )
                    })}
                    
                    {/* Overall Grade */}
                    <View className="w-24 p-3 items-center">
                      {overallGrade !== null ? (
                        <View className="items-center">
                          <Text 
                            className="font-rubik-bold text-sm"
                            style={{ color: getGradeColor(overallGrade) }}
                          >
                            {overallGrade.toFixed(1)}%
                          </Text>
                          <Text 
                            className="font-rubik text-xs"
                            style={{ color: getGradeColor(overallGrade) }}
                          >
                            {getGradeLetter(overallGrade)}
                          </Text>
                        </View>
                      ) : (
                        <Text className="font-rubik text-xs text-gray-400">N/A</Text>
                      )}
                    </View>
                  </View>
                )
              })}
            </View>
          </ScrollView>
        )}
      </View>

      {/* Action Buttons */}
      <View className="bg-white px-6 py-4 border-t border-gray-200">
        <View className="flex-row space-x-3">
          <TouchableOpacity className="flex-1 bg-blue-500 rounded-xl py-3">
            <View className="flex-row items-center justify-center">
              <Ionicons name="add-outline" size={20} color="white" />
              <Text className="text-white font-rubik-semibold ml-2">Add Assessment</Text>
            </View>
          </TouchableOpacity>
          
          <TouchableOpacity className="flex-1 bg-green-500 rounded-xl py-3">
            <View className="flex-row items-center justify-center">
              <Ionicons name="document-text-outline" size={20} color="white" />
              <Text className="text-white font-rubik-semibold ml-2">Generate Report</Text>
            </View>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  )
}
