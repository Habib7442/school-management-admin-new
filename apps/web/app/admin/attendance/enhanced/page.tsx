'use client'

import { AdminLayout } from '@/components/admin/AdminLayout'
import EnhancedAttendanceRegistry from '@/components/admin/EnhancedAttendanceRegistry'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { 
  Users, 
  Calendar, 
  TrendingUp, 
  Clock,
  CheckCircle,
  XCircle,
  BarChart3,
  ArrowLeft
} from 'lucide-react'
import Link from 'next/link'

export default function EnhancedAttendancePage() {
  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Link href="/admin/attendance">
              <Button variant="outline" size="sm">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Attendance
              </Button>
            </Link>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Enhanced Attendance Registry</h1>
              <p className="text-gray-600 mt-1">
                Simple tabular attendance marking system - like a traditional school registry
              </p>
            </div>
          </div>
        </div>

        {/* Features Overview */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <Users className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-900">Simple Registry</p>
                  <p className="text-xs text-gray-600">Traditional school format</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-green-100 rounded-lg">
                  <CheckCircle className="h-5 w-5 text-green-600" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-900">Quick Actions</p>
                  <p className="text-xs text-gray-600">Mark all present/absent</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-purple-100 rounded-lg">
                  <Clock className="h-5 w-5 text-purple-600" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-900">Real-time Stats</p>
                  <p className="text-xs text-gray-600">Live attendance counts</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-orange-100 rounded-lg">
                  <BarChart3 className="h-5 w-5 text-orange-600" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-900">Visual Feedback</p>
                  <p className="text-xs text-gray-600">Color-coded status</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Instructions */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Calendar className="h-5 w-5 mr-2" />
              How to Use the Enhanced Attendance Registry
            </CardTitle>
            <CardDescription>
              Follow these simple steps to mark attendance efficiently
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="text-center">
                <div className="w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center mx-auto mb-2 text-sm font-bold">
                  1
                </div>
                <h4 className="font-medium text-gray-900 mb-1">Select Class</h4>
                <p className="text-xs text-gray-600">Choose the class for attendance</p>
              </div>
              
              <div className="text-center">
                <div className="w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center mx-auto mb-2 text-sm font-bold">
                  2
                </div>
                <h4 className="font-medium text-gray-900 mb-1">Set Date</h4>
                <p className="text-xs text-gray-600">Select the attendance date</p>
              </div>
              
              <div className="text-center">
                <div className="w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center mx-auto mb-2 text-sm font-bold">
                  3
                </div>
                <h4 className="font-medium text-gray-900 mb-1">Mark Attendance</h4>
                <p className="text-xs text-gray-600">Check present or absent for each student</p>
              </div>
              
              <div className="text-center">
                <div className="w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center mx-auto mb-2 text-sm font-bold">
                  4
                </div>
                <h4 className="font-medium text-gray-900 mb-1">Save</h4>
                <p className="text-xs text-gray-600">Save the attendance record</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Key Features */}
        <Card>
          <CardHeader>
            <CardTitle>Key Features</CardTitle>
            <CardDescription>
              Enhanced features for efficient attendance management
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-3">
                <div className="flex items-start space-x-3">
                  <CheckCircle className="h-5 w-5 text-green-600 mt-0.5" />
                  <div>
                    <h4 className="font-medium text-gray-900">Traditional Registry Format</h4>
                    <p className="text-sm text-gray-600">Familiar tabular layout like paper attendance registers</p>
                  </div>
                </div>
                
                <div className="flex items-start space-x-3">
                  <CheckCircle className="h-5 w-5 text-green-600 mt-0.5" />
                  <div>
                    <h4 className="font-medium text-gray-900">Quick Bulk Actions</h4>
                    <p className="text-sm text-gray-600">Mark all students present or absent with one click</p>
                  </div>
                </div>
                
                <div className="flex items-start space-x-3">
                  <CheckCircle className="h-5 w-5 text-green-600 mt-0.5" />
                  <div>
                    <h4 className="font-medium text-gray-900">Real-time Statistics</h4>
                    <p className="text-sm text-gray-600">Live count of present, absent, and unmarked students</p>
                  </div>
                </div>
              </div>
              
              <div className="space-y-3">
                <div className="flex items-start space-x-3">
                  <CheckCircle className="h-5 w-5 text-green-600 mt-0.5" />
                  <div>
                    <h4 className="font-medium text-gray-900">Visual Status Indicators</h4>
                    <p className="text-sm text-gray-600">Color-coded rows and icons for easy identification</p>
                  </div>
                </div>
                
                <div className="flex items-start space-x-3">
                  <CheckCircle className="h-5 w-5 text-green-600 mt-0.5" />
                  <div>
                    <h4 className="font-medium text-gray-900">Search & Filter</h4>
                    <p className="text-sm text-gray-600">Find students by name, roll number, or admission number</p>
                  </div>
                </div>
                
                <div className="flex items-start space-x-3">
                  <CheckCircle className="h-5 w-5 text-green-600 mt-0.5" />
                  <div>
                    <h4 className="font-medium text-gray-900">Edit Previous Records</h4>
                    <p className="text-sm text-gray-600">Update attendance for previous dates when needed</p>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Enhanced Attendance Registry Component */}
        <EnhancedAttendanceRegistry />
      </div>
    </AdminLayout>
  )
}
