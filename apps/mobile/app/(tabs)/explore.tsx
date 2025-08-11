import { View, Text, ScrollView, TouchableOpacity, Linking } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useEffect } from 'react';
import { router } from 'expo-router';
import { useAuthStore } from '@/lib/stores/auth-store';

export default function ExploreScreen() {
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
  const openLink = (url: string) => {
    Linking.openURL(url);
  };

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
            colors={['#8B5CF6', '#7C3AED']}
            className="w-20 h-20 rounded-full items-center justify-center mb-4 shadow-lg"
          >
            <Ionicons name="code-slash" size={32} color="white" />
          </LinearGradient>
          <Text className="text-3xl font-rubik-bold text-gray-800 mb-2 text-center">
            Explore
          </Text>
          <Text className="text-base font-rubik text-gray-600 text-center">
            Learn about the app features and architecture
          </Text>
        </View>

        {/* Features Cards */}
        <View className="gap-4">
          {/* Authentication Feature */}
          <View className="bg-white rounded-2xl p-6 shadow-lg">
            <View className="flex-row items-center mb-3">
              <View className="w-10 h-10 bg-blue-100 rounded-full items-center justify-center mr-3">
                <Ionicons name="shield-checkmark" size={20} color="#3B82F6" />
              </View>
              <Text className="text-lg font-rubik-bold text-gray-800">
                Role-Based Authentication
              </Text>
            </View>
            <Text className="text-sm font-rubik text-gray-600 mb-4">
              Secure authentication system with separate Teacher and Student portals using Supabase.
            </Text>
            <View className="flex-row items-center">
              <Ionicons name="checkmark-circle" size={16} color="#10B981" />
              <Text className="text-xs font-rubik text-gray-500 ml-2">
                Email/Password authentication
              </Text>
            </View>
          </View>

          {/* UI/UX Feature */}
          <View className="bg-white rounded-2xl p-6 shadow-lg">
            <View className="flex-row items-center mb-3">
              <View className="w-10 h-10 bg-purple-100 rounded-full items-center justify-center mr-3">
                <Ionicons name="color-palette" size={20} color="#8B5CF6" />
              </View>
              <Text className="text-lg font-rubik-bold text-gray-800">
                Modern UI Design
              </Text>
            </View>
            <Text className="text-sm font-rubik text-gray-600 mb-4">
              Beautiful interface built with NativeWind (Tailwind CSS) and custom Rubik fonts.
            </Text>
            <View className="flex-row items-center">
              <Ionicons name="checkmark-circle" size={16} color="#10B981" />
              <Text className="text-xs font-rubik text-gray-500 ml-2">
                Responsive design with gradients
              </Text>
            </View>
          </View>

          {/* Architecture Feature */}
          <View className="bg-white rounded-2xl p-6 shadow-lg">
            <View className="flex-row items-center mb-3">
              <View className="w-10 h-10 bg-green-100 rounded-full items-center justify-center mr-3">
                <Ionicons name="construct" size={20} color="#10B981" />
              </View>
              <Text className="text-lg font-rubik-bold text-gray-800">
                Clean Architecture
              </Text>
            </View>
            <Text className="text-sm font-rubik text-gray-600 mb-4">
              Well-organized codebase with TypeScript, component separation, and reusable UI elements.
            </Text>
            <View className="flex-row items-center">
              <Ionicons name="checkmark-circle" size={16} color="#10B981" />
              <Text className="text-xs font-rubik text-gray-500 ml-2">
                Modular components and clean imports
              </Text>
            </View>
          </View>

          {/* Technology Stack */}
          <View className="bg-white rounded-2xl p-6 shadow-lg">
            <View className="flex-row items-center mb-3">
              <View className="w-10 h-10 bg-yellow-100 rounded-full items-center justify-center mr-3">
                <Ionicons name="layers" size={20} color="#F59E0B" />
              </View>
              <Text className="text-lg font-rubik-bold text-gray-800">
                Technology Stack
              </Text>
            </View>
            <Text className="text-sm font-rubik text-gray-600 mb-4">
              Built with modern technologies for optimal performance and developer experience.
            </Text>
            <View className="gap-2">
              <View className="flex-row items-center">
                <Ionicons name="logo-react" size={16} color="#61DAFB" />
                <Text className="text-xs font-rubik text-gray-500 ml-2">React Native + Expo</Text>
              </View>
              <View className="flex-row items-center">
                <Ionicons name="server" size={16} color="#3ECF8E" />
                <Text className="text-xs font-rubik text-gray-500 ml-2">Supabase Backend</Text>
              </View>
              <View className="flex-row items-center">
                <Ionicons name="code" size={16} color="#3178C6" />
                <Text className="text-xs font-rubik text-gray-500 ml-2">TypeScript</Text>
              </View>
            </View>
          </View>

          {/* Documentation Links */}
          <View className="bg-white rounded-2xl p-6 shadow-lg">
            <Text className="text-lg font-rubik-bold text-gray-800 mb-4">
              Learn More
            </Text>

            <TouchableOpacity
              className="flex-row items-center justify-between p-3 bg-gray-50 rounded-lg mb-3"
              onPress={() => openLink('https://docs.expo.dev/router/introduction')}
              activeOpacity={0.7}
            >
              <View className="flex-row items-center">
                <Ionicons name="book" size={20} color="#6B7280" />
                <Text className="text-sm font-rubik-medium text-gray-700 ml-3">
                  Expo Router Documentation
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color="#6B7280" />
            </TouchableOpacity>

            <TouchableOpacity
              className="flex-row items-center justify-between p-3 bg-gray-50 rounded-lg mb-3"
              onPress={() => openLink('https://supabase.com/docs')}
              activeOpacity={0.7}
            >
              <View className="flex-row items-center">
                <Ionicons name="cloud" size={20} color="#6B7280" />
                <Text className="text-sm font-rubik-medium text-gray-700 ml-3">
                  Supabase Documentation
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color="#6B7280" />
            </TouchableOpacity>

            <TouchableOpacity
              className="flex-row items-center justify-between p-3 bg-gray-50 rounded-lg"
              onPress={() => openLink('https://www.nativewind.dev/')}
              activeOpacity={0.7}
            >
              <View className="flex-row items-center">
                <Ionicons name="brush" size={20} color="#6B7280" />
                <Text className="text-sm font-rubik-medium text-gray-700 ml-3">
                  NativeWind Documentation
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color="#6B7280" />
            </TouchableOpacity>
          </View>
        </View>
        </ScrollView>
      </LinearGradient>
    </SafeAreaView>
  );
}
