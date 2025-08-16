'use client'

import { useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import Link from 'next/link'
import { useAuthStore } from '@/lib/stores/auth-store'
import { Button } from '@/components/ui/button'

interface StudentLayoutProps {
  children: React.ReactNode
}

const sidebarItems = [
  {
    name: 'Dashboard',
    href: '/student',
    icon: '🏠',
    description: 'Overview and quick access'
  },
  {
    name: 'My Profile',
    href: '/student/profile',
    icon: '👤',
    description: 'Personal information'
  },
  {
    name: 'My Classes',
    href: '/student/classes',
    icon: '📚',
    description: 'Enrolled classes and subjects'
  },
  {
    name: 'Schedule',
    href: '/student/schedule',
    icon: '📅',
    description: 'Class timetable'
  },
  {
    name: 'Assignments',
    href: '/student/assignments',
    icon: '📝',
    description: 'Homework and projects'
  },
  {
    name: 'Grades',
    href: '/student/grades',
    icon: '📊',
    description: 'Academic performance'
  },
  {
    name: 'Attendance',
    href: '/student/attendance',
    icon: '✅',
    description: 'Attendance records'
  }
]

export default function StudentLayout({ children }: StudentLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const { user, logout } = useAuthStore()
  const router = useRouter()
  const pathname = usePathname()

  const handleLogout = async () => {
    await logout()
    router.push('/login')
  }

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Sidebar */}
      <div className={`${sidebarOpen ? 'w-64' : 'w-16'} bg-white shadow-lg transition-all duration-300 flex flex-col fixed left-0 top-0 h-screen z-10`}>
        {/* Header */}
        <div className="p-4 border-b border-gray-200">
          <div className={`flex items-center ${sidebarOpen ? 'justify-between' : 'justify-center'}`}>
            {sidebarOpen && (
              <h2 className="text-xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                Student Portal
              </h2>
            )}
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="p-2 rounded-lg hover:bg-gray-100 transition-colors flex items-center justify-center"
            >
              <span className="text-lg">{sidebarOpen ? '←' : '→'}</span>
            </button>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
          {sidebarItems.map((item) => {
            const isActive = pathname === item.href

            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center rounded-lg transition-colors group ${
                  sidebarOpen
                    ? 'space-x-3 px-3 py-3'
                    : 'justify-center px-2 py-3'
                } ${
                  isActive
                    ? 'bg-blue-100 text-blue-700 border border-blue-200'
                    : 'hover:bg-blue-50 hover:text-blue-600'
                }`}
                title={!sidebarOpen ? item.name : undefined}
              >
                <span className="text-xl">{item.icon}</span>
                {sidebarOpen && (
                  <div className="flex-1">
                    <span className="font-medium block">{item.name}</span>
                    <span className="text-xs text-gray-500">{item.description}</span>
                  </div>
                )}
              </Link>
            )
          })}
        </nav>

        {/* User Info & Logout */}
        <div className="p-4 border-t border-gray-200">
          {sidebarOpen ? (
            <div className="space-y-3">
              <div className="text-sm">
                <div className="font-medium text-gray-900">{user?.name || 'Student'}</div>
                <div className="text-gray-500">{user?.email}</div>
              </div>
              <Button 
                onClick={handleLogout}
                variant="outline"
                size="sm"
                className="w-full"
              >
                Sign Out
              </Button>
            </div>
          ) : (
            <button
              onClick={handleLogout}
              className="w-full p-2 rounded-lg hover:bg-gray-100 transition-colors flex items-center justify-center"
              title="Sign Out"
            >
              <span className="text-lg">🚪</span>
            </button>
          )}
        </div>
      </div>

      {/* Main Content */}
      <div className={`flex-1 flex flex-col ${sidebarOpen ? 'ml-64' : 'ml-16'} transition-all duration-300`}>
        {/* Top Bar */}
        <header className="bg-white shadow-sm border-b border-gray-200 px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                Welcome back, {user?.name?.split(' ')[0] || 'Student'}!
              </h1>
              <p className="text-gray-500 text-sm mt-1">
                {new Date().toLocaleDateString('en-US', { 
                  weekday: 'long', 
                  year: 'numeric', 
                  month: 'long', 
                  day: 'numeric' 
                })}
              </p>
            </div>
            <div className="flex items-center space-x-4">
              <div className="text-right text-sm">
                <div className="font-medium text-gray-900">Student ID</div>
                <div className="text-gray-500">{user?.student_id || 'Not assigned'}</div>
              </div>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 p-6 overflow-auto">
          {children}
        </main>
      </div>
    </div>
  )
}
