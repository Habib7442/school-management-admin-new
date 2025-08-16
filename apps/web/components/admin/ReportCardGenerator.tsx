'use client'

import { useState, useEffect } from 'react'
import { toast } from 'sonner'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { 
  FileText, 
  Download, 
  Users, 
  BookOpen,
  Award,
  Calendar,
  TrendingUp,
  CheckCircle,
  AlertTriangle
} from 'lucide-react'
import { supabase } from '@/lib/supabase'

interface Class {
  id: string
  name: string
  section: string
  grade_level: number
}

interface AcademicYear {
  id: string
  year: string
  start_date: string
  end_date: string
  is_current: boolean
}

interface Student {
  id: string
  name: string
  student_id: string
  roll_number: number
}

interface ReportCardData {
  student: Student
  overall_percentage: number
  overall_grade: string
  overall_gpa: number
  class_rank: number
  total_students: number
  attendance_percentage: number
  subjects: {
    subject_name: string
    subject_code: string
    total_marks: number
    obtained_marks: number
    percentage: number
    grade: string
    exams: {
      exam_name: string
      exam_type: string
      marks_obtained: number
      max_marks: number
      grade: string
    }[]
  }[]
}

interface ReportCardGeneratorProps {
  isOpen: boolean
  onClose: () => void
}

