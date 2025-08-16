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

interface Grade {
  id: string
  subject: string
  assignment: string
  type: 'quiz' | 'assignment' | 'exam' | 'project'
  score: number
  totalMarks: number
  date: string
  status: 'graded' | 'pending'
}

interface SubjectGrade {
  subject: string
  currentGrade: number
  totalAssignments: number
  completedAssignments: number
  color: string
}

export default function StudentGrades() {
  const [refreshing, setRefreshing] = useState(false)
  const [selectedTab, setSelectedTab] = useState<'overview' | 'detailed'>('overview')

  const [subjectGrades] = useState<SubjectGrade[]>([
    {
      subject: 'Mathematics',
      currentGrade: 92.5,
      totalAssignments: 8,
      completedAssignments: 7,
      color: '#3b82f6'
    },
    {
      subject: 'Physics',
      currentGrade: 88.3,
      totalAssignments: 6,
      completedAssignments: 5,
      color: '#22c55e'
    },
    {
      subject: 'Chemistry',
      currentGrade: 85.7,
      totalAssignments: 7,
      completedAssignments: 6,
      color: '#f59e0b'
    },
    {
      subject: 'English',
      currentGrade: 91.2,
      totalAssignments: 5,
      completedAssignments: 4,
      color: '#8b5cf6'
    },
    {
      subject: 'History',
      currentGrade: 87.9,
      totalAssignments: 4,
      completedAssignments: 4,
      color: '#ef4444'
    }
  ])

  const [recentGrades] = useState<Grade[]>([
    {
      id: '1',
      subject: 'Mathematics',
      assignment: 'Algebra Quiz 1',
      type: 'quiz',
      score: 18,
      totalMarks: 20,
      date: 'Dec 15',
      status: 'graded'
    },
    {
      id: '2',
      subject: 'Physics',
      assignment: 'Lab Report 3',
      type: 'assignment',
      score: 45,
      totalMarks: 50,
      date: 'Dec 14',
      status: 'graded'
    },
    {
      id: '3',
      subject: 'Chemistry',
      assignment: 'Organic Chemistry Test',
      type: 'exam',
      score: 0,
      totalMarks: 100,
      date: 'Dec 13',
      status: 'pending'
    },
    {
      id: '4',
      subject: 'English',
      assignment: 'Essay Assignment',
      type: 'assignment',
      score: 42,
      totalMarks: 50,
      date: 'Dec 12',
      status: 'graded'
    },
    {
      id: '5',
      subject: 'History',
      assignment: 'World War II Project',
      type: 'project',
      score: 95,
      totalMarks: 100,
      date: 'Dec 10',
      status: 'graded'
    }
  ])

  const onRefresh = React.useCallback(() => {
    setRefreshing(true)
    setTimeout(() => {
      setRefreshing(false)
    }, 1000)
  }, [])

  const getGradeColor = (grade: number) => {
    if (grade >= 90) return '#22c55e'
    if (grade >= 80) return '#3b82f6'
    if (grade >= 70) return '#f59e0b'
    return '#ef4444'
  }

  const getGradeLetter = (grade: number) => {
    if (grade >= 90) return 'A'
    if (grade >= 80) return 'B'
    if (grade >= 70) return 'C'
    if (grade >= 60) return 'D'
    return 'F'
  }

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

  const calculateOverallGPA = () => {
    const total = subjectGrades.reduce((sum, subject) => sum + subject.currentGrade, 0)
    return (total / subjectGrades.length).toFixed(1)
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
            My Grades
          </Text>
          <Text className="text-sm font-rubik text-gray-600">
            Track your academic performance and progress
          </Text>
        </View>

        {/* Overall GPA Card */}
        <View className="px-6 mb-6">
          <View className="bg-gradient-to-r from-green-500 to-blue-500 rounded-xl p-6 shadow-soft">
            <View className="items-center">
              <Text className="text-white text-sm font-rubik-medium mb-1">
                Overall GPA
              </Text>
              <Text className="text-white text-4xl font-rubik-bold mb-2">
                {calculateOverallGPA()}
              </Text>
              <Text className="text-green-100 text-lg font-rubik-semibold">
                Grade {getGradeLetter(parseFloat(calculateOverallGPA()))}
              </Text>
            </View>
          </View>
        </View>

        {/* Tab Selector */}
        <View className="px-6 mb-6">
          <View className="bg-white rounded-xl p-1 shadow-soft">
            <View className="flex-row">
              <TouchableOpacity
                className={`flex-1 py-3 px-4 rounded-lg ${
                  selectedTab === 'overview' ? 'bg-green-500' : 'bg-transparent'
                }`}
                onPress={() => setSelectedTab('overview')}
              >
                <Text
                  className={`text-center font-rubik-medium ${
                    selectedTab === 'overview' ? 'text-white' : 'text-gray-600'
                  }`}
                >
                  Subject Overview
                </Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                className={`flex-1 py-3 px-4 rounded-lg ${
                  selectedTab === 'detailed' ? 'bg-green-500' : 'bg-transparent'
                }`}
                onPress={() => setSelectedTab('detailed')}
              >
                <Text
                  className={`text-center font-rubik-medium ${
                    selectedTab === 'detailed' ? 'text-white' : 'text-gray-600'
                  }`}
                >
                  Recent Grades
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* Content */}
        <View className="px-6 pb-6">
          {selectedTab === 'overview' ? (
            <View className="space-y-4">
              <Text className="text-lg font-rubik-semibold text-gray-800 mb-2">
                Subject Performance
              </Text>
              
              {subjectGrades.map((subject, index) => (
                <TouchableOpacity
                  key={index}
                  className="bg-white rounded-xl p-4 shadow-soft"
                  activeOpacity={0.7}
                >
                  <View className="flex-row items-center justify-between mb-3">
                    <Text className="text-lg font-rubik-semibold text-gray-800">
                      {subject.subject}
                    </Text>
                    <View className="items-end">
                      <Text 
                        className="text-2xl font-rubik-bold"
                        style={{ color: getGradeColor(subject.currentGrade) }}
                      >
                        {subject.currentGrade.toFixed(1)}%
                      </Text>
                      <Text 
                        className="text-sm font-rubik-medium"
                        style={{ color: getGradeColor(subject.currentGrade) }}
                      >
                        Grade {getGradeLetter(subject.currentGrade)}
                      </Text>
                    </View>
                  </View>

                  <View className="flex-row items-center justify-between mb-3">
                    <Text className="text-sm font-rubik text-gray-600">
                      Progress: {subject.completedAssignments}/{subject.totalAssignments} assignments
                    </Text>
                    <Text className="text-sm font-rubik-medium text-gray-800">
                      {Math.round((subject.completedAssignments / subject.totalAssignments) * 100)}% complete
                    </Text>
                  </View>

                  {/* Progress Bar */}
                  <View className="bg-gray-200 rounded-full h-2">
                    <View 
                      className="h-2 rounded-full"
                      style={{ 
                        width: `${(subject.completedAssignments / subject.totalAssignments) * 100}%`,
                        backgroundColor: subject.color 
                      }}
                    />
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          ) : (
            <View className="space-y-4">
              <Text className="text-lg font-rubik-semibold text-gray-800 mb-2">
                Recent Grades
              </Text>
              
              {recentGrades.map((grade) => (
                <TouchableOpacity
                  key={grade.id}
                  className="bg-white rounded-xl p-4 shadow-soft"
                  activeOpacity={0.7}
                >
                  <View className="flex-row items-start justify-between mb-3">
                    <View className="flex-1">
                      <Text className="text-lg font-rubik-semibold text-gray-800 mb-1">
                        {grade.assignment}
                      </Text>
                      <Text className="text-sm font-rubik text-gray-600 mb-2">
                        {grade.subject}
                      </Text>
                      <View className="flex-row items-center">
                        <View 
                          className="px-2 py-1 rounded-full mr-2"
                          style={{ backgroundColor: `${getTypeColor(grade.type)}20` }}
                        >
                          <Text 
                            className="text-xs font-rubik-medium capitalize"
                            style={{ color: getTypeColor(grade.type) }}
                          >
                            {grade.type}
                          </Text>
                        </View>
                        <Text className="text-xs font-rubik text-gray-500">
                          {grade.date}
                        </Text>
                      </View>
                    </View>
                    
                    <View className="items-end">
                      {grade.status === 'graded' ? (
                        <>
                          <Text 
                            className="text-2xl font-rubik-bold"
                            style={{ color: getGradeColor((grade.score / grade.totalMarks) * 100) }}
                          >
                            {grade.score}/{grade.totalMarks}
                          </Text>
                          <Text 
                            className="text-sm font-rubik-medium"
                            style={{ color: getGradeColor((grade.score / grade.totalMarks) * 100) }}
                          >
                            {((grade.score / grade.totalMarks) * 100).toFixed(1)}%
                          </Text>
                        </>
                      ) : (
                        <View className="items-center">
                          <Ionicons name="time-outline" size={24} color="#f59e0b" />
                          <Text className="text-sm font-rubik-medium text-orange-500 mt-1">
                            Pending
                          </Text>
                        </View>
                      )}
                    </View>
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  )
}
