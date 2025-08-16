'use client'

import { useState, useEffect } from 'react'
import { toast } from 'sonner'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import { supabase } from '@/lib/supabase'

interface ExamType {
  id: string
  name: string
  description: string
  weightage: number
}

interface Subject {
  id: string
  name: string
  code: string
  grade_level: number
  max_marks: number
  pass_marks: number
}

interface Class {
  id: string
  name: string
  section: string
  grade_level: number
}

interface CreateExamModalProps {
  isOpen: boolean
  onClose: () => void
  onExamCreated: () => void
}

interface ExamFormData {
  name: string
  description: string
  exam_type_id: string
  subject_id: string
  class_id: string
  exam_date: string
  start_time: string
  end_time: string
  duration_minutes: string
  max_marks: string
  pass_marks: string
  instructions: string
  allow_decimal_marks: boolean
  grade_entry_deadline: string
}

export default function CreateExamModal({ isOpen, onClose, onExamCreated }: CreateExamModalProps) {
  const [loading, setLoading] = useState(false)
  const [examTypes, setExamTypes] = useState<ExamType[]>([])
  const [subjects, setSubjects] = useState<Subject[]>([])
  const [classes, setClasses] = useState<Class[]>([])
  const [filteredSubjects, setFilteredSubjects] = useState<Subject[]>([])
  
  const [formData, setFormData] = useState<ExamFormData>({
    name: '',
    description: '',
    exam_type_id: '',
    subject_id: '',
    class_id: '',
    exam_date: '',
    start_time: '',
    end_time: '',
    duration_minutes: '',
    max_marks: '',
    pass_marks: '',
    instructions: '',
    allow_decimal_marks: false,
    grade_entry_deadline: ''
  })

  useEffect(() => {
    if (isOpen) {
      fetchData()
    }
  }, [isOpen])

  useEffect(() => {
    // Filter subjects based on selected class grade level
    if (formData.class_id) {
      const selectedClass = classes.find(cls => cls.id === formData.class_id)
      if (selectedClass) {
        const filtered = subjects.filter(subject => 
          subject.grade_level === selectedClass.grade_level
        )
        setFilteredSubjects(filtered)
        
        // Reset subject selection if current subject doesn't match grade level
        if (formData.subject_id) {
          const currentSubject = subjects.find(s => s.id === formData.subject_id)
          if (currentSubject && currentSubject.grade_level !== selectedClass.grade_level) {
            setFormData(prev => ({ ...prev, subject_id: '' }))
          }
        }
      }
    } else {
      setFilteredSubjects(subjects)
    }
  }, [formData.class_id, classes, subjects])

  useEffect(() => {
    // Auto-fill marks when subject is selected
    if (formData.subject_id) {
      const selectedSubject = subjects.find(s => s.id === formData.subject_id)
      if (selectedSubject) {
        setFormData(prev => ({
          ...prev,
          max_marks: selectedSubject.max_marks.toString(),
          pass_marks: selectedSubject.pass_marks.toString()
        }))
      }
    }
  }, [formData.subject_id, subjects])

  const fetchData = async () => {
    try {
      const [examTypesRes, subjectsRes, classesRes] = await Promise.all([
        supabase.from('exam_types').select('*').eq('is_active', true).order('name'),
        supabase.from('subjects').select('*').eq('is_active', true).order('grade_level', { ascending: true }).order('name'),
        supabase.from('classes').select('*').eq('is_active', true).order('grade_level', { ascending: true }).order('name')
      ])

      if (examTypesRes.error) throw examTypesRes.error
      if (subjectsRes.error) throw subjectsRes.error
      if (classesRes.error) throw classesRes.error

      setExamTypes(examTypesRes.data || [])
      setSubjects(subjectsRes.data || [])
      setClasses(classesRes.data || [])
      setFilteredSubjects(subjectsRes.data || [])
    } catch (error) {
      console.error('Error fetching data:', error)
      toast.error('Failed to load form data')
    }
  }

  const handleInputChange = (field: keyof ExamFormData, value: string | boolean) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  const calculateDuration = () => {
    if (formData.start_time && formData.end_time) {
      const start = new Date(`2000-01-01T${formData.start_time}`)
      const end = new Date(`2000-01-01T${formData.end_time}`)
      const diffMs = end.getTime() - start.getTime()
      const diffMins = Math.floor(diffMs / (1000 * 60))
      
      if (diffMins > 0) {
        setFormData(prev => ({ ...prev, duration_minutes: diffMins.toString() }))
      }
    }
  }

  useEffect(() => {
    calculateDuration()
  }, [formData.start_time, formData.end_time])

  const validateForm = (): boolean => {
    if (!formData.name.trim()) {
      toast.error('Exam name is required')
      return false
    }
    if (!formData.exam_type_id) {
      toast.error('Please select an exam type')
      return false
    }
    if (!formData.subject_id) {
      toast.error('Please select a subject')
      return false
    }
    if (!formData.class_id) {
      toast.error('Please select a class')
      return false
    }
    if (!formData.exam_date) {
      toast.error('Exam date is required')
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
    if (formData.start_time && formData.end_time && formData.start_time >= formData.end_time) {
      toast.error('End time must be after start time')
      return false
    }

    return true
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!validateForm()) return

    setLoading(true)
    try {
      const examData = {
        name: formData.name.trim(),
        description: formData.description.trim() || null,
        exam_type_id: formData.exam_type_id,
        subject_id: formData.subject_id,
        class_id: formData.class_id,
        exam_date: formData.exam_date,
        start_time: formData.start_time || null,
        end_time: formData.end_time || null,
        duration_minutes: formData.duration_minutes ? parseInt(formData.duration_minutes) : null,
        max_marks: parseInt(formData.max_marks),
        pass_marks: parseInt(formData.pass_marks),
        instructions: formData.instructions.trim() || null,
        allow_decimal_marks: formData.allow_decimal_marks,
        grade_entry_deadline: formData.grade_entry_deadline || null,
        status: 'scheduled'
      }

      const { error } = await supabase
        .from('exams')
        .insert([examData])

      if (error) throw error

      toast.success('Exam created successfully!')
      onExamCreated()
      handleClose()
    } catch (error) {
      console.error('Error creating exam:', error)
      toast.error('Failed to create exam')
    } finally {
      setLoading(false)
    }
  }

  const handleClose = () => {
    setFormData({
      name: '',
      description: '',
      exam_type_id: '',
      subject_id: '',
      class_id: '',
      exam_date: '',
      start_time: '',
      end_time: '',
      duration_minutes: '',
      max_marks: '',
      pass_marks: '',
      instructions: '',
      allow_decimal_marks: false,
      grade_entry_deadline: ''
    })
    onClose()
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create New Examination</DialogTitle>
          <DialogDescription>
            Set up a new examination with schedule, grading, and configuration details.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Basic Information */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-900 border-b pb-2">
              Basic Information
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">Exam Name *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => handleInputChange('name', e.target.value)}
                  placeholder="e.g., Mathematics Mid-term Exam"
                  required
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="exam_type">Exam Type *</Label>
                <Select value={formData.exam_type_id} onValueChange={(value) => handleInputChange('exam_type_id', value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select exam type" />
                  </SelectTrigger>
                  <SelectContent>
                    {examTypes.map((type) => (
                      <SelectItem key={type.id} value={type.id}>
                        {type.name} ({type.weightage}%)
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => handleInputChange('description', e.target.value)}
                placeholder="Brief description of the examination"
                rows={2}
              />
            </div>
          </div>

          {/* Class and Subject */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-900 border-b pb-2">
              Class and Subject
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="class">Class *</Label>
                <Select value={formData.class_id} onValueChange={(value) => handleInputChange('class_id', value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select class" />
                  </SelectTrigger>
                  <SelectContent>
                    {classes.map((cls) => (
                      <SelectItem key={cls.id} value={cls.id}>
                        {cls.name} - Section {cls.section} (Grade {cls.grade_level})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="subject">Subject *</Label>
                <Select value={formData.subject_id} onValueChange={(value) => handleInputChange('subject_id', value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select subject" />
                  </SelectTrigger>
                  <SelectContent>
                    {filteredSubjects.map((subject) => (
                      <SelectItem key={subject.id} value={subject.id}>
                        {subject.name} ({subject.code})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* Schedule */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-900 border-b pb-2">
              Schedule
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="exam_date">Exam Date *</Label>
                <Input
                  id="exam_date"
                  type="date"
                  value={formData.exam_date}
                  onChange={(e) => handleInputChange('exam_date', e.target.value)}
                  min={new Date().toISOString().split('T')[0]}
                  required
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="start_time">Start Time</Label>
                <Input
                  id="start_time"
                  type="time"
                  value={formData.start_time}
                  onChange={(e) => handleInputChange('start_time', e.target.value)}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="end_time">End Time</Label>
                <Input
                  id="end_time"
                  type="time"
                  value={formData.end_time}
                  onChange={(e) => handleInputChange('end_time', e.target.value)}
                />
              </div>
            </div>

            {formData.duration_minutes && (
              <div className="text-sm text-gray-600">
                Duration: {formData.duration_minutes} minutes
              </div>
            )}
          </div>

          {/* Grading */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-900 border-b pb-2">
              Grading Configuration
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="max_marks">Maximum Marks *</Label>
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
              
              <div className="space-y-2">
                <Label htmlFor="grade_entry_deadline">Grade Entry Deadline</Label>
                <Input
                  id="grade_entry_deadline"
                  type="date"
                  value={formData.grade_entry_deadline}
                  onChange={(e) => handleInputChange('grade_entry_deadline', e.target.value)}
                />
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="allow_decimal_marks"
                checked={formData.allow_decimal_marks}
                onCheckedChange={(checked) => handleInputChange('allow_decimal_marks', checked as boolean)}
              />
              <Label htmlFor="allow_decimal_marks">Allow decimal marks (e.g., 85.5)</Label>
            </div>
          </div>

          {/* Instructions */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-900 border-b pb-2">
              Additional Information
            </h3>
            
            <div className="space-y-2">
              <Label htmlFor="instructions">Exam Instructions</Label>
              <Textarea
                id="instructions"
                value={formData.instructions}
                onChange={(e) => handleInputChange('instructions', e.target.value)}
                placeholder="Special instructions for students (optional)"
                rows={3}
              />
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-end space-x-2 pt-4 border-t">
            <Button type="button" variant="outline" onClick={handleClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Creating...' : 'Create Exam'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
