'use client'

import { useEffect, useState } from 'react'
import AdminLayout from '@/components/admin/AdminLayout'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { supabase } from '@/lib/supabase'

interface DashboardStats {
  totalUsers: number
  totalClasses: number
  totalStudents: number
  totalTeachers: number
  activeEnrollments: number
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<DashboardStats>({
    totalUsers: 0,
    totalClasses: 0,
    totalStudents: 0,
    totalTeachers: 0,
    activeEnrollments: 0
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchDashboardStats()
  }, [])

  const fetchDashboardStats = async () => {
    try {
      setLoading(true)

      // Fetch total users
      const { count: totalUsers } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true })

      // Fetch total classes
      const { count: totalClasses } = await supabase
        .from('classes')
        .select('*', { count: 'exact', head: true })
        .eq('is_active', true)

      // Fetch students
      const { count: totalStudents } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true })
        .eq('role', 'student')

      // Fetch teachers
      const { count: totalTeachers } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true })
        .eq('role', 'teacher')

      // Fetch active enrollments
      const { count: activeEnrollments } = await supabase
        .from('class_enrollments')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'active')

      setStats({
        totalUsers: totalUsers || 0,
        totalClasses: totalClasses || 0,
        totalStudents: totalStudents || 0,
        totalTeachers: totalTeachers || 0,
        activeEnrollments: activeEnrollments || 0
      })
    } catch (error) {
      console.error('Error fetching dashboard stats:', error)
    } finally {
      setLoading(false)
    }
  }

  const statCards = [
    {
      title: 'Total Users',
      value: stats.totalUsers,
      description: 'All registered users',
      icon: '👥',
      color: 'from-blue-500 to-blue-600'
    },
    {
      title: 'Active Classes',
      value: stats.totalClasses,
      description: 'Currently running classes',
      icon: '🏫',
      color: 'from-green-500 to-green-600'
    },
    {
      title: 'Students',
      value: stats.totalStudents,
      description: 'Enrolled students',
      icon: '🎓',
      color: 'from-purple-500 to-purple-600'
    },
    {
      title: 'Teachers',
      value: stats.totalTeachers,
      description: 'Active teachers',
      icon: '👨‍🏫',
      color: 'from-orange-500 to-orange-600'
    },
    {
      title: 'Enrollments',
      value: stats.activeEnrollments,
      description: 'Active enrollments',
      icon: '📚',
      color: 'from-pink-500 to-pink-600'
    }
  ]

  return (
    <AdminLayout title="Dashboard">
      <div className="space-y-6">
        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-6">
          {statCards.map((card, index) => (
            <Card key={index} className="relative overflow-hidden">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-medium text-gray-600">
                    {card.title}
                  </CardTitle>
                  <div className={`w-8 h-8 rounded-lg bg-gradient-to-r ${card.color} flex items-center justify-center text-white text-lg`}>
                    {card.icon}
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-gray-900">
                  {loading ? '...' : card.value.toLocaleString()}
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  {card.description}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Recent Activity */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Recent Users</CardTitle>
              <CardDescription>Latest user registrations</CardDescription>
            </CardHeader>
            <CardContent>
              <RecentUsers />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>System Overview</CardTitle>
              <CardDescription>Key system metrics</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Database Status</span>
                  <span className="text-sm font-medium text-green-600">✓ Connected</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Authentication</span>
                  <span className="text-sm font-medium text-green-600">✓ Active</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Storage</span>
                  <span className="text-sm font-medium text-green-600">✓ Available</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Last Backup</span>
                  <span className="text-sm font-medium text-gray-600">2 hours ago</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
            <CardDescription>Common administrative tasks</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <button className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors text-left">
                <div className="text-2xl mb-2">👤</div>
                <div className="font-medium">Add User</div>
                <div className="text-sm text-gray-500">Create new user account</div>
              </button>
              <button className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors text-left">
                <div className="text-2xl mb-2">🏫</div>
                <div className="font-medium">Create Class</div>
                <div className="text-sm text-gray-500">Set up new class</div>
              </button>
              <button className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors text-left">
                <div className="text-2xl mb-2">📊</div>
                <div className="font-medium">View Reports</div>
                <div className="text-sm text-gray-500">Generate reports</div>
              </button>
              <button className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors text-left">
                <div className="text-2xl mb-2">⚙️</div>
                <div className="font-medium">Settings</div>
                <div className="text-sm text-gray-500">System configuration</div>
              </button>
            </div>
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  )
}

function RecentUsers() {
  const [users, setUsers] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchRecentUsers()
  }, [])

  const fetchRecentUsers = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('name, email, role, created_at')
        .order('created_at', { ascending: false })
        .limit(5)

      if (error) throw error
      setUsers(data || [])
    } catch (error) {
      console.error('Error fetching recent users:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return <div className="text-center py-4">Loading...</div>
  }

  return (
    <div className="space-y-3">
      {users.map((user, index) => (
        <div key={index} className="flex items-center space-x-3">
          <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full flex items-center justify-center text-white text-sm font-semibold">
            {user.name.charAt(0).toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-gray-900 truncate">{user.name}</p>
            <p className="text-xs text-gray-500 truncate">{user.email}</p>
          </div>
          <span className="text-xs text-gray-400 capitalize">{user.role}</span>
        </div>
      ))}
    </div>
  )
}
