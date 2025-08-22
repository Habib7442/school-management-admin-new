import React, { useState, useEffect } from 'react'
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { router } from 'expo-router'

interface PerformanceMetric {
  id: string
  title: string
  value: string
  change: string
  changeType: 'positive' | 'negative' | 'neutral'
  icon: keyof typeof Ionicons.glyphMap
}

interface ClassPerformance {
  id: string
  className: string
  subject: string
  averageGrade: number
  totalStudents: number
  attendanceRate: number
}

export default function PerformanceReports() {
  const [loading, setLoading] = useState(true)
  const [metrics, setMetrics] = useState<PerformanceMetric[]>([])
  const [classPerformance, setClassPerformance] = useState<ClassPerformance[]>([])

  useEffect(() => {
    loadPerformanceData()
  }, [])

  const loadPerformanceData = async () => {
    try {
      setLoading(true)
      
      // Mock data - in real implementation, this would come from API
      const mockMetrics: PerformanceMetric[] = [
        {
          id: '1',
          title: 'Total Classes',
          value: '12',
          change: '+2 this month',
          changeType: 'positive',
          icon: 'school-outline'
        },
        {
          id: '2',
          title: 'Total Students',
          value: '324',
          change: '+15 this month',
          changeType: 'positive',
          icon: 'people-outline'
        },
        {
          id: '3',
          title: 'Average Attendance',
          value: '87.5%',
          change: '+2.3% this month',
          changeType: 'positive',
          icon: 'checkmark-circle-outline'
        },
        {
          id: '4',
          title: 'Assignments Graded',
          value: '156',
          change: '+23 this week',
          changeType: 'positive',
          icon: 'document-text-outline'
        },
      ]

      const mockClassPerformance: ClassPerformance[] = [
        {
          id: '1',
          className: 'Class 10-A',
          subject: 'Mathematics',
          averageGrade: 85.2,
          totalStudents: 28,
          attendanceRate: 92.1
        },
        {
          id: '2',
          className: 'Class 10-B',
          subject: 'Mathematics',
          averageGrade: 78.9,
          totalStudents: 30,
          attendanceRate: 88.5
        },
        {
          id: '3',
          className: 'Class 12-A',
          subject: 'Physics',
          averageGrade: 82.7,
          totalStudents: 25,
          attendanceRate: 89.8
        },
        {
          id: '4',
          className: 'Class 12-B',
          subject: 'Physics',
          averageGrade: 79.3,
          totalStudents: 27,
          attendanceRate: 85.2
        },
      ]

      setMetrics(mockMetrics)
      setClassPerformance(mockClassPerformance)
    } catch (error) {
      console.error('Failed to load performance data:', error)
      Alert.alert('Error', 'Failed to load performance reports')
    } finally {
      setLoading(false)
    }
  }

  const getGradeColor = (grade: number) => {
    if (grade >= 90) return 'text-green-600'
    if (grade >= 80) return 'text-blue-600'
    if (grade >= 70) return 'text-yellow-600'
    return 'text-red-600'
  }

  const getGradeBg = (grade: number) => {
    if (grade >= 90) return 'bg-green-100'
    if (grade >= 80) return 'bg-blue-100'
    if (grade >= 70) return 'bg-yellow-100'
    return 'bg-red-100'
  }

  const renderMetricCard = (metric: PerformanceMetric) => (
    <View key={metric.id} className="bg-white rounded-xl p-4 shadow-soft">
      <View className="flex-row items-center justify-between mb-2">
        <Ionicons name={metric.icon} size={24} color="#3b82f6" />
        <Text className={`text-xs font-rubik-medium ${
          metric.changeType === 'positive' ? 'text-green-600' :
          metric.changeType === 'negative' ? 'text-red-600' : 'text-gray-600'
        }`}>
          {metric.change}
        </Text>
      </View>
      <Text className="text-2xl font-rubik-bold text-gray-800 mb-1">
        {metric.value}
      </Text>
      <Text className="text-sm font-rubik text-gray-600">
        {metric.title}
      </Text>
    </View>
  )

  const renderClassCard = (classData: ClassPerformance) => (
    <View key={classData.id} className="bg-white rounded-xl p-4 mb-3 shadow-soft">
      <View className="flex-row items-center justify-between mb-3">
        <View>
          <Text className="text-lg font-rubik-semibold text-gray-800">
            {classData.className}
          </Text>
          <Text className="text-sm font-rubik text-gray-600">
            {classData.subject} • {classData.totalStudents} students
          </Text>
        </View>
        <View className={`px-3 py-1 rounded-full ${getGradeBg(classData.averageGrade)}`}>
          <Text className={`text-sm font-rubik-semibold ${getGradeColor(classData.averageGrade)}`}>
            {classData.averageGrade.toFixed(1)}%
          </Text>
        </View>
      </View>
      
      <View className="flex-row justify-between">
        <View className="flex-1 mr-2">
          <Text className="text-xs font-rubik text-gray-500 mb-1">Attendance Rate</Text>
          <View className="bg-gray-200 rounded-full h-2">
            <View 
              className="bg-blue-500 rounded-full h-2" 
              style={{ width: `${classData.attendanceRate}%` }}
            />
          </View>
          <Text className="text-xs font-rubik-medium text-gray-700 mt-1">
            {classData.attendanceRate.toFixed(1)}%
          </Text>
        </View>
      </View>
    </View>
  )

  if (loading) {
    return (
      <SafeAreaView className="flex-1 bg-gray-50">
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#3b82f6" />
          <Text className="text-gray-600 font-rubik mt-4">Loading reports...</Text>
        </View>
      </SafeAreaView>
    )
  }

  return (
    <SafeAreaView className="flex-1 bg-gray-50">
      {/* Header */}
      <View className="flex-row items-center justify-between p-4 bg-white border-b border-gray-200">
        <TouchableOpacity
          onPress={() => router.back()}
          className="p-2"
        >
          <Ionicons name="arrow-back" size={24} color="#6b7280" />
        </TouchableOpacity>
        <Text className="text-lg font-rubik-semibold text-gray-800">
          Performance Reports
        </Text>
        <TouchableOpacity className="p-2">
          <Ionicons name="download-outline" size={24} color="#6b7280" />
        </TouchableOpacity>
      </View>

      <ScrollView className="flex-1 p-4">
        {/* Overview Metrics */}
        <Text className="text-lg font-rubik-semibold text-gray-800 mb-4">
          Overview
        </Text>
        <View className="grid grid-cols-2 gap-3 mb-6">
          {metrics.map(renderMetricCard)}
        </View>

        {/* Class Performance */}
        <Text className="text-lg font-rubik-semibold text-gray-800 mb-4">
          Class Performance
        </Text>
        {classPerformance.map(renderClassCard)}

        {/* Export Options */}
        <View className="bg-white rounded-xl p-4 mt-4 shadow-soft">
          <Text className="text-lg font-rubik-semibold text-gray-800 mb-3">
            Export Reports
          </Text>
          <TouchableOpacity 
            className="bg-blue-500 rounded-lg p-3 mb-2"
            onPress={() => Alert.alert('Export', 'PDF export feature coming soon')}
          >
            <Text className="text-white font-rubik-medium text-center">
              Export as PDF
            </Text>
          </TouchableOpacity>
          <TouchableOpacity 
            className="bg-green-500 rounded-lg p-3"
            onPress={() => Alert.alert('Export', 'Excel export feature coming soon')}
          >
            <Text className="text-white font-rubik-medium text-center">
              Export as Excel
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  )
}
