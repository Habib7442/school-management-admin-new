'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from '@/components/ui/dropdown-menu'
import { useAuthStore } from '@/lib/stores/auth-store'
import AdminLayout from '@/components/admin/AdminLayout'
import { toast } from 'sonner'
import {
  DollarSign,
  Users,
  FileText,
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  Plus,
  Eye,
  Edit,
  Trash2,
  Download,
  Send,
  CreditCard,
  ChevronDown
} from 'lucide-react'
import FeeStructuresManagement from '@/components/admin/fees/FeeStructuresManagement'
import FeeAssignmentsManagement from '@/components/admin/fees/FeeAssignmentsManagement'
import InvoiceManagement from '@/components/admin/fees/InvoiceManagement'
import PaymentManagement from '@/components/admin/fees/PaymentManagement'
import ReportsManagement from '@/components/admin/fees/ReportsManagement'

// Dashboard Overview Component
function FeeDashboard() {
  const { user } = useAuthStore()
  const [dashboardData, setDashboardData] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchDashboardData()
  }, [user])

  const fetchDashboardData = async () => {
    if (!user?.school_id) return

    try {
      const response = await fetch(`/api/fees/dashboard?school_id=${user.school_id}`)
      const result = await response.json()

      if (result.success) {
        setDashboardData(result.data)
      } else {
        toast.error('Failed to load dashboard data')
      }
    } catch (error) {
      console.error('Error fetching dashboard data:', error)
      toast.error('Failed to load dashboard data')
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[...Array(8)].map((_, i) => (
          <Card key={i} className="animate-pulse">
            <CardHeader className="pb-2">
              <div className="h-4 bg-gray-200 rounded w-3/4"></div>
            </CardHeader>
            <CardContent>
              <div className="h-8 bg-gray-200 rounded w-1/2 mb-2"></div>
              <div className="h-3 bg-gray-200 rounded w-full"></div>
            </CardContent>
          </Card>
        ))}
      </div>
    )
  }

  if (!dashboardData) {
    return (
      <Card>
        <CardContent className="p-6">
          <p className="text-center text-gray-500">No dashboard data available</p>
        </CardContent>
      </Card>
    )
  }

  const { overview, invoices_summary, overdue_summary, trends } = dashboardData

  return (
    <div className="space-y-6">
      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Collection</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ${overview.total_paid_amount?.toLocaleString() || '0'}
            </div>
            <p className="text-xs text-muted-foreground">
              Collection Rate: {overview.collection_rate || 0}%
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Outstanding Amount</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">
              ${overview.total_outstanding_amount?.toLocaleString() || '0'}
            </div>
            <p className="text-xs text-muted-foreground">
              {overdue_summary.overdue_assignments_count || 0} overdue assignments
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Monthly Collection</CardTitle>
            {trends.collection_trend === 'up' ? (
              <TrendingUp className="h-4 w-4 text-green-600" />
            ) : (
              <TrendingDown className="h-4 w-4 text-red-600" />
            )}
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ${overview.monthly_collection?.toLocaleString() || '0'}
            </div>
            <p className="text-xs text-muted-foreground">
              {overview.monthly_payment_count || 0} payments this month
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Fee Structures</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {overview.active_fee_structures || 0}
            </div>
            <p className="text-xs text-muted-foreground">
              {overview.total_assignments || 0} total assignments
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Invoice Summary */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Invoices</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{invoices_summary.total_invoices || 0}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Paid Invoices</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {invoices_summary.paid_invoices || 0}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Pending Invoices</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">
              {invoices_summary.pending_invoices || 0}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Overdue Invoices</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {invoices_summary.overdue_invoices || 0}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Top Overdue Students */}
      {dashboardData.top_overdue && dashboardData.top_overdue.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Top Overdue Payments</CardTitle>
            <CardDescription>Students with highest outstanding amounts</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {dashboardData.top_overdue.slice(0, 5).map((item: any, index: number) => (
                <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                  <div>
                    <p className="font-medium">{item.student_name}</p>
                    <p className="text-sm text-gray-500">
                      {item.fee_name} • {item.days_overdue} days overdue
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-red-600">
                      ${item.balance_amount?.toLocaleString()}
                    </p>
                    <p className="text-xs text-gray-500">Due: {item.due_date}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

// Quick Actions Dropdown Component
function QuickActionsDropdown({ onTabChange }: { onTabChange: (tab: string) => void }) {
  const handleAction = (action: string) => {
    switch (action) {
      case 'create-fee-structure':
        onTabChange('structures')
        toast.success('Navigated to Fee Structures - Click "Create Fee Structure" to add new')
        break
      case 'bulk-assign-fees':
        onTabChange('assignments')
        toast.success('Navigated to Fee Assignments - Use bulk assignment features')
        break
      case 'generate-invoices':
        onTabChange('invoices')
        toast.success('Navigated to Invoices - Click "Create Invoice" to generate new')
        break
      case 'record-payment':
        onTabChange('payments')
        toast.success('Navigated to Payments - Click "Record Payment" to add new')
        break
      case 'send-reminders':
        toast.info('Payment reminder feature coming soon!')
        break
      case 'financial-reports':
        onTabChange('reports')
        toast.success('Navigated to Financial Reports')
        break
      case 'export-data':
        onTabChange('reports')
        toast.success('Navigated to Reports - Use export features to download data')
        break
      case 'view-overdue':
        onTabChange('assignments')
        toast.success('Navigated to Fee Assignments - Filter by overdue payments')
        break
      default:
        break
    }
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button className="bg-blue-600 hover:bg-blue-700 text-white">
          <Plus className="h-4 w-4 mr-2" />
          Quick Actions
          <ChevronDown className="h-4 w-4 ml-2" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuItem onClick={() => handleAction('create-fee-structure')}>
          <Plus className="h-4 w-4 mr-2" />
          Create Fee Structure
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => handleAction('bulk-assign-fees')}>
          <Users className="h-4 w-4 mr-2" />
          Bulk Assign Fees
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => handleAction('generate-invoices')}>
          <FileText className="h-4 w-4 mr-2" />
          Generate Invoices
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => handleAction('record-payment')}>
          <CreditCard className="h-4 w-4 mr-2" />
          Record Payment
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => handleAction('view-overdue')}>
          <AlertTriangle className="h-4 w-4 mr-2" />
          View Overdue Payments
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => handleAction('send-reminders')}>
          <Send className="h-4 w-4 mr-2" />
          Send Reminders
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => handleAction('financial-reports')}>
          <Download className="h-4 w-4 mr-2" />
          Financial Reports
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => handleAction('export-data')}>
          <Download className="h-4 w-4 mr-2" />
          Export Data
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

