import { supabase } from '@/lib/supabase'
import type { AuthUser } from '@repo/types'

interface SecurityCheck {
  allowed: boolean
  reason?: string
}

interface RoleHierarchy {
  admin: 0
  'sub-admin': 1
  teacher: 2
  student: 3
}

const ROLE_HIERARCHY: RoleHierarchy = {
  admin: 0,
  'sub-admin': 1,
  teacher: 2,
  student: 3
}

/**
 * Security utilities for role management operations
 */
export class RoleManagementSecurity {
  
  /**
   * Check if user can create roles
   */
  static async canCreateRole(user: AuthUser): Promise<SecurityCheck> {
    // Only admins can create custom roles
    if (user.role !== 'admin') {
      return {
        allowed: false,
        reason: 'Only administrators can create custom roles'
      }
    }

    return { allowed: true }
  }

  /**
   * Check if user can edit a specific role
   */
  static async canEditRole(user: AuthUser, roleId: string): Promise<SecurityCheck> {
    try {
      // Get role details
      const { data: role, error } = await supabase
        .from('roles')
        .select('*')
        .eq('id', roleId)
        .single()

      if (error || !role) {
        return {
          allowed: false,
          reason: 'Role not found'
        }
      }

      // System roles can only be edited by admins
      if (role.is_system_role && user.role !== 'admin') {
        return {
          allowed: false,
          reason: 'Only administrators can edit system roles'
        }
      }

      // Custom roles can be edited by admins and the creator
      if (!role.is_system_role) {
        if (user.role === 'admin' || role.created_by === user.id) {
          return { allowed: true }
        }
        return {
          allowed: false,
          reason: 'You can only edit roles you created or be an administrator'
        }
      }

      return { allowed: true }
    } catch (error) {
      return {
        allowed: false,
        reason: 'Error checking role permissions'
      }
    }
  }

  /**
   * Check if user can delete a specific role
   */
  static async canDeleteRole(user: AuthUser, roleId: string): Promise<SecurityCheck> {
    try {
      // Get role details
      const { data: role, error } = await supabase
        .from('roles')
        .select('*')
        .eq('id', roleId)
        .single()

      if (error || !role) {
        return {
          allowed: false,
          reason: 'Role not found'
        }
      }

      // System roles cannot be deleted
      if (role.is_system_role) {
        return {
          allowed: false,
          reason: 'System roles cannot be deleted'
        }
      }

      // Only admins and role creators can delete custom roles
      if (user.role !== 'admin' && role.created_by !== user.id) {
        return {
          allowed: false,
          reason: 'You can only delete roles you created or be an administrator'
        }
      }

      // Check if role is currently assigned to users
      const { data: assignments, error: assignError } = await supabase
        .from('user_roles')
        .select('id')
        .eq('role_id', roleId)
        .eq('is_active', true)
        .limit(1)

      if (assignError) {
        return {
          allowed: false,
          reason: 'Error checking role assignments'
        }
      }

      if (assignments && assignments.length > 0) {
        return {
          allowed: false,
          reason: 'Cannot delete role that is currently assigned to users'
        }
      }

      return { allowed: true }
    } catch (error) {
      return {
        allowed: false,
        reason: 'Error checking role deletion permissions'
      }
    }
  }

  /**
   * Check if user can assign a role to another user
   */
  static async canAssignRole(
    assignerUser: AuthUser, 
    targetUserId: string, 
    roleId: string
  ): Promise<SecurityCheck> {
    try {
      // Get target user and role details
      const [userResult, roleResult] = await Promise.all([
        supabase
          .from('profiles')
          .select('*')
          .eq('id', targetUserId)
          .single(),
        supabase
          .from('roles')
          .select('*')
          .eq('id', roleId)
          .single()
      ])

      if (userResult.error || !userResult.data) {
        return {
          allowed: false,
          reason: 'Target user not found'
        }
      }

      if (roleResult.error || !roleResult.data) {
        return {
          allowed: false,
          reason: 'Role not found'
        }
      }

      const targetUser = userResult.data
      const role = roleResult.data

      // Prevent self-role modification for critical roles
      if (assignerUser.id === targetUserId && 
          (role.name === 'admin' || assignerUser.role === 'admin')) {
        return {
          allowed: false,
          reason: 'You cannot modify your own administrative role'
        }
      }

      // Check hierarchy - users can only assign roles at their level or below
      const assignerLevel = ROLE_HIERARCHY[assignerUser.role as keyof RoleHierarchy] ?? 999
      const roleLevel = role.hierarchy_level

      if (assignerLevel > roleLevel) {
        return {
          allowed: false,
          reason: 'You cannot assign roles with higher privileges than your own'
        }
      }

      // Admins can assign any role
      if (assignerUser.role === 'admin') {
        return { allowed: true }
      }

      // Sub-admins can assign teacher and student roles
      if (assignerUser.role === 'sub-admin' && roleLevel >= 2) {
        return { allowed: true }
      }

      return {
        allowed: false,
        reason: 'Insufficient privileges to assign this role'
      }
    } catch (error) {
      return {
        allowed: false,
        reason: 'Error checking role assignment permissions'
      }
    }
  }

