'use client'

import { useState, useEffect } from 'react'
import { useAuthStore } from '@/lib/stores/auth-store'
import AdminLayout from '@/components/admin/AdminLayout'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { 
  BookOpen, 
  Users, 
  ArrowRightLeft, 
  Clock, 
  AlertTriangle,
  TrendingUp,
  Plus,
  Search,
  Filter,
  BarChart3,
  Settings
} from 'lucide-react'
import Link from 'next/link'

interface LibraryStats {
  totalBooks: number
  totalMembers: number
  activeTransactions: number
  overdueBooks: number
  reservations: number
  finesCollected: number
  popularBooks: Array<{
    id: string
    title: string
    author: string
    checkouts: number
  }>
  recentActivity: Array<{
    id: string
    type: 'checkout' | 'return' | 'reservation'
    memberName: string
    bookTitle: string
    timestamp: string
  }>
}

export default function LibraryManagement() {
  const { user } = useAuthStore()
  const [stats, setStats] = useState<LibraryStats | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (user?.school_id) {
      fetchLibraryStats()
    }
  }, [user?.school_id])

  const fetchLibraryStats = async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/admin/library/stats?school_id=${user?.school_id}&user_id=${user?.id}`)
      if (response.ok) {
        const data = await response.json()
        setStats(data)
      }
    } catch (error) {
      console.error('Error fetching library stats:', error)
    } finally {
      setLoading(false)
    }
  }

  const quickActions = [
    {
      title: 'Add New Book',
      description: 'Add books to the library catalog',
      href: '/admin/library/books/new',
      icon: BookOpen,
      color: 'bg-blue-500'
    },
    {
      title: 'Register Member',
      description: 'Register new library members',
      href: '/admin/library/members/new',
      icon: Users,
      color: 'bg-green-500'
    },
    {
      title: 'Check Out Book',
      description: 'Process book borrowing',
      href: '/admin/library/transactions/checkout',
      icon: ArrowRightLeft,
      color: 'bg-purple-500'
    },
    {
      title: 'Library Settings',
      description: 'Configure library policies',
      href: '/admin/library/settings',
      icon: Settings,
      color: 'bg-gray-500'
    }
  ]

  const navigationTabs = [
    { value: 'overview', label: 'Overview', icon: BarChart3 },
    { value: 'books', label: 'Books', href: '/admin/library/books' },
    { value: 'members', label: 'Members', href: '/admin/library/members' },
    { value: 'transactions', label: 'Transactions', href: '/admin/library/transactions' },
    { value: 'reservations', label: 'Reservations', href: '/admin/library/reservations' },
    { value: 'fines', label: 'Fines', href: '/admin/library/fines' },
    { value: 'reports', label: 'Reports', href: '/admin/library/reports' },
    { value: 'settings', label: 'Settings', href: '/admin/library/settings' }
  ]

  return (
    <AdminLayout title="Library Management">
      <div className="space-y-6">
        {/* Navigation Tabs */}
        <Tabs defaultValue="overview" className="w-full">
          <TabsList className="grid w-full grid-cols-8">
            {navigationTabs.map((tab) => (
              <TabsTrigger 
                key={tab.value} 
                value={tab.value}
                className="flex items-center space-x-2"
                asChild={!!tab.href}
              >
                {tab.href ? (
                  <Link href={tab.href}>
                    {tab.icon && <tab.icon className="h-4 w-4" />}
                    <span className="hidden sm:inline">{tab.label}</span>
                  </Link>
                ) : (
                  <>
                    {tab.icon && <tab.icon className="h-4 w-4" />}
                    <span className="hidden sm:inline">{tab.label}</span>
                  </>
                )}
              </TabsTrigger>
            ))}
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            {/* Quick Actions */}
            <Card>
              <CardHeader>
                <CardTitle>Quick Actions</CardTitle>
                <CardDescription>
                  Common library management tasks
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  {quickActions.map((action) => (
                    <Link key={action.title} href={action.href}>
                      <Card className="hover:shadow-md transition-shadow cursor-pointer">
                        <CardContent className="p-4">
                          <div className="flex items-center space-x-3">
                            <div className={`p-2 rounded-lg ${action.color} text-white`}>
                              <action.icon className="h-5 w-5" />
                            </div>
                            <div>
                              <h3 className="font-medium">{action.title}</h3>
                              <p className="text-sm text-muted-foreground">
                                {action.description}
                              </p>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    </Link>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Statistics Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Books</CardTitle>
                  <BookOpen className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {loading ? '...' : stats?.totalBooks || 0}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    In library catalog
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Active Members</CardTitle>
                  <Users className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {loading ? '...' : stats?.totalMembers || 0}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Registered library members
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Books Borrowed</CardTitle>
                  <ArrowRightLeft className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {loading ? '...' : stats?.activeTransactions || 0}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Currently checked out
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Overdue Books</CardTitle>
                  <AlertTriangle className="h-4 w-4 text-red-500" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-red-600">
                    {loading ? '...' : stats?.overdueBooks || 0}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Need attention
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Popular Books and Recent Activity */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Popular Books</CardTitle>
                  <CardDescription>
                    Most borrowed books this month
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {loading ? (
                    <div className="space-y-3">
                      {[1, 2, 3].map((i) => (
                        <div key={i} className="animate-pulse">
                          <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                          <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                        </div>
                      ))}
                    </div>
                  ) : stats?.popularBooks?.length ? (
                    <div className="space-y-3">
                      {stats.popularBooks.map((book, index) => (
                        <div key={book.id} className="flex items-center justify-between">
                          <div>
                            <p className="font-medium">{book.title}</p>
                            <p className="text-sm text-muted-foreground">{book.author}</p>
                          </div>
                          <Badge variant="secondary">
                            {book.checkouts} checkouts
                          </Badge>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-muted-foreground">No data available</p>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Recent Activity</CardTitle>
                  <CardDescription>
                    Latest library transactions
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {loading ? (
                    <div className="space-y-3">
                      {[1, 2, 3].map((i) => (
                        <div key={i} className="animate-pulse">
                          <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                          <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                        </div>
                      ))}
                    </div>
                  ) : stats?.recentActivity?.length ? (
                    <div className="space-y-3">
                      {stats.recentActivity.map((activity) => (
                        <div key={activity.id} className="flex items-center justify-between">
                          <div>
                            <p className="font-medium">
                              {activity.memberName} {activity.type === 'checkout' ? 'borrowed' : 
                               activity.type === 'return' ? 'returned' : 'reserved'} 
                            </p>
                            <p className="text-sm text-muted-foreground">{activity.bookTitle}</p>
                          </div>
                          <Badge 
                            variant={activity.type === 'checkout' ? 'default' : 
                                   activity.type === 'return' ? 'secondary' : 'outline'}
                          >
                            {activity.type}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-muted-foreground">No recent activity</p>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </AdminLayout>
  )
}
