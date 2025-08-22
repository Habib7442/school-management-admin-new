import React, { useState, useEffect } from 'react'
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Alert,
  Platform,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { router, useLocalSearchParams } from 'expo-router'
import { Picker } from '@react-native-picker/picker'
import DateTimePicker from '@react-native-community/datetimepicker'
import { teacherApiService, LessonPlan, TeacherClass, CurriculumTopic } from '../lib/api/teacher-api-service'

export default function LessonForm() {
  const { id } = useLocalSearchParams()
  const isEditing = !!id

  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [classes, setClasses] = useState<TeacherClass[]>([])
  const [curriculumTopics, setCurriculumTopics] = useState<CurriculumTopic[]>([])
  const [showDatePicker, setShowDatePicker] = useState(false)
  
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    class_id: '',
    subject_id: '',
    lesson_date: new Date().toISOString().split('T')[0],
    duration_minutes: 45,
    curriculum_topic: '',
    learning_objectives: [''],
    prerequisites: [''],
    lesson_outline: '',
    materials_needed: [''],
    homework_assigned: '',
    assessment_methods: [''],
    success_criteria: '',
    differentiation_strategies: '',
    resource_links: [''],
    status: 'planned' as LessonPlan['status'],
    is_template: false,
    is_shared: false
  })

  useEffect(() => {
    loadInitialData()
  }, [])

  const loadInitialData = async () => {
    try {
      setLoading(true)

      // Load teacher's classes
      const classesResponse = await teacherApiService.getTeacherClasses()
      if (classesResponse.data) {
        setClasses(classesResponse.data)
      }

      // If editing, load the lesson plan
      if (isEditing && id) {
        const lessonResponse = await teacherApiService.getLessonPlan(id as string)
        if (lessonResponse.data) {
          const lesson = lessonResponse.data
          setFormData({
            title: lesson.title || '',
            description: lesson.description || '',
            class_id: lesson.class_id || '',
            subject_id: lesson.subject_id || '',
            lesson_date: lesson.lesson_date ? lesson.lesson_date.split('T')[0] : new Date().toISOString().split('T')[0],
            duration_minutes: lesson.duration_minutes || 45,
            curriculum_topic: lesson.curriculum_topic || '',
            learning_objectives: lesson.learning_objectives || [''],
            prerequisites: lesson.prerequisites || [''],
            lesson_outline: lesson.lesson_outline || '',
            materials_needed: lesson.materials_needed || [''],
            homework_assigned: lesson.homework_assigned || '',
            assessment_methods: lesson.assessment_methods || [''],
            success_criteria: lesson.success_criteria || '',
            differentiation_strategies: lesson.differentiation_strategies || '',
            resource_links: lesson.resource_links || [''],
            status: lesson.status || 'planned',
            is_template: lesson.is_template || false,
            is_shared: lesson.is_shared || false
          })
        }
      }

    } catch (error) {
      console.error('Error loading initial data:', error)
      Alert.alert('Error', 'Failed to load form data')
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async () => {
    try {
      setSaving(true)

      // Validate required fields
      if (!formData.title.trim()) {
        Alert.alert('Validation Error', 'Please enter a lesson title')
        return
      }

      if (!formData.class_id) {
        Alert.alert('Validation Error', 'Please select a class')
        return
      }

      if (!formData.subject_id) {
        Alert.alert('Validation Error', 'Please select a subject')
        return
      }

      // Prepare data for submission
      const submitData = {
        ...formData,
        learning_objectives: formData.learning_objectives.filter(obj => obj.trim()),
        prerequisites: formData.prerequisites.filter(req => req.trim()),
        materials_needed: formData.materials_needed.filter(mat => mat.trim()),
        assessment_methods: formData.assessment_methods.filter(method => method.trim()),
        resource_links: formData.resource_links.filter(link => link.trim())
      }

      let response
      if (isEditing) {
        response = await teacherApiService.updateLessonPlan(id as string, submitData)
      } else {
        response = await teacherApiService.createLessonPlan(submitData)
      }

      if (response.error) {
        Alert.alert('Error', response.error)
      } else {
        Alert.alert(
          'Success',
          `Lesson plan ${isEditing ? 'updated' : 'created'} successfully`,
          [{ text: 'OK', onPress: () => router.back() }]
        )
      }
    } catch (error) {
      console.error('Error saving lesson plan:', error)
      Alert.alert('Error', 'Failed to save lesson plan')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <SafeAreaView className="flex-1 bg-gray-50">
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#3b82f6" />
          <Text className="text-gray-600 font-rubik mt-4">Loading...</Text>
        </View>
      </SafeAreaView>
    )
  }

  return (
    <SafeAreaView className="flex-1 bg-gray-50">
      <ScrollView
        className="flex-1"
        contentContainerStyle={{
          flexGrow: 1,
          paddingHorizontal: 16,
          paddingTop: 8, // Reduced top padding to remove white space
          paddingBottom: 120 // Extra space for save button
        }}
        showsVerticalScrollIndicator={true}
        keyboardShouldPersistTaps="handled"
      >
        {/* Basic Information */}
        <View className="bg-white rounded-xl p-4 mb-4 shadow-soft">
          <Text className="text-lg font-rubik-semibold text-gray-800 mb-4">
            Basic Information
          </Text>

          <View className="mb-4">
            <Text className="text-sm font-rubik-medium text-gray-700 mb-2">
              Lesson Title *
            </Text>
            <TextInput
              value={formData.title}
              onChangeText={(text) => setFormData(prev => ({ ...prev, title: text }))}
              placeholder="Enter lesson title"
              className="border border-gray-300 rounded-lg px-3 py-2 font-rubik"
            />
          </View>

          <View className="mb-4">
            <Text className="text-sm font-rubik-medium text-gray-700 mb-2">
              Description
            </Text>
            <TextInput
              value={formData.description}
              onChangeText={(text) => setFormData(prev => ({ ...prev, description: text }))}
              placeholder="Enter lesson description"
              multiline
              numberOfLines={3}
              className="border border-gray-300 rounded-lg px-3 py-2 font-rubik"
            />
          </View>

          <View className="mb-4">
            <Text className="text-sm font-rubik-medium text-gray-700 mb-2">
              Class *
            </Text>
            <View className="border border-gray-300 rounded-lg">
              <Picker
                selectedValue={formData.class_id}
                onValueChange={(value) => setFormData(prev => ({ ...prev, class_id: value }))}
              >
                <Picker.Item label="Select a class" value="" />
                {classes.map((cls) => (
                  <Picker.Item key={cls.id} label={cls.name} value={cls.id} />
                ))}
              </Picker>
            </View>
          </View>

          <View className="mb-4">
            <Text className="text-sm font-rubik-medium text-gray-700 mb-2">
              Lesson Date *
            </Text>
            <TouchableOpacity
              onPress={() => setShowDatePicker(true)}
              className="border border-gray-300 rounded-lg px-3 py-3 bg-white flex-row items-center justify-between"
            >
              <Text className="font-rubik text-gray-800">
                {new Date(formData.lesson_date).toLocaleDateString('en-US', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric'
                })}
              </Text>
              <Ionicons name="calendar-outline" size={20} color="#6b7280" />
            </TouchableOpacity>

            {showDatePicker && (
              <DateTimePicker
                value={new Date(formData.lesson_date)}
                mode="date"
                display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                onChange={(event, selectedDate) => {
                  setShowDatePicker(Platform.OS === 'ios' ? showDatePicker : false)
                  if (selectedDate) {
                    setFormData(prev => ({
                      ...prev,
                      lesson_date: selectedDate.toISOString().split('T')[0]
                    }))
                  }
                }}
              />
            )}
          </View>

          <View className="mb-4">
            <Text className="text-sm font-rubik-medium text-gray-700 mb-2">
              Duration (minutes)
            </Text>
            <TextInput
              value={formData.duration_minutes.toString()}
              onChangeText={(text) => setFormData(prev => ({ ...prev, duration_minutes: parseInt(text) || 45 }))}
              placeholder="45"
              keyboardType="numeric"
              className="border border-gray-300 rounded-lg px-3 py-2 font-rubik"
            />
          </View>
        </View>

        {/* Learning Objectives */}
        <View className="bg-white rounded-xl p-4 mb-4 shadow-soft">
          <Text className="text-lg font-rubik-semibold text-gray-800 mb-4">
            Learning Objectives
          </Text>
          <TextInput
            value={formData.learning_objectives.join('\n')}
            onChangeText={(text) => setFormData(prev => ({ 
              ...prev, 
              learning_objectives: text.split('\n').filter(obj => obj.trim()) 
            }))}
            placeholder="Enter learning objectives (one per line)"
            multiline
            numberOfLines={4}
            className="border border-gray-300 rounded-lg px-3 py-2 font-rubik"
          />
        </View>

        {/* Lesson Outline */}
        <View className="bg-white rounded-xl p-4 mb-4 shadow-soft">
          <Text className="text-lg font-rubik-semibold text-gray-800 mb-4">
            Lesson Outline
          </Text>
          <TextInput
            value={formData.lesson_outline}
            onChangeText={(text) => setFormData(prev => ({ ...prev, lesson_outline: text }))}
            placeholder="Describe the lesson structure and activities"
            multiline
            numberOfLines={6}
            className="border border-gray-300 rounded-lg px-3 py-2 font-rubik"
          />
        </View>

        {/* Save Button */}
        <View style={{ marginTop: 32, marginBottom: 20 }}>
          <TouchableOpacity
            onPress={handleSave}
            disabled={saving}
            className="bg-blue-500 py-4 rounded-lg items-center"
          >
            {saving ? (
              <ActivityIndicator size="small" color="white" />
            ) : (
              <Text className="text-white font-rubik-semibold text-lg">
                {isEditing ? 'Update Lesson Plan' : 'Create Lesson Plan'}
              </Text>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  )
}
