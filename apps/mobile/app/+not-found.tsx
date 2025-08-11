import { Link, Stack } from 'expo-router';
import { View, Text, TouchableOpacity } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';

export default function NotFoundScreen() {
  return (
    <>
      <Stack.Screen options={{ title: 'Oops!' }} />
      <LinearGradient
        colors={['#FFD700', '#B8860B', '#FFFFFF']}
        className="flex-1"
      >
        <View className="flex-1 items-center justify-center p-6">
          {/* Error Icon */}
          <View className="w-24 h-24 bg-red-100 rounded-full items-center justify-center mb-6">
            <Ionicons name="alert-circle" size={48} color="#EF4444" />
          </View>

          {/* Error Message */}
          <Text className="text-2xl font-rubik-bold text-gray-800 text-center mb-2">
            Page Not Found
          </Text>
          <Text className="text-base font-rubik text-gray-600 text-center mb-8 max-w-sm">
            Sorry, the page you&apos;re looking for doesn&apos;t exist or has been moved.
          </Text>

          {/* Home Button */}
          <Link href="/" asChild>
            <TouchableOpacity
              className="bg-blue-500 px-8 py-4 rounded-xl shadow-lg"
              activeOpacity={0.8}
            >
              <View className="flex-row items-center">
                <Ionicons name="home" size={20} color="white" />
                <Text className="text-white font-rubik-semibold text-base ml-2">
                  Go to Home Screen
                </Text>
              </View>
            </TouchableOpacity>
          </Link>

          {/* Additional Help */}
          <Text className="text-sm font-rubik text-gray-500 text-center mt-6">
            If you think this is an error, please contact support.
          </Text>
        </View>
      </LinearGradient>
    </>
  );
}