export default function FeeManagementPage() {
  const [activeTab, setActiveTab] = useState('dashboard')

  const handleTabChange = (tab: string) => {
    setActiveTab(tab)
  }

  return (
    <AdminLayout title="Fee Management">
      <div className="space-y-6">
        <div className="flex justify-end items-center mb-6">
          <QuickActionsDropdown onTabChange={handleTabChange} />
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList>
            <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
            <TabsTrigger value="structures">Fee Structures</TabsTrigger>
            <TabsTrigger value="assignments">Fee Assignments</TabsTrigger>
            <TabsTrigger value="invoices">Invoices</TabsTrigger>
            <TabsTrigger value="payments">Payments</TabsTrigger>
            <TabsTrigger value="reports">Reports</TabsTrigger>
          </TabsList>

          <TabsContent value="dashboard">
            <FeeDashboard />
          </TabsContent>

          <TabsContent value="structures">
            <FeeStructuresManagement />
          </TabsContent>

          <TabsContent value="assignments">
            <FeeAssignmentsManagement />
          </TabsContent>

          <TabsContent value="invoices">
            <InvoiceManagement />
          </TabsContent>

          <TabsContent value="payments">
            <PaymentManagement />
          </TabsContent>

          <TabsContent value="reports">
            <ReportsManagement />
          </TabsContent>

        </Tabs>
      </div>
    </AdminLayout>
  )
}
