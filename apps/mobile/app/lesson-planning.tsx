import React, { useState, useEffect } from 'react'
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  RefreshControl,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { router, Link } from 'expo-router'
import { teacherApiService, LessonPlan, LessonPlanStats, TeacherClass } from '../lib/api/teacher-api-service'

interface ViewMode {
  type: 'list' | 'calendar'
}

export default function LessonPlanning() {
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [viewMode, setViewMode] = useState<ViewMode>({ type: 'list' })
  const [lessonPlans, setLessonPlans] = useState<LessonPlan[]>([])
  const [stats, setStats] = useState<LessonPlanStats>({
    totalLessons: 0,
    completedLessons: 0,
    upcomingLessons: 0,
    curriculumProgress: 0
  })
  const [classes, setClasses] = useState<TeacherClass[]>([])
  const [selectedFilter, setSelectedFilter] = useState<'all' | 'upcoming' | 'completed'>('all')

  useEffect(() => {
    loadLessonPlanningData()
  }, [])

  const loadLessonPlanningData = async () => {
    try {
      setLoading(true)

      // Load teacher's classes
      const classesResponse = await teacherApiService.getTeacherClasses()
      if (classesResponse.data) {
        setClasses(classesResponse.data)
      }

      // Load lesson plans
      await loadLessonPlans()

      // Load stats
      const statsResponse = await teacherApiService.getLessonPlanStats()
      if (statsResponse.data) {
        setStats(statsResponse.data)
      }

    } catch (error) {
      console.error('Error loading lesson planning data:', error)
      Alert.alert('Error', 'Failed to load lesson planning data')
    } finally {
      setLoading(false)
    }
  }

  const loadLessonPlans = async () => {
    try {
      const filters: any = {}
      
      if (selectedFilter === 'upcoming') {
        filters.status = 'planned'
        filters.dateFrom = new Date().toISOString().split('T')[0]
      } else if (selectedFilter === 'completed') {
        filters.status = 'completed'
      }

      const response = await teacherApiService.getLessonPlans(filters)
      if (response.data) {
        setLessonPlans(response.data)
      }
    } catch (error) {
      console.error('Error loading lesson plans:', error)
    }
  }

  const onRefresh = async () => {
    setRefreshing(true)
    await loadLessonPlanningData()
    setRefreshing(false)
  }

  const handleEditLesson = (lessonId: string) => {
    router.push(`/lesson-form?id=${lessonId}`)
  }

  const handleDeleteLesson = (lessonId: string) => {
    Alert.alert(
      'Delete Lesson Plan',
      'Are you sure you want to delete this lesson plan?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const response = await teacherApiService.deleteLessonPlan(lessonId)
              if (response.error) {
                Alert.alert('Error', response.error)
              } else {
                await loadLessonPlans()
                Alert.alert('Success', 'Lesson plan deleted successfully')
              }
            } catch (error) {
              Alert.alert('Error', 'Failed to delete lesson plan')
            }
          }
        }
      ]
    )
  }

  const getStatusColor = (status: LessonPlan['status']) => {
    switch (status) {
      case 'completed': return 'text-green-600 bg-green-100'
      case 'in_progress': return 'text-blue-600 bg-blue-100'
      case 'planned': return 'text-orange-600 bg-orange-100'
      case 'cancelled': return 'text-red-600 bg-red-100'
      default: return 'text-gray-600 bg-gray-100'
    }
  }

  const getStatusText = (status: LessonPlan['status']) => {
    switch (status) {
      case 'completed': return 'Completed'
      case 'in_progress': return 'In Progress'
      case 'planned': return 'Planned'
      case 'cancelled': return 'Cancelled'
      default: return 'Unknown'
    }
  }

  const renderStatsCard = () => (
    <View className="bg-white rounded-xl p-4 mb-4 shadow-soft">
      <Text className="text-lg font-rubik-semibold text-gray-800 mb-4">
        Lesson Planning Overview
      </Text>
      <View className="flex-row justify-between">
        <View className="items-center">
          <Text className="text-2xl font-rubik-bold text-blue-600">
            {stats.totalLessons}
          </Text>
          <Text className="text-sm font-rubik text-gray-600">Total</Text>
        </View>
        <View className="items-center">
          <Text className="text-2xl font-rubik-bold text-green-600">
            {stats.completedLessons}
          </Text>
          <Text className="text-sm font-rubik text-gray-600">Completed</Text>
        </View>
        <View className="items-center">
          <Text className="text-2xl font-rubik-bold text-orange-600">
            {stats.upcomingLessons}
          </Text>
          <Text className="text-sm font-rubik text-gray-600">Upcoming</Text>
        </View>
        <View className="items-center">
          <Text className="text-2xl font-rubik-bold text-purple-600">
            {stats.curriculumProgress}%
          </Text>
          <Text className="text-sm font-rubik text-gray-600">Progress</Text>
        </View>
      </View>
    </View>
  )

  const renderFilterTabs = () => (
    <View className="flex-row bg-gray-100 rounded-lg p-1 mb-4">
      {[
        { key: 'all', label: 'All Lessons' },
        { key: 'upcoming', label: 'Upcoming' },
        { key: 'completed', label: 'Completed' }
      ].map((tab) => (
        <TouchableOpacity
          key={tab.key}
          onPress={() => {
            setSelectedFilter(tab.key as any)
            loadLessonPlans()
          }}
          className={`flex-1 py-2 px-3 rounded-md ${
            selectedFilter === tab.key ? 'bg-white shadow-sm' : ''
          }`}
        >
          <Text className={`text-center font-rubik-medium ${
            selectedFilter === tab.key ? 'text-blue-600' : 'text-gray-600'
          }`}>
            {tab.label}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  )

  const renderLessonCard = (lesson: LessonPlan) => (
    <View key={lesson.id} className="bg-white rounded-xl p-4 mb-3 shadow-soft">
      <View className="flex-row items-start justify-between mb-2">
        <View className="flex-1">
          <Text className="text-lg font-rubik-semibold text-gray-800 mb-1">
            {lesson.title}
          </Text>
          <Text className="text-sm font-rubik text-gray-600 mb-2">
            {lesson.classes?.name} • {lesson.subjects?.name}
          </Text>
        </View>
        <View className={`px-2 py-1 rounded-full ${getStatusColor(lesson.status)}`}>
          <Text className="text-xs font-rubik-medium">
            {getStatusText(lesson.status)}
          </Text>
        </View>
      </View>

      <View className="flex-row items-center mb-3">
        <Ionicons name="calendar-outline" size={16} color="#6b7280" />
        <Text className="text-sm font-rubik text-gray-600 ml-2">
          {new Date(lesson.lesson_date).toLocaleDateString()}
        </Text>
        <Ionicons name="time-outline" size={16} color="#6b7280" className="ml-4" />
        <Text className="text-sm font-rubik text-gray-600 ml-2">
          {lesson.duration_minutes} min
        </Text>
      </View>

      {lesson.learning_objectives && lesson.learning_objectives.length > 0 && (
        <View className="mb-3">
          <Text className="text-sm font-rubik-medium text-gray-700 mb-1">
            Objectives:
          </Text>
          <Text className="text-sm font-rubik text-gray-600">
            {lesson.learning_objectives.slice(0, 2).join(', ')}
            {lesson.learning_objectives.length > 2 && '...'}
          </Text>
        </View>
      )}

      {lesson.curriculum_topic && (
        <View className="mb-3">
          <Text className="text-sm font-rubik-medium text-gray-700 mb-1">
            Topic:
          </Text>
          <Text className="text-sm font-rubik text-gray-600">
            {lesson.curriculum_topic}
          </Text>
        </View>
      )}

      <View className="flex-row justify-end space-x-2">
        <TouchableOpacity
          onPress={() => handleEditLesson(lesson.id)}
          className="bg-blue-100 px-3 py-2 rounded-lg"
        >
          <Text className="text-blue-600 font-rubik-medium text-sm">Edit</Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => handleDeleteLesson(lesson.id)}
          className="bg-red-100 px-3 py-2 rounded-lg"
        >
          <Text className="text-red-600 font-rubik-medium text-sm">Delete</Text>
        </TouchableOpacity>
      </View>
    </View>
  )

  if (loading) {
    return (
      <SafeAreaView className="flex-1 bg-gray-50">
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#3b82f6" />
          <Text className="text-gray-600 font-rubik mt-4">Loading lesson plans...</Text>
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
          padding: 16,
          paddingTop: 0,
          paddingBottom: 100 // Extra space for floating button
        }}
        showsVerticalScrollIndicator={true}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {renderStatsCard()}
        {renderFilterTabs()}

        {lessonPlans.length > 0 ? (
          <View style={{ paddingBottom: 20 }}>
            {lessonPlans.map(renderLessonCard)}
          </View>
        ) : (
          <View className="flex-1 items-center justify-center py-12 min-h-[300px]">
            <Ionicons name="document-text-outline" size={64} color="#d1d5db" />
            <Text className="text-lg font-rubik-medium text-gray-500 mt-4 mb-2">
              No Lesson Plans Found
            </Text>
            <Text className="text-sm font-rubik text-gray-400 text-center px-8 mb-6">
              Create your first lesson plan to get started with organized teaching
            </Text>
            <Link href="/lesson-form" asChild>
              <TouchableOpacity className="bg-blue-500 px-6 py-3 rounded-lg">
                <Text className="text-white font-rubik-medium">Create Lesson Plan</Text>
              </TouchableOpacity>
            </Link>
          </View>
        )}
      </ScrollView>

      {/* Floating Action Button */}
      <Link href="/lesson-form" asChild>
        <TouchableOpacity
          className="absolute bottom-6 right-6 w-14 h-14 bg-blue-500 rounded-full items-center justify-center shadow-lg"
          style={{
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.25,
            shadowRadius: 3.84,
            elevation: 5,
          }}
        >
          <Ionicons name="add" size={24} color="white" />
        </TouchableOpacity>
      </Link>
    </SafeAreaView>
  )
}
