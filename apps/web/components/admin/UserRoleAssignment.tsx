'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/lib/stores/auth-store'
import { toast } from 'sonner'
import { Search, Users, UserCheck, UserX, Calendar, Clock } from 'lucide-react'

interface User {
  id: string
  name: string
  email: string
  role: string
  created_at: string
}

interface Role {
  id: string
  name: string
  display_name: string
  description: string
  is_system_role: boolean
  hierarchy_level: number
}

interface UserRole {
  id: string
  user_id: string
  role_id: string
  assigned_by: string
  assigned_at: string
  expires_at: string | null
  is_active: boolean
  role: Role
  user: User
  assigned_by_user: User
}

interface UserRoleAssignmentProps {
  role?: Role
  onClose: () => void
  onAssignmentsUpdated: () => void
}

export function UserRoleAssignmentModal({ role, onClose, onAssignmentsUpdated }: UserRoleAssignmentProps) {
  const [users, setUsers] = useState<User[]>([])
  const [roles, setRoles] = useState<Role[]>([])
  const [userRoles, setUserRoles] = useState<UserRole[]>([])
  const [selectedUsers, setSelectedUsers] = useState<string[]>([])
  const [selectedRole, setSelectedRole] = useState<string>(role?.id || '')
  const [searchTerm, setSearchTerm] = useState('')
  const [expiresAt, setExpiresAt] = useState('')
  const [loading, setLoading] = useState(true)
  const [assigning, setAssigning] = useState(false)
  const { user: currentUser } = useAuthStore()

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    try {
      setLoading(true)

      // Fetch users
      const { data: usersData, error: usersError } = await supabase
        .from('profiles')
        .select('id, name, email, role, created_at')
        .order('name', { ascending: true })

      if (usersError) throw usersError

      // Fetch roles
      const { data: rolesData, error: rolesError } = await supabase
        .from('roles')
        .select('*')
        .eq('is_active', true)
        .order('hierarchy_level', { ascending: true })

      if (rolesError) throw rolesError

      // Fetch current user role assignments
      const { data: userRolesData, error: userRolesError } = await supabase
        .from('user_roles')
        .select(`
          *,
          role:roles(*),
          user:profiles!user_roles_user_id_fkey(id, name, email),
          assigned_by_user:profiles!user_roles_assigned_by_fkey(id, name, email)
        `)
        .eq('is_active', true)
        .order('assigned_at', { ascending: false })

      if (userRolesError) throw userRolesError

      setUsers(usersData || [])
      setRoles(rolesData || [])
      setUserRoles(userRolesData || [])
    } catch (error) {
      console.error('Error fetching data:', error)
      toast.error('Failed to load data')
    } finally {
      setLoading(false)
    }
  }

  const handleAssignRole = async () => {
    if (!selectedRole || selectedUsers.length === 0) {
      toast.error('Please select a role and at least one user')
      return
    }

    setAssigning(true)

    try {
      const assignments = selectedUsers.map(userId => ({
        user_id: userId,
        role_id: selectedRole,
        assigned_by: currentUser?.id,
        expires_at: expiresAt || null,
        is_active: true
      }))

      const { error } = await supabase
        .from('user_roles')
        .insert(assignments)

      if (error) throw error

      toast.success('Role assignments created successfully', {
        description: `Assigned role to ${selectedUsers.length} user(s)`,
        duration: 3000
      })

      setSelectedUsers([])
      setExpiresAt('')
      await fetchData()
      await onAssignmentsUpdated()
    } catch (error) {
      console.error('Error assigning roles:', error)
      toast.error('Failed to assign roles', {
        description: error instanceof Error ? error.message : 'Unknown error occurred',
        duration: 5000
      })
    } finally {
      setAssigning(false)
    }
  }

  const handleRevokeAssignment = async (assignmentId: string) => {
    if (!confirm('Are you sure you want to revoke this role assignment?')) {
      return
    }

    try {
      const { error } = await supabase
        .from('user_roles')
        .update({ is_active: false })
        .eq('id', assignmentId)

      if (error) throw error

      toast.success('Role assignment revoked successfully')
      await fetchData()
      await onAssignmentsUpdated()
    } catch (error) {
      console.error('Error revoking assignment:', error)
      toast.error('Failed to revoke assignment')
    }
  }

  const filteredUsers = users.filter(user =>
    user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.email.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const getUserCurrentRoles = (userId: string) => {
    return userRoles.filter(ur => ur.user_id === userId && ur.is_active)
  }

  const isUserSelected = (userId: string) => selectedUsers.includes(userId)

  const toggleUserSelection = (userId: string) => {
    setSelectedUsers(prev =>
      prev.includes(userId)
        ? prev.filter(id => id !== userId)
        : [...prev, userId]
    )
  }

  const selectAllUsers = () => {
    setSelectedUsers(filteredUsers.map(user => user.id))
  }

  const clearSelection = () => {
    setSelectedUsers([])
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
          <CardTitle>User Role Assignment</CardTitle>
          <CardDescription>
            {role ? `Assign users to the "${role.display_name}" role` : 'Manage user role assignments'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {/* Assignment Form */}
            <div className="border rounded-lg p-4 bg-gray-50">
              <h3 className="font-medium text-gray-900 mb-4">Assign New Role</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                <div className="space-y-2">
                  <Label htmlFor="role-select">Role</Label>
                  <select
                    id="role-select"
                    value={selectedRole}
                    onChange={(e) => setSelectedRole(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    disabled={!!role}
                  >
                    <option value="">Select a role</option>
                    {roles.map((r) => (
                      <option key={r.id} value={r.id}>
                        {r.display_name} {r.is_system_role ? '(System)' : '(Custom)'}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="expires-at">Expires At (Optional)</Label>
                  <Input
                    id="expires-at"
                    type="datetime-local"
                    value={expiresAt}
                    onChange={(e) => setExpiresAt(e.target.value)}
                  />
                </div>

                <div className="flex items-end">
                  <Button
                    onClick={handleAssignRole}
                    disabled={assigning || !selectedRole || selectedUsers.length === 0}
                    className="w-full"
                  >
                    {assigning ? 'Assigning...' : `Assign to ${selectedUsers.length} user(s)`}
                  </Button>
                </div>
              </div>

              <div className="flex items-center space-x-2 text-sm text-gray-600">
                <span>Selected: {selectedUsers.length} users</span>
                {selectedUsers.length > 0 && (
                  <>
                    <Button variant="outline" size="sm" onClick={clearSelection}>
                      Clear
                    </Button>
                    <Button variant="outline" size="sm" onClick={selectAllUsers}>
                      Select All Visible
                    </Button>
                  </>
                )}
              </div>
            </div>

            {/* User Search */}
            <div className="space-y-4">
              <div className="flex items-center space-x-4">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                  <Input
                    placeholder="Search users..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
            </div>

            {/* Users List */}
            <div className="border rounded-lg">
              <div className="p-4 border-b bg-gray-50">
                <h3 className="font-medium text-gray-900">Users ({filteredUsers.length})</h3>
              </div>
              <div className="max-h-96 overflow-y-auto">
                {filteredUsers.length === 0 ? (
                  <div className="text-center py-8">
                    <Users className="mx-auto h-12 w-12 text-gray-400" />
                    <h3 className="mt-2 text-sm font-medium text-gray-900">No users found</h3>
                    <p className="mt-1 text-sm text-gray-500">Try adjusting your search criteria.</p>
                  </div>
                ) : (
                  <div className="divide-y divide-gray-200">
                    {filteredUsers.map((user) => {
                      const currentRoles = getUserCurrentRoles(user.id)
                      const isSelected = isUserSelected(user.id)

                      return (
                        <div
                          key={user.id}
                          className={`p-4 hover:bg-gray-50 cursor-pointer ${
                            isSelected ? 'bg-blue-50 border-l-4 border-blue-500' : ''
                          }`}
                          onClick={() => toggleUserSelection(user.id)}
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-3">
                              <input
                                type="checkbox"
                                checked={isSelected}
                                onChange={() => toggleUserSelection(user.id)}
                                className="rounded border-gray-300"
                                onClick={(e) => e.stopPropagation()}
                              />
                              <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full flex items-center justify-center text-white font-semibold">
                                {user.name.charAt(0).toUpperCase()}
                              </div>
                              <div>
                                <div className="font-medium text-gray-900">{user.name}</div>
                                <div className="text-sm text-gray-500">{user.email}</div>
                                <div className="text-xs text-gray-400">
                                  Legacy Role: <span className="capitalize">{user.role}</span>
                                </div>
                              </div>
                            </div>
                            <div className="text-right">
                              {currentRoles.length > 0 ? (
                                <div className="space-y-1">
                                  {currentRoles.map((ur) => (
                                    <div key={ur.id} className="flex items-center space-x-2">
                                      <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">
                                        {ur.role.display_name}
                                      </span>
                                      {ur.expires_at && (
                                        <span className="text-xs text-orange-600 flex items-center">
                                          <Clock className="h-3 w-3 mr-1" />
                                          Expires {new Date(ur.expires_at).toLocaleDateString()}
                                        </span>
                                      )}
                                    </div>
                                  ))}
                                </div>
                              ) : (
                                <span className="text-sm text-gray-400">No custom roles</span>
                              )}
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            </div>

            {/* Current Assignments */}
            <div className="border rounded-lg">
              <div className="p-4 border-b bg-gray-50">
                <h3 className="font-medium text-gray-900">Current Role Assignments ({userRoles.length})</h3>
              </div>
              <div className="max-h-64 overflow-y-auto">
                {userRoles.length === 0 ? (
                  <div className="text-center py-8">
                    <UserCheck className="mx-auto h-12 w-12 text-gray-400" />
                    <h3 className="mt-2 text-sm font-medium text-gray-900">No role assignments</h3>
                    <p className="mt-1 text-sm text-gray-500">Start by assigning roles to users.</p>
                  </div>
                ) : (
                  <div className="divide-y divide-gray-200">
                    {userRoles.map((assignment) => (
                      <div key={assignment.id} className="p-4 hover:bg-gray-50">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-3">
                            <div className="w-8 h-8 bg-gradient-to-r from-green-500 to-blue-500 rounded-full flex items-center justify-center text-white font-semibold">
                              {assignment.user.name.charAt(0).toUpperCase()}
                            </div>
                            <div>
                              <div className="font-medium text-gray-900">{assignment.user.name}</div>
                              <div className="text-sm text-gray-500">{assignment.user.email}</div>
                              <div className="flex items-center space-x-2 mt-1">
                                <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800">
                                  {assignment.role.display_name}
                                </span>
                                {assignment.expires_at && (
                                  <span className="text-xs text-orange-600 flex items-center">
                                    <Clock className="h-3 w-3 mr-1" />
                                    Expires {new Date(assignment.expires_at).toLocaleDateString()}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                          <div className="text-right space-y-1">
                            <div className="text-xs text-gray-500">
                              Assigned by {assignment.assigned_by_user?.name}
                            </div>
                            <div className="text-xs text-gray-400 flex items-center">
                              <Calendar className="h-3 w-3 mr-1" />
                              {new Date(assignment.assigned_at).toLocaleDateString()}
                            </div>
                            <Button
                              onClick={() => handleRevokeAssignment(assignment.id)}
                              variant="outline"
                              size="sm"
                              className="text-red-600 hover:text-red-700 hover:bg-red-50"
                            >
                              <UserX className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="flex justify-end space-x-2 pt-4 border-t">
              <Button variant="outline" onClick={onClose}>
                Close
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
