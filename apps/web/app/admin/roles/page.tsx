'use client'

import { useState, useEffect } from 'react'
import AdminLayout from '@/components/admin/AdminLayout'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/lib/stores/auth-store'
import { toast } from 'sonner'
import { Search, Plus, Edit, Trash2, Users, Shield, Settings, UserCheck } from 'lucide-react'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog'
import { UserRoleAssignmentModal } from '@/components/admin/UserRoleAssignment'

// Types for role management
interface Role {
  id: string
  name: string
  display_name: string
  description: string
  is_system_role: boolean
  is_active: boolean
  hierarchy_level: number
  school_id: string | null
  created_by: string | null
  created_at: string
  updated_at: string
  _count?: {
    user_roles: number
    role_permissions: number
  }
  _permissions?: {
    count: number
  }
}

interface Permission {
  id: string
  name: string
  display_name: string
  description: string
  module: string
  action: string
  is_system_permission: boolean
}

interface RolePermission {
  id: string
  role_id: string
  permission_id: string
  granted: boolean
  permission: Permission
}

export default function RoleManagement() {
  const [roles, setRoles] = useState<Role[]>([])
  const [permissions, setPermissions] = useState<Permission[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [showPermissionModal, setShowPermissionModal] = useState(false)
  const [showUserAssignmentModal, setShowUserAssignmentModal] = useState(false)
  const [selectedRole, setSelectedRole] = useState<Role | null>(null)
  const [deletingRole, setDeletingRole] = useState<Role | null>(null)
  const { checkPermission, user } = useAuthStore()

  // Check if user has access to role management
  useEffect(() => {
    if (!checkPermission('roles', 'read')) {
      toast.error('Access denied', {
        description: 'You do not have permission to access role management.',
        duration: 5000
      })
      return
    }
    fetchRoles()
    fetchPermissions()
  }, [])

  const fetchRoles = async () => {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('roles')
        .select(`
          *
        `)
        .order('hierarchy_level', { ascending: true })

      if (error) throw error

      // Get user counts and permission counts separately to avoid relationship issues
      const rolesWithCounts = await Promise.all((data || []).map(async (role) => {
        // Get user count for this role
        const { count: userCount } = await supabase
          .from('user_roles')
          .select('*', { count: 'exact', head: true })
          .eq('role_id', role.id)
          .eq('is_active', true)

        // Get permission count for this role
        const { count: permissionCount } = await supabase
          .from('role_permissions')
          .select('*', { count: 'exact', head: true })
          .eq('role_id', role.id)
          .eq('granted', true)

        return {
          ...role,
          _count: { user_roles: userCount || 0 },
          _permissions: { count: permissionCount || 0 }
        }
      }))

      setRoles(rolesWithCounts)
    } catch (error) {
      console.error('Error fetching roles:', error)
      toast.error('Failed to load roles', {
        description: error instanceof Error ? error.message : 'Unknown error occurred',
        duration: 5000
      })
    } finally {
      setLoading(false)
    }
  }

  const fetchPermissions = async () => {
    try {
      const { data, error } = await supabase
        .from('permissions')
        .select('*')
        .order('module', { ascending: true })
        .order('action', { ascending: true })

      if (error) throw error
      setPermissions(data || [])
    } catch (error) {
      console.error('Error fetching permissions:', error)
      toast.error('Failed to load permissions')
    }
  }

  const handleCreateRole = () => {
    if (!checkPermission('roles', 'create')) {
      toast.error('Access denied', {
        description: 'You do not have permission to create roles.',
        duration: 3000
      })
      return
    }
    setShowCreateModal(true)
  }

  const handleEditRole = (role: Role) => {
    if (!checkPermission('roles', 'update')) {
      toast.error('Access denied', {
        description: 'You do not have permission to edit roles.',
        duration: 3000
      })
      return
    }
    setSelectedRole(role)
    setShowEditModal(true)
  }

  const handleManagePermissions = (role: Role) => {
    if (!checkPermission('roles', 'update')) {
      toast.error('Access denied', {
        description: 'You do not have permission to manage role permissions.',
        duration: 3000
      })
      return
    }
    setSelectedRole(role)
    setShowPermissionModal(true)
  }

  const handleDeleteRole = async () => {
    if (!deletingRole) return

    if (!checkPermission('roles', 'delete')) {
      toast.error('Access denied', {
        description: 'You do not have permission to delete roles.',
        duration: 3000
      })
      return
    }

    if (deletingRole.is_system_role) {
      toast.error('Cannot delete system role', {
        description: 'System roles cannot be deleted.',
        duration: 3000
      })
      return
    }

    try {
      const { error } = await supabase
        .from('roles')
        .delete()
        .eq('id', deletingRole.id)

      if (error) throw error

      toast.success('Role deleted successfully', {
        description: `The role "${deletingRole.display_name}" has been removed.`,
        duration: 3000
      })

      await fetchRoles()
      setDeletingRole(null)
    } catch (error) {
      console.error('Error deleting role:', error)
      toast.error('Failed to delete role', {
        description: error instanceof Error ? error.message : 'Unknown error occurred',
        duration: 5000
      })
      setDeletingRole(null)
    }
  }

  const filteredRoles = roles.filter(role =>
    role.display_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    role.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    role.description?.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const getRoleTypeColor = (role: Role) => {
    if (role.is_system_role) {
      return 'bg-blue-100 text-blue-800'
    }
    return 'bg-green-100 text-green-800'
  }

  const getHierarchyColor = (level: number) => {
    const colors = [
      'bg-red-100 text-red-800',     // 0 - Admin
      'bg-orange-100 text-orange-800', // 1 - Sub-admin
      'bg-yellow-100 text-yellow-800', // 2 - Teacher
      'bg-green-100 text-green-800',   // 3 - Student
      'bg-gray-100 text-gray-800'      // 4+ - Custom
    ]
    return colors[level] || colors[4]
  }

  if (loading) {
    return (
      <AdminLayout title="Role Management">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      </AdminLayout>
    )
  }

  return (
    <AdminLayout title="Role Management">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <p className="text-gray-600">Manage roles and permissions for your school</p>
          </div>
          <div className="flex items-center space-x-2">
            {checkPermission('users', 'update') && (
              <Button
                onClick={() => setShowUserAssignmentModal(true)}
                variant="outline"
                className="flex items-center space-x-2"
              >
                <UserCheck className="h-4 w-4" />
                <span>Assign Users</span>
              </Button>
            )}
            {checkPermission('roles', 'create') && (
              <Button onClick={handleCreateRole} className="flex items-center space-x-2">
                <Plus className="h-4 w-4" />
                <span>Create Role</span>
              </Button>
            )}
          </div>
        </div>

        {/* Search and Filters */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center space-x-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  placeholder="Search roles..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Button variant="outline" onClick={fetchRoles}>
                Refresh
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Roles Summary */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center space-x-2">
                <Shield className="h-8 w-8 text-blue-600" />
                <div>
                  <p className="text-2xl font-bold">{roles.length}</p>
                  <p className="text-sm text-gray-600">Total Roles</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center space-x-2">
                <Settings className="h-8 w-8 text-green-600" />
                <div>
                  <p className="text-2xl font-bold">{roles.filter(r => r.is_system_role).length}</p>
                  <p className="text-sm text-gray-600">System Roles</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center space-x-2">
                <Users className="h-8 w-8 text-purple-600" />
                <div>
                  <p className="text-2xl font-bold">{roles.filter(r => !r.is_system_role).length}</p>
                  <p className="text-sm text-gray-600">Custom Roles</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center space-x-2">
                <Shield className="h-8 w-8 text-orange-600" />
                <div>
                  <p className="text-2xl font-bold">{permissions.length}</p>
                  <p className="text-sm text-gray-600">Permissions</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Roles Table */}
        <Card>
          <CardHeader>
            <CardTitle>Roles ({filteredRoles.length})</CardTitle>
            <CardDescription>Manage system and custom roles</CardDescription>
          </CardHeader>
          <CardContent>
            {filteredRoles.length === 0 ? (
              <div className="text-center py-8">
                <Shield className="mx-auto h-12 w-12 text-gray-400" />
                <h3 className="mt-2 text-sm font-medium text-gray-900">No roles found</h3>
                <p className="mt-1 text-sm text-gray-500">
                  {searchTerm ? 'Try adjusting your search criteria.' : 'Get started by creating a new role.'}
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-200">
                      <th className="text-left py-3 px-4 font-medium text-gray-600">Role</th>
                      <th className="text-left py-3 px-4 font-medium text-gray-600">Type</th>
                      <th className="text-left py-3 px-4 font-medium text-gray-600">Hierarchy</th>
                      <th className="text-left py-3 px-4 font-medium text-gray-600">Permissions</th>
                      <th className="text-left py-3 px-4 font-medium text-gray-600">Users</th>
                      <th className="text-left py-3 px-4 font-medium text-gray-600">Status</th>
                      <th className="text-left py-3 px-4 font-medium text-gray-600">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredRoles.map((role) => (
                      <tr key={role.id} className="border-b border-gray-100 hover:bg-gray-50">
                        <td className="py-3 px-4">
                          <div>
                            <div className="font-medium text-gray-900">{role.display_name}</div>
                            <div className="text-sm text-gray-500">{role.name}</div>
                            {role.description && (
                              <div className="text-sm text-gray-400 mt-1">{role.description}</div>
                            )}
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getRoleTypeColor(role)}`}>
                            {role.is_system_role ? 'System' : 'Custom'}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getHierarchyColor(role.hierarchy_level)}`}>
                            Level {role.hierarchy_level}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-sm text-gray-500">
                          {role._permissions?.count || 0} permissions
                        </td>
                        <td className="py-3 px-4 text-sm text-gray-500">
                          {role._count?.user_roles || 0} users
                        </td>
                        <td className="py-3 px-4">
                          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                            role.is_active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                          }`}>
                            {role.is_active ? 'Active' : 'Inactive'}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex items-center space-x-2">
                            {checkPermission('roles', 'update') && (
                              <>
                                <Button
                                  onClick={() => handleEditRole(role)}
                                  variant="outline"
                                  size="sm"
                                  className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                                >
                                  <Edit className="h-4 w-4" />
                                </Button>
                                <Button
                                  onClick={() => handleManagePermissions(role)}
                                  variant="outline"
                                  size="sm"
                                  className="text-green-600 hover:text-green-700 hover:bg-green-50"
                                >
                                  <Shield className="h-4 w-4" />
                                </Button>
                              </>
                            )}
                            {checkPermission('roles', 'delete') && !role.is_system_role && (
                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    className="text-red-600 hover:text-red-700 hover:bg-red-50"
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                  <AlertDialogHeader>
                                    <AlertDialogTitle>Delete Role</AlertDialogTitle>
                                    <AlertDialogDescription>
                                      Are you sure you want to delete the role "{role.display_name}"? This action cannot be undone.
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                                    <AlertDialogAction
                                      onClick={() => {
                                        setDeletingRole(role)
                                        handleDeleteRole()
                                      }}
                                      className="bg-red-600 hover:bg-red-700"
                                    >
                                      Delete
                                    </AlertDialogAction>
                                  </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Modals */}
        {showCreateModal && (
          <CreateRoleModal
            onClose={() => setShowCreateModal(false)}
            onRoleCreated={fetchRoles}
            permissions={permissions}
          />
        )}

        {showEditModal && selectedRole && (
          <EditRoleModal
            role={selectedRole}
            onClose={() => {
              setShowEditModal(false)
              setSelectedRole(null)
            }}
            onRoleUpdated={fetchRoles}
          />
        )}

        {showPermissionModal && selectedRole && (
          <PermissionManagementModal
            role={selectedRole}
            permissions={permissions}
            onClose={() => {
              setShowPermissionModal(false)
              setSelectedRole(null)
            }}
            onPermissionsUpdated={fetchRoles}
          />
        )}

        {showUserAssignmentModal && (
          <UserRoleAssignmentModal
            onClose={() => setShowUserAssignmentModal(false)}
            onAssignmentsUpdated={fetchRoles}
          />
        )}
      </div>
    </AdminLayout>
  )
}

// Create Role Modal Component
function CreateRoleModal({
  onClose,
  onRoleCreated,
  permissions
}: {
  onClose: () => void
  onRoleCreated: () => void
  permissions: Permission[]
}) {
  const [formData, setFormData] = useState({
    name: '',
    display_name: '',
    description: '',
    hierarchy_level: 4,
    is_active: true
  })
  const [selectedPermissions, setSelectedPermissions] = useState<string[]>([])
  const [loading, setLoading] = useState(false)
  const { user } = useAuthStore()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!formData.name.trim() || !formData.display_name.trim()) {
      toast.error('Please fill in all required fields')
      return
    }

    // Validate role name format (lowercase, no spaces)
    const roleNameRegex = /^[a-z0-9-_]+$/
    if (!roleNameRegex.test(formData.name)) {
      toast.error('Role name must be lowercase letters, numbers, hyphens, and underscores only')
      return
    }

    setLoading(true)

    try {
      // Create the role
      const { data: roleData, error: roleError } = await supabase
        .from('roles')
        .insert({
          name: formData.name.trim(),
          display_name: formData.display_name.trim(),
          description: formData.description.trim() || null,
          hierarchy_level: formData.hierarchy_level,
          is_active: formData.is_active,
          is_system_role: false,
          school_id: user?.school_id || null,
          created_by: user?.id
        })
        .select()
        .single()

      if (roleError) throw roleError

      // Assign selected permissions
      if (selectedPermissions.length > 0) {
        const permissionAssignments = selectedPermissions.map(permissionId => ({
          role_id: roleData.id,
          permission_id: permissionId,
          granted: true
        }))

        const { error: permissionError } = await supabase
          .from('role_permissions')
          .insert(permissionAssignments)

        if (permissionError) throw permissionError
      }

      toast.success('Role created successfully', {
        description: `The role "${formData.display_name}" has been created.`,
        duration: 3000
      })

      await onRoleCreated()
      onClose()
    } catch (error) {
      console.error('Error creating role:', error)
      toast.error('Failed to create role', {
        description: error instanceof Error ? error.message : 'Unknown error occurred',
        duration: 5000
      })
    } finally {
      setLoading(false)
    }
  }

  const togglePermission = (permissionId: string) => {
    setSelectedPermissions(prev =>
      prev.includes(permissionId)
        ? prev.filter(id => id !== permissionId)
        : [...prev, permissionId]
    )
  }

  const groupedPermissions = permissions.reduce((acc, permission) => {
    if (!acc[permission.module]) {
      acc[permission.module] = []
    }
    acc[permission.module].push(permission)
    return acc
  }, {} as Record<string, Permission[]>)

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <Card className="w-full max-w-4xl mx-4 max-h-[90vh] overflow-y-auto">
        <CardHeader>
          <CardTitle>Create New Role</CardTitle>
          <CardDescription>Create a custom role with specific permissions</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Basic Information */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-900 border-b pb-2">Basic Information</h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="role-name">Role Name *</Label>
                  <Input
                    id="role-name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value.toLowerCase().replace(/\s+/g, '-') })}
                    placeholder="e.g., custom-teacher"
                    required
                  />
                  <p className="text-xs text-gray-500">Lowercase letters, numbers, hyphens, and underscores only</p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="display-name">Display Name *</Label>
                  <Input
                    id="display-name"
                    value={formData.display_name}
                    onChange={(e) => setFormData({ ...formData, display_name: e.target.value })}
                    placeholder="e.g., Custom Teacher"
                    required
                  />
                </div>

                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="description">Description</Label>
                  <Input
                    id="description"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Describe the role's purpose and responsibilities"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="hierarchy-level">Hierarchy Level</Label>
                  <select
                    id="hierarchy-level"
                    value={formData.hierarchy_level}
                    onChange={(e) => setFormData({ ...formData, hierarchy_level: parseInt(e.target.value) })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value={1}>Level 1 (Sub-Admin level)</option>
                    <option value={2}>Level 2 (Teacher level)</option>
                    <option value={3}>Level 3 (Student level)</option>
                    <option value={4}>Level 4 (Custom level)</option>
                    <option value={5}>Level 5 (Restricted level)</option>
                  </select>
                </div>

                <div className="space-y-2">
                  <Label>Status</Label>
                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id="is-active"
                      checked={formData.is_active}
                      onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                      className="rounded border-gray-300"
                    />
                    <Label htmlFor="is-active">Active</Label>
                  </div>
                </div>
              </div>
            </div>

            {/* Permissions */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-900 border-b pb-2">Permissions</h3>

              <div className="space-y-4">
                {Object.entries(groupedPermissions).map(([module, modulePermissions]) => (
                  <div key={module} className="border rounded-lg p-4">
                    <h4 className="font-medium text-gray-900 mb-3 capitalize">{module} Module</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                      {modulePermissions.map((permission) => (
                        <div key={permission.id} className="flex items-center space-x-2">
                          <input
                            type="checkbox"
                            id={`perm-${permission.id}`}
                            checked={selectedPermissions.includes(permission.id)}
                            onChange={() => togglePermission(permission.id)}
                            className="rounded border-gray-300"
                          />
                          <Label htmlFor={`perm-${permission.id}`} className="text-sm">
                            {permission.display_name}
                          </Label>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex justify-end space-x-2 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
                disabled={loading}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={loading || !formData.name.trim() || !formData.display_name.trim()}
                className="min-w-[120px]"
              >
                {loading ? (
                  <div className="flex items-center space-x-2">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    <span>Creating...</span>
                  </div>
                ) : (
                  'Create Role'
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}

// Edit Role Modal Component
function EditRoleModal({
  role,
  onClose,
  onRoleUpdated
}: {
  role: Role
  onClose: () => void
  onRoleUpdated: () => void
}) {
  const [formData, setFormData] = useState({
    display_name: role.display_name,
    description: role.description || '',
    hierarchy_level: role.hierarchy_level,
    is_active: role.is_active
  })
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!formData.display_name.trim()) {
      toast.error('Please enter a display name')
      return
    }

    setLoading(true)

    try {
      const { error } = await supabase
        .from('roles')
        .update({
          display_name: formData.display_name.trim(),
          description: formData.description.trim() || null,
          hierarchy_level: formData.hierarchy_level,
          is_active: formData.is_active,
          updated_at: new Date().toISOString()
        })
        .eq('id', role.id)

      if (error) throw error

      toast.success('Role updated successfully', {
        description: `The role "${formData.display_name}" has been updated.`,
        duration: 3000
      })

      await onRoleUpdated()
      onClose()
    } catch (error) {
      console.error('Error updating role:', error)
      toast.error('Failed to update role', {
        description: error instanceof Error ? error.message : 'Unknown error occurred',
        duration: 5000
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <Card className="w-full max-w-md mx-4">
        <CardHeader>
          <CardTitle>Edit Role</CardTitle>
          <CardDescription>Update role information</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="edit-display-name">Display Name *</Label>
              <Input
                id="edit-display-name"
                value={formData.display_name}
                onChange={(e) => setFormData({ ...formData, display_name: e.target.value })}
                placeholder="Enter display name"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-description">Description</Label>
              <Input
                id="edit-description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Describe the role's purpose"
              />
            </div>

            {!role.is_system_role && (
              <div className="space-y-2">
                <Label htmlFor="edit-hierarchy-level">Hierarchy Level</Label>
                <select
                  id="edit-hierarchy-level"
                  value={formData.hierarchy_level}
                  onChange={(e) => setFormData({ ...formData, hierarchy_level: parseInt(e.target.value) })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value={1}>Level 1 (Sub-Admin level)</option>
                  <option value={2}>Level 2 (Teacher level)</option>
                  <option value={3}>Level 3 (Student level)</option>
                  <option value={4}>Level 4 (Custom level)</option>
                  <option value={5}>Level 5 (Restricted level)</option>
                </select>
              </div>
            )}

            <div className="space-y-2">
              <Label>Status</Label>
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="edit-is-active"
                  checked={formData.is_active}
                  onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                  className="rounded border-gray-300"
                />
                <Label htmlFor="edit-is-active">Active</Label>
              </div>
            </div>

            <div className="flex justify-end space-x-2 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
                disabled={loading}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={loading || !formData.display_name.trim()}
                className="min-w-[120px]"
              >
                {loading ? (
                  <div className="flex items-center space-x-2">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    <span>Updating...</span>
                  </div>
                ) : (
                  'Update Role'
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}

// Permission Management Modal Component
function PermissionManagementModal({
  role,
  permissions,
  onClose,
  onPermissionsUpdated
}: {
  role: Role
  permissions: Permission[]
  onClose: () => void
  onPermissionsUpdated: () => void
}) {
  const [rolePermissions, setRolePermissions] = useState<RolePermission[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    fetchRolePermissions()
  }, [role.id])

  const fetchRolePermissions = async () => {
    try {
      const { data, error } = await supabase
        .from('role_permissions')
        .select(`
          *,
          permission:permissions(*)
        `)
        .eq('role_id', role.id)

      if (error) throw error
      setRolePermissions(data || [])
    } catch (error) {
      console.error('Error fetching role permissions:', error)
      toast.error('Failed to load role permissions')
    } finally {
      setLoading(false)
    }
  }

  const togglePermission = async (permission: Permission) => {
    const existingRolePermission = rolePermissions.find(rp => rp.permission_id === permission.id)

    try {
      if (existingRolePermission) {
        // Update existing permission
        const { error } = await supabase
          .from('role_permissions')
          .update({ granted: !existingRolePermission.granted })
          .eq('id', existingRolePermission.id)

        if (error) throw error

        setRolePermissions(prev =>
          prev.map(rp =>
            rp.id === existingRolePermission.id
              ? { ...rp, granted: !rp.granted }
              : rp
          )
        )
      } else {
        // Create new permission assignment
        const { data, error } = await supabase
          .from('role_permissions')
          .insert({
            role_id: role.id,
            permission_id: permission.id,
            granted: true
          })
          .select(`
            *,
            permission:permissions(*)
          `)
          .single()

        if (error) throw error

        setRolePermissions(prev => [...prev, data])
      }

      toast.success('Permission updated successfully')
    } catch (error) {
      console.error('Error updating permission:', error)
      toast.error('Failed to update permission')
    }
  }

  const isPermissionGranted = (permissionId: string) => {
    const rolePermission = rolePermissions.find(rp => rp.permission_id === permissionId)
    return rolePermission?.granted || false
  }

  const groupedPermissions = permissions.reduce((acc, permission) => {
    if (!acc[permission.module]) {
      acc[permission.module] = []
    }
    acc[permission.module].push(permission)
    return acc
  }, {} as Record<string, Permission[]>)

  const handleSaveAndClose = async () => {
    await onPermissionsUpdated()
    onClose()
  }

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <Card className="w-full max-w-4xl mx-4">
          <CardContent className="pt-6">
            <div className="flex items-center justify-center h-32">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <Card className="w-full max-w-6xl mx-4 max-h-[90vh] overflow-y-auto">
        <CardHeader>
          <CardTitle>Manage Permissions - {role.display_name}</CardTitle>
          <CardDescription>Configure permissions for this role</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {Object.entries(groupedPermissions).map(([module, modulePermissions]) => (
              <div key={module} className="border rounded-lg p-4">
                <h4 className="font-medium text-gray-900 mb-4 capitalize flex items-center">
                  <Shield className="h-5 w-5 mr-2" />
                  {module} Module
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {modulePermissions.map((permission) => (
                    <div key={permission.id} className="flex items-start space-x-3 p-3 border rounded-lg hover:bg-gray-50">
                      <input
                        type="checkbox"
                        id={`perm-${permission.id}`}
                        checked={isPermissionGranted(permission.id)}
                        onChange={() => togglePermission(permission)}
                        className="mt-1 rounded border-gray-300"
                      />
                      <div className="flex-1">
                        <Label htmlFor={`perm-${permission.id}`} className="font-medium text-sm">
                          {permission.display_name}
                        </Label>
                        <p className="text-xs text-gray-500 mt-1">{permission.description}</p>
                        <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-gray-100 text-gray-800 mt-2">
                          {permission.action}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>

          <div className="flex justify-end space-x-2 pt-6 border-t">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={saving}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSaveAndClose}
              disabled={saving}
              className="min-w-[120px]"
            >
              {saving ? (
                <div className="flex items-center space-x-2">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  <span>Saving...</span>
                </div>
              ) : (
                'Save & Close'
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
