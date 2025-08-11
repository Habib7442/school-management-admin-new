'use client'

import { useState } from 'react'
import AdminLayout from '@/components/admin/AdminLayout'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useClasses } from '@/hooks/useClasses'
import { useTeachers } from '@/hooks/useUsers'
import { usePermissions } from '@/hooks/usePermissions'

export default function ClassManagement() {
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedSubject, setSelectedSubject] = useState<string>('all')
  const [showCreateModal, setShowCreateModal] = useState(false)
  
  const { classes, loading, createClass, updateClass, deleteClass } = useClasses()
  const { users: teachers } = useTeachers()
  const { canCreateClasses, canUpdateClasses, canDeleteClasses } = usePermissions()

  const subjects = ['Mathematics', 'Science', 'English', 'History', 'Art', 'Physical Education']

  const filteredClasses = classes.filter(classItem => {
    const matchesSearch = classItem.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         classItem.subject.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesSubject = selectedSubject === 'all' || classItem.subject === selectedSubject
    return matchesSearch && matchesSubject
  })

  const handleDeleteClass = async (classId: string) => {
    if (confirm('Are you sure you want to delete this class?')) {
      await deleteClass(classId)
    }
  }

  const getStatusColor = (isActive: boolean) => {
    return isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
  }

  return (
    <AdminLayout title="Class Management">
      <div className="space-y-6">
        {/* Header Actions */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="flex flex-col sm:flex-row gap-4 flex-1">
            <div className="flex-1 max-w-sm">
              <Input
                placeholder="Search classes..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full"
              />
            </div>
            <select
              value={selectedSubject}
              onChange={(e) => setSelectedSubject(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Subjects</option>
              {subjects.map(subject => (
                <option key={subject} value={subject}>{subject}</option>
              ))}
            </select>
          </div>
          {canCreateClasses && (
            <Button
              onClick={() => setShowCreateModal(true)}
              className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
            >
              Create Class
            </Button>
          )}
        </div>

        {/* Classes Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {loading ? (
            <div className="col-span-full text-center py-8">Loading classes...</div>
          ) : filteredClasses.length === 0 ? (
            <div className="col-span-full text-center py-8 text-gray-500">
              No classes found matching your criteria.
            </div>
          ) : (
            filteredClasses.map((classItem) => (
              <Card key={classItem.id} className="hover:shadow-lg transition-shadow">
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle className="text-lg">{classItem.name}</CardTitle>
                      <CardDescription>{classItem.subject} • Grade {classItem.grade_level}</CardDescription>
                    </div>
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(classItem.is_active)}`}>
                      {classItem.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {classItem.description && (
                      <p className="text-sm text-gray-600">{classItem.description}</p>
                    )}
                    
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-500">Teacher:</span>
                      <span className="font-medium">
                        {classItem.teacher?.name || 'Not assigned'}
                      </span>
                    </div>
                    
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-500">Enrolled:</span>
                      <span className="font-medium">
                        {classItem.enrollment_count || 0} / {classItem.max_students}
                      </span>
                    </div>
                    
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-blue-600 h-2 rounded-full" 
                        style={{ 
                          width: `${Math.min(((classItem.enrollment_count || 0) / classItem.max_students) * 100, 100)}%` 
                        }}
                      ></div>
                    </div>
                    
                    <div className="flex justify-end space-x-2 pt-2">
                      {canUpdateClasses && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {/* TODO: Open edit modal */}}
                        >
                          Edit
                        </Button>
                      )}
                      {canDeleteClasses && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDeleteClass(classItem.id)}
                          className="text-red-600 hover:text-red-700 hover:bg-red-50"
                        >
                          Delete
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>

        {/* Statistics */}
        <Card>
          <CardHeader>
            <CardTitle>Class Statistics</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">{classes.length}</div>
                <div className="text-sm text-gray-500">Total Classes</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">
                  {classes.filter(c => c.is_active).length}
                </div>
                <div className="text-sm text-gray-500">Active Classes</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-purple-600">
                  {classes.reduce((sum, c) => sum + (c.enrollment_count || 0), 0)}
                </div>
                <div className="text-sm text-gray-500">Total Enrollments</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-orange-600">
                  {teachers.length}
                </div>
                <div className="text-sm text-gray-500">Available Teachers</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Create Class Modal */}
      {showCreateModal && (
        <CreateClassModal
          onClose={() => setShowCreateModal(false)}
          onClassCreated={() => {
            setShowCreateModal(false)
            // Classes will be refreshed automatically by the hook
          }}
          teachers={teachers}
          subjects={subjects}
          createClass={createClass}
        />
      )}
    </AdminLayout>
  )
}

function CreateClassModal({ 
  onClose, 
  onClassCreated, 
  teachers, 
  subjects, 
  createClass 
}: { 
  onClose: () => void
  onClassCreated: () => void
  teachers: any[]
  subjects: string[]
  createClass: (data: any) => Promise<any>
}) {
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    subject: subjects[0] || '',
    grade_level: '',
    teacher_id: '',
    max_students: 30
  })
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const result = await createClass({
        ...formData,
        teacher_id: formData.teacher_id || undefined
      })

      if (!result.error) {
        onClassCreated()
      }
    } catch (error) {
      console.error('Error creating class:', error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <Card className="w-full max-w-md mx-4 max-h-[90vh] overflow-y-auto">
        <CardHeader>
          <CardTitle>Create New Class</CardTitle>
          <CardDescription>Add a new class to the system</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="name">Class Name</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
              />
            </div>
            <div>
              <Label htmlFor="subject">Subject</Label>
              <select
                id="subject"
                value={formData.subject}
                onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              >
                {subjects.map(subject => (
                  <option key={subject} value={subject}>{subject}</option>
                ))}
              </select>
            </div>
            <div>
              <Label htmlFor="grade_level">Grade Level</Label>
              <Input
                id="grade_level"
                value={formData.grade_level}
                onChange={(e) => setFormData({ ...formData, grade_level: e.target.value })}
                placeholder="e.g., 9, 10, 11, 12"
                required
              />
            </div>
            <div>
              <Label htmlFor="teacher_id">Teacher (Optional)</Label>
              <select
                id="teacher_id"
                value={formData.teacher_id}
                onChange={(e) => setFormData({ ...formData, teacher_id: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Select a teacher</option>
                {teachers.map(teacher => (
                  <option key={teacher.id} value={teacher.id}>{teacher.name}</option>
                ))}
              </select>
            </div>
            <div>
              <Label htmlFor="max_students">Maximum Students</Label>
              <Input
                id="max_students"
                type="number"
                value={formData.max_students}
                onChange={(e) => setFormData({ ...formData, max_students: parseInt(e.target.value) || 30 })}
                min="1"
                max="100"
              />
            </div>
            <div>
              <Label htmlFor="description">Description (Optional)</Label>
              <textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                rows={3}
              />
            </div>
            <div className="flex justify-end space-x-2 pt-4">
              <Button type="button" variant="outline" onClick={onClose}>
                Cancel
              </Button>
              <Button type="submit" disabled={loading}>
                {loading ? 'Creating...' : 'Create Class'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
