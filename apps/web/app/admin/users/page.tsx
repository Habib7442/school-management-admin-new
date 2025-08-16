'use client'

import { useState, useEffect } from 'react'
import AdminLayout from '@/components/admin/AdminLayout'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/lib/stores/auth-store'
import { toast } from 'sonner'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog'
import type { AuthUser, UserRole } from '@repo/types'

// Extended user type with related data
interface ExtendedUser extends AuthUser {
  students?: Array<{
    id: string
    student_id: string
    admission_number: string
    class_id: string
    class: string
    section: string
    roll_number: string
    date_of_birth: string
    gender: string
    blood_group: string
    address: string
    parent_name: string
    parent_phone: string
    parent_email: string
    emergency_contact: string
    medical_conditions: string
    previous_school: string
    transport_required: boolean
    fee_concession: boolean
    scholarship: boolean
    is_active: boolean
    emergency_contact_name: string
    emergency_contact_phone: string
    emergency_contact_relation: string
  }>
  admissions?: Array<{
    class_level: string
    status: string
    applied_date: string
  }>
  teachers?: Array<{
    id: string
    employee_id: string
    subject: string
    department: string
    qualification: string
    experience_years: number
    joining_date: string
    salary: number
    contact_number: string
    emergency_contact: string
    address: string
    blood_group: string
    marital_status: string
    spouse_name: string
    children_count: number
    is_active: boolean
    designation: string
  }>
}

// Helper function for role colors
const getRoleColor = (role: UserRole) => {
  const colors = {
    admin: 'bg-red-100 text-red-800',
    'sub-admin': 'bg-orange-100 text-orange-800',
    teacher: 'bg-blue-100 text-blue-800',
    student: 'bg-green-100 text-green-800'
  }
  return colors[role] || 'bg-gray-100 text-gray-800'
}

