import React, { useState } from "react";
import {
  View,
  Text,
  Alert,
  TouchableOpacity,
  TextInput,
} from "react-native";
import { KeyboardAwareScrollView } from "react-native-keyboard-aware-scroll-view";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useAuthStore } from "../../lib/stores/auth-store";
import RoleSelector, { MobileUserRole } from "../../components/RoleSelector";
import Button from "../../components/ui/Button";
import { SafeAreaView } from "react-native-safe-area-context";

export default function LoginScreen() {
  const [selectedRole, setSelectedRole] = useState<MobileUserRole>("student");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const { login, isLoading } = useAuthStore();

  // Type-safe components
  const Icon = Ionicons as any;
  const TypedButton = Button as any;

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!email.trim()) {
      newErrors.email = "Email is required";
    } else if (!/\S+@\S+\.\S+/.test(email)) {
      newErrors.email = "Please enter a valid email address";
    }

    if (!password) {
      newErrors.password = "Password is required";
    } else if (password.length < 6) {
      newErrors.password = "Password must be at least 6 characters";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleLogin = async () => {
    if (!validateForm()) return;

    const result = await login(email.trim(), password);

    if (result.error) {
      Alert.alert("Login Failed", result.error);
    } else {
      // Use router.replace to navigate to the main app
      // The index screen will handle role-based routing
      router.replace("/");
    }
  };

  const getRolePlaceholders = (role: MobileUserRole) => {
    return {
      email: role === "teacher" ? "teacher@school.edu" : "student@school.edu",
    };
  };

  const placeholders = getRolePlaceholders(selectedRole);

  return (
    <SafeAreaView className="flex-1 bg-gray-50" style={{ flex: 1 }}>
      {/* @ts-ignore */}
      <KeyboardAwareScrollView
        contentContainerStyle={{
          flexGrow: 1,
          padding: 24,
          paddingBottom: 40,
        }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        enableOnAndroid={true}
        enableAutomaticScroll={true}
        extraHeight={120}
        extraScrollHeight={120}
        resetScrollToCoords={{ x: 0, y: 0 }}
        scrollEnabled={true}
      >
          {/* Header */}
          <View className="items-center mb-8">
            <View
              className={`
              w-20 h-20 rounded-full items-center justify-center mb-4 shadow-medium
              ${selectedRole === "teacher" ? "bg-primary-500" : "bg-secondary-500"}
            `}
            >
              <Icon name="school" size={32} color="white" />
            </View>
            <Text className="text-3xl font-rubik-bold text-gray-800 mb-2">
              Welcome Back
            </Text>
            <Text className="text-base font-rubik text-gray-600 text-center">
              Sign in to your account
            </Text>
          </View>

          {/* Role Selector */}
          <RoleSelector
            selectedRole={selectedRole}
            onRoleChange={setSelectedRole}
          />

          {/* Login Form */}
          <View className="bg-white rounded-2xl p-6 shadow-soft mb-8">
            {/* Email Input */}
            <View className="mb-4">
              <Text className="text-sm font-rubik-medium text-gray-700 mb-2">
                Email Address *
              </Text>
              <View className="flex-row items-center bg-white border border-gray-200 rounded-xl px-4 py-3">
                <Icon
                  name="mail-outline"
                  size={20}
                  color="#9ca3af"
                  style={{ marginRight: 12 }}
                />
                <TextInput
                  className="flex-1 text-base font-rubik text-gray-900"
                  placeholder={placeholders.email}
                  value={email}
                  onChangeText={(text: string) => {
                    console.log("Email input changed:", text);
                    setEmail(text);
                    if (errors.email) {
                      setErrors((prev) => ({ ...prev, email: "" }));
                    }
                  }}
                  onFocus={() => console.log("Email input focused")}
                  onBlur={() => console.log("Email input blurred")}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                  placeholderTextColor="#9ca3af"
                />
              </View>
              {errors.email && (
                <Text className="text-red-500 text-sm font-rubik mt-1 ml-1">
                  {errors.email}
                </Text>
              )}
            </View>

            {/* Password Input */}
            <View className="mb-4">
              <Text className="text-sm font-rubik-medium text-gray-700 mb-2">
                Password *
              </Text>
              <View className="flex-row items-center bg-white border border-gray-200 rounded-xl px-4 py-3">
                <Icon
                  name="lock-closed-outline"
                  size={20}
                  color="#9ca3af"
                  style={{ marginRight: 12 }}
                />
                <TextInput
                  className="flex-1 text-base font-rubik text-gray-900"
                  placeholder="Enter your password"
                  value={password}
                  onChangeText={(text: string) => {
                    setPassword(text);
                    if (errors.password) {
                      setErrors((prev) => ({ ...prev, password: "" }));
                    }
                  }}
                  secureTextEntry={!showPassword}
                  placeholderTextColor="#9ca3af"
                />
                <TouchableOpacity
                  onPress={() => setShowPassword(!showPassword)}
                  className="ml-2 p-1"
                  activeOpacity={0.7}
                >
                  <Icon
                    name={showPassword ? "eye-off-outline" : "eye-outline"}
                    size={20}
                    color="#9ca3af"
                  />
                </TouchableOpacity>
              </View>
              {errors.password && (
                <Text className="text-red-500 text-sm font-rubik mt-1 ml-1">
                  {errors.password}
                </Text>
              )}
            </View>

            <TypedButton
              title="Sign In"
              onPress={handleLogin}
              isLoading={isLoading}
              fullWidth
              className="mt-2"
              variant={selectedRole === "teacher" ? "primary" : "secondary"}
            />
          </View>

          {/* Register Link */}
          <View className="flex-row justify-center items-center">
            <Text className="text-gray-600 font-rubik">
              Don&apos;t have an account?{" "}
            </Text>
            <TouchableOpacity
              onPress={() => router.push("/(auth)/register")}
              activeOpacity={0.7}
            >
              <Text
                className={`
                font-rubik-semibold
                ${selectedRole === "teacher" ? "text-primary-500" : "text-secondary-500"}
              `}
              >
                Sign Up
              </Text>
            </TouchableOpacity>
          </View>

          {/* Footer */}
          <View className="mt-8 items-center">
            <Text className="text-sm text-gray-500 font-rubik text-center">
              School Management System
            </Text>
            <Text className="text-xs text-gray-400 font-rubik mt-1">
              Secure • Reliable • Easy to Use
            </Text>
          </View>
      </KeyboardAwareScrollView>
    </SafeAreaView>
  );
}
