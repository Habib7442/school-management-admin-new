'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import AdminLayout from '@/components/admin/AdminLayout'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { 
  Building2, 
  Users, 
  Shield, 
  Bell, 
  Database, 
  Palette,
  Globe,
  Lock,
  ChevronRight
} from 'lucide-react'

interface SettingsSection {
  id: string
  title: string
  description: string
  icon: React.ReactNode
  href: string
  available: boolean
  comingSoon?: boolean
}

export default function SettingsPage() {
  const router = useRouter()

  // Show success message if coming from school profile save
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search)
    if (urlParams.get('saved') === 'true') {
      toast.success('School profile updated successfully!')
      // Clean up URL
      router.replace('/admin/settings')
    }
  }, [])

  const settingsSections: SettingsSection[] = [
    {
      id: 'school-profile',
      title: 'School Profile',
      description: 'Manage school information, logo, contact details, and location settings',
      icon: <Building2 className="h-6 w-6" />,
      href: '/admin/settings/school-profile',
      available: true
    },
    {
      id: 'user-settings',
      title: 'User Settings',
      description: 'Configure user roles, permissions, and account policies',
      icon: <Users className="h-6 w-6" />,
      href: '/admin/settings/users',
      available: false,
      comingSoon: true
    },
    {
      id: 'security',
      title: 'Security & Privacy',
      description: 'Manage authentication, data privacy, and security policies',
      icon: <Shield className="h-6 w-6" />,
      href: '/admin/settings/security',
      available: false,
      comingSoon: true
    },
    {
      id: 'notifications',
      title: 'Notifications',
      description: 'Configure email notifications, alerts, and communication settings',
      icon: <Bell className="h-6 w-6" />,
      href: '/admin/settings/notifications',
      available: false,
      comingSoon: true
    },
    {
      id: 'integrations',
      title: 'Integrations',
      description: 'Connect with third-party services and external systems',
      icon: <Globe className="h-6 w-6" />,
      href: '/admin/settings/integrations',
      available: false,
      comingSoon: true
    },
    {
      id: 'backup',
      title: 'Backup & Data',
      description: 'Manage data backups, exports, and data retention policies',
      icon: <Database className="h-6 w-6" />,
      href: '/admin/settings/backup',
      available: false,
      comingSoon: true
    },
    {
      id: 'appearance',
      title: 'Appearance',
      description: 'Customize themes, branding, and visual appearance',
      icon: <Palette className="h-6 w-6" />,
      href: '/admin/settings/appearance',
      available: false,
      comingSoon: true
    },
    {
      id: 'advanced',
      title: 'Advanced Settings',
      description: 'System configuration, API settings, and developer options',
      icon: <Lock className="h-6 w-6" />,
      href: '/admin/settings/advanced',
      available: false,
      comingSoon: true
    }
  ]

  const handleSectionClick = (section: SettingsSection) => {
    if (section.available) {
      router.push(section.href)
    }
  }

  return (
    <AdminLayout title="Settings">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
          <p className="text-gray-600 mt-1">
            Manage your school's configuration and system preferences
          </p>
        </div>

        {/* Settings Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {settingsSections.map((section) => (
            <Card 
              key={section.id}
              className={`relative transition-all duration-200 ${
                section.available 
                  ? 'hover:shadow-lg cursor-pointer border-gray-200 hover:border-blue-300' 
                  : 'opacity-60 cursor-not-allowed border-gray-100'
              }`}
              onClick={() => handleSectionClick(section)}
            >
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className={`p-2 rounded-lg ${
                    section.available 
                      ? 'bg-blue-100 text-blue-600' 
                      : 'bg-gray-100 text-gray-400'
                  }`}>
                    {section.icon}
                  </div>
                  {section.available && (
                    <ChevronRight className="h-5 w-5 text-gray-400" />
                  )}
                  {section.comingSoon && (
                    <span className="bg-yellow-100 text-yellow-800 text-xs px-2 py-1 rounded-full">
                      Coming Soon
                    </span>
                  )}
                </div>
                <CardTitle className="text-lg">{section.title}</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription className="text-sm">
                  {section.description}
                </CardDescription>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
            <CardDescription>
              Common administrative tasks and shortcuts
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Button
                variant="outline"
                className="justify-start h-auto p-4"
                onClick={() => router.push('/admin/settings/school-profile')}
              >
                <div className="text-left">
                  <div className="font-medium">Update School Info</div>
                  <div className="text-sm text-gray-500">Edit basic details</div>
                </div>
              </Button>
              
              <Button
                variant="outline"
                className="justify-start h-auto p-4"
                disabled
              >
                <div className="text-left">
                  <div className="font-medium">Export Data</div>
                  <div className="text-sm text-gray-500">Download reports</div>
                </div>
              </Button>
              
              <Button
                variant="outline"
                className="justify-start h-auto p-4"
                disabled
              >
                <div className="text-left">
                  <div className="font-medium">System Health</div>
                  <div className="text-sm text-gray-500">Check status</div>
                </div>
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* System Information */}
        <Card>
          <CardHeader>
            <CardTitle>System Information</CardTitle>
            <CardDescription>
              Current system status and version information
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <div className="text-sm font-medium text-gray-500">System Status</div>
                <div className="flex items-center mt-1">
                  <div className="w-2 h-2 bg-green-500 rounded-full mr-2"></div>
                  <span className="text-sm text-green-600">All Systems Operational</span>
                </div>
              </div>
              <div>
                <div className="text-sm font-medium text-gray-500">Last Backup</div>
                <div className="text-sm text-gray-900 mt-1">2 hours ago</div>
              </div>
              <div>
                <div className="text-sm font-medium text-gray-500">Version</div>
                <div className="text-sm text-gray-900 mt-1">v1.0.0</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  )
}
