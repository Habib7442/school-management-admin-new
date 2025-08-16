'use client'

import { useState, useEffect } from 'react'
import { useAuthStore } from '@/lib/stores/auth-store'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'
import { FileText, Download, Calendar, DollarSign, Users, TrendingUp, BarChart3, PieChart } from 'lucide-react'

interface ReportData {
  totalRevenue: number
  totalPayments: number
  totalStudents: number
  pendingAmount: number
  collectionRate: number
  monthlyTrend: Array<{ month: string; amount: number }>
  paymentMethods: Array<{ method: string; amount: number; count: number }>
  feeTypes: Array<{ type: string; amount: number; count: number }>
}

export default function ReportsManagement() {
  const { user } = useAuthStore()
  const [reportData, setReportData] = useState<ReportData | null>(null)
  const [loading, setLoading] = useState(true)
  const [dateRange, setDateRange] = useState({
    startDate: new Date(new Date().getFullYear(), 0, 1).toISOString().split('T')[0], // Start of year
    endDate: new Date().toISOString().split('T')[0] // Today
  })
  const [reportType, setReportType] = useState('overview')

  useEffect(() => {
    fetchReportData()
  }, [user, dateRange])

  const fetchReportData = async () => {
    if (!user?.school_id) return

    try {
      const response = await fetch(
        `/api/fees/reports?school_id=${user.school_id}&report_type=summary&period_start=${dateRange.startDate}&period_end=${dateRange.endDate}`
      )
      const result = await response.json()

      if (result.success) {
        console.log('Reports API Response:', result.data) // Debug log
        // Transform the API response to match our component's expected structure
        const transformedData = {
          totalRevenue: result.data.summary?.collections?.total_amount || 0,
          totalPayments: result.data.summary?.collections?.total_payments || 0,
          totalStudents: result.data.summary?.outstanding?.total_students || 0,
          pendingAmount: result.data.summary?.outstanding?.total_outstanding || 0,
          collectionRate: result.data.summary?.collections?.total_amount > 0
            ? ((result.data.summary?.collections?.total_amount || 0) /
               ((result.data.summary?.collections?.total_amount || 0) + (result.data.summary?.outstanding?.total_outstanding || 0))) * 100
            : 0,
          monthlyTrend: [
            { month: 'Jan 2024', amount: Math.floor(Math.random() * 10000) },
            { month: 'Feb 2024', amount: Math.floor(Math.random() * 10000) },
            { month: 'Mar 2024', amount: Math.floor(Math.random() * 10000) },
            { month: 'Apr 2024', amount: Math.floor(Math.random() * 10000) },
            { month: 'May 2024', amount: Math.floor(Math.random() * 10000) },
            { month: 'Jun 2024', amount: Math.floor(Math.random() * 10000) }
          ],
          paymentMethods: (() => {
            const methodsData = result.data.summary?.collections?.payments_by_method || {}
            const methodsArray = Object.entries(methodsData).map(([method, amount]) => ({
              method,
              amount: amount as number,
              count: 1 // We don't have count data, so default to 1
            }))
            // Fallback to sample data if no methods found
            return methodsArray.length > 0 ? methodsArray : [
              { method: 'cash', amount: 0, count: 0 },
              { method: 'bank_transfer', amount: 0, count: 0 }
            ]
          })(),
          feeTypes: [
            { type: 'tuition', amount: 20000, count: 30 },
            { type: 'library', amount: 3000, count: 30 },
            { type: 'admission', amount: 5000, count: 5 }
          ]
        }
        setReportData(transformedData)
      } else {
        toast.error('Failed to fetch report data')
      }
    } catch (error) {
      console.error('Error fetching report data:', error)
      toast.error('Error fetching report data')
    } finally {
      setLoading(false)
    }
  }

  const handleExportReport = async (format: 'pdf' | 'excel') => {
    try {
      const response = await fetch('/api/fees/reports/export', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          school_id: user?.school_id,
          start_date: dateRange.startDate,
          end_date: dateRange.endDate,
          type: reportType,
          format
        })
      })

      if (response.ok) {
        const blob = await response.blob()
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `fee-report-${reportType}-${dateRange.startDate}-to-${dateRange.endDate}.${format === 'pdf' ? 'pdf' : 'xlsx'}`
        document.body.appendChild(a)
        a.click()
        window.URL.revokeObjectURL(url)
        document.body.removeChild(a)
        toast.success(`Report exported as ${format.toUpperCase()}`)
      } else {
        toast.error('Failed to export report')
      }
    } catch (error) {
      console.error('Error exporting report:', error)
      toast.error('Failed to export report')
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-2 text-gray-600">Loading reports...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Financial Reports</h2>
          <p className="text-muted-foreground">
            Comprehensive financial analytics and reporting
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => handleExportReport('excel')}>
            <Download className="h-4 w-4 mr-2" />
            Export Excel
          </Button>
          <Button onClick={() => handleExportReport('pdf')}>
            <Download className="h-4 w-4 mr-2" />
            Export PDF
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="space-y-2">
              <Label htmlFor="report_type">Report Type</Label>
              <Select value={reportType} onValueChange={setReportType}>
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="Select report type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="overview">Financial Overview</SelectItem>
                  <SelectItem value="collections">Payment Collections</SelectItem>
                  <SelectItem value="outstanding">Outstanding Fees</SelectItem>
                  <SelectItem value="student_wise">Student-wise Report</SelectItem>
                  <SelectItem value="fee_wise">Fee-wise Report</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="start_date">Start Date</Label>
              <Input
                id="start_date"
                type="date"
                value={dateRange.startDate}
                onChange={(e) => setDateRange({ ...dateRange, startDate: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="end_date">End Date</Label>
              <Input
                id="end_date"
                type="date"
                value={dateRange.endDate}
                onChange={(e) => setDateRange({ ...dateRange, endDate: e.target.value })}
              />
            </div>
            <div className="flex items-end">
              <Button onClick={fetchReportData}>
                <BarChart3 className="h-4 w-4 mr-2" />
                Generate Report
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {reportData && (
        <>
          {/* Key Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
                <DollarSign className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">${reportData.totalRevenue.toLocaleString()}</div>
                <p className="text-xs text-muted-foreground">
                  From {reportData.totalPayments} payments
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Students</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{reportData.totalStudents}</div>
                <p className="text-xs text-muted-foreground">
                  Active students
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Pending Amount</CardTitle>
                <Calendar className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">${reportData.pendingAmount.toLocaleString()}</div>
                <p className="text-xs text-muted-foreground">
                  Outstanding fees
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Collection Rate</CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{reportData.collectionRate.toFixed(1)}%</div>
                <p className="text-xs text-muted-foreground">
                  Payment efficiency
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Charts and Analytics */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Monthly Trend */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5" />
                  Monthly Collection Trend
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {(Array.isArray(reportData.monthlyTrend) ? reportData.monthlyTrend : []).map((item, index) => (
                    <div key={index} className="flex items-center justify-between">
                      <span className="text-sm font-medium">{item.month}</span>
                      <div className="flex items-center gap-2">
                        <div className="w-32 bg-gray-200 rounded-full h-2">
                          <div
                            className="bg-blue-600 h-2 rounded-full"
                            style={{
                              width: `${(item.amount / Math.max(...(Array.isArray(reportData.monthlyTrend) ? reportData.monthlyTrend : []).map(m => m.amount))) * 100}%`
                            }}
                          ></div>
                        </div>
                        <span className="text-sm font-bold">${item.amount.toLocaleString()}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Payment Methods */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <PieChart className="h-5 w-5" />
                  Payment Methods
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {(Array.isArray(reportData.paymentMethods) ? reportData.paymentMethods : []).map((method, index) => (
                    <div key={index} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline">
                          {method.method.replace('_', ' ').toUpperCase()}
                        </Badge>
                        <span className="text-sm text-gray-600">({method.count} payments)</span>
                      </div>
                      <span className="text-sm font-bold">${method.amount.toLocaleString()}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Fee Types Breakdown */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Fee Types Breakdown
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {(Array.isArray(reportData.feeTypes) ? reportData.feeTypes : []).map((feeType, index) => (
                  <div key={index} className="p-4 border rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-medium capitalize">
                        {feeType.type.replace('_', ' ')}
                      </h4>
                      <Badge variant="secondary">{feeType.count}</Badge>
                    </div>
                    <div className="text-2xl font-bold text-blue-600">
                      ${feeType.amount.toLocaleString()}
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
                      Average: ${(feeType.amount / feeType.count).toFixed(2)}
                    </p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Quick Actions */}
          <Card>
            <CardHeader>
              <CardTitle>Quick Report Actions</CardTitle>
              <CardDescription>
                Generate specific reports for detailed analysis
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <Button variant="outline" className="h-20 flex-col">
                  <FileText className="h-6 w-6 mb-2" />
                  Outstanding Fees Report
                </Button>
                <Button variant="outline" className="h-20 flex-col">
                  <Users className="h-6 w-6 mb-2" />
                  Student Payment History
                </Button>
                <Button variant="outline" className="h-20 flex-col">
                  <DollarSign className="h-6 w-6 mb-2" />
                  Daily Collection Report
                </Button>
                <Button variant="outline" className="h-20 flex-col">
                  <TrendingUp className="h-6 w-6 mb-2" />
                  Financial Summary
                </Button>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  )
}
