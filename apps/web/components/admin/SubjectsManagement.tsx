'use client'

import { useState, useEffect } from 'react'
import { toast } from 'sonner'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import { 
  Plus, 
  Edit, 
  Trash2, 
  Search,
  BookOpen,
  Filter,
  Eye,
  EyeOff
} from 'lucide-react'
import { supabase } from '@/lib/supabase'

interface Subject {
  id: string
  name: string
  code: string
  description: string | null
  grade_level: number
  is_core_subject: boolean
  max_marks: number
  pass_marks: number
  is_active: boolean
  created_at: string
  updated_at: string
}

interface SubjectFormData {
  name: string
  code: string
  description: string
  grade_level: string
  is_core_subject: boolean
  max_marks: string
  pass_marks: string
  is_active: boolean
}

export default function SubjectsManagement() {
  const [subjects, setSubjects] = useState<Subject[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [gradeFilter, setGradeFilter] = useState<string>('all')
  const [typeFilter, setTypeFilter] = useState<string>('all')
  const [showModal, setShowModal] = useState(false)
  const [editingSubject, setEditingSubject] = useState<Subject | null>(null)
  const [saving, setSaving] = useState(false)
  const [deletingSubject, setDeletingSubject] = useState<Subject | null>(null)
  const [togglingStatus, setTogglingStatus] = useState<string | null>(null)
  
  const [formData, setFormData] = useState<SubjectFormData>({
    name: '',
    code: '',
    description: '',
    grade_level: '',
    is_core_subject: true,
    max_marks: '100',
    pass_marks: '40',
    is_active: true
  })

  const gradeOptions = Array.from({ length: 12 }, (_, i) => i + 1)

  useEffect(() => {
    fetchSubjects()
  }, [])

  const fetchSubjects = async () => {
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('subjects')
        .select('*')
        .order('grade_level', { ascending: true })
        .order('name')

      if (error) throw error
      setSubjects(data || [])
    } catch (error) {
      console.error('Error fetching subjects:', error)
      toast.error('Failed to load subjects')
    } finally {
      setLoading(false)
    }
  }

  const handleInputChange = (field: keyof SubjectFormData, value: string | boolean) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  const validateForm = (): boolean => {
    if (!formData.name.trim()) {
      toast.error('Subject name is required')
      return false
    }
    if (!formData.code.trim()) {
      toast.error('Subject code is required')
      return false
    }
    if (!formData.grade_level) {
      toast.error('Grade level is required')
      return false
    }
    if (!formData.max_marks || parseInt(formData.max_marks) <= 0) {
      toast.error('Valid maximum marks is required')
      return false
    }
    if (!formData.pass_marks || parseInt(formData.pass_marks) <= 0) {
      toast.error('Valid pass marks is required')
      return false
    }
    if (parseInt(formData.pass_marks) > parseInt(formData.max_marks)) {
      toast.error('Pass marks cannot be greater than maximum marks')
      return false
    }
    return true
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!validateForm()) return

    setSaving(true)
    try {
      const subjectData = {
        name: formData.name.trim(),
        code: formData.code.trim().toUpperCase(),
        description: formData.description.trim() || null,
        grade_level: parseInt(formData.grade_level),
        is_core_subject: formData.is_core_subject,
        max_marks: parseInt(formData.max_marks),
        pass_marks: parseInt(formData.pass_marks),
        is_active: formData.is_active
      }

      if (editingSubject) {
        const { error } = await supabase
          .from('subjects')
          .update(subjectData)
          .eq('id', editingSubject.id)

        if (error) throw error
        toast.success('Subject updated successfully!')
      } else {
        const { error } = await supabase
          .from('subjects')
          .insert([subjectData])

        if (error) throw error
        toast.success('Subject created successfully!')
      }

      fetchSubjects()
      handleCloseModal()
    } catch (error: any) {
      console.error('Error saving subject:', error)
      if (error.code === '23505') {
        toast.error('Subject code already exists for this grade level')
      } else {
        toast.error('Failed to save subject')
      }
    } finally {
      setSaving(false)
    }
  }

  const handleEdit = (subject: Subject) => {
    setEditingSubject(subject)
    setFormData({
      name: subject.name,
      code: subject.code,
      description: subject.description || '',
      grade_level: subject.grade_level.toString(),
      is_core_subject: subject.is_core_subject,
      max_marks: subject.max_marks.toString(),
      pass_marks: subject.pass_marks.toString(),
      is_active: subject.is_active
    })
    setShowModal(true)
  }

  const handleDelete = async () => {
    if (!deletingSubject) return

    try {
      const { error } = await supabase
        .from('subjects')
        .delete()
        .eq('id', deletingSubject.id)

      if (error) throw error
      toast.success('Subject deleted successfully!')
      fetchSubjects()
      setDeletingSubject(null)
    } catch (error) {
      console.error('Error deleting subject:', error)
      toast.error('Failed to delete subject. It may be in use by existing exams.')
      setDeletingSubject(null)
    }
  }

  const handleToggleStatus = async (subject: Subject) => {
    setTogglingStatus(subject.id)
    try {
      const { error } = await supabase
        .from('subjects')
        .update({ is_active: !subject.is_active })
        .eq('id', subject.id)

      if (error) throw error
      toast.success(`Subject ${!subject.is_active ? 'activated' : 'deactivated'} successfully!`)
      fetchSubjects()
    } catch (error) {
      console.error('Error updating subject status:', error)
      toast.error('Failed to update subject status')
    } finally {
      setTogglingStatus(null)
    }
  }

  const handleCloseModal = () => {
    setShowModal(false)
    setEditingSubject(null)
    setFormData({
      name: '',
      code: '',
      description: '',
      grade_level: '',
      is_core_subject: true,
      max_marks: '100',
      pass_marks: '40',
      is_active: true
    })
  }

  const filteredSubjects = subjects.filter(subject => {
    const matchesSearch = subject.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         subject.code.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesGrade = gradeFilter === 'all' || subject.grade_level.toString() === gradeFilter
    const matchesType = typeFilter === 'all' || 
                       (typeFilter === 'core' && subject.is_core_subject) ||
                       (typeFilter === 'elective' && !subject.is_core_subject)
    
    return matchesSearch && matchesGrade && matchesType
  })

  if (loading) {
    return (
      <div className="flex items-center justify-center h-32">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Header and Actions */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Subjects Management</CardTitle>
              <CardDescription>
                Manage academic subjects, grading scales, and configurations
              </CardDescription>
            </div>
            <Button onClick={() => setShowModal(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Add Subject
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search subjects..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            
            <Select value={gradeFilter} onValueChange={setGradeFilter}>
              <SelectTrigger>
                <SelectValue placeholder="All Grades" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Grades</SelectItem>
                {gradeOptions.map(grade => (
                  <SelectItem key={grade} value={grade.toString()}>Grade {grade}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger>
                <SelectValue placeholder="All Types" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="core">Core Subjects</SelectItem>
                <SelectItem value="elective">Elective Subjects</SelectItem>
              </SelectContent>
            </Select>

            <div className="text-sm text-gray-500 flex items-center">
              {filteredSubjects.length} of {subjects.length} subjects
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Subjects List */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredSubjects.length === 0 ? (
          <div className="col-span-full">
            <Card>
              <CardContent className="text-center py-8">
                <BookOpen className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No Subjects Found</h3>
                <p className="text-gray-500 mb-4">
                  {searchTerm || gradeFilter !== 'all' || typeFilter !== 'all' 
                    ? 'No subjects match your current filters.' 
                    : 'Get started by creating your first subject.'}
                </p>
                <Button onClick={() => setShowModal(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add First Subject
                </Button>
              </CardContent>
            </Card>
          </div>
        ) : (
          filteredSubjects.map((subject) => (
            <Card key={subject.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-semibold text-lg text-gray-900">{subject.name}</h3>
                      <Badge variant="outline" className="text-xs">{subject.code}</Badge>
                    </div>
                    <p className="text-sm text-gray-600 mb-2">
                      {subject.description || 'No description'}
                    </p>
                  </div>
                  <div className="flex items-center gap-1 ml-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleToggleStatus(subject)}
                      disabled={togglingStatus === subject.id}
                      title={subject.is_active ? 'Deactivate' : 'Activate'}
                    >
                      {togglingStatus === subject.id ? (
                        <div className="h-4 w-4 animate-spin rounded-full border-2 border-gray-300 border-t-gray-600"></div>
                      ) : (
                        subject.is_active ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />
                      )}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleEdit(subject)}
                      title="Edit"
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button
                          variant="outline"
                          size="sm"
                          title="Delete"
                          className="text-red-600 hover:text-red-700"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Delete Subject</AlertDialogTitle>
                          <AlertDialogDescription>
                            Are you sure you want to delete "{subject.name}"? This action cannot be undone and may affect existing classes or exams.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => {
                              setDeletingSubject(subject)
                              handleDelete()
                            }}
                            className="bg-red-600 hover:bg-red-700"
                          >
                            Delete
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600">Grade Level:</span>
                    <Badge variant="secondary">Grade {subject.grade_level}</Badge>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600">Type:</span>
                    <Badge variant={subject.is_core_subject ? "default" : "outline"}>
                      {subject.is_core_subject ? 'Core' : 'Elective'}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600">Marks:</span>
                    <span className="font-medium">{subject.pass_marks}/{subject.max_marks}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600">Status:</span>
                    <Badge variant={subject.is_active ? "default" : "secondary"}>
                      {subject.is_active ? 'Active' : 'Inactive'}
                    </Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Create/Edit Modal */}
      <Dialog open={showModal} onOpenChange={handleCloseModal}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingSubject ? 'Edit Subject' : 'Create New Subject'}</DialogTitle>
            <DialogDescription>
              {editingSubject ? 'Update the subject details below.' : 'Add a new subject to the system.'}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">Subject Name *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => handleInputChange('name', e.target.value)}
                  placeholder="e.g., Mathematics"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="code">Subject Code *</Label>
                <Input
                  id="code"
                  value={formData.code}
                  onChange={(e) => handleInputChange('code', e.target.value)}
                  placeholder="e.g., MATH9"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => handleInputChange('description', e.target.value)}
                placeholder="Brief description of the subject"
                rows={2}
              />
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="grade_level">Grade Level *</Label>
                <Select value={formData.grade_level} onValueChange={(value) => handleInputChange('grade_level', value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select grade" />
                  </SelectTrigger>
                  <SelectContent>
                    {gradeOptions.map(grade => (
                      <SelectItem key={grade} value={grade.toString()}>Grade {grade}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="max_marks">Max Marks *</Label>
                <Input
                  id="max_marks"
                  type="number"
                  value={formData.max_marks}
                  onChange={(e) => handleInputChange('max_marks', e.target.value)}
                  min="1"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="pass_marks">Pass Marks *</Label>
                <Input
                  id="pass_marks"
                  type="number"
                  value={formData.pass_marks}
                  onChange={(e) => handleInputChange('pass_marks', e.target.value)}
                  min="1"
                  required
                />
              </div>
            </div>

            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="is_core_subject"
                  checked={formData.is_core_subject}
                  onCheckedChange={(checked) => handleInputChange('is_core_subject', checked as boolean)}
                />
                <Label htmlFor="is_core_subject">Core Subject</Label>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="is_active"
                  checked={formData.is_active}
                  onCheckedChange={(checked) => handleInputChange('is_active', checked as boolean)}
                />
                <Label htmlFor="is_active">Active</Label>
              </div>
            </div>

            <div className="flex justify-end space-x-2 pt-4">
              <Button type="button" variant="outline" onClick={handleCloseModal}>
                Cancel
              </Button>
              <Button type="submit" disabled={saving}>
                {saving ? 'Saving...' : editingSubject ? 'Update' : 'Create'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
