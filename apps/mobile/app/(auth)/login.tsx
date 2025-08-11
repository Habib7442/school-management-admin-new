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
import { SafeAreaView } from 'react-native-safe-area-context'
import { LinearGradient } from 'expo-linear-gradient'
import { Ionicons } from '@expo/vector-icons'
import { router } from 'expo-router'
import { useAuthStore } from '../../lib/stores/auth-store'
import RoleSelector, { MobileUserRole } from '../../components/RoleSelector'
import Input from '../../components/ui/Input'
import Button from '../../components/ui/Button'

export default function LoginScreen() {
  const [selectedRole, setSelectedRole] = useState<MobileUserRole>('student')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)

  const { login, isLoading } = useAuthStore()

  const getRoleColors = (role: MobileUserRole) => {
    return role === 'teacher' ? ['#3B82F6', '#1E40AF'] : ['#10B981', '#047857']
  }

  const getRolePlaceholders = (role: MobileUserRole) => {
    return {
      email: role === 'teacher' ? 'teacher@school.edu' : 'student@school.edu',
    }
  }

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert('Error', 'Please fill in all fields')
      return
    }

    const { error } = await login(email.trim(), password)

    if (error) {
      Alert.alert('Login Failed', error)
    } else {
      // Navigate to role-specific dashboard
      if (selectedRole === 'teacher') {
        router.replace('/teacher-dashboard')
      } else {
        router.replace('/student-dashboard')
      }
    }
  }

  const colors = getRoleColors(selectedRole)
  const placeholders = getRolePlaceholders(selectedRole)

  return (
    <SafeAreaView className="flex-1">
      <LinearGradient
        colors={['#F59E0B10', '#D9770605', '#FFFFFF']}
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
              <Ionicons name="school" size={32} color="white" />
            </LinearGradient>
            <Text className="text-3xl font-rubik-bold text-gray-800 mb-2">
              Welcome Back
            </Text>
            <Text className="text-base font-rubik text-gray-600 text-center">
              Sign in to your account
            </Text>
          </View>

          {/* Role Selector */}
          <RoleSelector selectedRole={selectedRole} onRoleChange={setSelectedRole} />

          {/* Login Form */}
          <View className="bg-white rounded-2xl p-6 shadow-md">
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
              placeholder="Enter your password"
              value={password}
              onChangeText={setPassword}
              isPassword
              showPassword={showPassword}
              onTogglePassword={() => setShowPassword(!showPassword)}
              accentColor={colors[0]}
            />

            <Button
              title={`Sign In as ${selectedRole === 'teacher' ? 'Teacher' : 'Student'}`}
              onPress={handleLogin}
              loading={isLoading}
              colors={colors}
              className="mt-2 mb-6"
            />

            {/* Register Link */}
            <View className="flex-row justify-center items-center">
              <Text className="text-sm font-rubik text-gray-600">
                Don't have an account?{' '}
              </Text>
              <TouchableOpacity onPress={() => router.push('/(auth)/register')}>
                <Text 
                  className="text-sm font-rubik-semibold"
                  style={{ color: colors[0] }}
                >
                  Sign up
                </Text>
              </TouchableOpacity>
            </View>
          </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </LinearGradient>
    </SafeAreaView>
  )
}
