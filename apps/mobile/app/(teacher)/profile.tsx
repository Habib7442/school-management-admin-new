import React, { useState } from 'react'
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Alert,
  Switch,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { router } from 'expo-router'
import { useAuthStore } from '../../lib/stores/auth-store'

interface ProfileMenuItem {
  id: string
  title: string
  icon: keyof typeof Ionicons.glyphMap
  action: () => void
  showArrow?: boolean
  color?: string
}

export default function TeacherProfile() {
  const { user, logout } = useAuthStore()
  const [notificationsEnabled, setNotificationsEnabled] = useState(true)
  const [darkModeEnabled, setDarkModeEnabled] = useState(false)

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
      action: () => {
        // Navigate to edit profile
        console.log('Edit profile')
      },
      showArrow: true,
    },
    {
      id: '2',
      title: 'My Classes',
      icon: 'school-outline',
      action: () => {
        // Navigate to classes
        console.log('My classes')
      },
      showArrow: true,
    },
    {
      id: '3',
      title: 'Teaching Schedule',
      icon: 'calendar-outline',
      action: () => {
        // Navigate to schedule
        console.log('Teaching schedule')
      },
      showArrow: true,
    },
    {
      id: '4',
      title: 'Performance Reports',
      icon: 'bar-chart-outline',
      action: () => {
        // Navigate to reports
        console.log('Performance reports')
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
        console.log('Privacy & Security')
      },
      showArrow: true,
    },
    {
      id: '6',
      title: 'Help & Support',
      icon: 'help-circle-outline',
      action: () => {
        console.log('Help & Support')
      },
      showArrow: true,
    },
    {
      id: '7',
      title: 'About',
      icon: 'information-circle-outline',
      action: () => {
        console.log('About')
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
        {/* Header */}
        <View className="px-6 pt-6 pb-4">
          <Text className="text-2xl font-rubik-bold text-gray-800 mb-2">
            Profile
          </Text>
          <Text className="text-sm font-rubik text-gray-600">
            Manage your account and preferences
          </Text>
        </View>

        {/* Profile Card */}
        <View className="px-6 mb-6">
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
        <View className="px-6 mb-6">
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
                onValueChange={setNotificationsEnabled}
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
                onValueChange={setDarkModeEnabled}
                trackColor={{ false: '#e5e7eb', true: '#3b82f6' }}
                thumbColor={darkModeEnabled ? '#ffffff' : '#ffffff'}
              />
            </View>
          </View>
        </View>

        {/* Profile Menu */}
        <View className="px-6 mb-6">
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
        <View className="px-6 pb-6">
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
      </ScrollView>
    </SafeAreaView>
  )
}
