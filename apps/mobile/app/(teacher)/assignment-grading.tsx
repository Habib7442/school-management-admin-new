import React, { useState, useEffect, useCallback } from 'react'
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  TextInput,
  Modal,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { teacherApiService, Assignment } from '../../lib/api/teacher-api-service'
import { AssignmentGrade } from '../../types/grades'

export default function AssignmentGrading() {
  const router = useRouter()
  const { assignmentId } = useLocalSearchParams<{ assignmentId: string }>()
  
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [assignment, setAssignment] = useState<Assignment | null>(null)
  const [submissions, setSubmissions] = useState<AssignmentGrade[]>([])
  const [selectedSubmission, setSelectedSubmission] = useState<AssignmentGrade | null>(null)
  const [showGradingModal, setShowGradingModal] = useState(false)
  
  // Grading form state
  const [gradeForm, setGradeForm] = useState({
    marks_obtained: '',
    teacher_feedback: '',
    teacher_comments: ''
  })

  const loadData = useCallback(async () => {
    if (!assignmentId) return

    try {
      setLoading(true)

      // Load assignment details
      const assignmentsResponse = await teacherApiService.getTeacherAssignments()
      const assignmentData = assignmentsResponse.data?.find(a => a.id === assignmentId)
      
      if (assignmentData) {
        setAssignment(assignmentData)
      }

      // Load submissions
      const submissionsResponse = await teacherApiService.getAssignmentSubmissions(assignmentId)
      if (submissionsResponse.data) {
        setSubmissions(submissionsResponse.data)
        console.log('📋 Loaded submissions:', submissionsResponse.data.length)
      }

    } catch (error) {
      console.error('Error loading assignment grading data:', error)
      Alert.alert('Error', 'Failed to load assignment data')
    } finally {
      setLoading(false)
    }
  }, [assignmentId])

  const handleGradeSubmission = (submission: AssignmentGrade) => {
    setSelectedSubmission(submission)
    setGradeForm({
      marks_obtained: submission.marks_obtained?.toString() || '',
      teacher_feedback: submission.teacher_feedback || '',
      teacher_comments: submission.teacher_comments || ''
    })
    setShowGradingModal(true)
  }

  const handleSaveGrade = async () => {
    if (!selectedSubmission || !assignment) return

    const marksObtained = parseFloat(gradeForm.marks_obtained)
    
    // Validation
    if (isNaN(marksObtained) || marksObtained < 0 || marksObtained > assignment.max_marks) {
      Alert.alert('Invalid Marks', `Please enter marks between 0 and ${assignment.max_marks}`)
      return
    }

    try {
      setSaving(true)

      const gradePercentage = (marksObtained / assignment.max_marks) * 100
      
      // Calculate grade letter based on percentage
      const gradeResult = await teacherApiService.calculateGradeFromPercentage(gradePercentage)
      
      const gradeData = {
        submission_id: selectedSubmission.id,
        marks_obtained: marksObtained,
        grade_percentage: gradePercentage,
        grade_letter: gradeResult?.grade_letter,
        teacher_feedback: gradeForm.teacher_feedback,
        teacher_comments: gradeForm.teacher_comments
      }

      const response = await teacherApiService.submitAssignmentGrades(assignment.id, [gradeData])
      
      if (response.error) {
        Alert.alert('Error', response.error)
        return
      }

      Alert.alert('Success', 'Grade saved successfully')
      setShowGradingModal(false)
      await loadData() // Reload data

    } catch (error) {
      console.error('Error saving grade:', error)
      Alert.alert('Error', 'Failed to save grade')
    } finally {
      setSaving(false)
    }
  }

  const getSubmissionStatusColor = (submission: AssignmentGrade) => {
    if (submission.is_graded) return '#22c55e'
    if (submission.is_late) return '#f59e0b'
    return '#3b82f6'
  }

  const getSubmissionStatusText = (submission: AssignmentGrade) => {
    if (submission.is_graded) return 'Graded'
    if (submission.is_late) return 'Late Submission'
    return 'Submitted'
  }

  useEffect(() => {
    loadData()
  }, [loadData])

  if (loading) {
    return (
      <SafeAreaView className="flex-1 bg-gray-50">
        <View className="flex-1 justify-center items-center">
          <ActivityIndicator size="large" color="#3b82f6" />
          <Text className="text-gray-600 font-rubik mt-4">Loading submissions...</Text>
        </View>
      </SafeAreaView>
    )
  }

  if (!assignment) {
    return (
      <SafeAreaView className="flex-1 bg-gray-50">
        <View className="flex-1 justify-center items-center">
          <Ionicons name="alert-circle-outline" size={48} color="#ef4444" />
          <Text className="text-gray-600 font-rubik mt-4">Assignment not found</Text>
          <TouchableOpacity 
            className="bg-blue-500 rounded-lg px-6 py-3 mt-4"
            onPress={() => router.back()}
          >
            <Text className="text-white font-rubik-medium">Go Back</Text>
          </TouchableOpacity>
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
            <Text className="text-xl font-rubik-bold text-gray-800">{assignment.title}</Text>
            <Text className="text-sm font-rubik text-gray-600">
              Grade Submissions • {assignment.max_marks} marks
            </Text>
          </View>
        </View>
      </View>

      {/* Assignment Info */}
      <View className="bg-white mx-6 mt-4 rounded-xl p-4 shadow-soft">
        <View className="flex-row justify-between items-center mb-2">
          <Text className="font-rubik-semibold text-gray-800">Assignment Details</Text>
          <View className="flex-row items-center">
            <Ionicons name="calendar-outline" size={16} color="#6b7280" />
            <Text className="text-sm font-rubik text-gray-600 ml-1">
              Due: {new Date(assignment.due_date).toLocaleDateString()}
            </Text>
          </View>
        </View>
        
        <Text className="text-sm font-rubik text-gray-600 mb-3">
          {assignment.description}
        </Text>
        
        <View className="flex-row justify-between">
          <View>
            <Text className="text-xs font-rubik text-gray-500">Total Submissions</Text>
            <Text className="text-lg font-rubik-bold text-blue-600">{submissions.length}</Text>
          </View>
          <View>
            <Text className="text-xs font-rubik text-gray-500">Graded</Text>
            <Text className="text-lg font-rubik-bold text-green-600">
              {submissions.filter(s => s.is_graded).length}
            </Text>
          </View>
          <View>
            <Text className="text-xs font-rubik text-gray-500">Pending</Text>
            <Text className="text-lg font-rubik-bold text-orange-600">
              {submissions.filter(s => !s.is_graded).length}
            </Text>
          </View>
        </View>
      </View>

      {/* Submissions List */}
      <ScrollView className="flex-1 px-6 mt-4">
        <Text className="text-lg font-rubik-semibold text-gray-800 mb-4">
          Student Submissions
        </Text>

        {submissions.length === 0 ? (
          <View className="bg-white rounded-xl p-8 items-center">
            <Ionicons name="document-outline" size={48} color="#9ca3af" />
            <Text className="text-lg font-rubik-medium text-gray-600 mt-4">
              No submissions yet
            </Text>
            <Text className="text-sm font-rubik text-gray-400 text-center mt-2">
              Student submissions will appear here
            </Text>
          </View>
        ) : (
          submissions.map((submission) => (
            <TouchableOpacity
              key={submission.id}
              className="bg-white rounded-xl p-4 shadow-soft mb-3"
              onPress={() => handleGradeSubmission(submission)}
              activeOpacity={0.7}
            >
              <View className="flex-row items-start justify-between mb-3">
                <View className="flex-1">
                  <Text className="text-lg font-rubik-semibold text-gray-800 mb-1">
                    {submission.student?.name}
                  </Text>
                  <Text className="text-sm font-rubik text-gray-600 mb-2">
                    Roll: {submission.student?.roll_number} • 
                    Admission: {submission.student?.admission_number}
                  </Text>
                  <Text className="text-xs font-rubik text-gray-500">
                    Submitted: {submission.submitted_at ? 
                      new Date(submission.submitted_at).toLocaleString() : 'Not submitted'}
                  </Text>
                </View>
                <View className="items-end">
                  {submission.is_graded ? (
                    <View className="items-end">
                      <Text className="text-lg font-rubik-bold text-green-600">
                        {submission.marks_obtained}/{assignment.max_marks}
                      </Text>
                      <Text className="text-xs font-rubik text-green-600">
                        {submission.grade_letter} ({submission.grade_percentage?.toFixed(1)}%)
                      </Text>
                    </View>
                  ) : (
                    <View className="items-end">
                      <Text className="text-lg font-rubik-bold text-gray-400">
                        --/{assignment.max_marks}
                      </Text>
                      <Text className="text-xs font-rubik text-gray-400">
                        Not graded
                      </Text>
                    </View>
                  )}
                </View>
              </View>

              <View className="flex-row items-center justify-between">
                <View
                  className="px-3 py-1 rounded-full"
                  style={{ backgroundColor: `${getSubmissionStatusColor(submission)}20` }}
                >
                  <Text
                    className="text-xs font-rubik-medium"
                    style={{ color: getSubmissionStatusColor(submission) }}
                  >
                    {getSubmissionStatusText(submission)}
                  </Text>
                </View>
                
                <View className="flex-row items-center">
                  <Ionicons name="chevron-forward" size={16} color="#6b7280" />
                </View>
              </View>
            </TouchableOpacity>
          ))
        )}
      </ScrollView>

      {/* Grading Modal */}
      <Modal
        visible={showGradingModal}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <SafeAreaView className="flex-1 bg-gray-50">
          <View className="bg-white px-6 py-4 border-b border-gray-200">
            <View className="flex-row items-center justify-between">
              <Text className="text-xl font-rubik-bold text-gray-800">Grade Submission</Text>
              <TouchableOpacity onPress={() => setShowGradingModal(false)}>
                <Ionicons name="close" size={24} color="#374151" />
              </TouchableOpacity>
            </View>
            {selectedSubmission && (
              <Text className="text-sm font-rubik text-gray-600 mt-1">
                {selectedSubmission.student?.name} • Roll: {selectedSubmission.student?.roll_number}
              </Text>
            )}
          </View>

          <ScrollView className="flex-1 p-6">
            {/* Submission Content */}
            {selectedSubmission?.submission_text && (
              <View className="bg-white rounded-xl p-4 mb-4">
                <Text className="text-base font-rubik-semibold text-gray-800 mb-3">
                  Submission Content
                </Text>
                <Text className="text-sm font-rubik text-gray-700 leading-6">
                  {selectedSubmission.submission_text}
                </Text>
              </View>
            )}

            {/* Grading Form */}
            <View className="bg-white rounded-xl p-4 mb-4">
              <Text className="text-base font-rubik-semibold text-gray-800 mb-4">
                Grade Assignment
              </Text>

              {/* Marks Input */}
              <View className="mb-4">
                <Text className="text-sm font-rubik-medium text-gray-700 mb-2">
                  Marks Obtained (out of {assignment?.max_marks})
                </Text>
                <TextInput
                  className="border border-gray-300 rounded-lg px-3 py-2 font-rubik"
                  placeholder="Enter marks"
                  value={gradeForm.marks_obtained}
                  onChangeText={(text) => setGradeForm(prev => ({ ...prev, marks_obtained: text }))}
                  keyboardType="numeric"
                />
              </View>

              {/* Feedback */}
              <View className="mb-4">
                <Text className="text-sm font-rubik-medium text-gray-700 mb-2">
                  Teacher Feedback
                </Text>
                <TextInput
                  className="border border-gray-300 rounded-lg px-3 py-2 font-rubik"
                  placeholder="Provide feedback to the student"
                  value={gradeForm.teacher_feedback}
                  onChangeText={(text) => setGradeForm(prev => ({ ...prev, teacher_feedback: text }))}
                  multiline
                  numberOfLines={3}
                  textAlignVertical="top"
                />
              </View>

              {/* Comments */}
              <View className="mb-4">
                <Text className="text-sm font-rubik-medium text-gray-700 mb-2">
                  Additional Comments
                </Text>
                <TextInput
                  className="border border-gray-300 rounded-lg px-3 py-2 font-rubik"
                  placeholder="Any additional comments"
                  value={gradeForm.teacher_comments}
                  onChangeText={(text) => setGradeForm(prev => ({ ...prev, teacher_comments: text }))}
                  multiline
                  numberOfLines={2}
                  textAlignVertical="top"
                />
              </View>
            </View>
          </ScrollView>

          {/* Save Button */}
          <View className="bg-white px-6 py-4 border-t border-gray-200">
            <TouchableOpacity
              className={`rounded-xl py-4 ${saving ? 'bg-gray-400' : 'bg-blue-500'}`}
              onPress={handleSaveGrade}
              disabled={saving}
            >
              <View className="flex-row items-center justify-center">
                {saving && <ActivityIndicator size="small" color="white" className="mr-2" />}
                <Text className="text-white font-rubik-semibold text-center">
                  {saving ? 'Saving Grade...' : 'Save Grade'}
                </Text>
              </View>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  )
}