export default function UserManagement() {
  const [users, setUsers] = useState<AuthUser[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedRole, setSelectedRole] = useState<UserRole | 'all'>('all')
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [selectedUser, setSelectedUser] = useState<AuthUser | null>(null)
  const [deletingUser, setDeletingUser] = useState<AuthUser | null>(null)

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1)
  const [totalUsers, setTotalUsers] = useState(0)
  const [hasMore, setHasMore] = useState(false)
  const pageSize = 20

  const { checkPermission } = useAuthStore()

  useEffect(() => {
    fetchUsers()
  }, [])

  const fetchUsers = async () => {
    try {
      setLoading(true)
      // First get all profiles
      const { data: profilesData, error: profilesError } = await supabase
        .from('profiles')
        .select(`
          id,
          email,
          name,
          role,
          phone,
          avatar_url,
          school_id,
          onboarding_completed,
          last_sign_in_at,
          created_at,
          updated_at,
          students (
            student_id,
            admission_number,
            class_id,
            section,
            roll_number,
            date_of_birth,
            gender,
            blood_group,
            address,
            parent_name,
            parent_phone,
            parent_email,
            emergency_contact_name,
            emergency_contact_phone,
            emergency_contact_relation,
            admission_date,
            is_active
          ),
          teachers (
            employee_id,
            department,
            designation,
            qualification,
            experience_years,
            date_of_birth,
            gender,
            blood_group,
            address,
            emergency_contact_name,
            emergency_contact_phone,
            emergency_contact_relation,
            salary,
            joining_date,
            is_active
          )
        `)
        .order('created_at', { ascending: false })

      if (profilesError) {
        console.error('Supabase error:', profilesError)
        toast.error('Failed to fetch users')
        throw profilesError
      }

      // Get admissions data separately (optional - don't fail if admissions table doesn't exist)
      let admissionsData = null
      try {
        const { data, error: admissionsError } = await supabase
          .from('admissions')
          .select('email, class_level, status, applied_date')

        if (admissionsError) {
          console.warn('Could not fetch admissions data:', admissionsError)
        } else {
          admissionsData = data
        }
      } catch (err) {
        console.warn('Admissions table might not exist:', err)
      }

      // Create a map of admissions by email for quick lookup
      const admissionsMap = new Map()
      if (admissionsData) {
        admissionsData.forEach(admission => {
          admissionsMap.set(admission.email.toLowerCase(), admission)
        })
      }

      // Combine profiles with admission data
      const usersWithAdmissions = (profilesData || []).map(user => ({
        ...user,
        admissions: admissionsMap.has(user.email.toLowerCase())
          ? [admissionsMap.get(user.email.toLowerCase())]
          : []
      }))

      console.log('Fetched users:', usersWithAdmissions)
      setUsers(usersWithAdmissions)
    } catch (error) {
      console.error('Error fetching users:', error)
      toast.error('Failed to load users')
    } finally {
      setLoading(false)
    }
  }

  const filteredUsers = users.filter(user => {
    const userName = user.name || user.email || 'Unknown User'
    const matchesSearch = userName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         user.email.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesRole = selectedRole === 'all' || user.role === selectedRole
    return matchesSearch && matchesRole
  })

  const handleDeleteUser = async () => {
    if (!deletingUser) return

    if (!checkPermission('users', 'delete')) {
      toast.error('Access denied', {
        description: 'You do not have permission to delete users.',
        duration: 3000
      })
      return
    }

    try {
      const { error } = await supabase
        .from('profiles')
        .delete()
        .eq('id', deletingUser.id)

      if (error) throw error

      setUsers(users.filter(user => user.id !== deletingUser.id))
      toast.success('User deleted successfully', {
        description: `${deletingUser.name} has been removed.`,
        duration: 3000
      })
      setDeletingUser(null)
    } catch (error) {
      console.error('Error deleting user:', error)
      toast.error('Failed to delete user', {
        description: error instanceof Error ? error.message : 'Unknown error occurred',
        duration: 5000
      })
      setDeletingUser(null)
    }
  }

  const handleUpdateRole = async (userId: string, newRole: UserRole) => {
    if (!checkPermission('users', 'update')) {
      alert('You do not have permission to update users')
      return
    }

    try {
      const { error } = await supabase
        .from('profiles')
        .update({ role: newRole })
        .eq('id', userId)

      if (error) throw error

      setUsers(users.map(user =>
        user.id === userId ? { ...user, role: newRole } : user
      ))
      alert('User role updated successfully')
    } catch (error) {
      console.error('Error updating user role:', error)
      alert('Failed to update user role')
    }
  }

  const handleEditUser = (user: AuthUser) => {
    setSelectedUser(user)
    setShowEditModal(true)
  }

  return (
    <AdminLayout title="User Management">
      <div className="space-y-6">
        {/* Header Actions */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="flex flex-col sm:flex-row gap-4 flex-1">
            <div className="flex-1 max-w-sm">
              <Input
                placeholder="Search users..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full"
              />
            </div>
            <select
              value={selectedRole}
              onChange={(e) => setSelectedRole(e.target.value as UserRole | 'all')}
              className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Roles</option>
              <option value="admin">Admin</option>
              <option value="sub-admin">Sub Admin</option>
              <option value="teacher">Teacher</option>
              <option value="student">Student</option>
            </select>
          </div>
          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              onClick={fetchUsers}
              disabled={loading}
              className="flex items-center space-x-2"
            >
              <span>🔄</span>
              <span>Refresh</span>
            </Button>
            {checkPermission('users', 'create') && (
              <Button
                onClick={() => setShowCreateModal(true)}
                className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
              >
                Add User
              </Button>
            )}
          </div>
        </div>

        {/* Users Table */}
        <Card>
          <CardHeader>
            <CardTitle>Users ({filteredUsers.length})</CardTitle>
            <CardDescription>Manage user accounts and permissions</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-8">Loading users...</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-200">
                      <th className="text-left py-3 px-4 font-medium text-gray-600">User</th>
                      <th className="text-left py-3 px-4 font-medium text-gray-600">Role</th>
                      <th className="text-left py-3 px-4 font-medium text-gray-600">Phone</th>
                      <th className="text-left py-3 px-4 font-medium text-gray-600">ID/Employee ID</th>
                      <th className="text-left py-3 px-4 font-medium text-gray-600">Department/Class</th>
                      <th className="text-left py-3 px-4 font-medium text-gray-600">Status</th>
                      <th className="text-left py-3 px-4 font-medium text-gray-600">Created</th>
                      <th className="text-left py-3 px-4 font-medium text-gray-600">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredUsers.map((user) => {
                      const extendedUser = user as ExtendedUser
                      const studentData = extendedUser.students?.[0]
                      const teacherData = extendedUser.teachers?.[0]

                      return (
                        <tr key={user.id} className="border-b border-gray-100 hover:bg-gray-50">
                          <td className="py-3 px-4">
                            <div className="flex items-center space-x-3">
                              <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full flex items-center justify-center text-white font-semibold">
                                {(user.name || user.email || 'U').charAt(0).toUpperCase()}
                              </div>
                              <div>
                                <div className="font-medium text-gray-900">
                                  {user.name || 'No Name Set'}
                                </div>
                                <div className="text-sm text-gray-500">
                                  {user.email}
                                  {user.role === 'student' && user.admissions && user.admissions.length > 0 && user.admissions[0].class_level && (
                                    <span className="ml-2 text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
                                      Applied: Grade {user.admissions[0].class_level}
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>
                          </td>
                          <td className="py-3 px-4">
                            <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getRoleColor(user.role)}`}>
                              {user.role}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-sm text-gray-500">
                            {user.phone || <span className="text-gray-400 italic">Not set</span>}
                          </td>
                          <td className="py-3 px-4 text-sm text-gray-500">
                            {user.role === 'student' ? (
                              studentData?.student_id || studentData?.admission_number || <span className="text-gray-400 italic">Not set</span>
                            ) : user.role === 'teacher' ? (
                              teacherData?.employee_id || <span className="text-gray-400 italic">Not set</span>
                            ) : (
                              <span className="text-gray-400 italic">N/A</span>
                            )}
                          </td>
                          <td className="py-3 px-4 text-sm text-gray-500">
                            {user.role === 'student' ? (
                              studentData?.section || <span className="text-gray-400 italic">Not set</span>
                            ) : user.role === 'teacher' ? (
                              teacherData?.department || <span className="text-gray-400 italic">Not set</span>
                            ) : (
                              <span className="text-gray-400 italic">N/A</span>
                            )}
                          </td>
                          <td className="py-3 px-4">
                            {user.role === 'student' && studentData ? (
                              <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                                studentData.is_active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                              }`}>
                                {studentData.is_active ? 'Active' : 'Inactive'}
                              </span>
                            ) : user.role === 'teacher' && teacherData ? (
                              <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                                teacherData.is_active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                              }`}>
                                {teacherData.is_active ? 'Active' : 'Inactive'}
                              </span>
                            ) : (
                              <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800">
                                Active
                              </span>
                            )}
                          </td>
                          <td className="py-3 px-4 text-sm text-gray-500">
                            {new Date(user.created_at).toLocaleDateString()}
                          </td>
                          <td className="py-3 px-4">
                            <div className="flex items-center space-x-2">
                              {checkPermission('users', 'update') && (
                                <Button
                                  onClick={() => handleEditUser(user)}
                                  variant="outline"
                                  size="sm"
                                  className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                                >
                                  Edit
                                </Button>
                              )}
                              {checkPermission('users', 'delete') && (
                                <AlertDialog>
                                  <AlertDialogTrigger asChild>
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      className="text-red-600 hover:text-red-700 hover:bg-red-50"
                                    >
                                      Delete
                                    </Button>
                                  </AlertDialogTrigger>
                                  <AlertDialogContent>
                                    <AlertDialogHeader>
                                      <AlertDialogTitle>Delete User</AlertDialogTitle>
                                      <AlertDialogDescription>
                                        Are you sure you want to delete "{user.name}"? This action cannot be undone.
                                      </AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                                      <AlertDialogAction
                                        onClick={() => {
                                          setDeletingUser(user)
                                          handleDeleteUser()
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
                      )
                    })}
                  </tbody>
                </table>
                {filteredUsers.length === 0 && (
                  <div className="text-center py-8 text-gray-500">
                    No users found matching your criteria.
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Create User Modal */}
      {showCreateModal && (
        <CreateUserModal
          onClose={() => setShowCreateModal(false)}
          onUserCreated={fetchUsers}
        />
      )}

      {/* Edit User Modal */}
      {showEditModal && selectedUser && (
        <EditUserModal
          user={selectedUser}
          onClose={() => {
            setShowEditModal(false)
            setSelectedUser(null)
          }}
          onUserUpdated={fetchUsers}
        />
      )}
    </AdminLayout>
  )
}

function CreateUserModal({ onClose, onUserCreated }: { onClose: () => void; onUserCreated: () => void }) {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    role: 'student' as UserRole
  })
  const [loading, setLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [passwordCopied, setPasswordCopied] = useState(false)

  // Generate password when name changes
  const generatePassword = (name: string) => {
    if (!name.trim()) return ''

    // Take first name, clean it, and add random 4-digit number
    const firstName = name.trim().split(' ')[0]
      .toLowerCase()
      .replace(/[^a-z]/g, '') // Remove non-alphabetic characters
      .slice(0, 8) // Limit to 8 characters

    if (!firstName) return '' // Return empty if no valid characters

    const randomNumber = Math.floor(1000 + Math.random() * 9000)
    return `${firstName}${randomNumber}`
  }

  // Update password when name changes
  const handleNameChange = (name: string) => {
    const newPassword = generatePassword(name)
    setFormData(prev => ({
      ...prev,
      name,
      password: newPassword
    }))
    setPasswordCopied(false) // Reset copy status when password changes
  }

  // Copy password to clipboard
  const copyPassword = async () => {
    try {
      await navigator.clipboard.writeText(formData.password)
      setPasswordCopied(true)
      setTimeout(() => setPasswordCopied(false), 2000)
    } catch (err) {
      console.error('Failed to copy password:', err)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!formData.name.trim()) {
      toast.error('Please enter a name to generate password')
      return
    }

    if (!formData.email.trim()) {
      toast.error('Please enter an email address')
      return
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(formData.email)) {
      toast.error('Please enter a valid email address')
      return
    }

    setLoading(true)
    const loadingToast = toast.loading('Creating user...', { duration: Infinity })

    try {
      // Get current user's school_id
      const { data: { user: currentAuthUser } } = await supabase.auth.getUser()

      if (!currentAuthUser) {
        throw new Error('Not authenticated')
      }

      const { data: currentUser } = await supabase
        .from('profiles')
        .select('school_id, role')
        .eq('id', currentAuthUser.id)
        .single()

      if (!currentUser?.school_id) {
        throw new Error('School ID not found. Please ensure you are properly set up.')
      }

      if (currentUser.role !== 'admin') {
        throw new Error('Only administrators can create users')
      }

      // Create user using API route
      const response = await fetch('/api/admin/create-user', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: formData.email.toLowerCase().trim(),
          password: formData.password,
          name: formData.name.trim(),
          role: formData.role,
          school_id: currentUser.school_id
        })
      })

      const result = await response.json()

      if (!response.ok || !result.success) {
        throw new Error(result.error || 'Failed to create user')
      }

      toast.dismiss(loadingToast)

      // Show success message with password
      toast.success('🎉 User created successfully!', {
        description: `${formData.name} (${formData.role}) has been added to the system.`,
        duration: 5000
      })

      // Show password in a separate toast with copy action
      toast.info('📋 Save this password!', {
        description: `Password: ${formData.password}`,
        duration: 15000,
        action: {
          label: 'Copy Password',
          onClick: () => {
            navigator.clipboard.writeText(formData.password)
            toast.success('Password copied to clipboard!')
          }
        }
      })

      // Refresh the user list and close modal
      await onUserCreated()
      onClose()
    } catch (error) {
      console.error('Error creating user:', error)
      toast.dismiss(loadingToast)
      toast.error('Failed to create user', {
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
          <CardTitle>Create New User</CardTitle>
          <CardDescription>Add a new user to the system</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="name">Full Name</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => handleNameChange(e.target.value)}
                placeholder="Enter full name"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="Enter email address"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Auto-Generated Password</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={formData.password}
                  readOnly
                  className="bg-gray-50 pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700"
                >
                  {showPassword ? '🙈' : '👁️'}
                </button>
              </div>
              {formData.password && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-md p-3">
                  <div className="flex items-start space-x-2">
                    <span className="text-yellow-600 text-sm">⚠️</span>
                    <div className="flex-1 text-sm text-yellow-800">
                      <p className="font-medium">Important: Save this password!</p>
                      <div className="flex items-center space-x-2 mt-1">
                        <span>Password:</span>
                        <span className="font-mono bg-yellow-100 px-2 py-1 rounded">{formData.password}</span>
                        <Button
                          type="button"
                          onClick={copyPassword}
                          size="sm"
                          variant="outline"
                          className="h-6 px-2 text-xs"
                        >
                          {passwordCopied ? '✓ Copied' : '📋 Copy'}
                        </Button>
                      </div>
                      <p className="text-xs mt-2">This password will not be shown again after user creation.</p>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="role">Role</Label>
              <select
                id="role"
                value={formData.role}
                onChange={(e) => setFormData({ ...formData, role: e.target.value as UserRole })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="student">Student</option>
                <option value="teacher">Teacher</option>
                <option value="sub-admin">Sub Admin</option>
                <option value="admin">Admin</option>
              </select>
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
                disabled={loading || !formData.name.trim() || !formData.email.trim()}
                className="min-w-[120px]"
              >
                {loading ? (
                  <div className="flex items-center space-x-2">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    <span>Creating...</span>
                  </div>
                ) : (
                  'Create User'
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}

function EditUserModal({
  user,
  onClose,
  onUserUpdated
}: {
  user: ExtendedUser
  onClose: () => void
  onUserUpdated: () => void
}) {
  const studentData = user.students?.[0]
  const teacherData = user.teachers?.[0]

  const [formData, setFormData] = useState({
    // Basic profile data
    name: user.name || '',
    email: user.email || '',
    phone: user.phone || '',
    role: user.role,

    // Student-specific fields
    student_id: studentData?.student_id || '',
    admission_number: studentData?.admission_number || '',
    roll_number: studentData?.roll_number || '',
    date_of_birth: studentData?.date_of_birth || '',
    gender: studentData?.gender || '',
    blood_group: studentData?.blood_group || '',
    address: studentData?.address || '',
    parent_name: studentData?.parent_name || '',
    parent_phone: studentData?.parent_phone || '',
    parent_email: studentData?.parent_email || '',
    emergency_contact_name: studentData?.emergency_contact_name || '',
    emergency_contact_phone: studentData?.emergency_contact_phone || '',
    emergency_contact_relation: studentData?.emergency_contact_relation || '',

    // Teacher-specific fields
    employee_id: teacherData?.employee_id || '',
    department: teacherData?.department || '',
    designation: teacherData?.designation || '',
    qualification: teacherData?.qualification || '',
    experience_years: teacherData?.experience_years || '',
    salary: teacherData?.salary || '',
    joining_date: teacherData?.joining_date || ''
  })
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!formData.name.trim()) {
      toast.error('Please enter a name')
      return
    }

    if (!formData.email.trim()) {
      toast.error('Please enter an email address')
      return
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(formData.email)) {
      toast.error('Please enter a valid email address')
      return
    }

    setLoading(true)

    try {
      // Update profiles table
      const { error: profileError } = await supabase
        .from('profiles')
        .update({
          name: formData.name.trim(),
          email: formData.email.toLowerCase().trim(),
          phone: formData.phone.trim() || null,
          updated_at: new Date().toISOString()
        })
        .eq('id', user.id)

      if (profileError) throw profileError

      // Update role-specific table based on user role
      if (user.role === 'student') {
        // Ensure unique fields are either valid strings or null (not empty strings)
        const cleanStudentId = formData.student_id?.trim()
        const cleanAdmissionNumber = formData.admission_number?.trim()

        const studentUpdateData = {
          student_id: cleanStudentId && cleanStudentId.length > 0 ? cleanStudentId : null,
          admission_number: cleanAdmissionNumber && cleanAdmissionNumber.length > 0 ? cleanAdmissionNumber : null,
          roll_number: formData.roll_number ? parseInt(formData.roll_number) : null,
          date_of_birth: formData.date_of_birth || null,
          gender: formData.gender || null,
          blood_group: formData.blood_group || null,
          address: formData.address.trim() || null,
          parent_name: formData.parent_name.trim() || null,
          parent_phone: formData.parent_phone.trim() || null,
          parent_email: formData.parent_email.trim() || null,
          emergency_contact_name: formData.emergency_contact_name.trim() || null,
          emergency_contact_phone: formData.emergency_contact_phone.trim() || null,
          emergency_contact_relation: formData.emergency_contact_relation.trim() || null,
          updated_at: new Date().toISOString()
        }

        // Use upsert to handle both insert and update cases
        const { error: studentError } = await supabase
          .from('students')
          .upsert({
            id: user.id,
            school_id: user.school_id,
            ...studentUpdateData
          }, {
            onConflict: 'id'
          })

        if (studentError) throw studentError
      } else if (user.role === 'teacher') {
        // Ensure unique fields are either valid strings or null (not empty strings)
        const cleanEmployeeId = formData.employee_id?.trim()

        const teacherUpdateData = {
          employee_id: cleanEmployeeId && cleanEmployeeId.length > 0 ? cleanEmployeeId : null,
          department: formData.department.trim() || null,
          designation: formData.designation.trim() || null,
          qualification: formData.qualification.trim() || null,
          experience_years: formData.experience_years ? parseInt(String(formData.experience_years)) : null,
          date_of_birth: formData.date_of_birth || null,
          gender: formData.gender || null,
          blood_group: formData.blood_group || null,
          address: formData.address.trim() || null,
          emergency_contact_name: formData.emergency_contact_name.trim() || null,
          emergency_contact_phone: formData.emergency_contact_phone.trim() || null,
          emergency_contact_relation: formData.emergency_contact_relation.trim() || null,
          salary: formData.salary ? parseFloat(String(formData.salary)) : null,
          joining_date: formData.joining_date || null,
          updated_at: new Date().toISOString()
        }

        // Use upsert to handle both insert and update cases
        const { error: teacherError } = await supabase
          .from('teachers')
          .upsert({
            id: user.id,
            school_id: user.school_id,
            ...teacherUpdateData
          }, {
            onConflict: 'id'
          })

        if (teacherError) throw teacherError
      }

      toast.success('User updated successfully', {
        description: `${formData.name}'s information has been updated.`,
        duration: 3000
      })

      await onUserUpdated()
      onClose()
    } catch (error) {
      console.error('Error updating user:', error)

      // Provide more specific error messages
      let errorMessage = 'Unknown error occurred'
      if (error instanceof Error) {
        if (error.message.includes('duplicate key value violates unique constraint "students_pkey"')) {
          errorMessage = 'Student record already exists. This should not happen during an update.'
        } else if (error.message.includes('duplicate key value violates unique constraint') && error.message.includes('student_id')) {
          errorMessage = 'A student with this Student ID already exists'
        } else if (error.message.includes('duplicate key value violates unique constraint') && error.message.includes('admission_number')) {
          errorMessage = 'A student with this Admission Number already exists'
        } else if (error.message.includes('duplicate key value violates unique constraint') && error.message.includes('employee_id')) {
          errorMessage = 'A teacher with this Employee ID already exists'
        } else if (error.message.includes('duplicate key')) {
          errorMessage = 'A user with this unique identifier already exists'
        } else if (error.message.includes('foreign key')) {
          errorMessage = 'Invalid reference to class or school'
        } else {
          errorMessage = error.message
        }
      }

      toast.error('Failed to update user', {
        description: errorMessage,
        duration: 5000
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <Card className="w-full max-w-4xl mx-4 max-h-[90vh] overflow-y-auto">
        <CardHeader>
          <CardTitle>Edit User</CardTitle>
          <CardDescription>Update user information and role-specific details</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Basic Information */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-900 border-b pb-2">Basic Information</h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-name">Full Name *</Label>
                  <Input
                    id="edit-name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Enter full name"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="edit-email">Email *</Label>
                  <Input
                    id="edit-email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="Enter email address"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="edit-phone">Phone</Label>
                  <Input
                    id="edit-phone"
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    placeholder="Enter phone number"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Current Role</Label>
                  <div className="px-3 py-2 bg-gray-100 border border-gray-300 rounded-md text-gray-700">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getRoleColor(formData.role)}`}>
                      {formData.role}
                    </span>
                    <span className="ml-2 text-sm text-gray-500">(Role cannot be changed)</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Student-specific fields */}
            {user.role === 'student' && (
              <div className="space-y-4">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 border-b pb-2">Student Information</h3>
                  <p className="text-sm text-gray-600 mt-2">
                    Basic student details. Use Class Management to assign students to classes.
                  </p>
                </div>

                {/* Admission Information */}
                {user.admissions && user.admissions.length > 0 && user.admissions[0].class_level && (
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <h4 className="text-sm font-semibold text-blue-900 mb-2">Original Admission Application</h4>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
                      <div>
                        <span className="text-blue-700 font-medium">Applied for Class:</span>
                        <p className="text-blue-900">Grade {user.admissions[0].class_level}</p>
                      </div>
                      <div>
                        <span className="text-blue-700 font-medium">Application Status:</span>
                        <p className="text-blue-900 capitalize">{user.admissions[0].status || 'Unknown'}</p>
                      </div>
                      <div>
                        <span className="text-blue-700 font-medium">Applied Date:</span>
                        <p className="text-blue-900">
                          {user.admissions[0].applied_date
                            ? new Date(user.admissions[0].applied_date).toLocaleDateString()
                            : 'Not available'
                          }
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="student-id">Student ID</Label>
                    <Input
                      id="student-id"
                      value={formData.student_id}
                      onChange={(e) => setFormData({ ...formData, student_id: e.target.value })}
                      placeholder="Enter student ID"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="admission-number">Admission Number</Label>
                    <Input
                      id="admission-number"
                      value={formData.admission_number}
                      onChange={(e) => setFormData({ ...formData, admission_number: e.target.value })}
                      placeholder="Enter admission number"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="roll-number">Roll Number</Label>
                    <Input
                      id="roll-number"
                      type="number"
                      value={formData.roll_number}
                      onChange={(e) => setFormData({ ...formData, roll_number: e.target.value })}
                      placeholder="Enter roll number"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="date-of-birth">Date of Birth</Label>
                    <Input
                      id="date-of-birth"
                      type="date"
                      value={formData.date_of_birth}
                      onChange={(e) => setFormData({ ...formData, date_of_birth: e.target.value })}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="gender">Gender</Label>
                    <select
                      id="gender"
                      value={formData.gender}
                      onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">Select gender</option>
                      <option value="male">Male</option>
                      <option value="female">Female</option>
                      <option value="other">Other</option>
                    </select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="blood-group">Blood Group</Label>
                    <select
                      id="blood-group"
                      value={formData.blood_group}
                      onChange={(e) => setFormData({ ...formData, blood_group: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">Select blood group</option>
                      <option value="A+">A+</option>
                      <option value="A-">A-</option>
                      <option value="B+">B+</option>
                      <option value="B-">B-</option>
                      <option value="AB+">AB+</option>
                      <option value="AB-">AB-</option>
                      <option value="O+">O+</option>
                      <option value="O-">O-</option>
                    </select>
                  </div>

                  <div className="space-y-2 md:col-span-2">
                    <Label htmlFor="address">Address</Label>
                    <Input
                      id="address"
                      value={formData.address}
                      onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                      placeholder="Enter address"
                    />
                  </div>
                </div>

                <div className="space-y-4">
                  <h4 className="text-md font-medium text-gray-800">Parent Information</h4>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="parent-name">Parent Name</Label>
                      <Input
                        id="parent-name"
                        value={formData.parent_name}
                        onChange={(e) => setFormData({ ...formData, parent_name: e.target.value })}
                        placeholder="Enter parent name"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="parent-phone">Parent Phone</Label>
                      <Input
                        id="parent-phone"
                        type="tel"
                        value={formData.parent_phone}
                        onChange={(e) => setFormData({ ...formData, parent_phone: e.target.value })}
                        placeholder="Enter parent phone"
                      />
                    </div>

                    <div className="space-y-2 md:col-span-2">
                      <Label htmlFor="parent-email">Parent Email</Label>
                      <Input
                        id="parent-email"
                        type="email"
                        value={formData.parent_email}
                        onChange={(e) => setFormData({ ...formData, parent_email: e.target.value })}
                        placeholder="Enter parent email"
                      />
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <h4 className="text-md font-medium text-gray-800">Emergency Contact</h4>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="emergency-name">Emergency Contact Name</Label>
                      <Input
                        id="emergency-name"
                        value={formData.emergency_contact_name}
                        onChange={(e) => setFormData({ ...formData, emergency_contact_name: e.target.value })}
                        placeholder="Enter emergency contact name"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="emergency-phone">Emergency Contact Phone</Label>
                      <Input
                        id="emergency-phone"
                        type="tel"
                        value={formData.emergency_contact_phone}
                        onChange={(e) => setFormData({ ...formData, emergency_contact_phone: e.target.value })}
                        placeholder="Enter emergency contact phone"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="emergency-relation">Relation</Label>
                      <Input
                        id="emergency-relation"
                        value={formData.emergency_contact_relation}
                        onChange={(e) => setFormData({ ...formData, emergency_contact_relation: e.target.value })}
                        placeholder="Enter relation (e.g., Father, Mother, Guardian)"
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Teacher-specific fields */}
            {user.role === 'teacher' && (
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-gray-900 border-b pb-2">Teacher Information</h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="employee-id">Employee ID</Label>
                    <Input
                      id="employee-id"
                      value={formData.employee_id}
                      onChange={(e) => setFormData({ ...formData, employee_id: e.target.value })}
                      placeholder="Enter employee ID"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="department">Department</Label>
                    <Input
                      id="department"
                      value={formData.department}
                      onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                      placeholder="Enter department"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="designation">Designation</Label>
                    <Input
                      id="designation"
                      value={formData.designation}
                      onChange={(e) => setFormData({ ...formData, designation: e.target.value })}
                      placeholder="Enter designation"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="experience-years">Experience (Years)</Label>
                    <Input
                      id="experience-years"
                      type="number"
                      value={formData.experience_years}
                      onChange={(e) => setFormData({ ...formData, experience_years: e.target.value })}
                      placeholder="Enter years of experience"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="teacher-dob">Date of Birth</Label>
                    <Input
                      id="teacher-dob"
                      type="date"
                      value={formData.date_of_birth}
                      onChange={(e) => setFormData({ ...formData, date_of_birth: e.target.value })}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="teacher-gender">Gender</Label>
                    <select
                      id="teacher-gender"
                      value={formData.gender}
                      onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">Select gender</option>
                      <option value="male">Male</option>
                      <option value="female">Female</option>
                      <option value="other">Other</option>
                    </select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="teacher-blood-group">Blood Group</Label>
                    <select
                      id="teacher-blood-group"
                      value={formData.blood_group}
                      onChange={(e) => setFormData({ ...formData, blood_group: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">Select blood group</option>
                      <option value="A+">A+</option>
                      <option value="A-">A-</option>
                      <option value="B+">B+</option>
                      <option value="B-">B-</option>
                      <option value="AB+">AB+</option>
                      <option value="AB-">AB-</option>
                      <option value="O+">O+</option>
                      <option value="O-">O-</option>
                    </select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="salary">Salary</Label>
                    <Input
                      id="salary"
                      type="number"
                      step="0.01"
                      value={formData.salary}
                      onChange={(e) => setFormData({ ...formData, salary: e.target.value })}
                      placeholder="Enter salary"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="joining-date">Joining Date</Label>
                    <Input
                      id="joining-date"
                      type="date"
                      value={formData.joining_date}
                      onChange={(e) => setFormData({ ...formData, joining_date: e.target.value })}
                    />
                  </div>

                  <div className="space-y-2 md:col-span-2">
                    <Label htmlFor="qualification">Qualification</Label>
                    <Input
                      id="qualification"
                      value={formData.qualification}
                      onChange={(e) => setFormData({ ...formData, qualification: e.target.value })}
                      placeholder="Enter qualification"
                    />
                  </div>

                  <div className="space-y-2 md:col-span-2">
                    <Label htmlFor="teacher-address">Address</Label>
                    <Input
                      id="teacher-address"
                      value={formData.address}
                      onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                      placeholder="Enter address"
                    />
                  </div>
                </div>

                <div className="space-y-4">
                  <h4 className="text-md font-medium text-gray-800">Emergency Contact</h4>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="teacher-emergency-name">Emergency Contact Name</Label>
                      <Input
                        id="teacher-emergency-name"
                        value={formData.emergency_contact_name}
                        onChange={(e) => setFormData({ ...formData, emergency_contact_name: e.target.value })}
                        placeholder="Enter emergency contact name"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="teacher-emergency-phone">Emergency Contact Phone</Label>
                      <Input
                        id="teacher-emergency-phone"
                        type="tel"
                        value={formData.emergency_contact_phone}
                        onChange={(e) => setFormData({ ...formData, emergency_contact_phone: e.target.value })}
                        placeholder="Enter emergency contact phone"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="teacher-emergency-relation">Relation</Label>
                      <Input
                        id="teacher-emergency-relation"
                        value={formData.emergency_contact_relation}
                        onChange={(e) => setFormData({ ...formData, emergency_contact_relation: e.target.value })}
                        placeholder="Enter relation (e.g., Spouse, Parent, Sibling)"
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}

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
                disabled={loading || !formData.name.trim() || !formData.email.trim()}
                className="min-w-[120px]"
              >
                {loading ? (
                  <div className="flex items-center space-x-2">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    <span>Updating...</span>
                  </div>
                ) : (
                  'Update User'
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
