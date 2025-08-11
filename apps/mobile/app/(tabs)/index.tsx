import { View, Text, TouchableOpacity, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useEffect } from 'react';
import { useAuthStore } from '@/lib/stores/auth-store';
import SupabaseTest from '@/components/SupabaseTest';

export default function HomeScreen() {
  const { user, isAuthenticated } = useAuthStore()

  useEffect(() => {
    // Redirect to login if not authenticated
    if (!isAuthenticated) {
      router.replace('/' as any)
    }
  }, [isAuthenticated])

  if (!isAuthenticated || !user) {
    return null // Will redirect to login
  }
  return (
    <SafeAreaView className="flex-1">
      <LinearGradient
        colors={['#FFD700', '#B8860B', '#FFFFFF']}
        className="flex-1"
      >
        <ScrollView
          className="flex-1"
          contentContainerStyle={{ padding: 24 }}
          showsVerticalScrollIndicator={false}
        >
        {/* Header */}
        <View className="items-center mb-8">
          <LinearGradient
            colors={['#FFD700', '#B8860B']}
            className="w-20 h-20 rounded-full items-center justify-center mb-4 shadow-lg"
          >
            <Ionicons name="school" size={32} color="white" />
          </LinearGradient>
          <Text className="text-3xl font-rubik-bold text-gray-800 mb-2 text-center">
            School Management
          </Text>
          <Text className="text-base font-rubik text-gray-600 text-center">
            Modern school management system
          </Text>
        </View>

        {/* Supabase Connection Test */}
        <SupabaseTest />

        {/* Authentication Section */}
        <View className="bg-white rounded-2xl p-6 shadow-lg mb-6">
          <Text className="text-xl font-rubik-bold text-gray-800 mb-2">
            Authentication System
          </Text>
          <Text className="text-sm font-rubik text-gray-600 mb-6">
            Test the role-based authentication system with beautiful UI components.
          </Text>

          <TouchableOpacity
            className="bg-blue-500 px-6 py-4 rounded-xl mb-3 items-center shadow-md"
            onPress={() => router.push('/(auth)/login')}
            activeOpacity={0.8}
          >
            <View className="flex-row items-center">
              <Ionicons name="log-in-outline" size={20} color="white" />
              <Text className="text-white font-rubik-semibold text-base ml-2">
                Go to Login
              </Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            className="bg-green-500 px-6 py-4 rounded-xl items-center shadow-md"
            onPress={() => router.push('/(auth)/register')}
            activeOpacity={0.8}
          >
            <View className="flex-row items-center">
              <Ionicons name="person-add-outline" size={20} color="white" />
              <Text className="text-white font-rubik-semibold text-base ml-2">
                Go to Register
              </Text>
            </View>
          </TouchableOpacity>
        </View>

        {/* Features Section */}
        <View className="bg-white rounded-2xl p-6 shadow-lg">
          <Text className="text-xl font-rubik-bold text-gray-800 mb-4">
            Features
          </Text>

          <View className="space-y-3">
            <View className="flex-row items-center">
              <View className="w-8 h-8 bg-blue-100 rounded-full items-center justify-center mr-3">
                <Ionicons name="checkmark" size={16} color="#3B82F6" />
              </View>
              <Text className="text-sm font-rubik text-gray-700 flex-1">
                Role-based authentication (Teacher/Student)
              </Text>
            </View>

            <View className="flex-row items-center">
              <View className="w-8 h-8 bg-green-100 rounded-full items-center justify-center mr-3">
                <Ionicons name="checkmark" size={16} color="#10B981" />
              </View>
              <Text className="text-sm font-rubik text-gray-700 flex-1">
                Beautiful UI with Tailwind CSS
              </Text>
            </View>

            <View className="flex-row items-center">
              <View className="w-8 h-8 bg-purple-100 rounded-full items-center justify-center mr-3">
                <Ionicons name="checkmark" size={16} color="#8B5CF6" />
              </View>
              <Text className="text-sm font-rubik text-gray-700 flex-1">
                Supabase backend integration
              </Text>
            </View>

            <View className="flex-row items-center">
              <View className="w-8 h-8 bg-yellow-100 rounded-full items-center justify-center mr-3">
                <Ionicons name="checkmark" size={16} color="#F59E0B" />
              </View>
              <Text className="text-sm font-rubik text-gray-700 flex-1">
                Clean architecture with TypeScript
              </Text>
            </View>
          </View>
        </View>
        </ScrollView>
      </LinearGradient>
    </SafeAreaView>
  );
}
