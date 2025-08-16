import React from 'react'
import { View, Text, TouchableOpacity } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import type { UserRole } from '@repo/types'

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
  className?: string
}

const roleConfigs: RoleConfig[] = [
  {
    role: 'teacher',
    label: 'Teacher',
    colors: ['#3b82f6', '#1e40af'], // Blue gradient
    icon: 'school-outline',
    description: 'Educator Portal'
  },
  {
    role: 'student',
    label: 'Student',
    colors: ['#22c55e', '#15803d'], // Green gradient
    icon: 'person-outline',
    description: 'Student Portal'
  }
]

export default function RoleSelector({ 
  selectedRole, 
  onRoleChange, 
  className = '' 
}: RoleSelectorProps) {
  return (
    <View className={`mb-6 ${className}`}>
      <Text className="text-lg font-rubik-semibold text-gray-800 text-center mb-4">
        Select Your Role
      </Text>
      
      <View className="flex-row gap-3">
        {roleConfigs.map((config) => {
          const isSelected = selectedRole === config.role

          return (
            <TouchableOpacity
              key={config.role}
              onPress={() => onRoleChange(config.role)}
              className={`
                flex-1 p-4 rounded-2xl border-2
                ${isSelected
                  ? 'border-primary-500 bg-primary-50'
                  : 'border-gray-200 bg-white'
                }
              `}
              activeOpacity={0.8}
            >
              <View className="items-center">
                {/* Icon Container */}
                <View className={`
                  w-12 h-12 rounded-full items-center justify-center mb-3
                  ${isSelected 
                    ? config.role === 'teacher' 
                      ? 'bg-primary-500' 
                      : 'bg-secondary-500'
                    : 'bg-gray-100'
                  }
                `}>
                  <Ionicons
                    name={config.icon}
                    size={24}
                    color={isSelected ? '#ffffff' : '#6b7280'}
                  />
                </View>

                {/* Role Label */}
                <Text className={`
                  text-base font-rubik-semibold text-center mb-1
                  ${isSelected ? 'text-gray-900' : 'text-gray-600'}
                `}>
                  {config.label}
                </Text>

                {/* Role Description */}
                <Text className={`
                  text-sm font-rubik text-center
                  ${isSelected ? 'text-gray-700' : 'text-gray-500'}
                `}>
                  {config.description}
                </Text>

                {/* Selection Indicator */}
                {isSelected && (
                  <View className="absolute -top-1 -right-1">
                    <View className="w-6 h-6 bg-primary-500 rounded-full items-center justify-center">
                      <Ionicons name="checkmark" size={14} color="#ffffff" />
                    </View>
                  </View>
                )}
              </View>
            </TouchableOpacity>
          )
        })}
      </View>
    </View>
  )
}
