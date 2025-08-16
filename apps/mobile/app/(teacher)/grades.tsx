import React, { useState } from 'react'
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'

interface Assignment {
  id: string
  title: string
  className: string
  type: 'assignment' | 'quiz' | 'exam' | 'project'
  dueDate: string
  totalMarks: number
  submittedCount: number
  totalStudents: number
  status: 'pending' | 'grading' | 'completed'
}

interface GradeOverview {
  className: string
  averageGrade: number
  totalAssignments: number
  pendingGrades: number
}

export default function TeacherGrades() {
  const [refreshing, setRefreshing] = useState(false)
  const [selectedTab, setSelectedTab] = useState<'assignments' | 'overview'>('assignments')
  
  const [assignments] = useState<Assignment[]>([
    {
      id: '1',
      title: 'Algebra Quiz 1',
      className: 'Mathematics 10A',
      type: 'quiz',
      dueDate: 'Today',
      totalMarks: 20,
      submittedCount: 28,
      totalStudents: 32,
      status: 'grading'
    },
    {
      id: '2',
      title: 'Geometry Assignment',
      className: 'Mathematics 10B',
      type: 'assignment',
      dueDate: 'Tomorrow',
      totalMarks: 50,
      submittedCount: 15,
      totalStudents: 28,
      status: 'pending'
    },
    {
      id: '3',
      title: 'Calculus Midterm',
      className: 'Advanced Mathematics',
      type: 'exam',
      dueDate: 'Next Week',
      totalMarks: 100,
      submittedCount: 0,
      totalStudents: 24,
      status: 'pending'
    }
  ])

  const [gradeOverview] = useState<GradeOverview[]>([
    {
      className: 'Mathematics 10A',
      averageGrade: 85.2,
      totalAssignments: 12,
      pendingGrades: 3
    },
    {
      className: 'Mathematics 10B',
      averageGrade: 78.9,
      totalAssignments: 10,
      pendingGrades: 5
    },
    {
      className: 'Advanced Mathematics',
      averageGrade: 91.4,
      totalAssignments: 8,
      pendingGrades: 2
    }
  ])

  const onRefresh = React.useCallback(() => {
    setRefreshing(true)
    setTimeout(() => {
      setRefreshing(false)
    }, 1000)
  }, [])

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'quiz':
        return '#3b82f6'
      case 'assignment':
        return '#22c55e'
      case 'exam':
        return '#ef4444'
      case 'project':
        return '#8b5cf6'
      default:
        return '#6b7280'
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return '#22c55e'
      case 'grading':
        return '#f59e0b'
      case 'pending':
        return '#6b7280'
      default:
        return '#6b7280'
    }
  }

  const getGradeColor = (grade: number) => {
    if (grade >= 90) return '#22c55e'
    if (grade >= 80) return '#3b82f6'
    if (grade >= 70) return '#f59e0b'
    return '#ef4444'
  }

  return (
    <SafeAreaView className="flex-1 bg-gray-50">
      <ScrollView
        className="flex-1"
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Header */}
        <View className="px-6 pt-6 pb-4">
          <Text className="text-2xl font-rubik-bold text-gray-800 mb-2">
            Grades & Assessments
          </Text>
          <Text className="text-sm font-rubik text-gray-600">
            Manage assignments and track student performance
          </Text>
        </View>

        {/* Tab Selector */}
        <View className="px-6 mb-6">
          <View className="bg-white rounded-xl p-1 shadow-soft">
            <View className="flex-row">
              <TouchableOpacity
                className={`flex-1 py-3 px-4 rounded-lg ${
                  selectedTab === 'assignments' ? 'bg-blue-500' : 'bg-transparent'
                }`}
                onPress={() => setSelectedTab('assignments')}
              >
                <Text
                  className={`text-center font-rubik-medium ${
                    selectedTab === 'assignments' ? 'text-white' : 'text-gray-600'
                  }`}
                >
                  Assignments
                </Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                className={`flex-1 py-3 px-4 rounded-lg ${
                  selectedTab === 'overview' ? 'bg-blue-500' : 'bg-transparent'
                }`}
                onPress={() => setSelectedTab('overview')}
              >
                <Text
                  className={`text-center font-rubik-medium ${
                    selectedTab === 'overview' ? 'text-white' : 'text-gray-600'
                  }`}
                >
                  Overview
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* Content */}
        <View className="px-6 pb-6">
          {selectedTab === 'assignments' ? (
            <View className="space-y-4">
              <View className="flex-row items-center justify-between mb-2">
                <Text className="text-lg font-rubik-semibold text-gray-800">
                  Recent Assignments
                </Text>
                <TouchableOpacity className="bg-blue-500 rounded-lg px-4 py-2">
                  <Text className="text-white font-rubik-medium text-sm">
                    + New
                  </Text>
                </TouchableOpacity>
              </View>
              
              {assignments.map((assignment) => (
                <TouchableOpacity
                  key={assignment.id}
                  className="bg-white rounded-xl p-4 shadow-soft"
                  activeOpacity={0.7}
                >
                  <View className="flex-row items-start justify-between mb-3">
                    <View className="flex-1">
                      <Text className="text-lg font-rubik-semibold text-gray-800 mb-1">
                        {assignment.title}
                      </Text>
                      <Text className="text-sm font-rubik text-gray-600 mb-2">
                        {assignment.className}
                      </Text>
                      <View className="flex-row items-center">
                        <View 
                          className="px-2 py-1 rounded-full mr-2"
                          style={{ backgroundColor: `${getTypeColor(assignment.type)}20` }}
                        >
                          <Text 
                            className="text-xs font-rubik-medium capitalize"
                            style={{ color: getTypeColor(assignment.type) }}
                          >
                            {assignment.type}
                          </Text>
                        </View>
                        <Text className="text-xs font-rubik text-gray-500">
                          Due: {assignment.dueDate}
                        </Text>
                      </View>
                    </View>
                    <View className="items-end">
                      <Text className="text-lg font-rubik-bold text-gray-800">
                        {assignment.totalMarks}
                      </Text>
                      <Text className="text-xs font-rubik text-gray-500">
                        marks
                      </Text>
                    </View>
                  </View>

                  <View className="flex-row items-center justify-between mb-4">
                    <View className="flex-row items-center">
                      <Ionicons name="document-text-outline" size={16} color="#6b7280" />
                      <Text className="ml-2 text-sm font-rubik text-gray-600">
                        {assignment.submittedCount}/{assignment.totalStudents} submitted
                      </Text>
                    </View>
                    
                    <View className="flex-row items-center">
                      <View 
                        className="w-2 h-2 rounded-full mr-2"
                        style={{ backgroundColor: getStatusColor(assignment.status) }}
                      />
                      <Text 
                        className="text-sm font-rubik-medium capitalize"
                        style={{ color: getStatusColor(assignment.status) }}
                      >
                        {assignment.status}
                      </Text>
                    </View>
                  </View>

                  <View className="flex-row space-x-3">
                    <TouchableOpacity className="flex-1 bg-blue-50 rounded-lg py-2 px-3">
                      <Text className="text-center text-sm font-rubik-medium text-blue-600">
                        View Details
                      </Text>
                    </TouchableOpacity>
                    
                    {assignment.status === 'grading' && (
                      <TouchableOpacity className="flex-1 bg-green-50 rounded-lg py-2 px-3">
                        <Text className="text-center text-sm font-rubik-medium text-green-600">
                          Grade Now
                        </Text>
                      </TouchableOpacity>
                    )}
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          ) : (
            <View className="space-y-4">
              <Text className="text-lg font-rubik-semibold text-gray-800 mb-2">
                Class Performance Overview
              </Text>
              
              {gradeOverview.map((overview, index) => (
                <View
                  key={index}
                  className="bg-white rounded-xl p-4 shadow-soft"
                >
                  <Text className="text-lg font-rubik-semibold text-gray-800 mb-3">
                    {overview.className}
                  </Text>

                  <View className="flex-row items-center justify-between mb-4">
                    <View className="items-center">
                      <Text 
                        className="text-2xl font-rubik-bold"
                        style={{ color: getGradeColor(overview.averageGrade) }}
                      >
                        {overview.averageGrade.toFixed(1)}%
                      </Text>
                      <Text className="text-sm font-rubik text-gray-600">
                        Class Average
                      </Text>
                    </View>
                    
                    <View className="items-center">
                      <Text className="text-2xl font-rubik-bold text-gray-800">
                        {overview.totalAssignments}
                      </Text>
                      <Text className="text-sm font-rubik text-gray-600">
                        Total Assignments
                      </Text>
                    </View>
                    
                    <View className="items-center">
                      <Text className="text-2xl font-rubik-bold text-orange-500">
                        {overview.pendingGrades}
                      </Text>
                      <Text className="text-sm font-rubik text-gray-600">
                        Pending Grades
                      </Text>
                    </View>
                  </View>

                  <TouchableOpacity className="bg-blue-500 rounded-lg py-3 px-4">
                    <Text className="text-center text-white font-rubik-medium">
                      View Detailed Report
                    </Text>
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  )
}
