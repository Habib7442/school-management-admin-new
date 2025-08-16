'use client'

import { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useAuthStore } from '@/lib/stores/auth-store'
import { supabase } from '@/lib/supabase'
import { toast } from 'sonner'

interface Student {
  id: string
  name: string
  email: string
  student_id?: string
  phone?: string
  date_of_birth?: string
  address?: string
  emergency_contact?: string
  emergency_phone?: string
  created_at: string
  onboarding_completed: boolean
  class_enrollment?: {
    class_name: string
    section: string
    roll_number?: number
    status: string
  }
}

interface EditStudentModalProps {
  student: Student
  onClose: () => void
  onStudentUpdated: () => void
  availableClasses: any[]
}

export default function EditStudentModal({ 
  student, 
  onClose, 
  onStudentUpdated, 
  availableClasses 
}: EditStudentModalProps) {
  const { user } = useAuthStore()
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    name: student.name,
    email: student.email,
    phone: student.phone || '',
    student_id: student.student_id || '',
    date_of_birth: student.date_of_birth || '',
    address: student.address || '',
    emergency_contact: student.emergency_contact || '',
    emergency_phone: student.emergency_phone || '',
    class_id: '',
    roll_number: student.class_enrollment?.roll_number?.toString() || ''
  })

  // Fetch current student data including class assignment
  useEffect(() => {
    const fetchStudentData = async () => {
      try {
        const { data: studentData, error } = await supabase
          .from('students')
          .select(`
            *,
            classes (
              id,
              name,
              section
            )
          `)
          .eq('id', student.id)
          .single()

        if (error) {
          console.error('Error fetching student data:', error)
          return
        }

        if (studentData) {
          setFormData(prev => ({
            ...prev,
            student_id: studentData.student_id || '',
            date_of_birth: studentData.date_of_birth || '',
            address: studentData.address || '',
            emergency_contact: studentData.emergency_contact_name || '',
            emergency_phone: studentData.emergency_contact_phone || '',
            class_id: studentData.class_id || '',
            roll_number: studentData.roll_number?.toString() || ''
          }))
        }
      } catch (error) {
        console.error('Error fetching student data:', error)
      }
    }

    fetchStudentData()
  }, [student.id])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.name || !formData.email) {
      toast.error('Name and email are required')
      return
    }

    try {
      setLoading(true)

      // Update profile
      const { error: profileError } = await supabase
        .from('profiles')
        .update({
          name: formData.name,
          email: formData.email,
          phone: formData.phone || null
        })
        .eq('id', student.id)

      if (profileError) {
        console.error('Error updating profile:', profileError)
        toast.error('Failed to update profile')
        return
      }

      // Update student record
      const { error: studentError } = await supabase
        .from('students')
        .update({
          student_id: formData.student_id || null,
          date_of_birth: formData.date_of_birth || null,
          address: formData.address || null,
          emergency_contact_name: formData.emergency_contact || null,
          emergency_contact_phone: formData.emergency_phone || null,
          class_id: formData.class_id || null,
          roll_number: formData.roll_number ? parseInt(formData.roll_number) : null
        })
        .eq('id', student.id)

      if (studentError) {
        console.error('Error updating student:', studentError)
        toast.error('Failed to update student information')
        return
      }

      // Update or create enrollment if class is selected
      if (formData.class_id) {
        // Check if enrollment exists
        const { data: existingEnrollment } = await supabase
          .from('class_enrollments')
          .select('id')
          .eq('student_id', student.id)
          .single()

        if (existingEnrollment) {
          // Update existing enrollment
          const { error: enrollmentError } = await supabase
            .from('class_enrollments')
            .update({
              class_id: formData.class_id,
              roll_number: formData.roll_number ? parseInt(formData.roll_number) : null,
              status: 'active'
            })
            .eq('student_id', student.id)

          if (enrollmentError) {
            console.error('Error updating enrollment:', enrollmentError)
            toast.error('Failed to update class enrollment')
            return
          }
        } else {
          // Create new enrollment
          const { error: enrollmentError } = await supabase
            .from('class_enrollments')
            .insert({
              student_id: student.id,
              class_id: formData.class_id,
              roll_number: formData.roll_number ? parseInt(formData.roll_number) : null,
              status: 'active'
            })

          if (enrollmentError) {
            console.error('Error creating enrollment:', enrollmentError)
            toast.error('Failed to create class enrollment')
            return
          }
        }
      } else {
        // Remove enrollment if no class selected
        const { error: deleteError } = await supabase
          .from('class_enrollments')
          .delete()
          .eq('student_id', student.id)

        if (deleteError) {
          console.error('Error removing enrollment:', deleteError)
        }
      }

      toast.success('Student updated successfully!')
      onStudentUpdated()
    } catch (error) {
      console.error('Error updating student:', error)
      toast.error('Failed to update student')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Student</DialogTitle>
          <DialogDescription>
            Update student information and class assignment.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Basic Information */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="name">Full Name *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Enter student's full name"
                required
              />
            </div>
            <div>
              <Label htmlFor="email">Email *</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="Enter email address"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="phone">Phone</Label>
              <Input
                id="phone"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                placeholder="Enter phone number"
              />
            </div>
            <div>
              <Label htmlFor="student_id">Student ID</Label>
              <Input
                id="student_id"
                value={formData.student_id}
                onChange={(e) => setFormData({ ...formData, student_id: e.target.value })}
                placeholder="Enter student ID"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="date_of_birth">Date of Birth</Label>
              <Input
                id="date_of_birth"
                type="date"
                value={formData.date_of_birth}
                onChange={(e) => setFormData({ ...formData, date_of_birth: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="class_id">Class</Label>
              <div className="flex space-x-2">
                <Select value={formData.class_id} onValueChange={(value) => setFormData({ ...formData, class_id: value })}>
                  <SelectTrigger className="flex-1">
                    <SelectValue placeholder="Select a class (optional)" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableClasses.map((cls) => (
                      <SelectItem key={cls.id} value={cls.id}>
                        {cls.name} - {cls.section} (Grade {cls.grade_level})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {formData.class_id && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setFormData({ ...formData, class_id: '', roll_number: '' })}
                  >
                    Clear
                  </Button>
                )}
              </div>
            </div>
          </div>

          {formData.class_id && (
            <div>
              <Label htmlFor="roll_number">Roll Number</Label>
              <Input
                id="roll_number"
                type="number"
                value={formData.roll_number}
                onChange={(e) => setFormData({ ...formData, roll_number: e.target.value })}
                placeholder="Enter roll number"
              />
            </div>
          )}

          <div>
            <Label htmlFor="address">Address</Label>
            <Textarea
              id="address"
              value={formData.address}
              onChange={(e) => setFormData({ ...formData, address: e.target.value })}
              placeholder="Enter full address"
              rows={2}
            />
          </div>

          {/* Emergency Contact */}
          <div className="border-t pt-4">
            <h3 className="font-medium mb-3">Emergency Contact</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="emergency_contact">Emergency Contact Name</Label>
                <Input
                  id="emergency_contact"
                  value={formData.emergency_contact}
                  onChange={(e) => setFormData({ ...formData, emergency_contact: e.target.value })}
                  placeholder="Enter emergency contact name"
                />
              </div>
              <div>
                <Label htmlFor="emergency_phone">Emergency Contact Phone</Label>
                <Input
                  id="emergency_phone"
                  value={formData.emergency_phone}
                  onChange={(e) => setFormData({ ...formData, emergency_phone: e.target.value })}
                  placeholder="Enter emergency contact phone"
                />
              </div>
            </div>
          </div>

          <div className="flex justify-end space-x-2 pt-4">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Updating...' : 'Update Student'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
