'use client'

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { 
  Users, 
  UserPlus, 
  Calendar, 
  Settings, 
  Edit3,
  Shield,
  CheckCircle,
  AlertCircle
} from 'lucide-react'
import { useClassTeacherPermissions } from '@/hooks/useClassTeacherPermissions'
import { 
  ClassTeacherPermissionGate,
  StudentManagementGate,
  StudentEnrollmentGate,
  TimetableManagementGate,
  ClassManagementGate
} from '@/components/permissions/ClassTeacherPermissionGate'
import { useAuthStore } from '@/lib/store/authStore'

interface ClassTeacherManagementProps {
  classId: string
  className: string
}

export function ClassTeacherManagement({ classId, className }: ClassTeacherManagementProps) {
  const { user } = useAuthStore()
  const {
    assignments,
    isLoading,
    error,
    isClassTeacher,
    canUpdateStudents,
    canEnrollStudents,
    canUpdateTimetable,
    canManageClass,
    getClassAssignment
  } = useClassTeacherPermissions({ classId })

  const [isClassTeacherResult, setIsClassTeacherResult] = useState(false)
  const [permissions, setPermissions] = useState({
    canUpdateStudents: false,
    canEnrollStudents: false,
    canUpdateTimetable: false,
    canManageClass: false
  })

  useEffect(() => {
    const checkPermissions = async () => {
      if (!user?.id) return

      const [
        isClassTeacherRes,
        canUpdateStudentsRes,
        canEnrollStudentsRes,
        canUpdateTimetableRes,
        canManageClassRes
      ] = await Promise.all([
        isClassTeacher(classId),
        canUpdateStudents(classId),
        canEnrollStudents(classId),
        canUpdateTimetable(classId),
        canManageClass(classId)
      ])

      setIsClassTeacherResult(isClassTeacherRes)
      setPermissions({
        canUpdateStudents: canUpdateStudentsRes,
        canEnrollStudents: canEnrollStudentsRes,
        canUpdateTimetable: canUpdateTimetableRes,
        canManageClass: canManageClassRes
      })
    }

    checkPermissions()
  }, [user?.id, classId, isClassTeacher, canUpdateStudents, canEnrollStudents, canUpdateTimetable, canManageClass])

  const classAssignment = getClassAssignment(classId)

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center text-red-600">
            <AlertCircle className="h-5 w-5 mr-2" />
            <span>Error loading class teacher permissions: {error}</span>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* Class Teacher Status */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center">
                <Shield className="h-5 w-5 mr-2" />
                Class Teacher Status
              </CardTitle>
              <CardDescription>
                Your permissions and role for {className}
              </CardDescription>
            </div>
            {isClassTeacherResult && (
              <Badge variant="default" className="bg-blue-100 text-blue-800">
                <CheckCircle className="h-4 w-4 mr-1" />
                Class Teacher
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {isClassTeacherResult ? (
            <div className="space-y-4">
              {classAssignment && (
                <div className="bg-blue-50 p-4 rounded-lg">
                  <h4 className="font-semibold text-blue-900 mb-2">Assignment Details</h4>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-blue-700 font-medium">Academic Year:</span>
                      <span className="ml-2">{classAssignment.academic_year}</span>
                    </div>
                    <div>
                      <span className="text-blue-700 font-medium">Assigned:</span>
                      <span className="ml-2">{new Date(classAssignment.assigned_at).toLocaleDateString()}</span>
                    </div>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="text-center">
                  <div className={`w-12 h-12 mx-auto rounded-full flex items-center justify-center ${
                    permissions.canUpdateStudents ? 'bg-green-100 text-green-600' : 'bg-gray-100 text-gray-400'
                  }`}>
                    <Users className="h-6 w-6" />
                  </div>
                  <p className="text-sm font-medium mt-2">Manage Students</p>
                  <p className="text-xs text-gray-500">
                    {permissions.canUpdateStudents ? 'Allowed' : 'Not Allowed'}
                  </p>
                </div>

                <div className="text-center">
                  <div className={`w-12 h-12 mx-auto rounded-full flex items-center justify-center ${
                    permissions.canEnrollStudents ? 'bg-green-100 text-green-600' : 'bg-gray-100 text-gray-400'
                  }`}>
                    <UserPlus className="h-6 w-6" />
                  </div>
                  <p className="text-sm font-medium mt-2">Enroll Students</p>
                  <p className="text-xs text-gray-500">
                    {permissions.canEnrollStudents ? 'Allowed' : 'Not Allowed'}
                  </p>
                </div>

                <div className="text-center">
                  <div className={`w-12 h-12 mx-auto rounded-full flex items-center justify-center ${
                    permissions.canUpdateTimetable ? 'bg-green-100 text-green-600' : 'bg-gray-100 text-gray-400'
                  }`}>
                    <Calendar className="h-6 w-6" />
                  </div>
                  <p className="text-sm font-medium mt-2">Manage Timetable</p>
                  <p className="text-xs text-gray-500">
                    {permissions.canUpdateTimetable ? 'Allowed' : 'Not Allowed'}
                  </p>
                </div>

                <div className="text-center">
                  <div className={`w-12 h-12 mx-auto rounded-full flex items-center justify-center ${
                    permissions.canManageClass ? 'bg-green-100 text-green-600' : 'bg-gray-100 text-gray-400'
                  }`}>
                    <Settings className="h-6 w-6" />
                  </div>
                  <p className="text-sm font-medium mt-2">Manage Class</p>
                  <p className="text-xs text-gray-500">
                    {permissions.canManageClass ? 'Allowed' : 'Not Allowed'}
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center py-8">
              <div className="w-16 h-16 mx-auto bg-gray-100 rounded-full flex items-center justify-center mb-4">
                <Shield className="h-8 w-8 text-gray-400" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Not a Class Teacher</h3>
              <p className="text-gray-600">
                You are not assigned as a class teacher for {className}
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Class Teacher Actions */}
      <ClassTeacherPermissionGate classId={classId}>
        <Card>
          <CardHeader>
            <CardTitle>Class Teacher Actions</CardTitle>
            <CardDescription>
              Manage your assigned class with enhanced permissions
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="students" className="w-full">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="students">Students</TabsTrigger>
                <TabsTrigger value="timetable">Timetable</TabsTrigger>
                <TabsTrigger value="analytics">Analytics</TabsTrigger>
              </TabsList>

              <TabsContent value="students" className="space-y-4">
                <div className="flex flex-wrap gap-2">
                  <StudentManagementGate classId={classId}>
                    <Button variant="outline" size="sm">
                      <Edit3 className="h-4 w-4 mr-2" />
                      Edit Student Details
                    </Button>
                  </StudentManagementGate>

                  <StudentEnrollmentGate classId={classId}>
                    <Button variant="outline" size="sm">
                      <UserPlus className="h-4 w-4 mr-2" />
                      Enroll New Student
                    </Button>
                  </StudentEnrollmentGate>
                </div>
              </TabsContent>

              <TabsContent value="timetable" className="space-y-4">
                <div className="flex flex-wrap gap-2">
                  <TimetableManagementGate classId={classId}>
                    <Button variant="outline" size="sm">
                      <Calendar className="h-4 w-4 mr-2" />
                      Update Class Schedule
                    </Button>
                  </TimetableManagementGate>

                  <TimetableManagementGate classId={classId}>
                    <Button variant="outline" size="sm">
                      <Users className="h-4 w-4 mr-2" />
                      Assign Teachers
                    </Button>
                  </TimetableManagementGate>
                </div>
              </TabsContent>

              <TabsContent value="analytics" className="space-y-4">
                <div className="flex flex-wrap gap-2">
                  <ClassManagementGate classId={classId}>
                    <Button variant="outline" size="sm">
                      <Settings className="h-4 w-4 mr-2" />
                      View Class Analytics
                    </Button>
                  </ClassManagementGate>
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </ClassTeacherPermissionGate>
    </div>
  )
}
