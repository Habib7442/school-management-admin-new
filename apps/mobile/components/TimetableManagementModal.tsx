import React, { useState, useEffect } from 'react'
import {
  View,
  Text,
  Modal,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  FlatList,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { 
  teacherApiService, 
  ClassTimetableView, 
  TimetableEntry, 
  TimetableUpdateData 
} from '../lib/api/teacher-api-service'

interface TimetableManagementModalProps {
  visible: boolean
  onClose: () => void
  classId: string
  className: string
  onTimetableUpdated: () => void
}

interface Teacher {
  id: string
  name: string
  email: string
}

interface Subject {
  id: string
  name: string
  code: string
}

export default function TimetableManagementModal({
  visible,
  onClose,
  classId,
  className,
  onTimetableUpdated
}: TimetableManagementModalProps) {
  const [timetable, setTimetable] = useState<ClassTimetableView[]>([])
  const [teachers, setTeachers] = useState<Teacher[]>([])
  const [subjects, setSubjects] = useState<Subject[]>([])
  const [loading, setLoading] = useState(false)
  const [selectedPeriod, setSelectedPeriod] = useState<{
    day: string
    periodId: string
    timetableId?: string
    teacherId?: string
    subjectId?: string
  } | null>(null)

  useEffect(() => {
    if (visible) {
      loadTimetableData()
    }
  }, [visible, classId])

  const loadTimetableData = async () => {
    setLoading(true)
    try {
      const [timetableResponse, teachersSubjectsResponse] = await Promise.all([
        teacherApiService.getClassTimetableStructured(classId),
        teacherApiService.getAvailableTeachersAndSubjects()
      ])

      if (timetableResponse.error) {
        Alert.alert('Error', timetableResponse.error)
        return
      }

      if (teachersSubjectsResponse.error) {
        Alert.alert('Error', teachersSubjectsResponse.error)
        return
      }

      if (timetableResponse.data) {
        setTimetable(timetableResponse.data)
      }

      if (teachersSubjectsResponse.data) {
        setTeachers(teachersSubjectsResponse.data.teachers)
        setSubjects(teachersSubjectsResponse.data.subjects)
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to load timetable data')
    } finally {
      setLoading(false)
    }
  }

  const handlePeriodPress = (day: string, period: any) => {
    setSelectedPeriod({
      day,
      periodId: period.time_period_id,
      timetableId: period.timetable_id,
      teacherId: period.teacher_id,
      subjectId: period.subject_id
    })
  }

  const handleAssignTeacher = (teacherId: string, subjectId: string) => {
    if (!selectedPeriod) return

    Alert.alert(
      'Assign Teacher',
      `Assign ${teachers.find(t => t.id === teacherId)?.name} to teach ${subjects.find(s => s.id === subjectId)?.name}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Assign', onPress: () => updateTimetableEntry(teacherId, subjectId) }
      ]
    )
  }

  const updateTimetableEntry = async (teacherId: string, subjectId: string) => {
    if (!selectedPeriod) return

    setLoading(true)
    try {
      if (selectedPeriod.timetableId) {
        // Update existing entry
        const updateData: TimetableUpdateData = {
          teacher_id: teacherId,
          subject_id: subjectId
        }
        
        const response = await teacherApiService.updateTimetableEntry(
          selectedPeriod.timetableId, 
          updateData
        )

        if (response.error) {
          Alert.alert('Error', response.error)
          return
        }
      } else {
        // Create new entry
        const entryData: TimetableEntry = {
          class_id: classId,
          teacher_id: teacherId,
          subject_id: subjectId,
          day_of_week: selectedPeriod.day,
          time_period_id: selectedPeriod.periodId,
          is_active: true
        }

        const response = await teacherApiService.createTimetableEntry(entryData)

        if (response.error) {
          Alert.alert('Error', response.error)
          return
        }
      }

      Alert.alert('Success', 'Timetable updated successfully!')
      setSelectedPeriod(null)
      loadTimetableData()
      onTimetableUpdated()
    } catch (error) {
      Alert.alert('Error', 'Failed to update timetable')
    } finally {
      setLoading(false)
    }
  }

  const handleRemoveAssignment = () => {
    if (!selectedPeriod?.timetableId) return

    Alert.alert(
      'Remove Assignment',
      'Are you sure you want to remove this teacher assignment?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Remove', style: 'destructive', onPress: removeAssignment }
      ]
    )
  }

  const removeAssignment = async () => {
    if (!selectedPeriod?.timetableId) return

    setLoading(true)
    try {
      const response = await teacherApiService.deleteTimetableEntry(selectedPeriod.timetableId)

      if (response.error) {
        Alert.alert('Error', response.error)
        return
      }

      Alert.alert('Success', 'Assignment removed successfully!')
      setSelectedPeriod(null)
      loadTimetableData()
      onTimetableUpdated()
    } catch (error) {
      Alert.alert('Error', 'Failed to remove assignment')
    } finally {
      setLoading(false)
    }
  }

  const renderPeriod = (period: any, day: string) => {
    const isAssigned = period.teacher_id && period.subject_id
    const isSelected = selectedPeriod?.day === day && selectedPeriod?.periodId === period.time_period_id

    return (
      <TouchableOpacity
        key={`${day}-${period.time_period_id}`}
        onPress={() => handlePeriodPress(day, period)}
        className={`border rounded-lg p-3 mb-2 ${
          isSelected 
            ? 'border-blue-500 bg-blue-50' 
            : isAssigned 
              ? 'border-green-300 bg-green-50' 
              : 'border-gray-300 bg-gray-50'
        }`}
      >
        <View className="flex-row items-center justify-between">
          <View className="flex-1">
            <Text className="text-sm font-rubik-medium text-gray-800">
              {period.time_period_name}
            </Text>
            <Text className="text-xs font-rubik text-gray-600">
              {period.start_time} - {period.end_time}
            </Text>
            {isAssigned && (
              <View className="mt-1">
                <Text className="text-xs font-rubik-medium text-green-700">
                  {period.teacher_name}
                </Text>
                <Text className="text-xs font-rubik text-green-600">
                  {period.subject_name} ({period.subject_code})
                </Text>
              </View>
            )}
          </View>
          <View className="ml-2">
            {isAssigned ? (
              <Ionicons name="checkmark-circle" size={20} color="#10b981" />
            ) : (
              <Ionicons name="add-circle-outline" size={20} color="#6b7280" />
            )}
          </View>
        </View>
      </TouchableOpacity>
    )
  }

  const renderDay = ({ item: day }: { item: ClassTimetableView }) => (
    <View className="mb-6">
      <Text className="text-lg font-rubik-semibold text-gray-800 mb-3 capitalize">
        {day.day_of_week}
      </Text>
      {day.periods.map(period => renderPeriod(period, day.day_of_week))}
    </View>
  )

  const renderTeacherSubjectSelector = () => {
    if (!selectedPeriod) return null

    return (
      <View className="bg-white border-t border-gray-200 p-4">
        <View className="flex-row items-center justify-between mb-4">
          <Text className="text-lg font-rubik-semibold text-gray-800">
            Assign Teacher & Subject
          </Text>
          <TouchableOpacity onPress={() => setSelectedPeriod(null)}>
            <Ionicons name="close" size={24} color="#6b7280" />
          </TouchableOpacity>
        </View>

        <Text className="text-sm font-rubik text-gray-600 mb-4">
          {selectedPeriod.day.charAt(0).toUpperCase() + selectedPeriod.day.slice(1)} - Period {
            timetable
              .find(d => d.day_of_week === selectedPeriod.day)
              ?.periods.find(p => p.time_period_id === selectedPeriod.periodId)
              ?.time_period_name
          }
        </Text>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mb-4">
          {subjects.map(subject => (
            <View key={subject.id} className="mr-4">
              <Text className="text-sm font-rubik-medium text-gray-700 mb-2">
                {subject.name} ({subject.code})
              </Text>
              <ScrollView className="max-h-32">
                {teachers.map(teacher => (
                  <TouchableOpacity
                    key={`${subject.id}-${teacher.id}`}
                    onPress={() => handleAssignTeacher(teacher.id, subject.id)}
                    className="bg-blue-50 border border-blue-200 rounded-lg p-2 mb-2 min-w-[150px]"
                  >
                    <Text className="text-sm font-rubik-medium text-blue-800">
                      {teacher.name}
                    </Text>
                    <Text className="text-xs font-rubik text-blue-600">
                      {teacher.email}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          ))}
        </ScrollView>

        {selectedPeriod.timetableId && (
          <TouchableOpacity
            onPress={handleRemoveAssignment}
            className="bg-red-50 border border-red-200 rounded-lg p-3 mt-2"
          >
            <Text className="text-center text-red-600 font-rubik-medium">
              Remove Current Assignment
            </Text>
          </TouchableOpacity>
        )}
      </View>
    )
  }

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <SafeAreaView className="flex-1 bg-white">
        {/* Header */}
        <View className="flex-row items-center justify-between p-4 border-b border-gray-200">
          <TouchableOpacity onPress={onClose} className="p-2">
            <Ionicons name="close" size={24} color="#6b7280" />
          </TouchableOpacity>
          <View className="flex-1 items-center">
            <Text className="text-lg font-rubik-semibold text-gray-800">
              Manage Timetable
            </Text>
            <Text className="text-sm font-rubik text-gray-600">
              {className}
            </Text>
          </View>
          <View className="w-10" />
        </View>

        {loading ? (
          <View className="flex-1 items-center justify-center">
            <ActivityIndicator size="large" color="#3b82f6" />
            <Text className="text-gray-600 font-rubik mt-2">Loading timetable...</Text>
          </View>
        ) : (
          <View className="flex-1">
            <FlatList
              data={timetable}
              renderItem={renderDay}
              keyExtractor={(item) => item.day_of_week}
              contentContainerStyle={{ padding: 16 }}
              showsVerticalScrollIndicator={false}
            />
            {renderTeacherSubjectSelector()}
          </View>
        )}
      </SafeAreaView>
    </Modal>
  )
}
