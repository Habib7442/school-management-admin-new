import React from 'react'
import { TouchableOpacity, Text, ActivityIndicator } from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'

interface ButtonProps {
  title: string
  onPress: () => void
  loading?: boolean
  disabled?: boolean
  colors: string[]
  className?: string
}

export default function Button({
  title,
  onPress,
  loading = false,
  disabled = false,
  colors,
  className = '',
}: ButtonProps) {
  return (
    <TouchableOpacity
      className={`rounded-xl overflow-hidden shadow-md ${className}`}
      onPress={onPress}
      disabled={disabled || loading}
      activeOpacity={0.8}
    >
      <LinearGradient
        colors={colors}
        className="py-4 items-center"
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
      >
        {loading ? (
          <ActivityIndicator color="white" size="small" />
        ) : (
          <Text className="text-white text-base font-rubik-semibold">
            {title}
          </Text>
        )}
      </LinearGradient>
    </TouchableOpacity>
  )
}
