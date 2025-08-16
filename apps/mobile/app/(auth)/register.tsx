import React, { useState } from 'react'
import {
  View,
  Text,
  Alert,
  TouchableOpacity,
  TextInput,
} from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { router } from 'expo-router'
import { useAuthStore } from '../../lib/stores/auth-store'
import RoleSelector, { MobileUserRole } from '../../components/RoleSelector'
import Button from '../../components/ui/Button'
import type { UserRole } from '@repo/types'
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view'
import { SafeAreaView } from 'react-native-safe-area-context'


interface FormData {
  name: string
  email: string
  password: string
  confirmPassword: string
  schoolCode: string
}

export default function RegisterScreen() {
  const [selectedRole, setSelectedRole] = useState<MobileUserRole>('student')
  const [formData, setFormData] = useState<FormData>({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    schoolCode: '',
  })
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})

  const { register, isLoading } = useAuthStore()

  // Type-safe components
  const Icon = Ionicons as any
  const TypedButton = Button as any

  const updateFormData = (field: keyof FormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }))
    }
  }

  const validateForm = () => {
    const newErrors: Record<string, string> = {}

    if (!formData.name.trim()) {
      newErrors.name = 'Full name is required'
    } else if (formData.name.trim().length < 2) {
      newErrors.name = 'Name must be at least 2 characters'
    }

    if (!formData.email.trim()) {
      newErrors.email = 'Email is required'
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'Please enter a valid email address'
    }

    if (!formData.password) {
      newErrors.password = 'Password is required'
    } else if (formData.password.length < 6) {
      newErrors.password = 'Password must be at least 6 characters'
    } else if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(formData.password)) {
      newErrors.password = 'Password must contain uppercase, lowercase, and number'
    }

    if (!formData.confirmPassword) {
      newErrors.confirmPassword = 'Please confirm your password'
    } else if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match'
    }

    if (!formData.schoolCode.trim()) {
      newErrors.schoolCode = 'School code is required'
    } else if (formData.schoolCode.trim().length < 4) {
      newErrors.schoolCode = 'School code must be at least 4 characters'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleRegister = async () => {
    if (!validateForm()) return



    const result = await register(
      formData.email.trim(),
      formData.password,
      formData.name.trim(),
      selectedRole as UserRole,
      formData.schoolCode.trim().toUpperCase()
    )

    if (result.error) {
      Alert.alert('Registration Failed', result.error)
    } else if (result.requiresEmailConfirmation) {
      Alert.alert(
        'Registration Successful',
        'Please check your email to verify your account before signing in.',
        [
          {
            text: 'OK',
            onPress: () => router.push('/(auth)/login')
          }
        ]
      )
    } else {
      Alert.alert(
        'Welcome!',
        'Your account has been created successfully.',
        [
          {
            text: 'OK',
            onPress: () => router.replace('/')
          }
        ]
      )
    }
  }

  const getRolePlaceholders = (role: MobileUserRole) => {
    return {
      email: role === 'teacher' ? 'teacher@school.edu' : 'student@school.edu',
      name: role === 'teacher' ? 'John Smith' : 'Jane Doe',
    }
  }

  const placeholders = getRolePlaceholders(selectedRole)

  return (
    <SafeAreaView className="flex-1 bg-gray-50" style={{ flex: 1 }}>
      {/* @ts-ignore */}
      <KeyboardAwareScrollView
        contentContainerStyle={{
          flexGrow: 1,
          padding: 24,
          paddingTop: 60,
          paddingBottom: 40,
        }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        enableOnAndroid={true}
        enableAutomaticScroll={true}
        extraHeight={120}
        extraScrollHeight={120}
        resetScrollToCoords={{ x: 0, y: 0 }}
        scrollEnabled={true}
      >
          {/* Header */}
          <View className="items-center mb-8">
            <View className={`
              w-20 h-20 rounded-full items-center justify-center mb-4 shadow-medium
              ${selectedRole === 'teacher' ? 'bg-primary-500' : 'bg-secondary-500'}
            `}>
              <Icon name="person-add" size={32} color="white" />
            </View>
            <Text className="text-3xl font-rubik-bold text-gray-800 mb-2">
              Create Account
            </Text>
            <Text className="text-base font-rubik text-gray-600 text-center">
              Join your school&apos;s management system
            </Text>
          </View>

          {/* Role Selector */}
          <RoleSelector selectedRole={selectedRole} onRoleChange={setSelectedRole} />

          {/* Registration Form */}
          <View className="bg-white rounded-2xl p-6 shadow-soft mb-6">
            {/* Full Name Input */}
            <View className="mb-4">
              <Text className="text-sm font-rubik-medium text-gray-700 mb-2">
                Full Name *
              </Text>
              <View className="flex-row items-center bg-white border border-gray-200 rounded-xl px-4 py-3">
                <Icon
                  name="person-outline"
                  size={20}
                  color="#9ca3af"
                  style={{ marginRight: 12 }}
                />
                <TextInput
                  className="flex-1 text-base font-rubik text-gray-900"
                  placeholder={placeholders.name}
                  value={formData.name}
                  onChangeText={(text: string) => updateFormData('name', text)}
                  autoCapitalize="words"
                  placeholderTextColor="#9ca3af"
                />
              </View>
              {errors.name && (
                <Text className="text-red-500 text-sm font-rubik mt-1 ml-1">
                  {errors.name}
                </Text>
              )}
            </View>

            {/* Email Input */}
            <View className="mb-4">
              <Text className="text-sm font-rubik-medium text-gray-700 mb-2">
                Email Address *
              </Text>
              <View className="flex-row items-center bg-white border border-gray-200 rounded-xl px-4 py-3">
                <Icon
                  name="mail-outline"
                  size={20}
                  color="#9ca3af"
                  style={{ marginRight: 12 }}
                />
                <TextInput
                  className="flex-1 text-base font-rubik text-gray-900"
                  placeholder={placeholders.email}
                  value={formData.email}
                  onChangeText={(text: string) => updateFormData('email', text)}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                  placeholderTextColor="#9ca3af"
                />
              </View>
              {errors.email && (
                <Text className="text-red-500 text-sm font-rubik mt-1 ml-1">
                  {errors.email}
                </Text>
              )}
            </View>

            {/* School Code Input */}
            <View className="mb-4">
              <Text className="text-sm font-rubik-medium text-gray-700 mb-2">
                School Code *
              </Text>
              <View className="flex-row items-center bg-white border border-gray-200 rounded-xl px-4 py-3">
                <Icon
                  name="school-outline"
                  size={20}
                  color="#9ca3af"
                  style={{ marginRight: 12 }}
                />
                <TextInput
                  className="flex-1 text-base font-rubik text-gray-900"
                  placeholder="Enter your school code"
                  value={formData.schoolCode}
                  onChangeText={(text: string) => updateFormData('schoolCode', text.toUpperCase())}
                  autoCapitalize="characters"
                  autoCorrect={false}
                  placeholderTextColor="#9ca3af"
                />
              </View>
              {errors.schoolCode && (
                <Text className="text-red-500 text-sm font-rubik mt-1 ml-1">
                  {errors.schoolCode}
                </Text>
              )}
            </View>

            {/* Password Input */}
            <View className="mb-4">
              <Text className="text-sm font-rubik-medium text-gray-700 mb-2">
                Password *
              </Text>
              <View className="flex-row items-center bg-white border border-gray-200 rounded-xl px-4 py-3">
                <Icon
                  name="lock-closed-outline"
                  size={20}
                  color="#9ca3af"
                  style={{ marginRight: 12 }}
                />
                <TextInput
                  className="flex-1 text-base font-rubik text-gray-900"
                  placeholder="Create a strong password"
                  value={formData.password}
                  onChangeText={(text: string) => updateFormData('password', text)}
                  secureTextEntry={!showPassword}
                  placeholderTextColor="#9ca3af"
                />
                <TouchableOpacity
                  onPress={() => setShowPassword(!showPassword)}
                  className="ml-2 p-1"
                  activeOpacity={0.7}
                >
                  <Icon
                    name={showPassword ? "eye-off-outline" : "eye-outline"}
                    size={20}
                    color="#9ca3af"
                  />
                </TouchableOpacity>
              </View>
              {errors.password && (
                <Text className="text-red-500 text-sm font-rubik mt-1 ml-1">
                  {errors.password}
                </Text>
              )}
            </View>

            {/* Confirm Password Input */}
            <View className="mb-4">
              <Text className="text-sm font-rubik-medium text-gray-700 mb-2">
                Confirm Password *
              </Text>
              <View className="flex-row items-center bg-white border border-gray-200 rounded-xl px-4 py-3">
                <Icon
                  name="lock-closed-outline"
                  size={20}
                  color="#9ca3af"
                  style={{ marginRight: 12 }}
                />
                <TextInput
                  className="flex-1 text-base font-rubik text-gray-900"
                  placeholder="Confirm your password"
                  value={formData.confirmPassword}
                  onChangeText={(text: string) => updateFormData('confirmPassword', text)}
                  secureTextEntry={!showConfirmPassword}
                  placeholderTextColor="#9ca3af"
                />
                <TouchableOpacity
                  onPress={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="ml-2 p-1"
                  activeOpacity={0.7}
                >
                  <Icon
                    name={showConfirmPassword ? "eye-off-outline" : "eye-outline"}
                    size={20}
                    color="#9ca3af"
                  />
                </TouchableOpacity>
              </View>
              {errors.confirmPassword && (
                <Text className="text-red-500 text-sm font-rubik mt-1 ml-1">
                  {errors.confirmPassword}
                </Text>
              )}
            </View>



            <TypedButton
              title="Create Account"
              onPress={handleRegister}
              isLoading={isLoading}
              fullWidth
              className="mt-2"
              variant={selectedRole === 'teacher' ? 'primary' : 'secondary'}
            />
          </View>

          {/* Login Link */}
          <View className="flex-row justify-center items-center mb-4">
            <Text className="text-gray-600 font-rubik">
              Already have an account?{' '}
            </Text>
            <TouchableOpacity
              onPress={() => router.push('/(auth)/login')}
              activeOpacity={0.7}
            >
              <Text className={`
                font-rubik-semibold
                ${selectedRole === 'teacher' ? 'text-primary-500' : 'text-secondary-500'}
              `}>
                Sign In
              </Text>
            </TouchableOpacity>
          </View>

          {/* Footer */}
          <View className="items-center">
            <Text className="text-sm text-gray-500 font-rubik text-center">
              School Management System
            </Text>
            <Text className="text-xs text-gray-400 font-rubik mt-1">
              Secure • Reliable • Easy to Use
            </Text>
          </View>
      </KeyboardAwareScrollView>
    </SafeAreaView>
  )
}
