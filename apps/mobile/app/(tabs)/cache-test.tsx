/**
 * Cache Test Screen - Test fallback cache manager
 */

import React from 'react'
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native'
import { useCache, useCacheStats, useClearUserCache } from '../../hooks/useCache'

// Mock data fetcher
const fetchUserProfile = async () => {
  // Simulate API delay
  await new Promise(resolve => setTimeout(resolve, 1000))
  
  return {
    id: '123',
    name: 'John Doe',
    email: 'john@school.edu',
    role: 'teacher',
    lastLogin: new Date().toISOString(),
  }
}

const fetchDashboardStats = async () => {
  await new Promise(resolve => setTimeout(resolve, 800))
  
  return {
    totalStudents: 150,
    totalClasses: 8,
    todayAttendance: 142,
    pendingAssignments: 12,
    lastUpdated: new Date().toISOString(),
  }
}

export default function CacheTestScreen() {
  const { stats, refreshStats } = useCacheStats()
  const { clearAllCache } = useClearUserCache()

  // Test different cache keys
  const userProfile = useCache('USER_PROFILE', fetchUserProfile, {
    userId: 'teacher123',
    schoolId: 'school456',
  })

  const dashboardStats = useCache('DASHBOARD_STATS', fetchDashboardStats, {
    userId: 'teacher123',
    schoolId: 'school456',
  })

  const handleClearCache = async () => {
    Alert.alert(
      'Clear Cache',
      'Are you sure you want to clear all cache?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear',
          style: 'destructive',
          onPress: async () => {
            await clearAllCache()
            await refreshStats()
            // Refetch data
            userProfile.refetch()
            dashboardStats.refetch()
          },
        },
      ]
    )
  }

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>Cache Test Screen</Text>
      <Text style={styles.subtitle}>Testing AsyncStorage fallback cache</Text>

      {/* Cache Stats */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Cache Statistics</Text>
        <View style={styles.statRow}>
          <Text style={styles.statLabel}>Total Keys:</Text>
          <Text style={styles.statValue}>{stats.totalKeys}</Text>
        </View>
        <View style={styles.statRow}>
          <Text style={styles.statLabel}>Cache Size:</Text>
          <Text style={styles.statValue}>{stats.cacheSize}</Text>
        </View>
        <View style={styles.statRow}>
          <Text style={styles.statLabel}>Network:</Text>
          <Text style={[styles.statValue, { color: stats.isOnline ? '#22c55e' : '#ef4444' }]}>
            {stats.isOnline ? 'Online' : 'Offline'}
          </Text>
        </View>
        
        <TouchableOpacity style={styles.button} onPress={refreshStats}>
          <Text style={styles.buttonText}>Refresh Stats</Text>
        </TouchableOpacity>
      </View>

      {/* User Profile Cache Test */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>User Profile (5min cache)</Text>
        {userProfile.isLoading ? (
          <Text style={styles.loading}>Loading...</Text>
        ) : userProfile.error ? (
          <Text style={styles.error}>Error: {userProfile.error}</Text>
        ) : userProfile.data ? (
          <View style={styles.dataContainer}>
            <Text style={styles.dataText}>Name: {userProfile.data.name}</Text>
            <Text style={styles.dataText}>Email: {userProfile.data.email}</Text>
            <Text style={styles.dataText}>Role: {userProfile.data.role}</Text>
            <Text style={styles.dataText}>
              Last Login: {new Date(userProfile.data.lastLogin).toLocaleTimeString()}
            </Text>
          </View>
        ) : (
          <Text style={styles.noData}>No data</Text>
        )}
        
        <TouchableOpacity style={styles.button} onPress={userProfile.refetch}>
          <Text style={styles.buttonText}>Refetch Profile</Text>
        </TouchableOpacity>
      </View>

      {/* Dashboard Stats Cache Test */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Dashboard Stats (3min cache)</Text>
        {dashboardStats.isLoading ? (
          <Text style={styles.loading}>Loading...</Text>
        ) : dashboardStats.error ? (
          <Text style={styles.error}>Error: {dashboardStats.error}</Text>
        ) : dashboardStats.data ? (
          <View style={styles.dataContainer}>
            <Text style={styles.dataText}>Students: {dashboardStats.data.totalStudents}</Text>
            <Text style={styles.dataText}>Classes: {dashboardStats.data.totalClasses}</Text>
            <Text style={styles.dataText}>Today's Attendance: {dashboardStats.data.todayAttendance}</Text>
            <Text style={styles.dataText}>Pending: {dashboardStats.data.pendingAssignments}</Text>
            <Text style={styles.dataText}>
              Updated: {new Date(dashboardStats.data.lastUpdated).toLocaleTimeString()}
            </Text>
          </View>
        ) : (
          <Text style={styles.noData}>No data</Text>
        )}
        
        <TouchableOpacity style={styles.button} onPress={dashboardStats.refetch}>
          <Text style={styles.buttonText}>Refetch Stats</Text>
        </TouchableOpacity>
      </View>

      {/* Cache Controls */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Cache Controls</Text>
        <TouchableOpacity style={[styles.button, styles.dangerButton]} onPress={handleClearCache}>
          <Text style={[styles.buttonText, styles.dangerButtonText]}>Clear All Cache</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    padding: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#6b7280',
    marginBottom: 24,
  },
  section: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 12,
  },
  statRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  statLabel: {
    fontSize: 14,
    color: '#6b7280',
  },
  statValue: {
    fontSize: 14,
    fontWeight: '500',
    color: '#1f2937',
  },
  dataContainer: {
    backgroundColor: '#f9fafb',
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
  },
  dataText: {
    fontSize: 14,
    color: '#374151',
    marginBottom: 4,
  },
  loading: {
    fontSize: 14,
    color: '#3b82f6',
    fontStyle: 'italic',
    marginBottom: 12,
  },
  error: {
    fontSize: 14,
    color: '#ef4444',
    marginBottom: 12,
  },
  noData: {
    fontSize: 14,
    color: '#6b7280',
    fontStyle: 'italic',
    marginBottom: 12,
  },
  button: {
    backgroundColor: '#3b82f6',
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    alignItems: 'center',
    marginTop: 8,
  },
  buttonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '500',
  },
  dangerButton: {
    backgroundColor: '#ef4444',
  },
  dangerButtonText: {
    color: 'white',
  },
})