export default function ReportCardGenerator({ isOpen, onClose }: ReportCardGeneratorProps) {
  const [loading, setLoading] = useState(false)
  const [generating, setGenerating] = useState(false)
  const [classes, setClasses] = useState<Class[]>([])
  const [academicYears, setAcademicYears] = useState<AcademicYear[]>([])
  const [students, setStudents] = useState<Student[]>([])
  const [reportCards, setReportCards] = useState<ReportCardData[]>([])
  
  const [selectedClass, setSelectedClass] = useState('')
  const [selectedYear, setSelectedYear] = useState('')
  const [selectedTerm, setSelectedTerm] = useState('')
  const [classTeacherRemarks, setClassTeacherRemarks] = useState('')
  const [principalRemarks, setPrincipalRemarks] = useState('')

  const terms = [
    { value: 'Term 1', label: 'Term 1' },
    { value: 'Term 2', label: 'Term 2' },
    { value: 'Mid-term', label: 'Mid-term' },
    { value: 'Final', label: 'Final' },
    { value: 'Annual', label: 'Annual' }
  ]

  useEffect(() => {
    if (isOpen) {
      fetchData()
    }
  }, [isOpen])

  useEffect(() => {
    if (selectedClass) {
      fetchStudents()
    }
  }, [selectedClass])

  const fetchData = async () => {
    try {
      const [classesRes, yearsRes] = await Promise.all([
        supabase.from('classes').select('*').eq('is_active', true).order('grade_level', { ascending: true }).order('name'),
        supabase.from('academic_years').select('*').order('start_date', { ascending: false })
      ])

      if (classesRes.error) throw classesRes.error
      if (yearsRes.error) throw yearsRes.error

      setClasses(classesRes.data || [])
      setAcademicYears(yearsRes.data || [])

      // Set current academic year as default
      const currentYear = yearsRes.data?.find(year => year.is_current)
      if (currentYear) {
        setSelectedYear(currentYear.id)
      }
    } catch (error) {
      console.error('Error fetching data:', error)
      toast.error('Failed to load form data')
    }
  }

  const fetchStudents = async () => {
    if (!selectedClass) return

    setLoading(true)
    try {
      const { data, error } = await supabase
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
        .eq('class_id', selectedClass)
        .eq('status', 'active')
        .eq('students.is_active', true)
        .order('roll_number', { ascending: true })

      if (error) throw error

      const studentList = data?.map(enrollment => ({
        id: enrollment.students.id,
        name: enrollment.students.profiles.name,
        student_id: enrollment.students.student_id,
        roll_number: enrollment.roll_number
      })) || []

      setStudents(studentList)
    } catch (error) {
      console.error('Error fetching students:', error)
      toast.error('Failed to load students')
    } finally {
      setLoading(false)
    }
  }

  const generateReportCards = async () => {
    if (!selectedClass || !selectedYear || !selectedTerm) {
      toast.error('Please select class, academic year, and term')
      return
    }

    setGenerating(true)
    try {
      const reportCardsData: ReportCardData[] = []

      for (const student of students) {
        // Fetch student's exam grades
        const { data: gradesData, error: gradesError } = await supabase
          .from('exam_grades')
          .select(`
            *,
            exam:exams!inner(
              name,
              max_marks,
              exam_type:exam_types(name),
              subject:subjects(name, code),
              grades_published
            )
          `)
          .eq('student_id', student.id)
          .eq('exam.grades_published', true)

        if (gradesError) throw gradesError

        // Fetch attendance data
        const { data: attendanceData, error: attendanceError } = await supabase
          .from('attendance_records')
          .select('status')
          .eq('student_id', student.id)

        if (attendanceError) throw attendanceError

        // Calculate attendance percentage
        const totalDays = attendanceData?.length || 0
        const presentDays = attendanceData?.filter(record => record.status === 'present').length || 0
        const attendancePercentage = totalDays > 0 ? (presentDays / totalDays) * 100 : 0

        // Group grades by subject
        const subjectMap = new Map()
        
        gradesData?.forEach(grade => {
          const subjectName = grade.exam.subject.name
          if (!subjectMap.has(subjectName)) {
            subjectMap.set(subjectName, {
              subject_name: subjectName,
              subject_code: grade.exam.subject.code,
              total_marks: 0,
              obtained_marks: 0,
              exams: []
            })
          }

          const subject = subjectMap.get(subjectName)
          if (!grade.is_absent && !grade.is_exempted && grade.marks_obtained !== null) {
            subject.total_marks += grade.exam.max_marks
            subject.obtained_marks += grade.marks_obtained
            subject.exams.push({
              exam_name: grade.exam.name,
              exam_type: grade.exam.exam_type.name,
              marks_obtained: grade.marks_obtained,
              max_marks: grade.exam.max_marks,
              grade: grade.grade_letter || 'N/A'
            })
          }
        })

        // Calculate subject percentages and grades
        const subjects = Array.from(subjectMap.values()).map(subject => ({
          ...subject,
          percentage: subject.total_marks > 0 ? (subject.obtained_marks / subject.total_marks) * 100 : 0,
          grade: calculateGradeLetter(subject.total_marks > 0 ? (subject.obtained_marks / subject.total_marks) * 100 : 0)
        }))

        // Calculate overall performance
        const totalMarks = subjects.reduce((sum, subject) => sum + subject.total_marks, 0)
        const totalObtained = subjects.reduce((sum, subject) => sum + subject.obtained_marks, 0)
        const overallPercentage = totalMarks > 0 ? (totalObtained / totalMarks) * 100 : 0
        const overallGrade = calculateGradeLetter(overallPercentage)
        const overallGPA = calculateGPA(overallPercentage)

        reportCardsData.push({
          student,
          overall_percentage: overallPercentage,
          overall_grade: overallGrade,
          overall_gpa: overallGPA,
          class_rank: 0, // Will be calculated after all students
          total_students: students.length,
          attendance_percentage: attendancePercentage,
          subjects
        })
      }

      // Calculate class ranks
      reportCardsData.sort((a, b) => b.overall_percentage - a.overall_percentage)
      reportCardsData.forEach((reportCard, index) => {
        reportCard.class_rank = index + 1
      })

      setReportCards(reportCardsData)
      toast.success('Report cards generated successfully!')

    } catch (error) {
      console.error('Error generating report cards:', error)
      toast.error('Failed to generate report cards')
    } finally {
      setGenerating(false)
    }
  }

  const calculateGradeLetter = (percentage: number): string => {
    if (percentage >= 90) return 'A+'
    if (percentage >= 80) return 'A'
    if (percentage >= 70) return 'B+'
    if (percentage >= 60) return 'B'
    if (percentage >= 50) return 'C+'
    if (percentage >= 40) return 'C'
    if (percentage >= 30) return 'D'
    return 'F'
  }

  const calculateGPA = (percentage: number): number => {
    if (percentage >= 90) return 4.0
    if (percentage >= 80) return 3.7
    if (percentage >= 70) return 3.3
    if (percentage >= 60) return 3.0
    if (percentage >= 50) return 2.3
    if (percentage >= 40) return 2.0
    if (percentage >= 30) return 1.0
    return 0.0
  }

  const saveReportCards = async () => {
    if (reportCards.length === 0) {
      toast.error('No report cards to save')
      return
    }

    try {
      const reportCardEntries = reportCards.map(reportCard => ({
        student_id: reportCard.student.id,
        class_id: selectedClass,
        academic_year_id: selectedYear,
        term: selectedTerm,
        total_marks: reportCard.subjects.reduce((sum, subject) => sum + subject.total_marks, 0),
        marks_obtained: reportCard.subjects.reduce((sum, subject) => sum + subject.obtained_marks, 0),
        overall_percentage: reportCard.overall_percentage,
        overall_grade: reportCard.overall_grade,
        overall_gpa: reportCard.overall_gpa,
        class_rank: reportCard.class_rank,
        total_students: reportCard.total_students,
        attendance_percentage: reportCard.attendance_percentage,
        class_teacher_remarks: classTeacherRemarks.trim() || null,
        principal_remarks: principalRemarks.trim() || null,
        status: 'published'
      }))

      const { error } = await supabase
        .from('report_cards')
        .upsert(reportCardEntries, {
          onConflict: 'student_id,academic_year_id,term,report_type'
        })

      if (error) throw error

      toast.success('Report cards saved successfully!')
      onClose()
    } catch (error) {
      console.error('Error saving report cards:', error)
      toast.error('Failed to save report cards')
    }
  }

  const getGradeColor = (grade: string) => {
    if (grade.startsWith('A')) return 'text-green-600'
    if (grade.startsWith('B')) return 'text-blue-600'
    if (grade.startsWith('C')) return 'text-yellow-600'
    if (grade.startsWith('D')) return 'text-orange-600'
    return 'text-red-600'
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Generate Report Cards</DialogTitle>
          <DialogDescription>
            Generate comprehensive report cards for students with grades, attendance, and remarks.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Configuration */}
          <Card>
            <CardHeader>
              <CardTitle>Report Configuration</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="class">Class *</Label>
                  <Select value={selectedClass} onValueChange={setSelectedClass}>
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
                  <Label htmlFor="year">Academic Year *</Label>
                  <Select value={selectedYear} onValueChange={setSelectedYear}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select academic year" />
                    </SelectTrigger>
                    <SelectContent>
                      {academicYears.map((year) => (
                        <SelectItem key={year.id} value={year.id}>
                          {year.year} {year.is_current && '(Current)'}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="term">Term *</Label>
                  <Select value={selectedTerm} onValueChange={setSelectedTerm}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select term" />
                    </SelectTrigger>
                    <SelectContent>
                      {terms.map((term) => (
                        <SelectItem key={term.value} value={term.value}>
                          {term.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="class-teacher-remarks">Class Teacher Remarks</Label>
                  <Textarea
                    id="class-teacher-remarks"
                    value={classTeacherRemarks}
                    onChange={(e) => setClassTeacherRemarks(e.target.value)}
                    placeholder="General remarks for all students in this class"
                    rows={3}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="principal-remarks">Principal Remarks</Label>
                  <Textarea
                    id="principal-remarks"
                    value={principalRemarks}
                    onChange={(e) => setPrincipalRemarks(e.target.value)}
                    placeholder="Principal's remarks for all students"
                    rows={3}
                  />
                </div>
              </div>

              <div className="flex gap-2">
                <Button 
                  onClick={generateReportCards} 
                  disabled={!selectedClass || !selectedYear || !selectedTerm || generating}
                >
                  <FileText className="h-4 w-4 mr-2" />
                  {generating ? 'Generating...' : 'Generate Report Cards'}
                </Button>
                
                {reportCards.length > 0 && (
                  <Button onClick={saveReportCards} variant="outline">
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Save Report Cards
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Generated Report Cards Preview */}
          {reportCards.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Generated Report Cards ({reportCards.length})</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4 max-h-96 overflow-y-auto">
                  {reportCards.map((reportCard) => (
                    <div key={reportCard.student.id} className="border rounded-lg p-4">
                      <div className="flex items-center justify-between mb-3">
                        <div>
                          <h3 className="font-semibold">{reportCard.student.name}</h3>
                          <p className="text-sm text-gray-500">
                            Roll: {reportCard.student.roll_number} | ID: {reportCard.student.student_id}
                          </p>
                        </div>
                        <div className="text-right">
                          <div className={`text-xl font-bold ${getGradeColor(reportCard.overall_grade)}`}>
                            {reportCard.overall_grade}
                          </div>
                          <div className="text-sm text-gray-500">
                            {reportCard.overall_percentage.toFixed(1)}% | GPA: {reportCard.overall_gpa.toFixed(2)}
                          </div>
                          <div className="text-xs text-gray-400">
                            Rank: {reportCard.class_rank}/{reportCard.total_students}
                          </div>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                        <div>
                          <span className="font-medium">Subjects:</span> {reportCard.subjects.length}
                        </div>
                        <div>
                          <span className="font-medium">Attendance:</span> {reportCard.attendance_percentage.toFixed(1)}%
                        </div>
                        <div>
                          <span className="font-medium">Total Marks:</span> {reportCard.subjects.reduce((sum, s) => sum + s.obtained_marks, 0)}/{reportCard.subjects.reduce((sum, s) => sum + s.total_marks, 0)}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Actions */}
        <div className="flex justify-end space-x-2 pt-4 border-t">
          <Button type="button" variant="outline" onClick={onClose}>
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
