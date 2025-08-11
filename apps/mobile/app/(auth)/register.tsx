import React, { useState } from 'react'
import {
  View,
  Text,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  TouchableOpacity,
} from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import { Ionicons } from '@expo/vector-icons'
import { router } from 'expo-router'
import { supabase } from '../../lib/supabase'
import RoleSelector, { MobileUserRole } from '../../components/RoleSelector'
import Input from '../../components/ui/Input'
import Button from '../../components/ui/Button'

export default function RegisterScreen() {
  const [selectedRole, setSelectedRole] = useState<MobileUserRole>('student')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)

  const getRoleColors = (role: MobileUserRole) => {
    return role === 'teacher' ? ['#3B82F6', '#1E40AF'] : ['#10B981', '#047857']
  }

  const getRolePlaceholders = (role: MobileUserRole) => {
    return {
      name: role === 'teacher' ? 'Dr. John Smith' : 'John Doe',
      email: role === 'teacher' ? 'teacher@school.edu' : 'student@school.edu',
    }
  }

  const validateForm = () => {
    if (!name.trim()) {
      Alert.alert('Error', 'Please enter your full name')
      return false
    }
    if (!email.trim()) {
      Alert.alert('Error', 'Please enter your email address')
      return false
    }
    if (password.length < 6) {
      Alert.alert('Error', 'Password must be at least 6 characters long')
      return false
    }
    if (password !== confirmPassword) {
      Alert.alert('Error', 'Passwords do not match')
      return false
    }
    return true
  }

  const handleRegister = async () => {
    if (!validateForm()) return

    setLoading(true)
    try {
      const { data, error } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: {
          data: {
            name: name.trim(),
            role: selectedRole,
          },
        },
      })

      if (error) {
        Alert.alert('Registration Failed', error.message)
      } else {
        Alert.alert(
          'Registration Successful',
          'Please check your email to verify your account before signing in.',
          [
            {
              text: 'OK',
              onPress: () => router.replace('/(auth)/login'),
            },
          ]
        )
      }
    } catch (err) {
      Alert.alert('Error', 'An unexpected error occurred')
    } finally {
      setLoading(false)
    }
  }

  const colors = getRoleColors(selectedRole)
  const placeholders = getRolePlaceholders(selectedRole)

  return (
    <LinearGradient
      colors={[colors[0] + '10', colors[1] + '05', '#FFFFFF']}
      className="flex-1"
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        className="flex-1"
      >
        <ScrollView 
          contentContainerStyle={{ flexGrow: 1, padding: 24, justifyContent: 'center' }}
          showsVerticalScrollIndicator={false}
        >
          {/* Header */}
          <View className="items-center mb-8">
            <LinearGradient
              colors={colors}
              className="w-20 h-20 rounded-full items-center justify-center mb-4 shadow-lg"
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              <Ionicons name="person-add" size={32} color="white" />
            </LinearGradient>
            <Text className="text-3xl font-rubik-bold text-gray-800 mb-2">
              Create Account
            </Text>
            <Text className="text-base font-rubik text-gray-600 text-center">
              Join our school community
            </Text>
          </View>

          {/* Role Selector */}
          <RoleSelector selectedRole={selectedRole} onRoleChange={setSelectedRole} />

          {/* Registration Form */}
          <View className="bg-white rounded-2xl p-6 shadow-md">
            <Input
              label="Full Name"
              icon="person-outline"
              placeholder={placeholders.name}
              value={name}
              onChangeText={setName}
              autoCapitalize="words"
              accentColor={colors[0]}
            />

            <Input
              label="Email Address"
              icon="mail-outline"
              placeholder={placeholders.email}
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              accentColor={colors[0]}
            />

            <Input
              label="Password"
              icon="lock-closed-outline"
              placeholder="Create a password"
              value={password}
              onChangeText={setPassword}
              isPassword
              showPassword={showPassword}
              onTogglePassword={() => setShowPassword(!showPassword)}
              accentColor={colors[0]}
            />

            <Input
              label="Confirm Password"
              icon="lock-closed-outline"
              placeholder="Confirm your password"
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              isPassword
              showPassword={showConfirmPassword}
              onTogglePassword={() => setShowConfirmPassword(!showConfirmPassword)}
              accentColor={colors[0]}
            />

            <Button
              title={`Register as ${selectedRole === 'teacher' ? 'Teacher' : 'Student'}`}
              onPress={handleRegister}
              loading={loading}
              colors={colors}
              className="mt-2 mb-6"
            />

            {/* Login Link */}
            <View className="flex-row justify-center items-center">
              <Text className="text-sm font-rubik text-gray-600">
                Already have an account?{' '}
              </Text>
              <TouchableOpacity onPress={() => router.push('/(auth)/login')}>
                <Text 
                  className="text-sm font-rubik-semibold"
                  style={{ color: colors[0] }}
                >
                  Sign in
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </LinearGradient>
  )
}
