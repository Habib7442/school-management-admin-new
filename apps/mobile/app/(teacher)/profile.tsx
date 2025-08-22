import React, { useState, useEffect } from 'react'
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Alert,
  Switch,
  Modal,
  TextInput,
  ActivityIndicator,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { router } from 'expo-router'
import { useAuthStore } from '../../lib/stores/auth-store'
import AsyncStorage from '@react-native-async-storage/async-storage'

interface ProfileMenuItem {
  id: string
  title: string
  icon: keyof typeof Ionicons.glyphMap
  action: () => void
  showArrow?: boolean
  color?: string
}

export default function TeacherProfile() {
  const { user, logout, updateProfile } = useAuthStore()
  const [notificationsEnabled, setNotificationsEnabled] = useState(true)
  const [darkModeEnabled, setDarkModeEnabled] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [editLoading, setEditLoading] = useState(false)
  const [editForm, setEditForm] = useState({
    name: '',
    email: '',
    phone: '',
  })

  // Load preferences on mount
  useEffect(() => {
    loadPreferences()
    if (user) {
      setEditForm({
        name: user.name || '',
        email: user.email || '',
        phone: user.phone || '',
      })
    }
  }, [user])

  const loadPreferences = async () => {
    try {
      const [notifications, darkMode] = await Promise.all([
        AsyncStorage.getItem('notifications_enabled'),
        AsyncStorage.getItem('dark_mode_enabled'),
      ])

      if (notifications !== null) {
        setNotificationsEnabled(JSON.parse(notifications))
      }
      if (darkMode !== null) {
        setDarkModeEnabled(JSON.parse(darkMode))
      }
    } catch (error) {
      console.error('Failed to load preferences:', error)
    }
  }

  const savePreference = async (key: string, value: boolean) => {
    try {
      await AsyncStorage.setItem(key, JSON.stringify(value))
    } catch (error) {
      console.error('Failed to save preference:', error)
    }
  }

  const handleEditProfile = () => {
    setShowEditModal(true)
  }

  const handleSaveProfile = async () => {
    if (!editForm.name.trim()) {
      Alert.alert('Error', 'Name is required')
      return
    }

    if (!editForm.email.trim()) {
      Alert.alert('Error', 'Email is required')
      return
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(editForm.email)) {
      Alert.alert('Error', 'Please enter a valid email address')
      return
    }

    setEditLoading(true)

    try {
      const { error } = await updateProfile({
        name: editForm.name.trim(),
        email: editForm.email.toLowerCase().trim(),
        phone: editForm.phone.trim() || null,
      })

      if (error) {
        Alert.alert('Error', error)
        return
      }

      Alert.alert('Success', 'Profile updated successfully')
      setShowEditModal(false)
    } catch (error) {
      console.error('Profile update error:', error)
      Alert.alert('Error', 'Failed to update profile. Please try again.')
    } finally {
      setEditLoading(false)
    }
  }

  const handleNotificationToggle = async (value: boolean) => {
    setNotificationsEnabled(value)
    await savePreference('notifications_enabled', value)
  }

  const handleDarkModeToggle = async (value: boolean) => {
    setDarkModeEnabled(value)
    await savePreference('dark_mode_enabled', value)
    // TODO: Implement actual dark mode theme switching
  }

  const handleSignOut = () => {
    Alert.alert(
      'Sign Out',
      'Are you sure you want to sign out?',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Sign Out',
          style: 'destructive',
          onPress: async () => {
            try {
              await logout()
              router.replace('/(auth)/login')
            } catch (error) {
              console.error('Logout error:', error)
              Alert.alert('Error', 'Failed to sign out. Please try again.')
            }
          },
        },
      ]
    )
  }

  const profileMenuItems: ProfileMenuItem[] = [
    {
      id: '1',
      title: 'Edit Profile',
      icon: 'person-outline',
      action: handleEditProfile,
      showArrow: true,
    },
    {
      id: '2',
      title: 'My Classes',
      icon: 'school-outline',
      action: () => {
        router.push('/(teacher)/classes')
      },
      showArrow: true,
    },
    {
      id: '3',
      title: 'Teaching Schedule',
      icon: 'calendar-outline',
      action: () => {
        router.push('/(teacher)/teaching-schedule')
      },
      showArrow: true,
    },
    {
      id: '4',
      title: 'Performance Reports',
      icon: 'bar-chart-outline',
      action: () => {
        router.push('/(teacher)/performance-reports')
      },
      showArrow: true,
    },
  ]

  const settingsMenuItems: ProfileMenuItem[] = [
    {
      id: '5',
      title: 'Privacy & Security',
      icon: 'shield-outline',
      action: () => {
        Alert.alert(
          'Privacy & Security',
          'Manage your privacy settings and account security.\n\n• Change password\n• Two-factor authentication\n• Data privacy settings\n• Account permissions',
          [{ text: 'OK' }]
        )
      },
      showArrow: true,
    },
    {
      id: '6',
      title: 'Help & Support',
      icon: 'help-circle-outline',
      action: () => {
        Alert.alert(
          'Help & Support',
          'Need assistance? Contact our support team:\n\n📧 Email: support@schoolmanagement.com\n📞 Phone: +1 (555) 123-4567\n🕒 Hours: Mon-Fri 9AM-6PM\n\nOr visit our help center for FAQs and guides.',
          [{ text: 'OK' }]
        )
      },
      showArrow: true,
    },
    {
      id: '7',
      title: 'About',
      icon: 'information-circle-outline',
      action: () => {
        Alert.alert(
          'About School Management',
          'Version 1.0.0\n\nA comprehensive school management system designed to streamline educational administration and enhance communication between teachers, students, and parents.\n\n© 2024 School Management System',
          [{ text: 'OK' }]
        )
      },
      showArrow: true,
    },
    {
      id: '8',
      title: 'Sign Out',
      icon: 'log-out-outline',
      action: handleSignOut,
      showArrow: false,
      color: '#ef4444',
    },
  ]

  if (!user) {
    return (
      <SafeAreaView className="flex-1 bg-gray-50">
        <View className="flex-1 items-center justify-center">
          <Text className="text-gray-600 font-rubik">Loading...</Text>
        </View>
      </SafeAreaView>
    )
  }

  return (
    <SafeAreaView className="flex-1 bg-gray-50">
      <ScrollView className="flex-1">
        <View className="p-6">
          {/* Header */}
          <View className="mb-6">
            <Text className="text-2xl font-rubik-bold text-gray-800 mb-2">
              Profile
            </Text>
            <Text className="text-sm font-rubik text-gray-600">
              Manage your account and preferences
            </Text>
          </View>

          {/* Profile Card */}
          <View className="mb-6">
          <View className="bg-white rounded-xl p-6 shadow-soft">
            <View className="items-center mb-4">
              <View className="w-20 h-20 bg-blue-500 rounded-full items-center justify-center mb-3">
                <Text className="text-2xl font-rubik-bold text-white">
                  {user.name?.charAt(0).toUpperCase() || 'T'}
                </Text>
              </View>
              <Text className="text-xl font-rubik-bold text-gray-800 mb-1">
                {user.name}
              </Text>
              <Text className="text-sm font-rubik text-gray-600 mb-2">
                {user.email}
              </Text>
              <View className="bg-blue-100 px-3 py-1 rounded-full">
                <Text className="text-blue-600 font-rubik-medium text-sm capitalize">
                  {user.role}
                </Text>
              </View>
            </View>

            <View className="border-t border-gray-100 pt-4">
              <View className="flex-row justify-between items-center mb-2">
                <Text className="text-sm font-rubik text-gray-600">Member since</Text>
                <Text className="text-sm font-rubik-medium text-gray-800">
                  {user.created_at ? new Date(user.created_at).toLocaleDateString() : 'N/A'}
                </Text>
              </View>
              {user.phone && (
                <View className="flex-row justify-between items-center">
                  <Text className="text-sm font-rubik text-gray-600">Phone</Text>
                  <Text className="text-sm font-rubik-medium text-gray-800">
                    {user.phone}
                  </Text>
                </View>
              )}
            </View>
          </View>
        </View>

          {/* Quick Settings */}
          <View className="mb-6">
          <Text className="text-lg font-rubik-semibold text-gray-800 mb-4">
            Quick Settings
          </Text>
          
          <View className="bg-white rounded-xl shadow-soft">
            <View className="flex-row items-center justify-between p-4 border-b border-gray-100">
              <View className="flex-row items-center">
                <Ionicons name="notifications-outline" size={20} color="#6b7280" />
                <Text className="ml-3 text-base font-rubik text-gray-800">
                  Notifications
                </Text>
              </View>
              <Switch
                value={notificationsEnabled}
                onValueChange={handleNotificationToggle}
                trackColor={{ false: '#e5e7eb', true: '#3b82f6' }}
                thumbColor={notificationsEnabled ? '#ffffff' : '#ffffff'}
              />
            </View>
            
            <View className="flex-row items-center justify-between p-4">
              <View className="flex-row items-center">
                <Ionicons name="moon-outline" size={20} color="#6b7280" />
                <Text className="ml-3 text-base font-rubik text-gray-800">
                  Dark Mode
                </Text>
              </View>
              <Switch
                value={darkModeEnabled}
                onValueChange={handleDarkModeToggle}
                trackColor={{ false: '#e5e7eb', true: '#3b82f6' }}
                thumbColor={darkModeEnabled ? '#ffffff' : '#ffffff'}
              />
            </View>
          </View>
        </View>

          {/* Profile Menu */}
          <View className="mb-6">
          <Text className="text-lg font-rubik-semibold text-gray-800 mb-4">
            Account
          </Text>
          
          <View className="bg-white rounded-xl shadow-soft">
            {profileMenuItems.map((item, index) => (
              <TouchableOpacity
                key={item.id}
                className={`flex-row items-center justify-between p-4 ${
                  index < profileMenuItems.length - 1 ? 'border-b border-gray-100' : ''
                }`}
                onPress={item.action}
                activeOpacity={0.7}
              >
                <View className="flex-row items-center">
                  <Ionicons 
                    name={item.icon} 
                    size={20} 
                    color={item.color || '#6b7280'} 
                  />
                  <Text 
                    className="ml-3 text-base font-rubik text-gray-800"
                    style={{ color: item.color || '#1f2937' }}
                  >
                    {item.title}
                  </Text>
                </View>
                {item.showArrow && (
                  <Ionicons name="chevron-forward" size={16} color="#9ca3af" />
                )}
              </TouchableOpacity>
            ))}
          </View>
        </View>

          {/* Settings Menu */}
          <View className="mb-6">
            <Text className="text-lg font-rubik-semibold text-gray-800 mb-4">
              Settings
            </Text>

            <View className="bg-white rounded-xl shadow-soft">
              {settingsMenuItems.map((item, index) => (
                <TouchableOpacity
                  key={item.id}
                  className={`flex-row items-center justify-between p-4 ${
                    index < settingsMenuItems.length - 1 ? 'border-b border-gray-100' : ''
                  }`}
                  onPress={item.action}
                  activeOpacity={0.7}
                >
                  <View className="flex-row items-center">
                    <Ionicons
                      name={item.icon}
                      size={20}
                      color={item.color || '#6b7280'}
                    />
                    <Text
                      className="ml-3 text-base font-rubik"
                      style={{ color: item.color || '#1f2937' }}
                    >
                      {item.title}
                    </Text>
                  </View>
                  {item.showArrow && (
                    <Ionicons name="chevron-forward" size={16} color="#9ca3af" />
                  )}
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </View>
      </ScrollView>

      {/* Edit Profile Modal */}
      <Modal
        visible={showEditModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowEditModal(false)}
      >
        <SafeAreaView className="flex-1 bg-gray-50">
          <View className="flex-1">
            {/* Modal Header */}
            <View className="flex-row items-center justify-between p-4 bg-white border-b border-gray-200">
              <TouchableOpacity
                onPress={() => setShowEditModal(false)}
                className="p-2"
              >
                <Ionicons name="close" size={24} color="#6b7280" />
              </TouchableOpacity>
              <Text className="text-lg font-rubik-semibold text-gray-800">
                Edit Profile
              </Text>
              <TouchableOpacity
                onPress={handleSaveProfile}
                disabled={editLoading}
                className="p-2"
              >
                {editLoading ? (
                  <ActivityIndicator size="small" color="#3b82f6" />
                ) : (
                  <Text className="text-blue-600 font-rubik-medium">Save</Text>
                )}
              </TouchableOpacity>
            </View>

            {/* Modal Content */}
            <ScrollView className="flex-1 p-6">
              <View className="bg-white rounded-xl p-6 shadow-soft">
                <Text className="text-lg font-rubik-semibold text-gray-800 mb-6">
                  Personal Information
                </Text>

                {/* Name Field */}
                <View className="mb-4">
                  <Text className="text-sm font-rubik-medium text-gray-700 mb-2">
                    Full Name *
                  </Text>
                  <TextInput
                    value={editForm.name}
                    onChangeText={(text) => setEditForm(prev => ({ ...prev, name: text }))}
                    placeholder="Enter your full name"
                    className="bg-gray-50 border border-gray-200 rounded-lg px-4 py-3 font-rubik text-gray-800"
                    placeholderTextColor="#9ca3af"
                  />
                </View>

                {/* Email Field */}
                <View className="mb-4">
                  <Text className="text-sm font-rubik-medium text-gray-700 mb-2">
                    Email Address *
                  </Text>
                  <TextInput
                    value={editForm.email}
                    onChangeText={(text) => setEditForm(prev => ({ ...prev, email: text }))}
                    placeholder="Enter your email address"
                    keyboardType="email-address"
                    autoCapitalize="none"
                    className="bg-gray-50 border border-gray-200 rounded-lg px-4 py-3 font-rubik text-gray-800"
                    placeholderTextColor="#9ca3af"
                  />
                </View>

                {/* Phone Field */}
                <View className="mb-4">
                  <Text className="text-sm font-rubik-medium text-gray-700 mb-2">
                    Phone Number
                  </Text>
                  <TextInput
                    value={editForm.phone}
                    onChangeText={(text) => setEditForm(prev => ({ ...prev, phone: text }))}
                    placeholder="Enter your phone number"
                    keyboardType="phone-pad"
                    className="bg-gray-50 border border-gray-200 rounded-lg px-4 py-3 font-rubik text-gray-800"
                    placeholderTextColor="#9ca3af"
                  />
                </View>

                <Text className="text-xs font-rubik text-gray-500 mt-4">
                  * Required fields
                </Text>
              </View>
            </ScrollView>
          </View>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  )
}
