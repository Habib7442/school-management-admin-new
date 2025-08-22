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
import { teacherApiService } from '../../lib/api/teacher-api-service'

interface ScheduleItem {
  id: string
  day: string
  time: string
  subject: string
  class: string
  room?: string
}

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday']
const TIME_SLOTS = [
  '08:00 - 08:45',
  '08:45 - 09:30',
  '09:30 - 10:15',
  '10:15 - 11:00',
  '11:15 - 12:00',
  '12:00 - 12:45',
  '01:30 - 02:15',
  '02:15 - 03:00',
  '03:00 - 03:45',
]

export default function TeachingSchedule() {
  const [loading, setLoading] = useState(true)
  const [schedule, setSchedule] = useState<ScheduleItem[]>([])
  const [selectedDay, setSelectedDay] = useState('Monday')

  useEffect(() => {
    loadSchedule()
  }, [])

  const loadSchedule = async () => {
    try {
      setLoading(true)
      
      // For now, we'll create a mock schedule
      // In a real implementation, this would fetch from the API
      const mockSchedule: ScheduleItem[] = [
        {
          id: '1',
          day: 'Monday',
          time: '08:00 - 08:45',
          subject: 'Mathematics',
          class: 'Class 10-A',
          room: 'Room 101'
        },
        {
          id: '2',
          day: 'Monday',
          time: '09:30 - 10:15',
          subject: 'Physics',
          class: 'Class 12-B',
          room: 'Lab 1'
        },
        {
          id: '3',
          day: 'Tuesday',
          time: '08:00 - 08:45',
          subject: 'Mathematics',
          class: 'Class 10-B',
          room: 'Room 102'
        },
        {
          id: '4',
          day: 'Wednesday',
          time: '10:15 - 11:00',
          subject: 'Physics',
          class: 'Class 11-A',
          room: 'Lab 2'
        },
        {
          id: '5',
          day: 'Thursday',
          time: '08:45 - 09:30',
          subject: 'Mathematics',
          class: 'Class 9-A',
          room: 'Room 103'
        },
        {
          id: '6',
          day: 'Friday',
          time: '01:30 - 02:15',
          subject: 'Physics',
          class: 'Class 12-A',
          room: 'Lab 1'
        },
      ]
      
      setSchedule(mockSchedule)
    } catch (error) {
      console.error('Failed to load schedule:', error)
      Alert.alert('Error', 'Failed to load teaching schedule')
    } finally {
      setLoading(false)
    }
  }

  const getScheduleForDay = (day: string) => {
    return schedule.filter(item => item.day === day)
  }

  const renderScheduleItem = (item: ScheduleItem) => (
    <View key={item.id} className="bg-white rounded-lg p-4 mb-3 shadow-soft">
      <View className="flex-row items-center justify-between mb-2">
        <Text className="text-sm font-rubik-medium text-blue-600">
          {item.time}
        </Text>
        {item.room && (
          <View className="bg-gray-100 px-2 py-1 rounded">
            <Text className="text-xs font-rubik text-gray-600">{item.room}</Text>
          </View>
        )}
      </View>
      <Text className="text-base font-rubik-semibold text-gray-800 mb-1">
        {item.subject}
      </Text>
      <Text className="text-sm font-rubik text-gray-600">
        {item.class}
      </Text>
    </View>
  )

  const renderEmptyState = () => (
    <View className="flex-1 items-center justify-center py-12">
      <Ionicons name="calendar-outline" size={64} color="#d1d5db" />
      <Text className="text-lg font-rubik-medium text-gray-500 mt-4 mb-2">
        No Classes Scheduled
      </Text>
      <Text className="text-sm font-rubik text-gray-400 text-center px-8">
        You don't have any classes scheduled for {selectedDay}
      </Text>
    </View>
  )

  if (loading) {
    return (
      <SafeAreaView className="flex-1 bg-gray-50">
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#3b82f6" />
          <Text className="text-gray-600 font-rubik mt-4">Loading schedule...</Text>
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
          Teaching Schedule
        </Text>
        <View className="w-10" />
      </View>

      {/* Day Selector */}
      <ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={false}
        className="bg-white border-b border-gray-200"
        contentContainerStyle={{ paddingHorizontal: 16, paddingVertical: 12 }}
      >
        {DAYS.map((day) => (
          <TouchableOpacity
            key={day}
            onPress={() => setSelectedDay(day)}
            className={`px-4 py-2 rounded-full mr-3 ${
              selectedDay === day 
                ? 'bg-blue-500' 
                : 'bg-gray-100'
            }`}
          >
            <Text 
              className={`font-rubik-medium ${
                selectedDay === day 
                  ? 'text-white' 
                  : 'text-gray-600'
              }`}
            >
              {day}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Schedule Content */}
      <ScrollView className="flex-1 p-4">
        {getScheduleForDay(selectedDay).length > 0 ? (
          getScheduleForDay(selectedDay).map(renderScheduleItem)
        ) : (
          renderEmptyState()
        )}
      </ScrollView>
    </SafeAreaView>
  )
}
