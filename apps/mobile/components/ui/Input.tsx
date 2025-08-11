import React from 'react'
import { View, Text, TextInput, TouchableOpacity, TextInputProps } from 'react-native'
import { Ionicons } from '@expo/vector-icons'

interface InputProps extends TextInputProps {
  label: string
  icon: keyof typeof Ionicons.glyphMap
  error?: string
  isPassword?: boolean
  showPassword?: boolean
  onTogglePassword?: () => void
  accentColor?: string
}

export default function Input({
  label,
  icon,
  error,
  isPassword = false,
  showPassword = false,
  onTogglePassword,
  accentColor = '#3B82F6',
  ...props
}: InputProps) {
  return (
    <View className="mb-5">
      <Text 
        className="text-sm font-rubik-medium mb-2"
        style={{ color: accentColor }}
      >
        {label}
      </Text>
      <View className="flex-row items-center border border-gray-200 rounded-xl bg-gray-50">
        <View className="ml-4 mr-3">
          <Ionicons 
            name={icon} 
            size={20} 
            color={accentColor} 
          />
        </View>
        <TextInput
          className={`flex-1 h-12 text-base font-rubik text-gray-800 ${
            isPassword ? 'pr-12' : 'pr-4'
          }`}
          placeholderTextColor="#9CA3AF"
          secureTextEntry={isPassword && !showPassword}
          {...props}
        />
        {isPassword && (
          <TouchableOpacity
            onPress={onTogglePassword}
            className="absolute right-4 p-1"
          >
            <Ionicons
              name={showPassword ? 'eye-outline' : 'eye-off-outline'}
              size={20}
              color="#9CA3AF"
            />
          </TouchableOpacity>
        )}
      </View>
      {error && (
        <Text className="text-red-500 text-xs font-rubik mt-1">
          {error}
        </Text>
      )}
    </View>
  )
}
