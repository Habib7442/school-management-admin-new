import React, { useEffect, useState } from 'react'
import { useClassTeacherPermissions } from '@/hooks/useClassTeacherPermissions'
import { type ClassTeacherPermission } from '@/lib/permissions/classTeacherPermissions'

interface ClassTeacherPermissionGateProps {
  classId: string
  permission?: ClassTeacherPermission
  permissions?: ClassTeacherPermission[]
  requireAll?: boolean
  requireClassTeacher?: boolean
  children: React.ReactNode
  fallback?: React.ReactNode
  loadingComponent?: React.ReactNode
}

export function ClassTeacherPermissionGate({
  classId,
  permission,
  permissions,
  requireAll = false,
  requireClassTeacher = true,
  children,
  fallback = null,
  loadingComponent = <div className="animate-pulse bg-gray-200 h-8 w-32 rounded"></div>
}: ClassTeacherPermissionGateProps) {
  const {
    isClassTeacher,
    hasClassTeacherPermission,
    checkMultiplePermissions,
    isLoading
  } = useClassTeacherPermissions({ classId })

  const [hasAccess, setHasAccess] = useState(false)
  const [checking, setChecking] = useState(true)

  useEffect(() => {
    const checkAccess = async () => {
      setChecking(true)

      try {
        // First check if user is class teacher (if required)
        if (requireClassTeacher) {
          const isClassTeacherResult = await isClassTeacher(classId)
          if (!isClassTeacherResult) {
            setHasAccess(false)
            setChecking(false)
            return
          }
        }

        // If no specific permissions required, just being a class teacher is enough
        if (!permission && !permissions) {
          setHasAccess(true)
          setChecking(false)
          return
        }

        // Check single permission
        if (permission) {
          const hasPermission = await hasClassTeacherPermission(permission, classId)
          setHasAccess(hasPermission)
          setChecking(false)
          return
        }

        // Check multiple permissions
        if (permissions && permissions.length > 0) {
          const permissionResults = await checkMultiplePermissions(permissions, classId)
          const hasPermissions = requireAll
            ? permissions.every(p => permissionResults[p])
            : permissions.some(p => permissionResults[p])
          
          setHasAccess(hasPermissions)
          setChecking(false)
          return
        }

        setHasAccess(false)
        setChecking(false)
      } catch (error) {
        console.error('Error checking class teacher permissions:', error)
        setHasAccess(false)
        setChecking(false)
      }
    }

    if (classId) {
      checkAccess()
    } else {
      setHasAccess(false)
      setChecking(false)
    }
  }, [
    classId,
    permission,
    permissions,
    requireAll,
    requireClassTeacher,
    isClassTeacher,
    hasClassTeacherPermission,
    checkMultiplePermissions
  ])

  if (isLoading || checking) {
    return <>{loadingComponent}</>
  }

  if (!hasAccess) {
    return <>{fallback}</>
  }

  return <>{children}</>
}

// Convenience components for common permission checks
export function StudentManagementGate({ 
  classId, 
  children, 
  fallback 
}: { 
  classId: string
  children: React.ReactNode
  fallback?: React.ReactNode 
}) {
  return (
    <ClassTeacherPermissionGate
      classId={classId}
      permissions={['students.update_class_students', 'students.view_class_details']}
      requireAll={false}
      fallback={fallback}
    >
      {children}
    </ClassTeacherPermissionGate>
  )
}

export function StudentEnrollmentGate({ 
  classId, 
  children, 
  fallback 
}: { 
  classId: string
  children: React.ReactNode
  fallback?: React.ReactNode 
}) {
  return (
    <ClassTeacherPermissionGate
      classId={classId}
      permission="students.enroll_to_class"
      fallback={fallback}
    >
      {children}
    </ClassTeacherPermissionGate>
  )
}

export function TimetableManagementGate({ 
  classId, 
  children, 
  fallback 
}: { 
  classId: string
  children: React.ReactNode
  fallback?: React.ReactNode 
}) {
  return (
    <ClassTeacherPermissionGate
      classId={classId}
      permissions={['timetables.update_class_schedule', 'timetables.assign_teachers']}
      requireAll={false}
      fallback={fallback}
    >
      {children}
    </ClassTeacherPermissionGate>
  )
}

export function ClassManagementGate({ 
  classId, 
  children, 
  fallback 
}: { 
  classId: string
  children: React.ReactNode
  fallback?: React.ReactNode 
}) {
  return (
    <ClassTeacherPermissionGate
      classId={classId}
      permission="classes.manage_assigned_class"
      fallback={fallback}
    >
      {children}
    </ClassTeacherPermissionGate>
  )
}

// Hook-based permission checker for conditional logic
export function useClassTeacherPermissionCheck(
  classId: string,
  permission?: ClassTeacherPermission,
  permissions?: ClassTeacherPermission[],
  requireAll = false
) {
  const {
    isClassTeacher,
    hasClassTeacherPermission,
    checkMultiplePermissions
  } = useClassTeacherPermissions({ classId })

  const [hasAccess, setHasAccess] = useState(false)
  const [checking, setChecking] = useState(true)

  useEffect(() => {
    const checkAccess = async () => {
      setChecking(true)

      try {
        const isClassTeacherResult = await isClassTeacher(classId)
        if (!isClassTeacherResult) {
          setHasAccess(false)
          setChecking(false)
          return
        }

        if (!permission && !permissions) {
          setHasAccess(true)
          setChecking(false)
          return
        }

        if (permission) {
          const hasPermission = await hasClassTeacherPermission(permission, classId)
          setHasAccess(hasPermission)
          setChecking(false)
          return
        }

        if (permissions && permissions.length > 0) {
          const permissionResults = await checkMultiplePermissions(permissions, classId)
          const hasPermissions = requireAll
            ? permissions.every(p => permissionResults[p])
            : permissions.some(p => permissionResults[p])
          
          setHasAccess(hasPermissions)
          setChecking(false)
          return
        }

        setHasAccess(false)
        setChecking(false)
      } catch (error) {
        console.error('Error checking permissions:', error)
        setHasAccess(false)
        setChecking(false)
      }
    }

    if (classId) {
      checkAccess()
    } else {
      setHasAccess(false)
      setChecking(false)
    }
  }, [classId, permission, permissions, requireAll, isClassTeacher, hasClassTeacherPermission, checkMultiplePermissions])

  return { hasAccess, checking }
}
