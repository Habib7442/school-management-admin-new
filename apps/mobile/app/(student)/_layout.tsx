import React from 'react'
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs'
import { Ionicons } from '@expo/vector-icons'
import { SafeAreaView } from 'react-native-safe-area-context'

// Import tab screens
import StudentDashboard from './dashboard'
import StudentSchedule from './schedule'
import StudentGrades from './grades'
import StudentProfile from './profile'

const Tab = createBottomTabNavigator()

export default function StudentLayout() {
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
              case 'schedule':
                iconName = focused ? 'calendar' : 'calendar-outline'
                break
              case 'grades':
                iconName = focused ? 'bar-chart' : 'bar-chart-outline'
                break
              case 'profile':
                iconName = focused ? 'person' : 'person-outline'
                break
              default:
                iconName = 'home-outline'
            }

            return <Ionicons name={iconName} size={size} color={color} />
          },
          tabBarActiveTintColor: '#22c55e',
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
          component={StudentDashboard}
          options={{ tabBarLabel: 'Home' }}
        />
        <Tab.Screen
          name="schedule"
          component={StudentSchedule}
          options={{ tabBarLabel: 'Schedule' }}
        />
        <Tab.Screen
          name="grades"
          component={StudentGrades}
          options={{ tabBarLabel: 'Grades' }}
        />
        <Tab.Screen
          name="profile"
          component={StudentProfile}
          options={{ tabBarLabel: 'Profile' }}
        />
      </Tab.Navigator>
    </SafeAreaView>
  )
}
