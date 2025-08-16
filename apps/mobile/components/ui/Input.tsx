import React, { useState } from 'react'
import { View, Text,  TouchableOpacity, TextInputProps,TextInput } from 'react-native'
import { Ionicons } from '@expo/vector-icons'

interface InputProps extends TextInputProps {
  label?: string
  icon?: keyof typeof Ionicons.glyphMap
  error?: string
  isPassword?: boolean
  required?: boolean
  containerClassName?: string
  inputClassName?: string
  labelClassName?: string
}

export default function Input({
  label,
  icon,
  error,
  isPassword = false,
  required = false,
  containerClassName = '',
  inputClassName = '',
  labelClassName = '',
  ...props
}: InputProps) {
  const [showPassword, setShowPassword] = useState(false)
  const [isFocused, setIsFocused] = useState(false)

  return (
    <View className={`mb-4 ${containerClassName}`}>
      {label && (
        <Text className={`text-sm font-rubik-medium text-gray-700 mb-2 ${labelClassName}`}>
          {label}
          {required && <Text className="text-error-500 ml-1">*</Text>}
        </Text>
      )}
      
      <View className={`
        relative flex-row items-center bg-white border rounded-xl px-4 py-3
        ${isFocused ? 'border-primary-500 shadow-soft' : 'border-gray-200'}
        ${error ? 'border-error-500' : ''}
      `}>
        {icon && (
          <Ionicons 
            name={icon} 
            size={20} 
            color={isFocused ? '#3b82f6' : '#9ca3af'} 
            style={{ marginRight: 12 }}
          />
        )}
        
        <TextInput
          className={`flex-1 text-base font-rubik text-gray-900 ${inputClassName}`}
          secureTextEntry={isPassword && !showPassword}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          placeholderTextColor="#9ca3af"
          {...props}
        />
        
        {isPassword && (
          <View className="ml-2 p-1">
            <Text>👁</Text>
          </View>
        )}
      </View>
      
      {error && (
        <Text className="text-error-500 text-sm font-rubik mt-1 ml-1">
          {error}
        </Text>
      )}
    </View>
  )
}
