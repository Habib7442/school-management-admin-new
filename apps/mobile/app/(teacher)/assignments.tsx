import React, { useState, useEffect } from 'react'
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Alert,
  TextInput,
  ActivityIndicator,
  RefreshControl,
  FlatList,
  Modal,
  Platform,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import DateTimePicker from '@react-native-community/datetimepicker'
// @ts-ignore - Temporary fix for React version compatibility
import { useAuthStore } from '../../lib/stores/auth-store'
import { teacherApiService, Assignment, TeacherClass, AssignmentSubmission } from '../../lib/api/teacher-api-service'

export default function TeacherAssignments() {
  const { user } = useAuthStore()
  const [refreshing, setRefreshing] = useState(false)
  const [loading, setLoading] = useState(true)
  const [assignments, setAssignments] = useState<Assignment[]>([])
  const [classes, setClasses] = useState<TeacherClass[]>([])
  const [subjects, setSubjects] = useState<Array<{ id: string; name: string; code: string }>>([])
  const [selectedFilter, setSelectedFilter] = useState<'all' | 'draft' | 'published' | 'completed'>('all')
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [showSubmissionsModal, setShowSubmissionsModal] = useState(false)
  const [showGradingModal, setShowGradingModal] = useState(false)
  const [selectedAssignment, setSelectedAssignment] = useState<Assignment | null>(null)
  const [submissions, setSubmissions] = useState<AssignmentSubmission[]>([])
  const [selectedSubmission, setSelectedSubmission] = useState<AssignmentSubmission | null>(null)
  const [searchQuery, setSearchQuery] = useState('')

  // Date/Time picker state
  const [showDatePicker, setShowDatePicker] = useState(false)
  const [showTimePicker, setShowTimePicker] = useState(false)
  const [selectedDate, setSelectedDate] = useState(new Date())
  const [selectedTime, setSelectedTime] = useState(new Date())

  // Create assignment form state
  const [newAssignment, setNewAssignment] = useState<{
    title: string
    description: string
    instructions: string
    class_id: string
    subject_id: string
    due_date: string
    due_time: string
    max_marks: string
    pass_marks: string
    assignment_type: 'homework' | 'project' | 'quiz' | 'test' | 'lab' | 'presentation' | 'essay' | 'research'
    difficulty_level: 'easy' | 'medium' | 'hard'
    late_submission_allowed: boolean
    late_penalty_percentage: string
    submission_type: 'file' | 'text' | 'link' | 'multiple'
  }>({
    title: '',
    description: '',
    instructions: '',
    class_id: '',
    subject_id: '',
    due_date: '',
    due_time: '',
    max_marks: '100',
    pass_marks: '40',
    assignment_type: 'homework',
    difficulty_level: 'medium',
    late_submission_allowed: true,
    late_penalty_percentage: '10',
    submission_type: 'file'
  })

  // Edit assignment state
  const [editAssignment, setEditAssignment] = useState<Partial<Assignment>>({})

  // Grading state
  const [gradingData, setGradingData] = useState({
    marks_obtained: '',
    grade_letter: '',
    teacher_feedback: '',
    teacher_comments: ''
  })

  useEffect(() => {
    loadData()
  }, [])

  useEffect(() => {
    loadAssignments()
  }, [selectedFilter])

  const loadData = async () => {
    try {
      setLoading(true)

      // Load classes first
      const classesResponse = await teacherApiService.getTeacherClasses()
      if (classesResponse.data) {
        setClasses(classesResponse.data)
      }

      // Load subjects assigned to the current teacher
      const subjectsResponse = await teacherApiService.getTeacherAssignedSubjects()
      if (subjectsResponse.data) {
        setSubjects(subjectsResponse.data)
        console.log('📚 Loaded teacher assigned subjects:', subjectsResponse.data.length, 'subjects')
      } else {
        console.log('⚠️ No subjects assigned to teacher or error loading subjects')
        setSubjects([])
      }

      // Load assignments
      await loadAssignments()
    } catch (error) {
      console.error('Error loading data:', error)
      Alert.alert('Error', 'Failed to load data')
    } finally {
      setLoading(false)
    }
  }

  const loadAssignments = async (forceRefresh = false) => {
    try {
      const filters = selectedFilter !== 'all' ? { status: selectedFilter } : {}
      const response = await teacherApiService.getTeacherAssignments(filters, forceRefresh)

      if (response.error) {
        Alert.alert('Error', response.error)
        return
      }

      if (response.data) {
        setAssignments(response.data)
        console.log('📋 Loaded assignments:', response.data.length, 'assignments')
      }
    } catch (error) {
      console.error('Error loading assignments:', error)
      Alert.alert('Error', 'Failed to load assignments')
    }
  }

  const loadSubmissions = async (assignmentId: string) => {
    try {
      const response = await teacherApiService.getAssignmentSubmissions(assignmentId)
      if (response.error) {
        Alert.alert('Error', response.error)
        return
      }
      if (response.data) {
        setSubmissions(response.data)
      }
    } catch (error) {
      console.error('Error loading submissions:', error)
      Alert.alert('Error', 'Failed to load submissions')
    }
  }

  const onRefresh = async () => {
    setRefreshing(true)
    await loadAssignments()
    setRefreshing(false)
  }

  const resetNewAssignmentForm = () => {
    setNewAssignment({
      title: '',
      description: '',
      instructions: '',
      class_id: '',
      subject_id: '',
      due_date: '',
      due_time: '',
      max_marks: '100',
      pass_marks: '40',
      assignment_type: 'homework',
      difficulty_level: 'medium',
      late_submission_allowed: true,
      late_penalty_percentage: '10',
      submission_type: 'file'
    })
    setSelectedDate(new Date())
    setSelectedTime(new Date())
  }

  // Date/Time picker handlers
  const handleDateChange = (event: any, date?: Date) => {
    setShowDatePicker(Platform.OS === 'ios')
    if (date) {
      setSelectedDate(date)
      const formattedDate = date.toISOString().split('T')[0] // YYYY-MM-DD format
      setNewAssignment(prev => ({ ...prev, due_date: formattedDate }))
    }
  }

  const handleTimeChange = (event: any, time?: Date) => {
    setShowTimePicker(Platform.OS === 'ios')
    if (time) {
      setSelectedTime(time)
      const formattedTime = time.toTimeString().slice(0, 5) // HH:MM format
      setNewAssignment(prev => ({ ...prev, due_time: formattedTime }))
    }
  }

  const showDatePickerModal = () => {
    setShowDatePicker(true)
  }

  const showTimePickerModal = () => {
    setShowTimePicker(true)
  }

  const handleCreateAssignment = async () => {
    if (subjects.length === 0) {
      Alert.alert('Error', 'You have no subjects assigned to you. Please contact your administrator to assign subjects before creating assignments.')
      return
    }

    if (!newAssignment.title || !newAssignment.class_id || !newAssignment.subject_id || !newAssignment.due_date) {
      Alert.alert('Error', 'Please fill in all required fields (Title, Class, Subject, Due Date)')
      return
    }

    try {
      console.log('🚀 Creating assignment with data:', {
        ...newAssignment,
        max_marks: parseFloat(newAssignment.max_marks),
        pass_marks: parseFloat(newAssignment.pass_marks),
        late_penalty_percentage: parseFloat(newAssignment.late_penalty_percentage),
        status: 'draft'
      })

      const response = await teacherApiService.createAssignment({
        ...newAssignment,
        max_marks: parseFloat(newAssignment.max_marks),
        pass_marks: parseFloat(newAssignment.pass_marks),
        late_penalty_percentage: parseFloat(newAssignment.late_penalty_percentage),
        status: 'draft'
      })

      console.log('📝 Assignment creation response:', response)

      if (response.error) {
        Alert.alert('Error', response.error)
        return
      }

      Alert.alert('Success', 'Assignment created successfully')
      setShowCreateModal(false)
      resetNewAssignmentForm()
      await loadAssignments(true) // Force refresh to bypass cache
    } catch (error) {
      console.error('Error creating assignment:', error)
      Alert.alert('Error', 'Failed to create assignment')
    }
  }

  const handleUpdateAssignment = async () => {
    if (!selectedAssignment) return

    try {
      const response = await teacherApiService.updateAssignment(selectedAssignment.id, editAssignment)

      if (response.error) {
        Alert.alert('Error', response.error)
        return
      }

      Alert.alert('Success', 'Assignment updated successfully')
      setShowEditModal(false)
      setSelectedAssignment(null)
      setEditAssignment({})
      await loadAssignments()
    } catch (error) {
      console.error('Error updating assignment:', error)
      Alert.alert('Error', 'Failed to update assignment')
    }
  }

  const handleDeleteAssignment = async (assignmentId: string) => {
    Alert.alert(
      'Delete Assignment',
      'Are you sure you want to delete this assignment? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const response = await teacherApiService.deleteAssignment(assignmentId)
              if (response.error) {
                Alert.alert('Error', response.error)
                return
              }
              Alert.alert('Success', 'Assignment deleted successfully')
              await loadAssignments(true) // Force refresh to bypass any remaining cache
            } catch (error) {
              console.error('Error deleting assignment:', error)
              Alert.alert('Error', 'Failed to delete assignment')
            }
          }
        }
      ]
    )
  }

  const handleAssignmentPress = (assignment: Assignment) => {
    const actions = [
      { text: 'View Submissions', onPress: () => handleViewSubmissions(assignment) },
      { text: 'Edit Assignment', onPress: () => handleEditAssignment(assignment) },
    ]

    if (assignment.status === 'draft') {
      actions.push({ text: 'Publish', onPress: () => publishAssignment(assignment.id) })
    }

    if (assignment.status === 'published') {
      actions.push({ text: 'Mark Complete', onPress: () => markAssignmentComplete(assignment.id) })
    }

    actions.push({ text: 'Delete', onPress: () => handleDeleteAssignment(assignment.id) })
    actions.push({ text: 'Cancel', onPress: () => {} })

    Alert.alert(assignment.title, 'What would you like to do?', actions)
  }

  const handleViewSubmissions = async (assignment: Assignment) => {
    setSelectedAssignment(assignment)
    await loadSubmissions(assignment.id)
    setShowSubmissionsModal(true)
  }

  const handleEditAssignment = (assignment: Assignment) => {
    setSelectedAssignment(assignment)
    setEditAssignment(assignment)
    setShowEditModal(true)
  }

  const handleGradeSubmission = (submission: AssignmentSubmission) => {
    setSelectedSubmission(submission)
    setGradingData({
      marks_obtained: submission.marks_obtained?.toString() || '',
      grade_letter: submission.grade_letter || '',
      teacher_feedback: submission.teacher_feedback || '',
      teacher_comments: submission.teacher_comments || ''
    })
    setShowGradingModal(true)
  }

  const submitGrade = async () => {
    if (!selectedSubmission || !gradingData.marks_obtained) {
      Alert.alert('Error', 'Please enter marks obtained')
      return
    }

    try {
      const response = await teacherApiService.gradeSubmission(selectedSubmission.id, {
        marks_obtained: parseFloat(gradingData.marks_obtained),
        grade_letter: gradingData.grade_letter,
        teacher_feedback: gradingData.teacher_feedback,
        teacher_comments: gradingData.teacher_comments,
        grade_percentage: (parseFloat(gradingData.marks_obtained) / (selectedSubmission.assignment?.max_marks || 100)) * 100
      })

      if (response.error) {
        Alert.alert('Error', response.error)
        return
      }

      Alert.alert('Success', 'Grade submitted successfully')
      setShowGradingModal(false)
      setSelectedSubmission(null)
      setGradingData({ marks_obtained: '', grade_letter: '', teacher_feedback: '', teacher_comments: '' })

      // Reload submissions
      if (selectedAssignment) {
        await loadSubmissions(selectedAssignment.id)
      }
    } catch (error) {
      console.error('Error grading submission:', error)
      Alert.alert('Error', 'Failed to submit grade')
    }
  }

  const publishAssignment = async (assignmentId: string) => {
    try {
      const response = await teacherApiService.updateAssignment(assignmentId, {
        status: 'published',
        is_visible_to_students: true
      })

      if (response.error) {
        Alert.alert('Error', response.error)
        return
      }

      Alert.alert('Success', 'Assignment published successfully')
      await loadAssignments()
    } catch (error) {
      console.error('Error publishing assignment:', error)
      Alert.alert('Error', 'Failed to publish assignment')
    }
  }

  const markAssignmentComplete = async (assignmentId: string) => {
    try {
      const response = await teacherApiService.updateAssignment(assignmentId, {
        status: 'completed'
      })

      if (response.error) {
        Alert.alert('Error', response.error)
        return
      }

      Alert.alert('Success', 'Assignment marked as complete')
      await loadAssignments()
    } catch (error) {
      console.error('Error updating assignment:', error)
      Alert.alert('Error', 'Failed to update assignment')
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'draft': return '#f59e0b'
      case 'published': return '#22c55e'
      case 'completed': return '#6b7280'
      default: return '#3b82f6'
    }
  }

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'homework': return 'book-outline'
      case 'project': return 'construct-outline'
      case 'quiz': return 'help-circle-outline'
      case 'test': return 'document-text-outline'
      default: return 'document-outline'
    }
  }

  // Filter assignments based on selected filter and search query
  const filteredAssignments = assignments.filter(assignment => {
    const matchesFilter = selectedFilter === 'all' || assignment.status === selectedFilter
    const matchesSearch = searchQuery === '' ||
      assignment.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      assignment.description?.toLowerCase().includes(searchQuery.toLowerCase())
    return matchesFilter && matchesSearch
  })

  if (loading) {
    return (
      <SafeAreaView className="flex-1 bg-gray-50">
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#3b82f6" />
          <Text className="text-gray-600 font-rubik mt-4">Loading assignments...</Text>
        </View>
      </SafeAreaView>
    )
  }

  return (
    <>
      <SafeAreaView className="flex-1 bg-gray-50">
        <ScrollView
          className="flex-1"
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
        >
          <View className="p-6">
            {/* Header - Compact design matching other screens */}
            <View className="mb-6">
              <View className="flex-row items-center justify-between mb-4">
                <View className="flex-1">
                  <Text className="text-2xl font-rubik-bold text-gray-800 mb-2">
                    Assignments
                  </Text>
                  <Text className="text-sm font-rubik text-gray-600">
                    Manage assignments and track submissions
                  </Text>
                </View>
                <TouchableOpacity
                  onPress={() => setShowCreateModal(true)}
                  className="w-12 h-12 bg-blue-500 rounded-full items-center justify-center shadow-soft"
                >
                  <Ionicons name="add" size={24} color="white" />
                </TouchableOpacity>
              </View>

              {/* Search Bar */}
              <View className="mb-4">
                <View className="flex-row items-center bg-white rounded-lg px-3 py-2 shadow-soft">
                  <Ionicons name="search" size={20} color="#6b7280" />
                  <TextInput
                    className="flex-1 ml-2 font-rubik text-gray-800"
                    placeholder="Search assignments..."
                    value={searchQuery}
                    onChangeText={(text: string) => setSearchQuery(text)}
                  />
                  {searchQuery.length > 0 && (
                    <TouchableOpacity onPress={() => setSearchQuery('')}>
                      <Ionicons name="close-circle" size={20} color="#6b7280" />
                    </TouchableOpacity>
                  )}
                </View>
              </View>

              {/* Filter Tabs */}
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={{ paddingRight: 24 }}
              >
                {(['all', 'draft', 'published', 'completed'] as const).map((filter) => (
                  <TouchableOpacity
                    key={filter}
                    onPress={() => setSelectedFilter(filter)}
                    className={`mr-3 px-4 py-2 rounded-full ${
                      selectedFilter === filter
                        ? 'bg-blue-500'
                        : 'bg-gray-100'
                    }`}
                  >
                    <Text className={`text-sm font-rubik-medium capitalize ${
                      selectedFilter === filter
                        ? 'text-white'
                        : 'text-gray-600'
                    }`}>
                      {filter} ({assignments.filter(a => filter === 'all' || a.status === filter).length})
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>

            {/* Assignments List */}
            <View className="space-y-3">
              {filteredAssignments.length === 0 ? (
                <View className="bg-white rounded-xl p-8 items-center">
                  <Ionicons name="document-outline" size={48} color="#9ca3af" />
                  <Text className="text-lg font-rubik-semibold text-gray-500 mt-4">
                    {searchQuery ? 'No matching assignments' : 'No assignments found'}
                  </Text>
                  <Text className="text-sm font-rubik text-gray-400 text-center mt-2">
                    {searchQuery
                      ? 'Try adjusting your search terms'
                      : 'Create your first assignment to get started'
                    }
                  </Text>
                  {searchQuery && (
                    <TouchableOpacity
                      onPress={() => setSearchQuery('')}
                      className="mt-4 px-4 py-2 bg-blue-500 rounded-lg"
                    >
                      <Text className="text-white font-rubik-medium">Clear Search</Text>
                    </TouchableOpacity>
                  )}
                </View>
              ) : (
                filteredAssignments.map((assignment) => (
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
                  {assignment.description && (
                    <Text className="text-sm font-rubik text-gray-600 mb-2" numberOfLines={2}>
                      {assignment.description}
                    </Text>
                  )}
                  {assignment.instructions && (
                    <Text className="text-xs font-rubik text-gray-500 mb-2" numberOfLines={1}>
                      Instructions: {assignment.instructions}
                    </Text>
                  )}
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
                <View className="flex-row items-center flex-1">
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
                  <View className="flex-1">
                    <Text className="text-xs font-rubik text-gray-500">
                      Due: {new Date(assignment.due_date).toLocaleDateString()}
                    </Text>
                    {assignment.due_time && (
                      <Text className="text-xs font-rubik text-gray-500">
                        Time: {assignment.due_time}
                      </Text>
                    )}
                  </View>
                </View>
                <View className="items-end">
                  <Text className="text-sm font-rubik-semibold text-gray-700">
                    {assignment.max_marks} marks
                  </Text>
                  <Text className="text-xs font-rubik text-gray-500">
                    Pass: {assignment.pass_marks}
                  </Text>
                </View>
              </View>

              {/* Additional info row */}
              <View className="flex-row items-center justify-between mt-3 pt-3 border-t border-gray-100">
                <View className="flex-row items-center">
                  <View
                    className="px-2 py-1 rounded-full mr-2"
                    style={{ backgroundColor: assignment.difficulty_level === 'easy' ? '#22c55e20' :
                             assignment.difficulty_level === 'medium' ? '#f59e0b20' : '#ef444420' }}
                  >
                    <Text
                      className="text-xs font-rubik-medium capitalize"
                      style={{ color: assignment.difficulty_level === 'easy' ? '#22c55e' :
                               assignment.difficulty_level === 'medium' ? '#f59e0b' : '#ef4444' }}
                    >
                      {assignment.difficulty_level}
                    </Text>
                  </View>
                  {assignment.late_submission_allowed && (
                    <Text className="text-xs font-rubik text-gray-500">
                      Late allowed (-{assignment.late_penalty_percentage}%)
                    </Text>
                  )}
                </View>
                <View className="flex-row items-center">
                  <TouchableOpacity
                    onPress={() => handleViewSubmissions(assignment)}
                    className="flex-row items-center"
                  >
                    <Ionicons name="eye-outline" size={16} color="#3b82f6" />
                    <Text className="text-xs font-rubik-medium text-blue-500 ml-1">
                      View
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    onPress={() => handleDeleteAssignment(assignment.id)}
                    className="flex-row items-center ml-4"
                  >
                    <Ionicons name="trash-outline" size={16} color="#ef4444" />
                    <Text className="text-xs font-rubik-medium text-red-500 ml-1">
                      Delete
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
                  </TouchableOpacity>
                ))
              )}
            </View>
          </View>
        </ScrollView>
      </SafeAreaView>

      {/* Create Assignment Modal */}
      <Modal
        visible={showCreateModal}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <SafeAreaView className="flex-1 bg-white">
          <View className="flex-1">
            {/* Modal Header */}
            <View className="flex-row items-center justify-between px-6 py-4 border-b border-gray-200">
              <TouchableOpacity onPress={() => { setShowCreateModal(false); resetNewAssignmentForm(); }}>
                <Text className="text-lg font-rubik-medium text-blue-500">Cancel</Text>
              </TouchableOpacity>
              <Text className="text-lg font-rubik-semibold text-gray-800">
                New Assignment
              </Text>
              <TouchableOpacity onPress={handleCreateAssignment}>
                <Text className="text-lg font-rubik-medium text-blue-500">Create</Text>
              </TouchableOpacity>
            </View>

            {/* Form */}
            <ScrollView className="flex-1 px-6 py-4">
              <View className="space-y-4">
                <View>
                  <Text className="text-sm font-rubik-medium text-gray-700 mb-2">
                    Title *
                  </Text>
                  <TextInput
                    className="border border-gray-300 rounded-lg px-3 py-2 font-rubik"
                    placeholder="Assignment title"
                    value={newAssignment.title}
                    onChangeText={(text: string) => setNewAssignment(prev => ({ ...prev, title: text }))}
                  />
                </View>

                <View>
                  <Text className="text-sm font-rubik-medium text-gray-700 mb-2">
                    Description
                  </Text>
                  <TextInput
                    className="border border-gray-300 rounded-lg px-3 py-2 font-rubik"
                    placeholder="Assignment description"
                    multiline
                    numberOfLines={3}
                    value={newAssignment.description}
                    onChangeText={(text: string) => setNewAssignment(prev => ({ ...prev, description: text }))}
                  />
                </View>

                <View>
                  <Text className="text-sm font-rubik-medium text-gray-700 mb-2">
                    Instructions
                  </Text>
                  <TextInput
                    className="border border-gray-300 rounded-lg px-3 py-2 font-rubik"
                    placeholder="Detailed instructions for students"
                    multiline
                    numberOfLines={3}
                    value={newAssignment.instructions}
                    onChangeText={(text: string) => setNewAssignment(prev => ({ ...prev, instructions: text }))}
                  />
                </View>

                <View>
                  <Text className="text-sm font-rubik-medium text-gray-700 mb-2">
                    Class *
                  </Text>
                  <TouchableOpacity
                    className="border border-gray-300 rounded-lg px-3 py-2 flex-row items-center justify-between"
                    onPress={() => Alert.alert('Class Selection', 'Please select a class from the list', [
                      { text: 'Cancel', style: 'cancel' },
                      ...classes.map(cls => ({
                        text: `${cls.name} - ${cls.section}`,
                        onPress: () => setNewAssignment(prev => ({ ...prev, class_id: cls.id }))
                      }))
                    ])}
                  >
                    <Text className={`font-rubik ${newAssignment.class_id ? 'text-gray-800' : 'text-gray-400'}`}>
                      {newAssignment.class_id
                        ? classes.find(c => c.id === newAssignment.class_id)?.name + ' - ' + classes.find(c => c.id === newAssignment.class_id)?.section
                        : 'Select a class'
                      }
                    </Text>
                    <Ionicons name="chevron-down-outline" size={20} color="#6b7280" />
                  </TouchableOpacity>
                </View>

                <View>
                  <Text className="text-sm font-rubik-medium text-gray-700 mb-2">
                    Subject *
                  </Text>
                  <TouchableOpacity
                    className="border border-gray-300 rounded-lg px-3 py-2 flex-row items-center justify-between"
                    onPress={() => {
                      if (subjects.length === 0) {
                        Alert.alert(
                          'No Subjects Assigned',
                          'You have no subjects assigned to you. Please contact your administrator to assign subjects before creating assignments.',
                          [{ text: 'OK' }]
                        )
                        return
                      }

                      Alert.alert('Subject Selection', 'Please select a subject from your assigned subjects', [
                        { text: 'Cancel', style: 'cancel' },
                        ...subjects.map(subject => ({
                          text: `${subject.name} (${subject.code})`,
                          onPress: () => setNewAssignment(prev => ({ ...prev, subject_id: subject.id }))
                        }))
                      ])
                    }}
                  >
                    <Text className={`font-rubik ${newAssignment.subject_id ? 'text-gray-800' : 'text-gray-400'}`}>
                      {newAssignment.subject_id
                        ? subjects.find(s => s.id === newAssignment.subject_id)?.name + ' (' + subjects.find(s => s.id === newAssignment.subject_id)?.code + ')'
                        : subjects.length > 0 ? 'Select from your assigned subjects' : 'No subjects assigned'
                      }
                    </Text>
                    <Ionicons name="chevron-down-outline" size={20} color="#6b7280" />
                  </TouchableOpacity>
                </View>

                <View>
                  <Text className="text-sm font-rubik-medium text-gray-700 mb-2">
                    Due Date *
                  </Text>
                  <TouchableOpacity
                    className="border border-gray-300 rounded-lg px-3 py-2 flex-row items-center justify-between"
                    onPress={showDatePickerModal}
                  >
                    <Text className={`font-rubik ${newAssignment.due_date ? 'text-gray-800' : 'text-gray-400'}`}>
                      {newAssignment.due_date || 'Select due date'}
                    </Text>
                    <Ionicons name="calendar-outline" size={20} color="#6b7280" />
                  </TouchableOpacity>
                </View>

                <View>
                  <Text className="text-sm font-rubik-medium text-gray-700 mb-2">
                    Due Time
                  </Text>
                  <TouchableOpacity
                    className="border border-gray-300 rounded-lg px-3 py-2 flex-row items-center justify-between"
                    onPress={showTimePickerModal}
                  >
                    <Text className={`font-rubik ${newAssignment.due_time ? 'text-gray-800' : 'text-gray-400'}`}>
                      {newAssignment.due_time || 'Select due time (optional)'}
                    </Text>
                    <Ionicons name="time-outline" size={20} color="#6b7280" />
                  </TouchableOpacity>
                </View>

                <View className="flex-row space-x-3">
                  <View className="flex-1">
                    <Text className="text-sm font-rubik-medium text-gray-700 mb-2">
                      Max Marks *
                    </Text>
                    <TextInput
                      className="border border-gray-300 rounded-lg px-3 py-2 font-rubik"
                      placeholder="100"
                      keyboardType="numeric"
                      value={newAssignment.max_marks}
                      onChangeText={(text: string) => setNewAssignment(prev => ({ ...prev, max_marks: text }))}
                    />
                  </View>
                  <View className="flex-1">
                    <Text className="text-sm font-rubik-medium text-gray-700 mb-2">
                      Pass Marks
                    </Text>
                    <TextInput
                      className="border border-gray-300 rounded-lg px-3 py-2 font-rubik"
                      placeholder="40"
                      keyboardType="numeric"
                      value={newAssignment.pass_marks}
                      onChangeText={(text: string) => setNewAssignment(prev => ({ ...prev, pass_marks: text }))}
                    />
                  </View>
                </View>

                <View>
                  <Text className="text-sm font-rubik-medium text-gray-700 mb-2">
                    Assignment Type
                  </Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                    {(['homework', 'project', 'quiz', 'test', 'lab', 'presentation', 'essay'] as const).map((type) => (
                      <TouchableOpacity
                        key={type}
                        onPress={() => setNewAssignment(prev => ({ ...prev, assignment_type: type }))}
                        className={`mr-3 px-4 py-2 rounded-full ${
                          newAssignment.assignment_type === type ? 'bg-blue-500' : 'bg-gray-100'
                        }`}
                      >
                        <Text className={`text-sm font-rubik-medium capitalize ${
                          newAssignment.assignment_type === type ? 'text-white' : 'text-gray-600'
                        }`}>
                          {type}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </View>

                <View>
                  <Text className="text-sm font-rubik-medium text-gray-700 mb-2">
                    Difficulty Level
                  </Text>
                  <View className="flex-row space-x-3">
                    {(['easy', 'medium', 'hard'] as const).map((level) => (
                      <TouchableOpacity
                        key={level}
                        onPress={() => setNewAssignment(prev => ({ ...prev, difficulty_level: level }))}
                        className={`flex-1 py-3 rounded-lg ${
                          newAssignment.difficulty_level === level ? 'bg-blue-500' : 'bg-gray-100'
                        }`}
                      >
                        <Text className={`text-center font-rubik-medium capitalize ${
                          newAssignment.difficulty_level === level ? 'text-white' : 'text-gray-600'
                        }`}>
                          {level}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              </View>
            </ScrollView>
          </View>
        </SafeAreaView>

        {/* Date Picker */}
        {showDatePicker && (
          // @ts-ignore - React version compatibility issue
          <DateTimePicker
            value={selectedDate}
            mode="date"
            display={Platform.OS === 'ios' ? 'spinner' : 'default'}
            onChange={handleDateChange}
            minimumDate={new Date()}
          />
        )}

        {/* Time Picker */}
        {showTimePicker && (
          // @ts-ignore - React version compatibility issue
          <DateTimePicker
            value={selectedTime}
            mode="time"
            display={Platform.OS === 'ios' ? 'spinner' : 'default'}
            onChange={handleTimeChange}
            is24Hour={true}
          />
        )}
      </Modal>

      {/* Submissions Modal */}
      <Modal
        visible={showSubmissionsModal}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <SafeAreaView className="flex-1 bg-white">
          <View className="flex-1">
            {/* Modal Header */}
            <View className="flex-row items-center justify-between px-6 py-4 border-b border-gray-200">
              <TouchableOpacity onPress={() => setShowSubmissionsModal(false)}>
                <Text className="text-lg font-rubik-medium text-blue-500">Close</Text>
              </TouchableOpacity>
              <Text className="text-lg font-rubik-semibold text-gray-800">
                Submissions
              </Text>
              <View className="w-16" />
            </View>

            {/* Submissions List */}
            <FlatList
              data={submissions}
              keyExtractor={(item: AssignmentSubmission) => item.id}
              contentContainerStyle={{ padding: 16 }}
              ListEmptyComponent={() => (
                <View className="items-center py-8">
                  <Ionicons name="document-outline" size={48} color="#9ca3af" />
                  <Text className="text-lg font-rubik-semibold text-gray-500 mt-4">
                    No submissions yet
                  </Text>
                  <Text className="text-sm font-rubik text-gray-400 text-center mt-2">
                    Students haven't submitted their work yet
                  </Text>
                </View>
              )}
              renderItem={({ item: submission }: { item: AssignmentSubmission }) => (
                <TouchableOpacity
                  className="bg-gray-50 rounded-xl p-4 mb-3"
                  onPress={() => handleGradeSubmission(submission)}
                  activeOpacity={0.7}
                >
                  <View className="flex-row items-start justify-between mb-3">
                    <View className="flex-1">
                      <Text className="text-lg font-rubik-semibold text-gray-800 mb-1">
                        {submission.student?.name}
                      </Text>
                      <Text className="text-sm font-rubik text-gray-600">
                        Roll: {submission.student?.roll_number}
                      </Text>
                      <Text className="text-xs font-rubik text-gray-500 mt-1">
                        Submitted: {new Date(submission.submitted_at).toLocaleDateString()}
                      </Text>
                    </View>
                    <View className="items-end">
                      {submission.is_graded ? (
                        <View>
                          <Text className="text-lg font-rubik-bold text-green-600">
                            {submission.marks_obtained}/{submission.assignment?.max_marks}
                          </Text>
                          <Text className="text-sm font-rubik text-gray-600">
                            {submission.grade_percentage?.toFixed(1)}%
                          </Text>
                        </View>
                      ) : (
                        <View className="bg-orange-100 px-3 py-1 rounded-full">
                          <Text className="text-xs font-rubik-medium text-orange-700">
                            Pending
                          </Text>
                        </View>
                      )}
                    </View>
                  </View>

                  {submission.is_late && (
                    <View className="bg-red-100 px-2 py-1 rounded-full self-start mb-2">
                      <Text className="text-xs font-rubik-medium text-red-700">
                        Late Submission ({submission.late_days} days)
                      </Text>
                    </View>
                  )}

                  {submission.teacher_feedback && (
                    <View className="mt-2 p-2 bg-blue-50 rounded-lg">
                      <Text className="text-sm font-rubik text-blue-800">
                        Feedback: {submission.teacher_feedback}
                      </Text>
                    </View>
                  )}
                </TouchableOpacity>
              )}
            />
          </View>
        </SafeAreaView>
      </Modal>

      {/* Grading Modal */}
      <Modal
        visible={showGradingModal}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <SafeAreaView className="flex-1 bg-white">
          <View className="flex-1">
            {/* Modal Header */}
            <View className="flex-row items-center justify-between px-6 py-4 border-b border-gray-200">
              <TouchableOpacity onPress={() => setShowGradingModal(false)}>
                <Text className="text-lg font-rubik-medium text-blue-500">Cancel</Text>
              </TouchableOpacity>
              <Text className="text-lg font-rubik-semibold text-gray-800">
                Grade Submission
              </Text>
              <TouchableOpacity onPress={submitGrade}>
                <Text className="text-lg font-rubik-medium text-blue-500">Save</Text>
              </TouchableOpacity>
            </View>

            {/* Grading Form */}
            <ScrollView className="flex-1 px-6 py-4">
              <View className="space-y-4">
                <View className="bg-gray-50 rounded-xl p-4 mb-4">
                  <Text className="text-lg font-rubik-semibold text-gray-800">
                    {selectedSubmission?.student?.name}
                  </Text>
                  <Text className="text-sm font-rubik text-gray-600">
                    Roll: {selectedSubmission?.student?.roll_number}
                  </Text>
                  <Text className="text-sm font-rubik text-gray-600">
                    Max Marks: {selectedSubmission?.assignment?.max_marks}
                  </Text>
                </View>

                <View>
                  <Text className="text-sm font-rubik-medium text-gray-700 mb-2">
                    Marks Obtained *
                  </Text>
                  <TextInput
                    className="border border-gray-300 rounded-lg px-3 py-2 font-rubik"
                    placeholder="Enter marks"
                    keyboardType="numeric"
                    value={gradingData.marks_obtained}
                    onChangeText={(text: string) => setGradingData(prev => ({ ...prev, marks_obtained: text }))}
                  />
                </View>

                <View>
                  <Text className="text-sm font-rubik-medium text-gray-700 mb-2">
                    Grade Letter
                  </Text>
                  <TextInput
                    className="border border-gray-300 rounded-lg px-3 py-2 font-rubik"
                    placeholder="A, B, C, etc."
                    value={gradingData.grade_letter}
                    onChangeText={(text: string) => setGradingData(prev => ({ ...prev, grade_letter: text }))}
                  />
                </View>

                <View>
                  <Text className="text-sm font-rubik-medium text-gray-700 mb-2">
                    Feedback
                  </Text>
                  <TextInput
                    className="border border-gray-300 rounded-lg px-3 py-2 font-rubik"
                    placeholder="Provide feedback to the student"
                    multiline
                    numberOfLines={3}
                    value={gradingData.teacher_feedback}
                    onChangeText={(text: string) => setGradingData(prev => ({ ...prev, teacher_feedback: text }))}
                  />
                </View>

                <View>
                  <Text className="text-sm font-rubik-medium text-gray-700 mb-2">
                    Comments
                  </Text>
                  <TextInput
                    className="border border-gray-300 rounded-lg px-3 py-2 font-rubik"
                    placeholder="Additional comments"
                    multiline
                    numberOfLines={3}
                    value={gradingData.teacher_comments}
                    onChangeText={(text: string) => setGradingData(prev => ({ ...prev, teacher_comments: text }))}
                  />
                </View>
              </View>
            </ScrollView>
          </View>
        </SafeAreaView>
      </Modal>
    </>
  )
}