  /**
   * Check if user can revoke a role assignment
   */
  static async canRevokeRoleAssignment(
    user: AuthUser, 
    assignmentId: string
  ): Promise<SecurityCheck> {
    try {
      // Get assignment details
      const { data: assignment, error } = await supabase
        .from('user_roles')
        .select(`
          *,
          user:profiles(*),
          role:roles(*)
        `)
        .eq('id', assignmentId)
        .single()

      if (error || !assignment) {
        return {
          allowed: false,
          reason: 'Role assignment not found'
        }
      }

      // Prevent self-role revocation for admins
      if (user.id === assignment.user_id && 
          (assignment.role.name === 'admin' || user.role === 'admin')) {
        return {
          allowed: false,
          reason: 'You cannot revoke your own administrative role'
        }
      }

      // Admins can revoke any assignment
      if (user.role === 'admin') {
        return { allowed: true }
      }

      // Users can revoke assignments they created
      if (assignment.assigned_by === user.id) {
        return { allowed: true }
      }

      // Sub-admins can revoke non-admin assignments
      if (user.role === 'sub-admin' && assignment.role.hierarchy_level >= 1) {
        return { allowed: true }
      }

      return {
        allowed: false,
        reason: 'Insufficient privileges to revoke this role assignment'
      }
    } catch (error) {
      return {
        allowed: false,
        reason: 'Error checking role revocation permissions'
      }
    }
  }

  /**
   * Check if user can manage permissions for a role
   */
  static async canManageRolePermissions(
    user: AuthUser, 
    roleId: string
  ): Promise<SecurityCheck> {
    try {
      // Get role details
      const { data: role, error } = await supabase
        .from('roles')
        .select('*')
        .eq('id', roleId)
        .single()

      if (error || !role) {
        return {
          allowed: false,
          reason: 'Role not found'
        }
      }

      // Only admins can manage permissions
      if (user.role !== 'admin') {
        return {
          allowed: false,
          reason: 'Only administrators can manage role permissions'
        }
      }

      return { allowed: true }
    } catch (error) {
      return {
        allowed: false,
        reason: 'Error checking permission management access'
      }
    }
  }

  /**
   * Validate role hierarchy constraints
   */
  static validateRoleHierarchy(
    assignerRole: string, 
    targetRole: string
  ): SecurityCheck {
    const assignerLevel = ROLE_HIERARCHY[assignerRole as keyof RoleHierarchy] ?? 999
    const targetLevel = ROLE_HIERARCHY[targetRole as keyof RoleHierarchy] ?? 999

    if (assignerLevel > targetLevel) {
      return {
        allowed: false,
        reason: 'Cannot assign roles with higher privileges than your own'
      }
    }

    return { allowed: true }
  }

  /**
   * Check if operation would create security vulnerabilities
   */
  static async validateSecurityConstraints(
    operation: 'create' | 'edit' | 'delete' | 'assign' | 'revoke',
    user: AuthUser,
    data: any
  ): Promise<SecurityCheck> {
    // Prevent privilege escalation
    if (operation === 'assign' && data.roleId) {
      const roleCheck = await this.canAssignRole(user, data.targetUserId, data.roleId)
      if (!roleCheck.allowed) {
        return roleCheck
      }
    }

    // Prevent system disruption
    if (operation === 'delete' && data.roleId) {
      const deleteCheck = await this.canDeleteRole(user, data.roleId)
      if (!deleteCheck.allowed) {
        return deleteCheck
      }
    }

    return { allowed: true }
  }
}
