import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/lib/stores/auth-store'

interface Permission {
  id: string
  name: string
  display_name: string
  description: string
  module: string
  action: string
  is_system_permission: boolean
}

interface UserPermission {
  permission: Permission
  granted: boolean
  source: 'role' | 'direct'
  role_name?: string
}

export function usePermissions() {
  const [permissions, setPermissions] = useState<Permission[]>([])
  const [userPermissions, setUserPermissions] = useState<UserPermission[]>([])
  const [loading, setLoading] = useState(true)
  const { user } = useAuthStore()

  useEffect(() => {
    if (user) {
      fetchUserPermissions()
    }
  }, [user])

  const fetchUserPermissions = async () => {
    if (!user) return

    try {
      setLoading(true)

      // Get all permissions
      const { data: allPermissions, error: permError } = await supabase
        .from('permissions')
        .select('*')
        .order('module', { ascending: true })
        .order('action', { ascending: true })

      if (permError) throw permError
      setPermissions(allPermissions || [])

      // Get user's permissions through roles
      const { data: rolePermissions, error: rolePermError } = await supabase
        .from('profiles')
        .select(`
          role,
          user_roles!inner(
            role:roles!inner(
              name,
              display_name,
              role_permissions!inner(
                granted,
                permission:permissions(*)
              )
            )
          )
        `)
        .eq('id', user.id)

      if (rolePermError) throw rolePermError

      // Also get permissions from legacy role system
      const { data: legacyRolePermissions, error: legacyError } = await supabase
        .from('roles')
        .select(`
          name,
          display_name,
          role_permissions!inner(
            granted,
            permission:permissions(*)
          )
        `)
        .eq('name', user.role)
        .eq('is_system_role', true)

      if (legacyError) throw legacyError

      // Combine and process permissions
      const combinedPermissions: UserPermission[] = []

      // Process legacy role permissions
      if (legacyRolePermissions && legacyRolePermissions.length > 0) {
        const legacyRole = legacyRolePermissions[0]
        legacyRole.role_permissions?.forEach((rp: any) => {
          if (rp.granted && rp.permission) {
            combinedPermissions.push({
              permission: rp.permission,
              granted: true,
              source: 'role',
              role_name: legacyRole.display_name
            })
          }
        })
      }

      // Process custom role permissions
      rolePermissions?.forEach((profile: any) => {
        profile.user_roles?.forEach((ur: any) => {
          ur.role?.role_permissions?.forEach((rp: any) => {
            if (rp.granted && rp.permission) {
              // Check if permission already exists from legacy role
              const existingIndex = combinedPermissions.findIndex(
                cp => cp.permission.id === rp.permission.id
              )
              
              if (existingIndex >= 0) {
                // Update existing permission if custom role grants it
                combinedPermissions[existingIndex] = {
                  permission: rp.permission,
                  granted: true,
                  source: 'role',
                  role_name: ur.role.display_name
                }
              } else {
                // Add new permission
                combinedPermissions.push({
                  permission: rp.permission,
                  granted: true,
                  source: 'role',
                  role_name: ur.role.display_name
                })
              }
            }
          })
        })
      })

      setUserPermissions(combinedPermissions)
    } catch (error) {
      console.error('Error fetching user permissions:', error)
    } finally {
      setLoading(false)
    }
  }

  const hasPermission = (module: string, action: string): boolean => {
    const permissionName = `${module}.${action}`
    return userPermissions.some(
      up => up.permission.name === permissionName && up.granted
    )
  }

  const hasAnyPermission = (permissions: string[]): boolean => {
    return permissions.some(permission => {
      const [module, action] = permission.split('.')
      return hasPermission(module, action)
    })
  }

  const hasAllPermissions = (permissions: string[]): boolean => {
    return permissions.every(permission => {
      const [module, action] = permission.split('.')
      return hasPermission(module, action)
    })
  }

  const getPermissionsByModule = (module: string): UserPermission[] => {
    return userPermissions.filter(up => up.permission.module === module)
  }

  const getGrantedPermissions = (): UserPermission[] => {
    return userPermissions.filter(up => up.granted)
  }

  const getPermissionSource = (module: string, action: string): string | null => {
    const permissionName = `${module}.${action}`
    const userPerm = userPermissions.find(
      up => up.permission.name === permissionName && up.granted
    )
    return userPerm?.role_name || null
  }

  return {
    permissions,
    userPermissions,
    loading,
    hasPermission,
    hasAnyPermission,
    hasAllPermissions,
    getPermissionsByModule,
    getGrantedPermissions,
    getPermissionSource,
    refetch: fetchUserPermissions
  }
}

// Enhanced permission checking hook for components
export function usePermissionCheck() {
  const { hasPermission, hasAnyPermission, hasAllPermissions, loading } = usePermissions()

  const checkPermission = (resource: string, action: string): boolean => {
    if (loading) return false
    return hasPermission(resource, action)
  }

  const checkAnyPermission = (permissions: string[]): boolean => {
    if (loading) return false
    return hasAnyPermission(permissions)
  }

  const checkAllPermissions = (permissions: string[]): boolean => {
    if (loading) return false
    return hasAllPermissions(permissions)
  }

  return {
    checkPermission,
    checkAnyPermission,
    checkAllPermissions,
    loading
  }
}

// Permission-based component wrapper
export function withPermission<T extends object>(
  Component: React.ComponentType<T>,
  requiredPermission: string,
  fallback?: React.ComponentType
) {
  return function PermissionWrapper(props: T) {
    const { checkPermission, loading } = usePermissionCheck()
    const [module, action] = requiredPermission.split('.')

    if (loading) {
      return <div className="animate-pulse bg-gray-200 h-8 w-32 rounded"></div>
    }

    if (!checkPermission(module, action)) {
      if (fallback) {
        const FallbackComponent = fallback
        return <FallbackComponent />
      }
      return null
    }

    return <Component {...props} />
  }
}

// Permission context for conditional rendering
export function PermissionGate({ 
  permission, 
  permissions,
  requireAll = false,
  children, 
  fallback 
}: {
  permission?: string
  permissions?: string[]
  requireAll?: boolean
  children: React.ReactNode
  fallback?: React.ReactNode
}) {
  const { checkPermission, checkAnyPermission, checkAllPermissions, loading } = usePermissionCheck()

  if (loading) {
    return <div className="animate-pulse bg-gray-200 h-8 w-32 rounded"></div>
  }

  let hasAccess = false

  if (permission) {
    const [module, action] = permission.split('.')
    hasAccess = checkPermission(module, action)
  } else if (permissions) {
    hasAccess = requireAll 
      ? checkAllPermissions(permissions)
      : checkAnyPermission(permissions)
  }

  if (!hasAccess) {
    return fallback ? <>{fallback}</> : null
  }

  return <>{children}</>
}
