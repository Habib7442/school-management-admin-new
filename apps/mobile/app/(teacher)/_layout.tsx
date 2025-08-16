import React from 'react'
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs'
import { Ionicons } from '@expo/vector-icons'
import { SafeAreaView } from 'react-native-safe-area-context'
import { View } from 'react-native'

// Import tab screens
import TeacherDashboard from './dashboard'
import TeacherClasses from './classes'
import TeacherAttendance from './attendance'
import TeacherGrades from './grades'
import TeacherProfile from './profile'

const Tab = createBottomTabNavigator()

export default function TeacherLayout() {
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#f9fafb' }}>
      <Tab.Navigator
        screenOptions={({ route }) => ({
          headerShown: false,
          tabBarIcon: ({ focused, color, size }) => {
            let iconName: keyof typeof Ionicons.glyphMap

            switch (route.name) {
              case 'dashboard':
                iconName = focused ? 'home' : 'home-outline'
                break
              case 'classes':
                iconName = focused ? 'people' : 'people-outline'
                break
              case 'attendance':
                iconName = focused ? 'checkmark-circle' : 'checkmark-circle-outline'
                break
              case 'grades':
                iconName = focused ? 'document-text' : 'document-text-outline'
                break
              case 'profile':
                iconName = focused ? 'person' : 'person-outline'
                break
              default:
                iconName = 'home-outline'
            }

            return <Ionicons name={iconName} size={size} color={color} />
          },
          tabBarActiveTintColor: '#3b82f6',
          tabBarInactiveTintColor: '#9ca3af',
          tabBarStyle: {
            backgroundColor: '#ffffff',
            borderTopWidth: 1,
            borderTopColor: '#e5e7eb',
            paddingBottom: 8,
            paddingTop: 8,
            height: 80,
            shadowColor: '#000',
            shadowOffset: {
              width: 0,
              height: -2,
            },
            shadowOpacity: 0.1,
            shadowRadius: 3,
            elevation: 5,
          },
          tabBarLabelStyle: {
            fontSize: 12,
            fontFamily: 'Rubik-Medium',
            marginTop: 4,
          },
        })}
      >
        <Tab.Screen
          name="dashboard"
          component={TeacherDashboard}
          options={{ tabBarLabel: 'Home' }}
        />
        <Tab.Screen
          name="classes"
          component={TeacherClasses}
          options={{ tabBarLabel: 'Classes' }}
        />
        <Tab.Screen
          name="attendance"
          component={TeacherAttendance}
          options={{ tabBarLabel: 'Attendance' }}
        />
        <Tab.Screen
          name="grades"
          component={TeacherGrades}
          options={{ tabBarLabel: 'Grades' }}
        />
        <Tab.Screen
          name="profile"
          component={TeacherProfile}
          options={{ tabBarLabel: 'Profile' }}
        />
      </Tab.Navigator>
    </SafeAreaView>
  )
}
