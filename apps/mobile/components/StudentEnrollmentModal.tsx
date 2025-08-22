import React, { useState } from 'react'
import {
  View,
  Text,
  Modal,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { teacherApiService, ClassStudentInfo, StudentEnrollmentData } from '../lib/api/teacher-api-service'

interface StudentEnrollmentModalProps {
  visible: boolean
  onClose: () => void
  classId: string
  className: string
  onStudentEnrolled: (newStudent: ClassStudentInfo) => void
}

interface FormData {
  name: string
  email: string
  roll_number: string
  admission_number: string
  parent_name: string
  parent_phone: string
  parent_email: string
}

interface FormErrors {
  name?: string
  email?: string
  roll_number?: string
  admission_number?: string
  parent_name?: string
  parent_phone?: string
  parent_email?: string
}

export default function StudentEnrollmentModal({
  visible,
  onClose,
  classId,
  className,
  onStudentEnrolled
}: StudentEnrollmentModalProps) {
  const [formData, setFormData] = useState<FormData>({
    name: '',
    email: '',
    roll_number: '',
    admission_number: '',
    parent_name: '',
    parent_phone: '',
    parent_email: ''
  })
  const [errors, setErrors] = useState<FormErrors>({})
  const [loading, setLoading] = useState(false)

  const resetForm = () => {
    setFormData({
      name: '',
      email: '',
      roll_number: '',
      admission_number: '',
      parent_name: '',
      parent_phone: '',
      parent_email: ''
    })
    setErrors({})
  }

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {}

    if (!formData.name.trim()) {
      newErrors.name = 'Student name is required'
    }

    if (!formData.email.trim()) {
      newErrors.email = 'Email is required'
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'Please enter a valid email address'
    }

    if (!formData.parent_name.trim()) {
      newErrors.parent_name = 'Parent name is required'
    }

    if (!formData.parent_phone.trim()) {
      newErrors.parent_phone = 'Parent phone is required'
    } else if (!/^\+?[\d\s-()]+$/.test(formData.parent_phone)) {
      newErrors.parent_phone = 'Please enter a valid phone number'
    }

    if (formData.parent_email && !/\S+@\S+\.\S+/.test(formData.parent_email)) {
      newErrors.parent_email = 'Please enter a valid email address'
    }

    if (formData.roll_number && isNaN(Number(formData.roll_number))) {
      newErrors.roll_number = 'Roll number must be a valid number'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleEnroll = async () => {
    if (!validateForm()) {
      Alert.alert('Validation Error', 'Please fix the errors before enrolling.')
      return
    }

    setLoading(true)

    try {
      const enrollmentData: StudentEnrollmentData = {
        name: formData.name.trim(),
        email: formData.email.trim(),
        roll_number: formData.roll_number ? Number(formData.roll_number) : null,
        admission_number: formData.admission_number.trim() || null,
        parent_name: formData.parent_name.trim(),
        parent_phone: formData.parent_phone.trim(),
        parent_email: formData.parent_email.trim() || null,
        class_id: classId
      }

      const response = await teacherApiService.enrollStudentToClass(enrollmentData)

      if (response.error) {
        Alert.alert('Error', response.error)
        return
      }

      if (response.data) {
        onStudentEnrolled(response.data)
        Alert.alert(
          'Success', 
          `${formData.name} has been successfully enrolled in ${className}!`,
          [{ text: 'OK', onPress: () => { resetForm(); onClose() } }]
        )
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to enroll student. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const updateFormData = (field: keyof FormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: undefined }))
    }
  }

  const handleClose = () => {
    resetForm()
    onClose()
  }

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <SafeAreaView className="flex-1 bg-white">
        <KeyboardAvoidingView 
          className="flex-1" 
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          {/* Header */}
          <View className="flex-row items-center justify-between p-4 border-b border-gray-200">
            <TouchableOpacity onPress={handleClose} className="p-2">
              <Ionicons name="close" size={24} color="#6b7280" />
            </TouchableOpacity>
            <View className="flex-1 items-center">
              <Text className="text-lg font-rubik-semibold text-gray-800">
                Enroll New Student
              </Text>
              <Text className="text-sm font-rubik text-gray-600">
                {className}
              </Text>
            </View>
            <TouchableOpacity 
              onPress={handleEnroll}
              disabled={loading}
              className={`px-4 py-2 rounded-lg ${loading ? 'bg-gray-300' : 'bg-green-600'}`}
            >
              {loading ? (
                <ActivityIndicator size="small" color="white" />
              ) : (
                <Text className="text-white font-rubik-medium">Enroll</Text>
              )}
            </TouchableOpacity>
          </View>

          <ScrollView className="flex-1 p-4">
            {/* Student Information Section */}
            <View className="mb-6">
              <Text className="text-lg font-rubik-semibold text-gray-800 mb-4">
                Student Information
              </Text>

              {/* Name Field */}
              <View className="mb-4">
                <Text className="text-sm font-rubik-medium text-gray-700 mb-2">
                  Student Name *
                </Text>
                <TextInput
                  value={formData.name}
                  onChangeText={(value) => updateFormData('name', value)}
                  placeholder="Enter student full name"
                  className={`border rounded-lg px-3 py-3 font-rubik ${
                    errors.name ? 'border-red-500' : 'border-gray-300'
                  }`}
                />
                {errors.name && (
                  <Text className="text-red-500 text-xs mt-1 font-rubik">{errors.name}</Text>
                )}
              </View>

              {/* Email Field */}
              <View className="mb-4">
                <Text className="text-sm font-rubik-medium text-gray-700 mb-2">
                  Email Address *
                </Text>
                <TextInput
                  value={formData.email}
                  onChangeText={(value) => updateFormData('email', value)}
                  placeholder="Enter student email address"
                  keyboardType="email-address"
                  autoCapitalize="none"
                  className={`border rounded-lg px-3 py-3 font-rubik ${
                    errors.email ? 'border-red-500' : 'border-gray-300'
                  }`}
                />
                {errors.email && (
                  <Text className="text-red-500 text-xs mt-1 font-rubik">{errors.email}</Text>
                )}
              </View>

              {/* Roll Number Field */}
              <View className="mb-4">
                <Text className="text-sm font-rubik-medium text-gray-700 mb-2">
                  Roll Number
                </Text>
                <TextInput
                  value={formData.roll_number}
                  onChangeText={(value) => updateFormData('roll_number', value)}
                  placeholder="Enter roll number (optional)"
                  keyboardType="numeric"
                  className={`border rounded-lg px-3 py-3 font-rubik ${
                    errors.roll_number ? 'border-red-500' : 'border-gray-300'
                  }`}
                />
                {errors.roll_number && (
                  <Text className="text-red-500 text-xs mt-1 font-rubik">{errors.roll_number}</Text>
                )}
              </View>

              {/* Admission Number Field */}
              <View className="mb-4">
                <Text className="text-sm font-rubik-medium text-gray-700 mb-2">
                  Admission Number
                </Text>
                <TextInput
                  value={formData.admission_number}
                  onChangeText={(value) => updateFormData('admission_number', value)}
                  placeholder="Enter admission number (optional)"
                  className="border border-gray-300 rounded-lg px-3 py-3 font-rubik"
                />
              </View>
            </View>

            {/* Parent Information Section */}
            <View className="mb-6">
              <Text className="text-lg font-rubik-semibold text-gray-800 mb-4">
                Parent Information
              </Text>

              {/* Parent Name Field */}
              <View className="mb-4">
                <Text className="text-sm font-rubik-medium text-gray-700 mb-2">
                  Parent/Guardian Name *
                </Text>
                <TextInput
                  value={formData.parent_name}
                  onChangeText={(value) => updateFormData('parent_name', value)}
                  placeholder="Enter parent or guardian name"
                  className={`border rounded-lg px-3 py-3 font-rubik ${
                    errors.parent_name ? 'border-red-500' : 'border-gray-300'
                  }`}
                />
                {errors.parent_name && (
                  <Text className="text-red-500 text-xs mt-1 font-rubik">{errors.parent_name}</Text>
                )}
              </View>

              {/* Parent Phone Field */}
              <View className="mb-4">
                <Text className="text-sm font-rubik-medium text-gray-700 mb-2">
                  Parent Phone Number *
                </Text>
                <TextInput
                  value={formData.parent_phone}
                  onChangeText={(value) => updateFormData('parent_phone', value)}
                  placeholder="Enter parent phone number"
                  keyboardType="phone-pad"
                  className={`border rounded-lg px-3 py-3 font-rubik ${
                    errors.parent_phone ? 'border-red-500' : 'border-gray-300'
                  }`}
                />
                {errors.parent_phone && (
                  <Text className="text-red-500 text-xs mt-1 font-rubik">{errors.parent_phone}</Text>
                )}
              </View>

              {/* Parent Email Field */}
              <View className="mb-4">
                <Text className="text-sm font-rubik-medium text-gray-700 mb-2">
                  Parent Email Address
                </Text>
                <TextInput
                  value={formData.parent_email}
                  onChangeText={(value) => updateFormData('parent_email', value)}
                  placeholder="Enter parent email (optional)"
                  keyboardType="email-address"
                  autoCapitalize="none"
                  className={`border rounded-lg px-3 py-3 font-rubik ${
                    errors.parent_email ? 'border-red-500' : 'border-gray-300'
                  }`}
                />
                {errors.parent_email && (
                  <Text className="text-red-500 text-xs mt-1 font-rubik">{errors.parent_email}</Text>
                )}
              </View>
            </View>

            {/* Info Note */}
            <View className="bg-blue-50 p-4 rounded-lg mb-6">
              <View className="flex-row items-start">
                <Ionicons name="information-circle" size={20} color="#3b82f6" />
                <View className="ml-3 flex-1">
                  <Text className="text-sm font-rubik-medium text-blue-800 mb-1">
                    Enrollment Information
                  </Text>
                  <Text className="text-xs font-rubik text-blue-700">
                    The student will be automatically enrolled in {className}. 
                    You can update their details later if needed.
                  </Text>
                </View>
              </View>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </Modal>
  )
}
