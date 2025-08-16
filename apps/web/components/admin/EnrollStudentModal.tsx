'use client'

import { useState } from 'react'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
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

interface EnrollStudentModalProps {
  student: Student
  onClose: () => void
  onStudentEnrolled: () => void
  availableClasses: any[]
}

export default function EnrollStudentModal({ 
  student, 
  onClose, 
  onStudentEnrolled, 
  availableClasses 
}: EnrollStudentModalProps) {
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    class_id: '',
    roll_number: ''
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.class_id) {
      toast.error('Please select a class')
      return
    }

    try {
      setLoading(true)

      // Check if student is already enrolled in any class
      const { data: existingEnrollment, error: checkError } = await supabase
        .from('class_enrollments')
        .select('id, classes(name, section)')
        .eq('student_id', student.id)
        .eq('status', 'active')
        .single()

      if (checkError && checkError.code !== 'PGRST116') {
        console.error('Error checking enrollment:', checkError)
        toast.error('Failed to check existing enrollment')
        return
      }

      if (existingEnrollment) {
        toast.error(`Student is already enrolled in ${existingEnrollment.classes?.name} - ${existingEnrollment.classes?.section}`)
        return
      }

      // Check if roll number is already taken in the selected class
      if (formData.roll_number) {
        const { data: rollCheck, error: rollError } = await supabase
          .from('class_enrollments')
          .select('id')
          .eq('class_id', formData.class_id)
          .eq('roll_number', parseInt(formData.roll_number))
          .eq('status', 'active')

        if (rollError) {
          console.error('Error checking roll number:', rollError)
          toast.error('Failed to validate roll number')
          return
        }

        if (rollCheck && rollCheck.length > 0) {
          toast.error('This roll number is already assigned to another student in this class')
          return
        }
      }

      // Create enrollment
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
        toast.error('Failed to enroll student')
        return
      }

      // Also update the students table with class assignment
      const { error: studentUpdateError } = await supabase
        .from('students')
        .update({
          class_id: formData.class_id,
          roll_number: formData.roll_number ? parseInt(formData.roll_number) : null
        })
        .eq('id', student.id)

      if (studentUpdateError) {
        console.error('Error updating student class:', studentUpdateError)
        // Don't return here as enrollment was successful
      }

      toast.success('Student enrolled successfully!')
      onStudentEnrolled()
    } catch (error) {
      console.error('Error enrolling student:', error)
      toast.error('Failed to enroll student')
    } finally {
      setLoading(false)
    }
  }

  const selectedClass = availableClasses.find(cls => cls.id === formData.class_id)

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Enroll Student</DialogTitle>
          <DialogDescription>
            Assign {student.name} to a class
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label className="text-sm font-medium text-gray-500">Student</Label>
            <div className="p-3 bg-gray-50 rounded-lg border border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">{student.name}</p>
                  <p className="text-sm text-gray-600">{student.email}</p>
                </div>
                {student.student_id && (
                  <Badge variant="outline" className="bg-gray-100 text-gray-700 border-gray-300">
                    ID: {student.student_id}
                  </Badge>
                )}
              </div>
            </div>
          </div>

          <div>
            <Label htmlFor="class_id">Select Class *</Label>
            <Select 
              value={formData.class_id} 
              onValueChange={(value) => setFormData({ ...formData, class_id: value })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Choose a class" />
              </SelectTrigger>
              <SelectContent>
                {availableClasses.map((cls) => (
                  <SelectItem key={cls.id} value={cls.id}>
                    <div className="flex flex-col">
                      <span>{cls.name} - {cls.section}</span>
                      <span className="text-xs text-gray-500">Grade {cls.grade_level}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {selectedClass && (
            <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
              <h4 className="font-medium text-blue-900 mb-2">Selected Class</h4>
              <div className="flex flex-wrap gap-2">
                <Badge className="bg-blue-100 text-blue-800 border-blue-200">
                  {selectedClass.name}
                </Badge>
                <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-300">
                  Section {selectedClass.section}
                </Badge>
                <Badge variant="outline" className="bg-gray-50 text-gray-600 border-gray-300">
                  Grade {selectedClass.grade_level}
                </Badge>
              </div>
            </div>
          )}

          <div>
            <Label htmlFor="roll_number">Roll Number (Optional)</Label>
            <Input
              id="roll_number"
              type="number"
              value={formData.roll_number}
              onChange={(e) => setFormData({ ...formData, roll_number: e.target.value })}
              placeholder="Enter roll number"
              min="1"
            />
            <p className="text-xs text-gray-500 mt-1">
              Leave empty to assign later
            </p>
          </div>

          <div className="flex justify-end space-x-2 pt-4">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading || !formData.class_id}>
              {loading ? 'Enrolling...' : 'Enroll Student'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
