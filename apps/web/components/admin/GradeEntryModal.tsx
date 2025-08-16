'use client'

import { useState, useEffect } from 'react'
import { toast } from 'sonner'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { 
  Save, 
  Users, 
  BookOpen, 
  Calendar,
  AlertTriangle,
  CheckCircle,
  XCircle
} from 'lucide-react'
import { supabase } from '@/lib/supabase'

interface Exam {
  id: string
  name: string
  exam_date: string
  max_marks: number
  pass_marks: number
  allow_decimal_marks: boolean
  subject: {
    name: string
    code: string
  }
  class: {
    name: string
    section: string
  }
}

interface Student {
  id: string
  name: string
  student_id: string
  roll_number: number
}

interface Grade {
  student_id: string
  marks_obtained: number | null
  is_absent: boolean
  is_exempted: boolean
  remarks: string
}

interface GradeEntryModalProps {
  exam: Exam | null
  isOpen: boolean
  onClose: () => void
  onGradesSaved: () => void
}

export default function GradeEntryModal({ exam, isOpen, onClose, onGradesSaved }: GradeEntryModalProps) {
  const [students, setStudents] = useState<Student[]>([])
  const [grades, setGrades] = useState<Record<string, Grade>>({})
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [existingGrades, setExistingGrades] = useState<Record<string, any>>({})

  useEffect(() => {
    if (isOpen && exam) {
      fetchStudentsAndGrades()
    }
  }, [isOpen, exam])

  const fetchStudentsAndGrades = async () => {
    if (!exam) return

    setLoading(true)
    try {
      // Fetch students enrolled in the exam's class
      const { data: enrollments, error: enrollmentError } = await supabase
        .from('class_enrollments')
        .select(`
          student_id,
          roll_number,
          students!inner(
            id,
            student_id,
            profiles!inner(name)
          )
        `)
        .eq('class_id', exam.class.id)
        .eq('status', 'active')
        .eq('students.is_active', true)
        .order('roll_number', { ascending: true })

      if (enrollmentError) throw enrollmentError

      const studentList = enrollments?.map(enrollment => ({
        id: enrollment.students.id,
        name: enrollment.students.profiles.name,
        student_id: enrollment.students.student_id,
        roll_number: enrollment.roll_number
      })) || []

      setStudents(studentList)

      // Fetch existing grades for this exam
      const { data: existingGradesData, error: gradesError } = await supabase
        .from('exam_grades')
        .select('*')
        .eq('exam_id', exam.id)

      if (gradesError) throw gradesError

      // Convert existing grades to lookup object
      const gradesLookup: Record<string, any> = {}
      const currentGrades: Record<string, Grade> = {}

      existingGradesData?.forEach(grade => {
        gradesLookup[grade.student_id] = grade
        currentGrades[grade.student_id] = {
          student_id: grade.student_id,
          marks_obtained: grade.marks_obtained,
          is_absent: grade.is_absent,
          is_exempted: grade.is_exempted,
          remarks: grade.remarks || ''
        }
      })

      // Initialize grades for students without existing grades
      studentList.forEach(student => {
        if (!currentGrades[student.id]) {
          currentGrades[student.id] = {
            student_id: student.id,
            marks_obtained: null,
            is_absent: false,
            is_exempted: false,
            remarks: ''
          }
        }
      })

      setExistingGrades(gradesLookup)
      setGrades(currentGrades)
    } catch (error) {
      console.error('Error fetching students and grades:', error)
      toast.error('Failed to load student data')
    } finally {
      setLoading(false)
    }
  }

  const updateGrade = (studentId: string, field: keyof Grade, value: any) => {
    setGrades(prev => ({
      ...prev,
      [studentId]: {
        ...prev[studentId],
        [field]: value
      }
    }))
  }

  const validateGrades = (): boolean => {
    if (!exam) return false

    for (const studentId in grades) {
      const grade = grades[studentId]
      
      // Skip validation for absent or exempted students
      if (grade.is_absent || grade.is_exempted) continue

      // Check if marks are provided
      if (grade.marks_obtained === null || grade.marks_obtained === undefined) {
        const student = students.find(s => s.id === studentId)
        toast.error(`Please enter marks for ${student?.name || 'student'} or mark as absent/exempted`)
        return false
      }

      // Validate marks range
      if (grade.marks_obtained < 0 || grade.marks_obtained > exam.max_marks) {
        const student = students.find(s => s.id === studentId)
        toast.error(`Marks for ${student?.name || 'student'} must be between 0 and ${exam.max_marks}`)
        return false
      }

      // Validate decimal marks if not allowed
      if (!exam.allow_decimal_marks && grade.marks_obtained % 1 !== 0) {
        const student = students.find(s => s.id === studentId)
        toast.error(`Decimal marks not allowed for ${student?.name || 'student'}`)
        return false
      }
    }

    return true
  }

  const handleSave = async () => {
    if (!exam || !validateGrades()) return

    setSaving(true)
    try {
      const gradeEntries = Object.values(grades).map(grade => ({
        exam_id: exam.id,
        student_id: grade.student_id,
        marks_obtained: grade.is_absent || grade.is_exempted ? null : grade.marks_obtained,
        is_absent: grade.is_absent,
        is_exempted: grade.is_exempted,
        remarks: grade.remarks.trim() || null,
        entered_at: new Date().toISOString()
      }))

      // Use upsert to handle both new entries and updates
      const { error } = await supabase
        .from('exam_grades')
        .upsert(gradeEntries, {
          onConflict: 'exam_id,student_id'
        })

      if (error) throw error

      toast.success('Grades saved successfully!')
      onGradesSaved()
      onClose()
    } catch (error) {
      console.error('Error saving grades:', error)
      toast.error('Failed to save grades')
    } finally {
      setSaving(false)
    }
  }

  const getGradeStatus = (studentId: string) => {
    const grade = grades[studentId]
    if (!grade) return 'pending'
    
    if (grade.is_absent) return 'absent'
    if (grade.is_exempted) return 'exempted'
    if (grade.marks_obtained !== null) {
      return grade.marks_obtained >= exam!.pass_marks ? 'pass' : 'fail'
    }
    return 'pending'
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pass':
        return 'bg-green-100 text-green-800'
      case 'fail':
        return 'bg-red-100 text-red-800'
      case 'absent':
        return 'bg-gray-100 text-gray-800'
      case 'exempted':
        return 'bg-blue-100 text-blue-800'
      default:
        return 'bg-yellow-100 text-yellow-800'
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pass':
        return <CheckCircle className="h-4 w-4" />
      case 'fail':
        return <XCircle className="h-4 w-4" />
      case 'absent':
      case 'exempted':
        return <AlertTriangle className="h-4 w-4" />
      default:
        return null
    }
  }

  if (!exam) return null

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Grade Entry - {exam.name}</DialogTitle>
          <DialogDescription>
            Enter grades for students in {exam.class.name} - Section {exam.class.section}
          </DialogDescription>
        </DialogHeader>

        {/* Exam Info */}
        <Card className="mb-4">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">Examination Details</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-sm">
              <div className="flex items-center">
                <BookOpen className="h-4 w-4 mr-2 text-blue-600" />
                <span>{exam.subject.name} ({exam.subject.code})</span>
              </div>
              <div className="flex items-center">
                <Users className="h-4 w-4 mr-2 text-green-600" />
                <span>{exam.class.name} - Section {exam.class.section}</span>
              </div>
              <div className="flex items-center">
                <Calendar className="h-4 w-4 mr-2 text-purple-600" />
                <span>{new Date(exam.exam_date).toLocaleDateString()}</span>
              </div>
              <div className="text-gray-600">
                Max Marks: {exam.max_marks} | Pass Marks: {exam.pass_marks}
              </div>
            </div>
          </CardContent>
        </Card>

        {loading ? (
          <div className="flex items-center justify-center h-32">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Grade Entry Table */}
            <div className="border rounded-lg overflow-hidden">
              <div className="bg-gray-50 px-4 py-3 border-b">
                <h3 className="font-medium text-gray-900">Student Grades</h3>
              </div>
              
              <div className="max-h-96 overflow-y-auto">
                {students.map((student) => {
                  const grade = grades[student.id]
                  const status = getGradeStatus(student.id)
                  
                  return (
                    <div key={student.id} className="border-b last:border-b-0 p-4 hover:bg-gray-50">
                      <div className="grid grid-cols-1 md:grid-cols-6 gap-4 items-center">
                        {/* Student Info */}
                        <div className="md:col-span-2">
                          <div className="font-medium text-gray-900">{student.name}</div>
                          <div className="text-sm text-gray-500">
                            Roll: {student.roll_number} | ID: {student.student_id}
                          </div>
                        </div>

                        {/* Marks Input */}
                        <div className="space-y-2">
                          <Label htmlFor={`marks-${student.id}`}>Marks</Label>
                          <Input
                            id={`marks-${student.id}`}
                            type="number"
                            value={grade?.marks_obtained || ''}
                            onChange={(e) => updateGrade(student.id, 'marks_obtained', 
                              e.target.value ? parseFloat(e.target.value) : null)}
                            disabled={grade?.is_absent || grade?.is_exempted}
                            min="0"
                            max={exam.max_marks}
                            step={exam.allow_decimal_marks ? "0.1" : "1"}
                            placeholder="Enter marks"
                            className="w-full"
                          />
                        </div>

                        {/* Status Checkboxes */}
                        <div className="space-y-2">
                          <div className="flex items-center space-x-2">
                            <Checkbox
                              id={`absent-${student.id}`}
                              checked={grade?.is_absent || false}
                              onCheckedChange={(checked) => {
                                updateGrade(student.id, 'is_absent', checked)
                                if (checked) {
                                  updateGrade(student.id, 'is_exempted', false)
                                  updateGrade(student.id, 'marks_obtained', null)
                                }
                              }}
                            />
                            <Label htmlFor={`absent-${student.id}`} className="text-sm">Absent</Label>
                          </div>
                          <div className="flex items-center space-x-2">
                            <Checkbox
                              id={`exempted-${student.id}`}
                              checked={grade?.is_exempted || false}
                              onCheckedChange={(checked) => {
                                updateGrade(student.id, 'is_exempted', checked)
                                if (checked) {
                                  updateGrade(student.id, 'is_absent', false)
                                  updateGrade(student.id, 'marks_obtained', null)
                                }
                              }}
                            />
                            <Label htmlFor={`exempted-${student.id}`} className="text-sm">Exempted</Label>
                          </div>
                        </div>

                        {/* Remarks */}
                        <div className="space-y-2">
                          <Label htmlFor={`remarks-${student.id}`}>Remarks</Label>
                          <Input
                            id={`remarks-${student.id}`}
                            value={grade?.remarks || ''}
                            onChange={(e) => updateGrade(student.id, 'remarks', e.target.value)}
                            placeholder="Optional remarks"
                            className="w-full"
                          />
                        </div>

                        {/* Status Badge */}
                        <div className="flex justify-center">
                          <Badge className={`${getStatusColor(status)} flex items-center gap-1`}>
                            {getStatusIcon(status)}
                            {status.charAt(0).toUpperCase() + status.slice(1)}
                          </Badge>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Summary */}
            <Card>
              <CardContent className="pt-4">
                <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-center">
                  <div>
                    <div className="text-2xl font-bold text-blue-600">
                      {students.length}
                    </div>
                    <div className="text-sm text-gray-600">Total Students</div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-green-600">
                      {Object.values(grades).filter(g => getGradeStatus(g.student_id) === 'pass').length}
                    </div>
                    <div className="text-sm text-gray-600">Pass</div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-red-600">
                      {Object.values(grades).filter(g => getGradeStatus(g.student_id) === 'fail').length}
                    </div>
                    <div className="text-sm text-gray-600">Fail</div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-gray-600">
                      {Object.values(grades).filter(g => g.is_absent).length}
                    </div>
                    <div className="text-sm text-gray-600">Absent</div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-yellow-600">
                      {Object.values(grades).filter(g => getGradeStatus(g.student_id) === 'pending').length}
                    </div>
                    <div className="text-sm text-gray-600">Pending</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Actions */}
        <div className="flex justify-end space-x-2 pt-4 border-t">
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={saving || loading}>
            <Save className="h-4 w-4 mr-2" />
            {saving ? 'Saving...' : 'Save Grades'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
