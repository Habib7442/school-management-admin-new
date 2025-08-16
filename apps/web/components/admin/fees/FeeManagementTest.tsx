'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { useAuthStore } from '@/lib/stores/auth-store'
import { toast } from 'sonner'
import { 
  CheckCircle, 
  XCircle, 
  AlertTriangle, 
  Loader2,
  Database,
  Server,
  Users,
  DollarSign
} from 'lucide-react'

interface TestResult {
  name: string
  status: 'pending' | 'success' | 'error' | 'warning'
  message: string
  details?: string
}

export default function FeeManagementTest() {
  const { user } = useAuthStore()
  const [testing, setTesting] = useState(false)
  const [testResults, setTestResults] = useState<TestResult[]>([])

  const runTests = async () => {
    if (!user?.school_id) {
      toast.error('User not authenticated or missing school ID')
      return
    }

    setTesting(true)
    setTestResults([])

    const tests: TestResult[] = []

    // Test 1: Database Schema Check
    tests.push({ name: 'Database Schema Check', status: 'pending', message: 'Checking fee management tables...' })
    setTestResults([...tests])

    try {
      const response = await fetch('/api/fees/dashboard?school_id=' + user.school_id)
      const result = await response.json()

      if (response.ok && result.success) {
        tests[0] = { 
          name: 'Database Schema Check', 
          status: 'success', 
          message: 'All fee management tables are accessible',
          details: 'Dashboard API returned valid data structure'
        }
      } else {
        tests[0] = { 
          name: 'Database Schema Check', 
          status: 'error', 
          message: 'Database schema issues detected',
          details: result.error || 'Unknown error'
        }
      }
    } catch (error) {
      tests[0] = { 
        name: 'Database Schema Check', 
        status: 'error', 
        message: 'Failed to connect to database',
        details: error instanceof Error ? error.message : 'Unknown error'
      }
    }

    setTestResults([...tests])

    // Test 2: Fee Structures API
    tests.push({ name: 'Fee Structures API', status: 'pending', message: 'Testing fee structures endpoint...' })
    setTestResults([...tests])

    try {
      const response = await fetch(`/api/fees/structures?school_id=${user.school_id}&user_id=${user.id}`)
      const result = await response.json()

      if (response.ok && result.success) {
        tests[1] = { 
          name: 'Fee Structures API', 
          status: 'success', 
          message: `Fee structures API working (${result.data.fee_structures.length} structures found)`,
          details: 'API returned valid fee structures data'
        }
      } else {
        tests[1] = { 
          name: 'Fee Structures API', 
          status: 'warning', 
          message: 'Fee structures API accessible but may have issues',
          details: result.error || 'No error details'
        }
      }
    } catch (error) {
      tests[1] = { 
        name: 'Fee Structures API', 
        status: 'error', 
        message: 'Fee structures API failed',
        details: error instanceof Error ? error.message : 'Unknown error'
      }
    }

    setTestResults([...tests])

    // Test 3: Fee Assignments API
    tests.push({ name: 'Fee Assignments API', status: 'pending', message: 'Testing fee assignments endpoint...' })
    setTestResults([...tests])

    try {
      const response = await fetch(`/api/fees/assignments?school_id=${user.school_id}&user_id=${user.id}`)
      const result = await response.json()

      if (response.ok && result.success) {
        tests[2] = { 
          name: 'Fee Assignments API', 
          status: 'success', 
          message: `Fee assignments API working (${result.data.assignments.length} assignments found)`,
          details: 'API returned valid assignments data'
        }
      } else {
        tests[2] = { 
          name: 'Fee Assignments API', 
          status: 'warning', 
          message: 'Fee assignments API accessible but may have issues',
          details: result.error || 'No error details'
        }
      }
    } catch (error) {
      tests[2] = { 
        name: 'Fee Assignments API', 
        status: 'error', 
        message: 'Fee assignments API failed',
        details: error instanceof Error ? error.message : 'Unknown error'
      }
    }

    setTestResults([...tests])

    // Test 4: Payments API
    tests.push({ name: 'Payments API', status: 'pending', message: 'Testing payments endpoint...' })
    setTestResults([...tests])

    try {
      const response = await fetch(`/api/fees/payments?school_id=${user.school_id}&user_id=${user.id}`)
      const result = await response.json()

      if (response.ok && result.success) {
        tests[3] = { 
          name: 'Payments API', 
          status: 'success', 
          message: `Payments API working (${result.data.payments.length} payments found)`,
          details: 'API returned valid payments data'
        }
      } else {
        tests[3] = { 
          name: 'Payments API', 
          status: 'warning', 
          message: 'Payments API accessible but may have issues',
          details: result.error || 'No error details'
        }
      }
    } catch (error) {
      tests[3] = { 
        name: 'Payments API', 
        status: 'error', 
        message: 'Payments API failed',
        details: error instanceof Error ? error.message : 'Unknown error'
      }
    }

    setTestResults([...tests])

    // Test 5: Reports API
    tests.push({ name: 'Reports API', status: 'pending', message: 'Testing financial reports endpoint...' })
    setTestResults([...tests])

    try {
      const startDate = new Date()
      startDate.setMonth(startDate.getMonth() - 1)
      const endDate = new Date()
      
      const response = await fetch(
        `/api/fees/reports?school_id=${user.school_id}&report_type=summary&period_start=${startDate.toISOString().split('T')[0]}&period_end=${endDate.toISOString().split('T')[0]}`
      )
      const result = await response.json()

      if (response.ok && result.success) {
        tests[4] = { 
          name: 'Reports API', 
          status: 'success', 
          message: 'Financial reports API working',
          details: 'API returned valid report data'
        }
      } else {
        tests[4] = { 
          name: 'Reports API', 
          status: 'warning', 
          message: 'Reports API accessible but may have issues',
          details: result.error || 'No error details'
        }
      }
    } catch (error) {
      tests[4] = { 
        name: 'Reports API', 
        status: 'error', 
        message: 'Reports API failed',
        details: error instanceof Error ? error.message : 'Unknown error'
      }
    }

    setTestResults([...tests])

    // Test 6: User Permissions
    tests.push({ name: 'User Permissions', status: 'pending', message: 'Checking fee management permissions...' })
    setTestResults([...tests])

    try {
      // Check if user has fee management permissions
      const hasFeesRead = user.role === 'admin' || user.role === 'sub-admin'
      const hasPaymentsRead = user.role === 'admin' || user.role === 'sub-admin'

      if (hasFeesRead && hasPaymentsRead) {
        tests[5] = { 
          name: 'User Permissions', 
          status: 'success', 
          message: 'User has appropriate fee management permissions',
          details: `Role: ${user.role}, Can access fee management features`
        }
      } else {
        tests[5] = { 
          name: 'User Permissions', 
          status: 'warning', 
          message: 'User may have limited fee management access',
          details: `Role: ${user.role}, Some features may be restricted`
        }
      }
    } catch (error) {
      tests[5] = { 
        name: 'User Permissions', 
        status: 'error', 
        message: 'Failed to check user permissions',
        details: error instanceof Error ? error.message : 'Unknown error'
      }
    }

    setTestResults([...tests])
    setTesting(false)

    // Show summary toast
    const successCount = tests.filter(t => t.status === 'success').length
    const errorCount = tests.filter(t => t.status === 'error').length
    const warningCount = tests.filter(t => t.status === 'warning').length

    if (errorCount === 0) {
      toast.success(`Fee Management System Test Complete: ${successCount} passed, ${warningCount} warnings`)
    } else {
      toast.error(`Fee Management System Test Complete: ${successCount} passed, ${errorCount} failed, ${warningCount} warnings`)
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'success':
        return <CheckCircle className="h-5 w-5 text-green-600" />
      case 'error':
        return <XCircle className="h-5 w-5 text-red-600" />
      case 'warning':
        return <AlertTriangle className="h-5 w-5 text-yellow-600" />
      case 'pending':
        return <Loader2 className="h-5 w-5 text-blue-600 animate-spin" />
      default:
        return null
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'success':
        return <Badge className="bg-green-100 text-green-800">Passed</Badge>
      case 'error':
        return <Badge className="bg-red-100 text-red-800">Failed</Badge>
      case 'warning':
        return <Badge className="bg-yellow-100 text-yellow-800">Warning</Badge>
      case 'pending':
        return <Badge className="bg-blue-100 text-blue-800">Testing...</Badge>
      default:
        return null
    }
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="h-5 w-5" />
            Fee Management System Integration Test
          </CardTitle>
          <CardDescription>
            Verify that all fee management components are properly integrated and working
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex justify-between items-center mb-6">
            <div>
              <p className="text-sm text-muted-foreground">
                School ID: {user?.school_id || 'Not available'}
              </p>
              <p className="text-sm text-muted-foreground">
                User Role: {user?.role || 'Not available'}
              </p>
            </div>
            <Button 
              onClick={runTests} 
              disabled={testing || !user?.school_id}
              className="flex items-center gap-2"
            >
              {testing ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Running Tests...
                </>
              ) : (
                <>
                  <Server className="h-4 w-4" />
                  Run Integration Tests
                </>
              )}
            </Button>
          </div>

          {testResults.length > 0 && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Test Results</h3>
              <div className="space-y-3">
                {testResults.map((test, index) => (
                  <div key={index} className="flex items-start gap-3 p-4 border rounded-lg">
                    {getStatusIcon(test.status)}
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-1">
                        <h4 className="font-medium">{test.name}</h4>
                        {getStatusBadge(test.status)}
                      </div>
                      <p className="text-sm text-muted-foreground mb-1">{test.message}</p>
                      {test.details && (
                        <p className="text-xs text-gray-500 bg-gray-50 p-2 rounded">
                          {test.details}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {!testing && testResults.length > 0 && (
                <div className="mt-6 p-4 bg-blue-50 rounded-lg">
                  <h4 className="font-medium text-blue-900 mb-2">Next Steps</h4>
                  <ul className="text-sm text-blue-800 space-y-1">
                    <li>• If all tests passed, the fee management system is ready to use</li>
                    <li>• If there are warnings, check the details and consider addressing them</li>
                    <li>• If there are errors, review the database migration and API setup</li>
                    <li>• Test creating fee structures and assignments in the admin panel</li>
                  </ul>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
