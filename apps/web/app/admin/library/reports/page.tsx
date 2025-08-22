'use client'

import { useState, useEffect } from 'react'
import { useAuthStore } from '@/lib/stores/auth-store'
import AdminLayout from '@/components/admin/AdminLayout'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'
import { 
  BarChart3, 
  TrendingUp, 
  Users, 
  BookOpen, 
  Calendar,
  Download,
  Filter,
  AlertTriangle,
  CheckCircle,
  Clock,
  DollarSign
} from 'lucide-react'

interface LibraryStats {
  totalBooks: number
  totalMembers: number
  activeLoans: number
  overdueBooks: number
  totalFines: number
  booksAddedThisMonth: number
  popularBooks: Array<{
    title: string
    authors: string[]
    borrowCount: number
  }>
  memberActivity: Array<{
    memberType: string
    count: number
    percentage: number
  }>
  monthlyStats: Array<{
    month: string
    checkouts: number
    returns: number
    newMembers: number
  }>
  categoryStats: Array<{
    categoryName: string
    bookCount: number
    borrowCount: number
  }>
}

export default function LibraryReportsPage() {
  const { user } = useAuthStore()
  const [stats, setStats] = useState<LibraryStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [selectedPeriod, setSelectedPeriod] = useState('month')
  const [selectedReport, setSelectedReport] = useState('overview')

  useEffect(() => {
    if (user?.school_id && user?.id) {
      fetchStats()
    }
  }, [selectedPeriod, user?.school_id, user?.id])

  const fetchStats = async () => {
    if (!user?.school_id || !user?.id) {
      return
    }

    try {
      setLoading(true)
      const params = new URLSearchParams({
        school_id: user.school_id,
        user_id: user.id,
        period: selectedPeriod
      })

      const response = await fetch(`/api/admin/library/reports/stats?${params}`)
      if (response.ok) {
        const data = await response.json()
        setStats(data)
      } else {
        toast.error('Failed to fetch library statistics')
      }
    } catch (error) {
      console.error('Error fetching stats:', error)
      toast.error('Failed to fetch library statistics')
    } finally {
      setLoading(false)
    }
  }

  const exportReport = async (reportType: string) => {
    if (!user?.school_id || !user?.id) {
      toast.error('User not authenticated')
      return
    }

    try {
      const params = new URLSearchParams({
        school_id: user.school_id,
        user_id: user.id,
        period: selectedPeriod,
        type: reportType
      })

      const response = await fetch(`/api/admin/library/reports/export?${params}`)
      if (response.ok) {
        const blob = await response.blob()
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `library-${reportType}-report-${new Date().toISOString().split('T')[0]}.csv`
        document.body.appendChild(a)
        a.click()
        window.URL.revokeObjectURL(url)
        document.body.removeChild(a)
        toast.success('Report exported successfully')
      } else {
        toast.error('Failed to export report')
      }
    } catch (error) {
      console.error('Error exporting report:', error)
      toast.error('Failed to export report')
    }
  }

  if (!user) {
    return (
      <AdminLayout title="Library Reports">
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </AdminLayout>
    )
  }

  if (loading) {
    return (
      <AdminLayout title="Library Reports">
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </AdminLayout>
    )
  }

  return (
    <AdminLayout title="Library Reports & Analytics">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold">Library Reports</h2>
            <p className="text-muted-foreground">
              Analytics and insights for your library management
            </p>
          </div>
          <div className="flex items-center space-x-2">
            <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
              <SelectTrigger className="w-[150px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="week">This Week</SelectItem>
                <SelectItem value="month">This Month</SelectItem>
                <SelectItem value="quarter">This Quarter</SelectItem>
                <SelectItem value="year">This Year</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" size="sm" onClick={() => exportReport('overview')}>
              <Download className="h-4 w-4 mr-2" />
              Export Report
            </Button>
          </div>
        </div>

        {/* Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <BookOpen className="h-8 w-8 text-blue-600" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Total Books</p>
                  <p className="text-2xl font-bold">{stats?.totalBooks || 0}</p>
                  <p className="text-xs text-green-600">
                    +{stats?.booksAddedThisMonth || 0} this month
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <Users className="h-8 w-8 text-green-600" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Active Members</p>
                  <p className="text-2xl font-bold">{stats?.totalMembers || 0}</p>
                  <p className="text-xs text-blue-600">
                    Library membership
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <Clock className="h-8 w-8 text-orange-600" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Active Loans</p>
                  <p className="text-2xl font-bold">{stats?.activeLoans || 0}</p>
                  <p className="text-xs text-orange-600">
                    Currently borrowed
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <AlertTriangle className="h-8 w-8 text-red-600" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Overdue Books</p>
                  <p className="text-2xl font-bold">{stats?.overdueBooks || 0}</p>
                  <p className="text-xs text-red-600">
                    Need attention
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Financial Overview */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <DollarSign className="h-5 w-5 mr-2" />
              Financial Overview
            </CardTitle>
            <CardDescription>
              Fines and financial metrics
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="text-center p-4 bg-red-50 rounded-lg">
                <p className="text-sm text-gray-600">Total Outstanding Fines</p>
                <p className="text-2xl font-bold text-red-600">
                  ${stats?.totalFines?.toFixed(2) || '0.00'}
                </p>
              </div>
              <div className="text-center p-4 bg-green-50 rounded-lg">
                <p className="text-sm text-gray-600">Collection Rate</p>
                <p className="text-2xl font-bold text-green-600">85%</p>
              </div>
              <div className="text-center p-4 bg-blue-50 rounded-lg">
                <p className="text-sm text-gray-600">Average Fine</p>
                <p className="text-2xl font-bold text-blue-600">$2.50</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Popular Books */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <TrendingUp className="h-5 w-5 mr-2" />
                Most Popular Books
              </CardTitle>
              <CardDescription>
                Books with highest circulation
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {stats?.popularBooks?.map((book, index) => (
                  <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex-1">
                      <p className="font-medium">{book.title}</p>
                      <p className="text-sm text-gray-600">
                        by {book.authors.join(', ')}
                      </p>
                    </div>
                    <Badge variant="secondary">
                      {book.borrowCount} borrows
                    </Badge>
                  </div>
                )) || (
                  <p className="text-gray-500 text-center py-4">No data available</p>
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <BarChart3 className="h-5 w-5 mr-2" />
                Member Activity
              </CardTitle>
              <CardDescription>
                Borrowing activity by member type
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {stats?.memberActivity?.map((activity, index) => (
                  <div key={index} className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                      <span className="capitalize">{activity.memberType}</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className="text-sm text-gray-600">{activity.count}</span>
                      <Badge variant="outline">{activity.percentage}%</Badge>
                    </div>
                  </div>
                )) || (
                  <p className="text-gray-500 text-center py-4">No data available</p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Category Statistics */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Filter className="h-5 w-5 mr-2" />
              Collection by Category
            </CardTitle>
            <CardDescription>
              Book distribution and circulation by category
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-2">Category</th>
                    <th className="text-right py-2">Books</th>
                    <th className="text-right py-2">Circulations</th>
                    <th className="text-right py-2">Avg. per Book</th>
                  </tr>
                </thead>
                <tbody>
                  {stats?.categoryStats?.map((category, index) => (
                    <tr key={index} className="border-b">
                      <td className="py-2">{category.categoryName}</td>
                      <td className="text-right py-2">{category.bookCount}</td>
                      <td className="text-right py-2">{category.borrowCount}</td>
                      <td className="text-right py-2">
                        {category.bookCount > 0 
                          ? (category.borrowCount / category.bookCount).toFixed(1)
                          : '0.0'
                        }
                      </td>
                    </tr>
                  )) || (
                    <tr>
                      <td colSpan={4} className="text-center py-4 text-gray-500">
                        No data available
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        {/* Export Options */}
        <Card>
          <CardHeader>
            <CardTitle>Export Reports</CardTitle>
            <CardDescription>
              Download detailed reports for further analysis
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Button 
                variant="outline" 
                onClick={() => exportReport('circulation')}
                className="justify-start"
              >
                <Download className="h-4 w-4 mr-2" />
                Circulation Report
              </Button>
              <Button 
                variant="outline" 
                onClick={() => exportReport('members')}
                className="justify-start"
              >
                <Download className="h-4 w-4 mr-2" />
                Members Report
              </Button>
              <Button 
                variant="outline" 
                onClick={() => exportReport('fines')}
                className="justify-start"
              >
                <Download className="h-4 w-4 mr-2" />
                Fines Report
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  )
}
