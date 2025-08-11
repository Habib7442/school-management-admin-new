import React from 'react'
import { View, Text, TouchableOpacity } from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import { Ionicons } from '@expo/vector-icons'

export type MobileUserRole = 'teacher' | 'student'

interface RoleConfig {
  role: MobileUserRole
  label: string
  colors: string[]
  icon: keyof typeof Ionicons.glyphMap
  description: string
}

interface RoleSelectorProps {
  selectedRole: MobileUserRole
  onRoleChange: (role: MobileUserRole) => void
}

const roleConfigs: RoleConfig[] = [
  {
    role: 'teacher',
    label: 'Teacher',
    colors: ['#3B82F6', '#1E40AF'], // Blue gradient
    icon: 'school-outline',
    description: 'Educator Portal'
  },
  {
    role: 'student',
    label: 'Student',
    colors: ['#10B981', '#047857'], // Green gradient
    icon: 'person-outline',
    description: 'Student Portal'
  }
]

export default function RoleSelector({ selectedRole, onRoleChange }: RoleSelectorProps) {
  return (
    <View className="mb-6">
      <Text className="text-lg font-rubik-semibold text-gray-800 text-center mb-4">
        Select Your Role
      </Text>
      <View className="flex-row gap-3">
        {roleConfigs.map((config) => {
          const isSelected = selectedRole === config.role

          return (
            <TouchableOpacity
              key={config.role}
              className={`flex-1 rounded-2xl border-2 bg-white overflow-hidden ${
                isSelected
                  ? 'border-transparent shadow-lg'
                  : 'border-gray-200 shadow-sm'
              }`}
              onPress={() => onRoleChange(config.role)}
              activeOpacity={0.8}
            >
              {isSelected ? (
                <LinearGradient
                  colors={config.colors}
                  className="flex-1"
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                >
                  <View className="p-5 items-center justify-center min-h-[120px]">
                    <View className="w-14 h-14 rounded-full items-center justify-center mb-3">
                      <Ionicons
                        name={config.icon}
                        size={32}
                        color="white"
                      />
                    </View>
                    <Text className="text-base font-rubik-semibold text-white mb-1 text-center">
                      {config.label}
                    </Text>
                    <Text className="text-xs font-rubik text-white opacity-90 text-center">
                      {config.description}
                    </Text>
                  </View>
                </LinearGradient>
              ) : (
                <View className="p-5 items-center justify-center min-h-[120px]">
                  <View
                    className="w-14 h-14 rounded-full items-center justify-center mb-3"
                    style={{ backgroundColor: config.colors[0] + '20' }}
                  >
                    <Ionicons
                      name={config.icon}
                      size={32}
                      color={config.colors[0]}
                    />
                  </View>
                  <Text
                    className="text-base font-rubik-semibold mb-1 text-center"
                    style={{ color: config.colors[0] }}
                  >
                    {config.label}
                  </Text>
                  <Text className="text-xs font-rubik text-gray-500 text-center">
                    {config.description}
                  </Text>
                </View>
              )}
            </TouchableOpacity>
          )
        })}
      </View>
    </View>
  )
}
