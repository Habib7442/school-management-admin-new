import React from 'react'
import { TouchableOpacity, Text, ActivityIndicator, TouchableOpacityProps } from 'react-native'
import { Ionicons } from '@expo/vector-icons'

interface ButtonProps extends TouchableOpacityProps {
  title: string
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger'
  size?: 'sm' | 'md' | 'lg'
  isLoading?: boolean
  icon?: keyof typeof Ionicons.glyphMap
  iconPosition?: 'left' | 'right'
  fullWidth?: boolean
  className?: string
}

export default function Button({
  title,
  variant = 'primary',
  size = 'md',
  isLoading = false,
  icon,
  iconPosition = 'left',
  fullWidth = false,
  className = '',
  disabled,
  ...props
}: ButtonProps) {
  const getVariantStyles = () => {
    switch (variant) {
      case 'primary':
        return 'bg-primary-500 border-primary-500'
      case 'secondary':
        return 'bg-secondary-500 border-secondary-500'
      case 'outline':
        return 'bg-transparent border-primary-500'
      case 'ghost':
        return 'bg-transparent border-transparent'
      case 'danger':
        return 'bg-error-500 border-error-500'
      default:
        return 'bg-primary-500 border-primary-500'
    }
  }

  const getTextStyles = () => {
    switch (variant) {
      case 'outline':
        return 'text-primary-500'
      case 'ghost':
        return 'text-primary-500'
      default:
        return 'text-white'
    }
  }

  const getSizeStyles = () => {
    switch (size) {
      case 'sm':
        return 'px-3 py-2'
      case 'md':
        return 'px-4 py-3'
      case 'lg':
        return 'px-6 py-4'
      default:
        return 'px-4 py-3'
    }
  }

  const getTextSizeStyles = () => {
    switch (size) {
      case 'sm':
        return 'text-sm'
      case 'md':
        return 'text-base'
      case 'lg':
        return 'text-lg'
      default:
        return 'text-base'
    }
  }

  const getIconSize = () => {
    switch (size) {
      case 'sm':
        return 16
      case 'md':
        return 20
      case 'lg':
        return 24
      default:
        return 20
    }
  }

  const isDisabled = disabled || isLoading

  return (
    <TouchableOpacity
      className={`
        border rounded-xl flex-row items-center justify-center
        ${getVariantStyles()}
        ${getSizeStyles()}
        ${fullWidth ? 'w-full' : ''}
        ${isDisabled ? 'opacity-50' : ''}
        ${className}
      `}
      disabled={isDisabled}
      activeOpacity={0.8}
      {...props}
    >
      {isLoading ? (
        <ActivityIndicator 
          size="small" 
          color={variant === 'outline' || variant === 'ghost' ? '#3b82f6' : '#ffffff'} 
        />
      ) : (
        <>
          {icon && iconPosition === 'left' && (
            <Ionicons
              name={icon}
              size={getIconSize()}
              color={variant === 'outline' || variant === 'ghost' ? '#3b82f6' : '#ffffff'}
              style={{ marginRight: 8 }}
            />
          )}
          
          <Text className={`
            font-rubik-semibold text-center
            ${getTextStyles()}
            ${getTextSizeStyles()}
          `}>
            {title}
          </Text>
          
          {icon && iconPosition === 'right' && (
            <Ionicons
              name={icon}
              size={getIconSize()}
              color={variant === 'outline' || variant === 'ghost' ? '#3b82f6' : '#ffffff'}
              style={{ marginLeft: 8 }}
            />
          )}
        </>
      )}
    </TouchableOpacity>
  )
}
