'use client'

import { useState, useEffect } from 'react'
import { toast } from 'sonner'
import { useAuthStore } from '@/lib/stores/auth-store'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog'
import { 
  Plus, 
  Edit, 
  Trash2, 
  Search,
  MoreHorizontal,
  Eye,
  EyeOff
} from 'lucide-react'
import { supabase } from '@/lib/supabase'

interface ExamType {
  id: string
  name: string
  description: string
  weightage: number
  is_active: boolean
  created_at: string
  updated_at: string
}

interface ExamTypeFormData {
  name: string
  description: string
  weightage: string
  is_active: boolean
}

export default function ExamTypesManagement() {
  const { user } = useAuthStore()
  const [examTypes, setExamTypes] = useState<ExamType[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [editingType, setEditingType] = useState<ExamType | null>(null)
  const [saving, setSaving] = useState(false)

  const [togglingStatus, setTogglingStatus] = useState<string | null>(null)
  
  const [formData, setFormData] = useState<ExamTypeFormData>({
    name: '',
    description: '',
    weightage: '',
    is_active: true
  })

  useEffect(() => {
    if (user?.school_id) {
      fetchExamTypes()
    }
  }, [user?.school_id])

  const fetchExamTypes = async () => {
    if (!user?.school_id) {
      console.error('No school_id found for user')
      setLoading(false)
      return
    }

    setLoading(true)
    try {
      console.log('Fetching exam types for school:', user.school_id)
      const { data, error } = await supabase
        .from('exam_types')
        .select('*')
        .eq('school_id', user.school_id)
        .order('created_at', { ascending: false })

      if (error) {
        console.error('Supabase fetch error:', error)
        throw error
      }
      console.log('Fetched exam types:', data)
      setExamTypes(data || [])
    } catch (error) {
      console.error('Error fetching exam types:', error)
      toast.error('Failed to load exam types')
    } finally {
      setLoading(false)
    }
  }

  const handleInputChange = (field: keyof ExamTypeFormData, value: string | boolean) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  const validateForm = (): boolean => {
    if (!formData.name.trim()) {
      toast.error('Exam type name is required')
      return false
    }
    if (!formData.weightage || parseFloat(formData.weightage) <= 0 || parseFloat(formData.weightage) > 100) {
      toast.error('Weightage must be between 1 and 100')
      return false
    }
    return true
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!validateForm()) return

    if (!user?.school_id) {
      toast.error('No school information found')
      return
    }

    setSaving(true)
    try {
      const examTypeData = {
        name: formData.name.trim(),
        description: formData.description.trim() || null,
        weightage: parseFloat(formData.weightage),
        is_active: formData.is_active,
        school_id: user.school_id
      }

      if (editingType) {
        console.log('Updating exam type:', editingType.id, 'with data:', examTypeData)
        const { error } = await supabase
          .from('exam_types')
          .update(examTypeData)
          .eq('id', editingType.id)

        if (error) {
          console.error('Supabase update error:', error)
          throw error
        }
        console.log('Update successful, refreshing data...')
        toast.success('Exam type updated successfully!')
      } else {
        console.log('Creating new exam type with data:', examTypeData)
        const { error } = await supabase
          .from('exam_types')
          .insert([examTypeData])

        if (error) {
          console.error('Supabase insert error:', error)
          throw error
        }
        console.log('Insert successful, refreshing data...')
        toast.success('Exam type created successfully!')
      }

      await fetchExamTypes()
      handleCloseModal()
    } catch (error) {
      console.error('Error saving exam type:', error)
      toast.error('Failed to save exam type')
    } finally {
      setSaving(false)
    }
  }

  const handleEdit = (examType: ExamType) => {
    setEditingType(examType)
    setFormData({
      name: examType.name,
      description: examType.description || '',
      weightage: examType.weightage.toString(),
      is_active: examType.is_active
    })
    setShowModal(true)
  }

  const handleDelete = async (examType: ExamType) => {
    try {
      console.log('Deleting exam type:', examType.id)
      const { error } = await supabase
        .from('exam_types')
        .delete()
        .eq('id', examType.id)

      if (error) {
        console.error('Supabase delete error:', error)
        throw error
      }

      console.log('Delete successful, refreshing data...')
      toast.success('Exam type deleted successfully!')
      await fetchExamTypes()
    } catch (error) {
      console.error('Error deleting exam type:', error)
      toast.error('Failed to delete exam type. It may be in use by existing exams.')
    }
  }

  const handleToggleStatus = async (examType: ExamType) => {
    setTogglingStatus(examType.id)
    try {
      console.log('Toggling status for exam type:', examType.id, 'from', examType.is_active, 'to', !examType.is_active)
      const { error } = await supabase
        .from('exam_types')
        .update({ is_active: !examType.is_active })
        .eq('id', examType.id)

      if (error) {
        console.error('Supabase update error:', error)
        throw error
      }

      console.log('Status toggle successful, refreshing data...')
      toast.success(`Exam type ${!examType.is_active ? 'activated' : 'deactivated'} successfully!`)
      await fetchExamTypes()
    } catch (error) {
      console.error('Error updating exam type status:', error)
      toast.error('Failed to update exam type status')
    } finally {
      setTogglingStatus(null)
    }
  }

  const handleCloseModal = () => {
    setShowModal(false)
    setEditingType(null)
    setFormData({
      name: '',
      description: '',
      weightage: '',
      is_active: true
    })
  }

  const filteredExamTypes = examTypes.filter(examType =>
    examType.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    examType.description?.toLowerCase().includes(searchTerm.toLowerCase())
  )

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
              <CardTitle>Exam Types Management</CardTitle>
              <CardDescription>
                Configure different types of examinations and their weightages
              </CardDescription>
            </div>
            <Button onClick={() => setShowModal(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Add Exam Type
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search exam types..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <div className="text-sm text-gray-500">
              {filteredExamTypes.length} of {examTypes.length} exam types
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Exam Types List */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredExamTypes.length === 0 ? (
          <div className="col-span-full">
            <Card>
              <CardContent className="text-center py-8">
                <div className="text-4xl mb-4">📝</div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">No Exam Types Found</h3>
                <p className="text-gray-500 mb-4">
                  {searchTerm ? 'No exam types match your search.' : 'Get started by creating your first exam type.'}
                </p>
                <Button onClick={() => setShowModal(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add First Exam Type
                </Button>
              </CardContent>
            </Card>
          </div>
        ) : (
          filteredExamTypes.map((examType) => (
            <Card key={examType.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <h3 className="font-semibold text-lg text-gray-900 mb-1">{examType.name}</h3>
                    <p className="text-sm text-gray-600 mb-2">{examType.description || 'No description'}</p>
                  </div>
                  <div className="flex items-center gap-1 ml-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleToggleStatus(examType)}
                      disabled={togglingStatus === examType.id}
                      title={examType.is_active ? 'Deactivate' : 'Activate'}
                    >
                      {togglingStatus === examType.id ? (
                        <div className="h-4 w-4 animate-spin rounded-full border-2 border-gray-300 border-t-gray-600"></div>
                      ) : (
                        examType.is_active ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />
                      )}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleEdit(examType)}
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
                          <AlertDialogTitle>Delete Exam Type</AlertDialogTitle>
                          <AlertDialogDescription>
                            Are you sure you want to delete "{examType.name}"? This action cannot be undone and may affect existing exams.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => handleDelete(examType)}
                            className="bg-red-600 hover:bg-red-700"
                          >
                            Delete
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Badge variant={examType.is_active ? "default" : "secondary"}>
                      {examType.is_active ? 'Active' : 'Inactive'}
                    </Badge>
                  </div>
                  <div className="text-right">
                    <div className="text-lg font-bold text-blue-600">{examType.weightage}%</div>
                    <div className="text-xs text-gray-500">Weightage</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Create/Edit Modal */}
      <Dialog open={showModal} onOpenChange={handleCloseModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editingType ? 'Edit Exam Type' : 'Create New Exam Type'}</DialogTitle>
            <DialogDescription>
              {editingType ? 'Update the exam type details below.' : 'Add a new exam type to the system.'}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Name *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => handleInputChange('name', e.target.value)}
                placeholder="e.g., Mid-term Exam"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => handleInputChange('description', e.target.value)}
                placeholder="Brief description of this exam type"
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="weightage">Weightage (%) *</Label>
              <Input
                id="weightage"
                type="number"
                value={formData.weightage}
                onChange={(e) => handleInputChange('weightage', e.target.value)}
                placeholder="e.g., 30"
                min="1"
                max="100"
                required
              />
            </div>

            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="is_active"
                checked={formData.is_active}
                onChange={(e) => handleInputChange('is_active', e.target.checked)}
                className="rounded border-gray-300"
              />
              <Label htmlFor="is_active">Active (available for use)</Label>
            </div>

            <div className="flex justify-end space-x-2 pt-4">
              <Button type="button" variant="outline" onClick={handleCloseModal}>
                Cancel
              </Button>
              <Button type="submit" disabled={saving}>
                {saving ? 'Saving...' : editingType ? 'Update' : 'Create'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
