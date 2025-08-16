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

interface ScheduleItem {
  id: string
  subject: string
  teacher: string
  time: string
  duration: string
  room: string
  type: 'lecture' | 'lab' | 'tutorial' | 'break'
}

interface DaySchedule {
  day: string
  date: string
  classes: ScheduleItem[]
}

export default function StudentSchedule() {
  const [refreshing, setRefreshing] = useState(false)
  const [selectedDay, setSelectedDay] = useState(0)

  const weekDays = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri']
  
  const [weekSchedule] = useState<DaySchedule[]>([
    {
      day: 'Monday',
      date: 'Dec 16',
      classes: [
        {
          id: '1',
          subject: 'Mathematics',
          teacher: 'Mr. Smith',
          time: '9:00 AM',
          duration: '1h',
          room: 'Room 201',
          type: 'lecture'
        },
        {
          id: '2',
          subject: 'Break',
          teacher: '',
          time: '10:00 AM',
          duration: '15m',
          room: '',
          type: 'break'
        },
        {
          id: '3',
          subject: 'Physics',
          teacher: 'Dr. Johnson',
          time: '10:15 AM',
          duration: '1h',
          room: 'Lab 3',
          type: 'lab'
        },
        {
          id: '4',
          subject: 'English',
          teacher: 'Ms. Davis',
          time: '2:00 PM',
          duration: '45m',
          room: 'Room 105',
          type: 'lecture'
        }
      ]
    },
    {
      day: 'Tuesday',
      date: 'Dec 17',
      classes: [
        {
          id: '5',
          subject: 'Chemistry',
          teacher: 'Dr. Wilson',
          time: '9:00 AM',
          duration: '1h',
          room: 'Lab 2',
          type: 'lab'
        },
        {
          id: '6',
          subject: 'Mathematics',
          teacher: 'Mr. Smith',
          time: '11:00 AM',
          duration: '45m',
          room: 'Room 201',
          type: 'tutorial'
        },
        {
          id: '7',
          subject: 'History',
          teacher: 'Mr. Brown',
          time: '1:00 PM',
          duration: '1h',
          room: 'Room 301',
          type: 'lecture'
        }
      ]
    },
    {
      day: 'Wednesday',
      date: 'Dec 18',
      classes: [
        {
          id: '8',
          subject: 'Physics',
          teacher: 'Dr. Johnson',
          time: '9:00 AM',
          duration: '1h',
          room: 'Room 203',
          type: 'lecture'
        },
        {
          id: '9',
          subject: 'English',
          teacher: 'Ms. Davis',
          time: '11:00 AM',
          duration: '45m',
          room: 'Room 105',
          type: 'lecture'
        },
        {
          id: '10',
          subject: 'Mathematics',
          teacher: 'Mr. Smith',
          time: '2:00 PM',
          duration: '1h',
          room: 'Room 201',
          type: 'lecture'
        }
      ]
    },
    {
      day: 'Thursday',
      date: 'Dec 19',
      classes: [
        {
          id: '11',
          subject: 'Chemistry',
          teacher: 'Dr. Wilson',
          time: '10:00 AM',
          duration: '45m',
          room: 'Room 204',
          type: 'lecture'
        },
        {
          id: '12',
          subject: 'History',
          teacher: 'Mr. Brown',
          time: '1:00 PM',
          duration: '1h',
          room: 'Room 301',
          type: 'lecture'
        },
        {
          id: '13',
          subject: 'Physics',
          teacher: 'Dr. Johnson',
          time: '3:00 PM',
          duration: '1h',
          room: 'Lab 3',
          type: 'lab'
        }
      ]
    },
    {
      day: 'Friday',
      date: 'Dec 20',
      classes: [
        {
          id: '14',
          subject: 'English',
          teacher: 'Ms. Davis',
          time: '9:00 AM',
          duration: '1h',
          room: 'Room 105',
          type: 'lecture'
        },
        {
          id: '15',
          subject: 'Mathematics',
          teacher: 'Mr. Smith',
          time: '11:00 AM',
          duration: '45m',
          room: 'Room 201',
          type: 'tutorial'
        },
        {
          id: '16',
          subject: 'Chemistry',
          teacher: 'Dr. Wilson',
          time: '2:00 PM',
          duration: '1h',
          room: 'Lab 2',
          type: 'lab'
        }
      ]
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
      case 'lecture':
        return '#3b82f6'
      case 'lab':
        return '#22c55e'
      case 'tutorial':
        return '#f59e0b'
      case 'break':
        return '#6b7280'
      default:
        return '#6b7280'
    }
  }

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'lecture':
        return 'book-outline'
      case 'lab':
        return 'flask-outline'
      case 'tutorial':
        return 'people-outline'
      case 'break':
        return 'cafe-outline'
      default:
        return 'time-outline'
    }
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
            Class Schedule
          </Text>
          <Text className="text-sm font-rubik text-gray-600">
            Your weekly timetable and upcoming classes
          </Text>
        </View>

        {/* Day Selector */}
        <View className="px-6 mb-6">
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View className="flex-row space-x-3">
              {weekSchedule.map((dayData, index) => (
                <TouchableOpacity
                  key={index}
                  className={`px-4 py-3 rounded-xl min-w-[80px] items-center ${
                    selectedDay === index ? 'bg-green-500' : 'bg-white'
                  } shadow-soft`}
                  onPress={() => setSelectedDay(index)}
                >
                  <Text
                    className={`text-sm font-rubik-medium ${
                      selectedDay === index ? 'text-white' : 'text-gray-600'
                    }`}
                  >
                    {weekDays[index]}
                  </Text>
                  <Text
                    className={`text-xs font-rubik ${
                      selectedDay === index ? 'text-green-100' : 'text-gray-500'
                    }`}
                  >
                    {dayData.date}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>
        </View>

        {/* Schedule for Selected Day */}
        <View className="px-6 pb-6">
          <Text className="text-lg font-rubik-semibold text-gray-800 mb-4">
            {weekSchedule[selectedDay].day} Schedule
          </Text>
          
          <View className="space-y-3">
            {weekSchedule[selectedDay].classes.map((classItem) => (
              <TouchableOpacity
                key={classItem.id}
                className={`rounded-xl p-4 shadow-soft ${
                  classItem.type === 'break' ? 'bg-gray-100' : 'bg-white'
                }`}
                activeOpacity={0.7}
                disabled={classItem.type === 'break'}
              >
                <View className="flex-row items-start justify-between">
                  <View className="flex-1">
                    <View className="flex-row items-center mb-2">
                      <Ionicons
                        name={getTypeIcon(classItem.type)}
                        size={20}
                        color={getTypeColor(classItem.type)}
                      />
                      <Text className="ml-2 text-lg font-rubik-semibold text-gray-800">
                        {classItem.subject}
                      </Text>
                    </View>
                    
                    {classItem.teacher && (
                      <View className="flex-row items-center mb-1">
                        <Ionicons name="person-outline" size={16} color="#6b7280" />
                        <Text className="ml-2 text-sm font-rubik text-gray-600">
                          {classItem.teacher}
                        </Text>
                      </View>
                    )}
                    
                    {classItem.room && (
                      <View className="flex-row items-center">
                        <Ionicons name="location-outline" size={16} color="#6b7280" />
                        <Text className="ml-2 text-sm font-rubik text-gray-600">
                          {classItem.room}
                        </Text>
                      </View>
                    )}
                  </View>
                  
                  <View className="items-end">
                    <Text className="text-lg font-rubik-bold text-gray-800">
                      {classItem.time}
                    </Text>
                    <Text className="text-sm font-rubik text-gray-500">
                      {classItem.duration}
                    </Text>
                    <View 
                      className="mt-2 px-2 py-1 rounded-full"
                      style={{ backgroundColor: `${getTypeColor(classItem.type)}20` }}
                    >
                      <Text 
                        className="text-xs font-rubik-medium capitalize"
                        style={{ color: getTypeColor(classItem.type) }}
                      >
                        {classItem.type}
                      </Text>
                    </View>
                  </View>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  )
}
