'use client'

import { useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import Link from 'next/link'
import { useAuthStore } from '@/lib/stores/auth-store'
import { Button } from '@/components/ui/button'
import { AdminGuard } from '@/components/auth/AuthGuard'

interface AdminLayoutProps {
  children: React.ReactNode
  title: string
}

const sidebarItems = [
  {
    name: 'Dashboard',
    href: '/admin',
    icon: '📊',
    permission: { resource: 'dashboard', action: 'read' }
  },
  {
    name: 'Admission Management',
    href: '/admin/admissions',
    icon: '📝',
    permission: { resource: 'admissions', action: 'read' }
  },
  {
    name: 'User Management',
    href: '/admin/users',
    icon: '👥',
    permission: { resource: 'users', action: 'read' }
  },
  {
    name: 'Student Management',
    href: '/admin/students',
    icon: '🎓',
    permission: { resource: 'students', action: 'read' }
  },
  {
    name: 'Attendance Management',
    href: '/admin/attendance',
    icon: '📋',
    permission: { resource: 'attendance', action: 'read' }
  },
  {
    name: 'Examination Management',
    href: '/admin/examinations',
    icon: '📝',
    permission: { resource: 'examinations', action: 'read' }
  },
  {
    name: 'Role Management',
    href: '/admin/roles',
    icon: '🔐',
    permission: { resource: 'roles', action: 'read' }
  },
  {
    name: 'Class Management',
    href: '/admin/classes',
    icon: '🏫',
    permission: { resource: 'classes', action: 'read' }
  },
  {
    name: 'Timetable Management',
    href: '/admin/timetables',
    icon: '📅',
    permission: { resource: 'timetables', action: 'read' }
  },
  {
    name: 'Library Management',
    href: '/admin/library',
    icon: '📚',
    permission: { resource: 'library', action: 'read' }
  },
  {
    name: 'Fee Management',
    href: '/admin/fees',
    icon: '💰',
    permission: { resource: 'fees', action: 'read' }
  },
  {
    name: 'Reports',
    href: '/admin/reports',
    icon: '📈',
    permission: { resource: 'reports', action: 'read' }
  },
  {
    name: 'Settings',
    href: '/admin/settings',
    icon: '⚙️',
    permission: { resource: 'settings', action: 'read' }
  }
]

export default function AdminLayout({ children, title }: AdminLayoutProps) {
  return (
    <AdminGuard>
      <AdminLayoutContent title={title}>
        {children}
      </AdminLayoutContent>
    </AdminGuard>
  )
}

function AdminLayoutContent({ children, title }: AdminLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const { user, logout, checkPermission, isLoading } = useAuthStore()
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
              <h2 className="text-xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                Admin Panel
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
          {isLoading ? (
            <div className="p-4 text-center text-gray-500">Loading...</div>
          ) : (
            sidebarItems.map((item) => {
              const hasPermission = checkPermission(item.permission.resource, item.permission.action)
              const isActive = pathname === item.href

              if (!hasPermission) return null

            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center rounded-lg transition-colors group ${
                  sidebarOpen
                    ? 'space-x-3 px-3 py-2'
                    : 'justify-center px-2 py-2'
                } ${
                  isActive
                    ? 'bg-blue-100 text-blue-700 border border-blue-200'
                    : 'hover:bg-blue-50 hover:text-blue-600'
                }`}
              >
                <span className="text-xl">{item.icon}</span>
                {sidebarOpen && (
                  <span className="font-medium">{item.name}</span>
                )}
              </Link>
            )
          })
          )}
        </nav>

        {/* User Info */}
        <div className="p-4 border-t border-gray-200">
          {sidebarOpen ? (
            <div className="space-y-3">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full flex items-center justify-center text-white font-semibold">
                  {user?.name?.charAt(0).toUpperCase() || 'U'}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">{user?.name || 'Unknown User'}</p>
                  <p className="text-xs text-gray-500 capitalize">{user?.role || 'No Role'}</p>
                </div>
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
              <span className="text-xl">🚪</span>
            </button>
          )}
        </div>
      </div>

      {/* Main Content */}
      <div className={`flex-1 flex flex-col ${sidebarOpen ? 'ml-64' : 'ml-16'} transition-all duration-300`}>
        {/* Top Bar */}
        <header className="bg-white shadow-sm border-b border-gray-200 px-6 py-4">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold text-gray-900">{title}</h1>
            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-500">
                Welcome back, {user?.name || 'User'}
              </span>
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
