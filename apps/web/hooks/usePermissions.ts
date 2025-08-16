import { useMemo } from 'react'
import { useAuth } from './useAuth'
import type { UserRole } from '@repo/types'

interface PermissionCheck {
  resource: string
  action: string
}

interface ConditionalPermissionCheck extends PermissionCheck {
  condition?: boolean
}

export function usePermissions() {
  const { user, hasPermission } = useAuth()

  // Memoized permission checks for common operations
  const permissions = useMemo(() => {
    if (!user) {
      return {
        canViewUsers: false,
        canCreateUsers: false,
        canUpdateUsers: false,
        canDeleteUsers: false,
        canViewClasses: false,
        canCreateClasses: false,
        canUpdateClasses: false,
        canDeleteClasses: false,
        canViewReports: false,
        canCreateReports: false,
        canUpdateReports: false,
        canDeleteReports: false,
        canViewSettings: false,
        canUpdateSettings: false,
        canManageRoles: false,
        isAdmin: false,
        isSubAdmin: false,
        isTeacher: false,
        isStudent: false
      }
    }

    return {
      // User permissions
      canViewUsers: hasPermission('users', 'read'),
      canCreateUsers: hasPermission('users', 'create'),
      canUpdateUsers: hasPermission('users', 'update'),
      canDeleteUsers: hasPermission('users', 'delete'),

      // Class permissions
      canViewClasses: hasPermission('classes', 'read'),
      canCreateClasses: hasPermission('classes', 'create'),
      canUpdateClasses: hasPermission('classes', 'update'),
      canDeleteClasses: hasPermission('classes', 'delete'),

      // Report permissions
      canViewReports: hasPermission('reports', 'read'),
      canCreateReports: hasPermission('reports', 'create'),
      canUpdateReports: hasPermission('reports', 'update'),
      canDeleteReports: hasPermission('reports', 'delete'),

      // Settings permissions
      canViewSettings: hasPermission('settings', 'read'),
      canUpdateSettings: hasPermission('settings', 'update'),

      // Role permissions
      canManageRoles: hasPermission('roles', 'read'),

      // Timetable permissions
      canViewTimetables: hasPermission('timetables', 'read'),
      canCreateTimetables: hasPermission('timetables', 'create'),
      canUpdateTimetables: hasPermission('timetables', 'update'),
      canDeleteTimetables: hasPermission('timetables', 'delete'),
      canManageTimetables: hasPermission('timetables', 'manage'),

      // Library permissions
      canViewLibrary: hasPermission('library', 'read'),
      canCreateLibraryItems: hasPermission('library', 'create'),
      canUpdateLibraryItems: hasPermission('library', 'update'),
      canDeleteLibraryItems: hasPermission('library', 'delete'),
      canManageLibrary: hasPermission('library', 'manage'),

      // Role checks
      isAdmin: user.role === 'admin',
      isSubAdmin: user.role === 'sub-admin',
      isTeacher: user.role === 'teacher',
      isStudent: user.role === 'student'
    }
  }, [user, hasPermission])

  // Check multiple permissions at once
  const checkMultiplePermissions = (checks: PermissionCheck[]) => {
    return checks.every(check => hasPermission(check.resource, check.action))
  }

  // Check if user has any of the specified permissions
  const hasAnyPermission = (checks: PermissionCheck[]) => {
    return checks.some(check => hasPermission(check.resource, check.action))
  }

  // Check conditional permissions
  const checkConditionalPermissions = (checks: ConditionalPermissionCheck[]) => {
    return checks.every(check => {
      if (check.condition === false) return true
      return hasPermission(check.resource, check.action)
    })
  }

  // Check if user can access a specific route
  const canAccessRoute = (route: string) => {
    const routePermissions: Record<string, PermissionCheck[]> = {
      '/admin': [{ resource: 'dashboard', action: 'read' }],
      '/admin/admissions': [{ resource: 'admissions', action: 'read' }],
      '/admin/users': [{ resource: 'users', action: 'read' }],
      '/admin/students': [{ resource: 'students', action: 'read' }],
      '/admin/attendance': [{ resource: 'attendance', action: 'read' }],
      '/admin/examinations': [{ resource: 'examinations', action: 'read' }],
      '/admin/classes': [{ resource: 'classes', action: 'read' }],
      '/admin/timetables': [{ resource: 'timetables', action: 'read' }],
      '/admin/library': [{ resource: 'library', action: 'read' }],
      '/admin/fees': [{ resource: 'fees', action: 'read' }],
      '/admin/reports': [{ resource: 'reports', action: 'read' }],
      '/admin/settings': [{ resource: 'settings', action: 'read' }],
      '/admin/roles': [{ resource: 'roles', action: 'read' }]
    }

    const requiredPermissions = routePermissions[route]
    if (!requiredPermissions) return true

    return checkMultiplePermissions(requiredPermissions)
  }

  // Check if user can perform an action on a specific resource
  const canPerformAction = (resource: string, action: string, ownerId?: string) => {
    // Check basic permission
    if (!hasPermission(resource, action)) return false

    // If there's an owner check and user is not admin/sub-admin
    if (ownerId && !permissions.isAdmin && !permissions.isSubAdmin) {
      // For teachers, they can only modify their own resources
      if (permissions.isTeacher && user?.id !== ownerId) return false
      // For students, they can only modify their own resources
      if (permissions.isStudent && user?.id !== ownerId) return false
    }

    return true
  }

  // Get user's role hierarchy level (higher number = more permissions)
  const getRoleLevel = (role: UserRole) => {
    const levels = {
      student: 1,
      teacher: 2,
      'sub-admin': 3,
      admin: 4
    }
    return levels[role] || 0
  }

  // Check if user has higher or equal role level
  const hasRoleLevel = (requiredRole: UserRole) => {
    if (!user) return false
    return getRoleLevel(user.role) >= getRoleLevel(requiredRole)
  }

  // Get filtered navigation items based on permissions
  const getFilteredNavigation = (navigationItems: any[]) => {
    return navigationItems.filter(item => {
      if (item.permission) {
        return hasPermission(item.permission.resource, item.permission.action)
      }
      if (item.requiredRole) {
        return hasRoleLevel(item.requiredRole)
      }
      return true
    })
  }

  // Permission-based component wrapper
  const withPermission = (
    component: React.ReactNode,
    resource: string,
    action: string,
    fallback?: React.ReactNode
  ) => {
    return hasPermission(resource, action) ? component : (fallback || null)
  }

  // Role-based component wrapper
  const withRole = (
    component: React.ReactNode,
    requiredRole: UserRole | UserRole[],
    fallback?: React.ReactNode
  ) => {
    const allowedRoles = Array.isArray(requiredRole) ? requiredRole : [requiredRole]
    const hasRole = user && allowedRoles.includes(user.role)
    return hasRole ? component : (fallback || null)
  }

  return {
    // Computed permissions
    ...permissions,

    // Permission checking functions
    hasPermission,
    checkMultiplePermissions,
    hasAnyPermission,
    checkConditionalPermissions,
    canAccessRoute,
    canPerformAction,

    // Role checking functions
    hasRoleLevel,
    getRoleLevel,

    // Utility functions
    getFilteredNavigation,
    withPermission,
    withRole,

    // Current user info
    currentUser: user,
    currentRole: user?.role
  }
}
