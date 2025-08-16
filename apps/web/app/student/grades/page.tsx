'use client'

import { useState, useEffect } from 'react'
import { toast } from 'sonner'
import StudentLayout from '@/components/student/StudentLayout'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import {
  TrendingUp,
  TrendingDown,
  Minus,
  BookOpen,
  Calendar,
  Award,
  Target,
  BarChart3,
  FileText,
  Clock,
  CheckCircle,
  XCircle,
  AlertTriangle
} from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/lib/stores/auth-store'

interface ExamGrade {
  id: string
  marks_obtained: number | null
  percentage: number | null
  grade_letter: string | null
  grade_points: number | null
  is_pass: boolean | null
  is_absent: boolean
  is_exempted: boolean
  remarks: string | null
  entered_at: string | null
  exam: {
    id: string
    name: string
    exam_date: string
    max_marks: number
    pass_marks: number
    grades_published: boolean
    exam_type: {
      name: string
      weightage: number
    }
    subject: {
      name: string
      code: string
    }
    class: {
      name: string
      section: string
    }
  }
}

interface SubjectSummary {
  subject_id: string
  subject_name: string
  subject_code: string
  total_exams: number
  completed_exams: number
  average_percentage: number
  average_grade: string
  total_marks: number
  obtained_marks: number
  grades: ExamGrade[]
}

interface AcademicYear {
  id: string
  year: string
  start_date: string
  end_date: string
  is_current: boolean
}

export default function StudentGrades() {
  const { user } = useAuthStore()
  const [loading, setLoading] = useState(true)
  const [grades, setGrades] = useState<ExamGrade[]>([])
  const [subjectSummaries, setSubjectSummaries] = useState<SubjectSummary[]>([])
  const [academicYears, setAcademicYears] = useState<AcademicYear[]>([])
  const [selectedYear, setSelectedYear] = useState<string>('')
  const [stats, setStats] = useState({
    totalExams: 0,
    completedExams: 0,
    averagePercentage: 0,
    overallGPA: 0
  })

  useEffect(() => {
    if (user) {
      fetchAcademicYears()
    }
  }, [user])

  useEffect(() => {
    if (selectedYear) {
      fetchGrades()
    }
  }, [selectedYear])

  const fetchAcademicYears = async () => {
    try {
      const { data, error } = await supabase
        .from('academic_years')
        .select('*')
        .order('start_date', { ascending: false })

      if (error) throw error

      setAcademicYears(data || [])

      // Set current academic year as default
      const currentYear = data?.find(year => year.is_current)
      if (currentYear) {
        setSelectedYear(currentYear.id)
      } else if (data && data.length > 0) {
        setSelectedYear(data[0].id)
      }
    } catch (error) {
      console.error('Error fetching academic years:', error)
      toast.error('Failed to load academic years')
    }
  }

  const fetchGrades = async () => {
    if (!user || !selectedYear) return

    setLoading(true)
    try {
      // Get student ID
      const { data: studentData, error: studentError } = await supabase
        .from('students')
        .select('id')
        .eq('id', user.id)
        .single()

      if (studentError) throw studentError

      // Fetch exam grades for the student
      const { data: gradesData, error: gradesError } = await supabase
        .from('exam_grades')
        .select(`
          *,
          exam:exams!inner(
            id,
            name,
            exam_date,
            max_marks,
            pass_marks,
            grades_published,
            exam_type:exam_types(name, weightage),
            subject:subjects(name, code),
            class:classes(name, section)
          )
        `)
        .eq('student_id', studentData.id)
        .eq('exam.grades_published', true)
        .order('exam.exam_date', { ascending: false })

      if (gradesError) throw gradesError

      const formattedGrades = gradesData || []
      setGrades(formattedGrades)

      // Calculate subject summaries
      calculateSubjectSummaries(formattedGrades)
      calculateStats(formattedGrades)

    } catch (error) {
      console.error('Error fetching grades:', error)
      toast.error('Failed to load grades')
    } finally {
      setLoading(false)
    }
  }

  const calculateSubjectSummaries = (gradesData: ExamGrade[]) => {
    const subjectMap = new Map<string, SubjectSummary>()

    gradesData.forEach(grade => {
      const subjectKey = grade.exam.subject.name

      if (!subjectMap.has(subjectKey)) {
        subjectMap.set(subjectKey, {
          subject_id: subjectKey,
          subject_name: grade.exam.subject.name,
          subject_code: grade.exam.subject.code,
          total_exams: 0,
          completed_exams: 0,
          average_percentage: 0,
          average_grade: '',
          total_marks: 0,
          obtained_marks: 0,
          grades: []
        })
      }

      const summary = subjectMap.get(subjectKey)!
      summary.grades.push(grade)
      summary.total_exams++

      if (!grade.is_absent && !grade.is_exempted && grade.marks_obtained !== null) {
        summary.completed_exams++
        summary.total_marks += grade.exam.max_marks
        summary.obtained_marks += grade.marks_obtained
      }
    })

    // Calculate averages
    const summaries = Array.from(subjectMap.values()).map(summary => {
      if (summary.completed_exams > 0) {
        summary.average_percentage = (summary.obtained_marks / summary.total_marks) * 100
        summary.average_grade = calculateGradeLetter(summary.average_percentage)
      }
      return summary
    })

    setSubjectSummaries(summaries)
  }

  const calculateStats = (gradesData: ExamGrade[]) => {
    const totalExams = gradesData.length
    const completedExams = gradesData.filter(g => !g.is_absent && !g.is_exempted && g.marks_obtained !== null).length

    let totalPercentage = 0
    let totalGradePoints = 0
    let validGrades = 0

    gradesData.forEach(grade => {
      if (!grade.is_absent && !grade.is_exempted && grade.percentage !== null) {
        totalPercentage += grade.percentage
        validGrades++
      }
      if (grade.grade_points !== null) {
        totalGradePoints += grade.grade_points
      }
    })

    const averagePercentage = validGrades > 0 ? totalPercentage / validGrades : 0
    const overallGPA = validGrades > 0 ? totalGradePoints / validGrades : 0

    setStats({
      totalExams,
      completedExams,
      averagePercentage,
      overallGPA
    })
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

  const getGradeColor = (grade: string | null) => {
    if (!grade) return 'text-gray-500'
    if (grade.startsWith('A')) return 'text-green-600'
    if (grade.startsWith('B')) return 'text-blue-600'
    if (grade.startsWith('C')) return 'text-yellow-600'
    if (grade.startsWith('D')) return 'text-orange-600'
    return 'text-red-600'
  }

  const getStatusIcon = (grade: ExamGrade) => {
    if (grade.is_absent) return <AlertTriangle className="h-4 w-4 text-gray-500" />
    if (grade.is_exempted) return <AlertTriangle className="h-4 w-4 text-blue-500" />
    if (grade.is_pass) return <CheckCircle className="h-4 w-4 text-green-500" />
    if (grade.is_pass === false) return <XCircle className="h-4 w-4 text-red-500" />
    return <Clock className="h-4 w-4 text-yellow-500" />
  }

  if (loading) {
    return (
      <StudentLayout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      </StudentLayout>
    )
  }

  return (
    <StudentLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">My Grades</h1>
            <p className="text-gray-500">Track your academic performance and exam results</p>
          </div>
          <div className="space-y-2">
            <Select value={selectedYear} onValueChange={setSelectedYear}>
              <SelectTrigger className="w-48">
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
        </div>

        {/* Performance Overview */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="border-blue-200 bg-blue-50/50">
            <CardHeader className="pb-3">
              <CardDescription className="text-blue-600">Total Exams</CardDescription>
              <CardTitle className="text-2xl text-blue-700">{stats.totalExams}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center text-blue-600">
                <FileText className="h-4 w-4 mr-1" />
                <span className="text-sm">All examinations</span>
              </div>
            </CardContent>
          </Card>

          <Card className="border-green-200 bg-green-50/50">
            <CardHeader className="pb-3">
              <CardDescription className="text-green-600">Completed</CardDescription>
              <CardTitle className="text-2xl text-green-700">{stats.completedExams}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center text-green-600">
                <CheckCircle className="h-4 w-4 mr-1" />
                <span className="text-sm">Exams taken</span>
              </div>
            </CardContent>
          </Card>

          <Card className="border-purple-200 bg-purple-50/50">
            <CardHeader className="pb-3">
              <CardDescription className="text-purple-600">Average</CardDescription>
              <CardTitle className="text-2xl text-purple-700">{stats.averagePercentage.toFixed(1)}%</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center text-purple-600">
                <BarChart3 className="h-4 w-4 mr-1" />
                <span className="text-sm">Overall performance</span>
              </div>
            </CardContent>
          </Card>

          <Card className="border-yellow-200 bg-yellow-50/50">
            <CardHeader className="pb-3">
              <CardDescription className="text-yellow-600">GPA</CardDescription>
              <CardTitle className="text-2xl text-yellow-700">{stats.overallGPA.toFixed(2)}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center text-yellow-600">
                <Award className="h-4 w-4 mr-1" />
                <span className="text-sm">Grade point average</span>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Content */}
        <Tabs defaultValue="subjects" className="space-y-4">
          <TabsList>
            <TabsTrigger value="subjects">By Subject</TabsTrigger>
            <TabsTrigger value="exams">All Exams</TabsTrigger>
            <TabsTrigger value="analytics">Analytics</TabsTrigger>
          </TabsList>

          <TabsContent value="subjects" className="space-y-4">
            {subjectSummaries.length === 0 ? (
              <Card>
                <CardContent className="text-center py-8">
                  <BookOpen className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No Grades Available</h3>
                  <p className="text-gray-500">
                    Your exam results will appear here once they are published by your teachers.
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {subjectSummaries.map((subject) => (
                  <Card key={subject.subject_id}>
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <div>
                          <CardTitle className="text-lg">{subject.subject_name}</CardTitle>
                          <CardDescription>{subject.subject_code}</CardDescription>
                        </div>
                        <div className="text-right">
                          <div className={`text-2xl font-bold ${getGradeColor(subject.average_grade)}`}>
                            {subject.average_grade || 'N/A'}
                          </div>
                          <div className="text-sm text-gray-500">{subject.average_percentage.toFixed(1)}%</div>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {/* Progress Bar */}
                      <div>
                        <div className="flex justify-between text-sm mb-1">
                          <span>Performance</span>
                          <span>{subject.average_percentage.toFixed(1)}%</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div
                            className={`h-2 rounded-full ${
                              subject.average_percentage >= 90 ? 'bg-green-500' :
                              subject.average_percentage >= 80 ? 'bg-blue-500' :
                              subject.average_percentage >= 70 ? 'bg-yellow-500' :
                              subject.average_percentage >= 60 ? 'bg-orange-500' : 'bg-red-500'
                            }`}
                            style={{ width: `${Math.min(subject.average_percentage, 100)}%` }}
                          ></div>
                        </div>
                      </div>

                      {/* Exam Summary */}
                      <div className="grid grid-cols-2 gap-4 text-center">
                        <div>
                          <div className="text-lg font-semibold text-blue-600">{subject.completed_exams}</div>
                          <div className="text-xs text-gray-500">Completed</div>
                        </div>
                        <div>
                          <div className="text-lg font-semibold text-gray-600">{subject.total_exams}</div>
                          <div className="text-xs text-gray-500">Total Exams</div>
                        </div>
                      </div>

                      {/* Recent Exams */}
                      <div>
                        <h4 className="font-medium text-sm mb-2">Recent Exams</h4>
                        <div className="space-y-2">
                          {subject.grades.slice(0, 3).map((grade) => (
                            <div key={grade.id} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                              <div className="flex items-center gap-2">
                                {getStatusIcon(grade)}
                                <div>
                                  <div className="font-medium text-sm">{grade.exam.name}</div>
                                  <div className="text-xs text-gray-500">
                                    {new Date(grade.exam.exam_date).toLocaleDateString()}
                                  </div>
                                </div>
                              </div>
                              <div className="text-right">
                                {grade.is_absent ? (
                                  <div className="text-sm text-gray-500">Absent</div>
                                ) : grade.is_exempted ? (
                                  <div className="text-sm text-blue-500">Exempted</div>
                                ) : (
                                  <>
                                    <div className={`font-medium ${getGradeColor(grade.grade_letter)}`}>
                                      {grade.grade_letter || 'N/A'}
                                    </div>
                                    <div className="text-xs text-gray-500">
                                      {grade.marks_obtained}/{grade.exam.max_marks}
                                    </div>
                                  </>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="exams" className="space-y-4">
            {grades.length === 0 ? (
              <Card>
                <CardContent className="text-center py-8">
                  <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No Exam Results</h3>
                  <p className="text-gray-500">
                    Your exam results will appear here once they are published.
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {grades.map((grade) => (
                  <Card key={grade.id}>
                    <CardContent className="p-6">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <h3 className="text-lg font-semibold text-gray-900">{grade.exam.name}</h3>
                            {getStatusIcon(grade)}
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-sm text-gray-600 mb-3">
                            <div className="flex items-center">
                              <BookOpen className="h-4 w-4 mr-2" />
                              <span>{grade.exam.subject.name} ({grade.exam.subject.code})</span>
                            </div>
                            <div className="flex items-center">
                              <Calendar className="h-4 w-4 mr-2" />
                              <span>{new Date(grade.exam.exam_date).toLocaleDateString()}</span>
                            </div>
                            <div className="flex items-center">
                              <Target className="h-4 w-4 mr-2" />
                              <span>{grade.exam.exam_type.name}</span>
                            </div>
                            <div className="flex items-center">
                              <Award className="h-4 w-4 mr-2" />
                              <span>Max: {grade.exam.max_marks} | Pass: {grade.exam.pass_marks}</span>
                            </div>
                          </div>

                          {grade.remarks && (
                            <div className="text-sm text-gray-600 italic">
                              Remarks: {grade.remarks}
                            </div>
                          )}
                        </div>

                        <div className="text-right ml-4">
                          {grade.is_absent ? (
                            <div>
                              <div className="text-lg font-bold text-gray-500">Absent</div>
                              <div className="text-sm text-gray-400">Not taken</div>
                            </div>
                          ) : grade.is_exempted ? (
                            <div>
                              <div className="text-lg font-bold text-blue-500">Exempted</div>
                              <div className="text-sm text-blue-400">Excused</div>
                            </div>
                          ) : (
                            <div>
                              <div className={`text-2xl font-bold ${getGradeColor(grade.grade_letter)}`}>
                                {grade.grade_letter || 'N/A'}
                              </div>
                              <div className="text-sm text-gray-500">
                                {grade.marks_obtained}/{grade.exam.max_marks}
                              </div>
                              <div className="text-sm text-gray-500">
                                {grade.percentage?.toFixed(1)}%
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="analytics" className="space-y-4">
            {/* Grade Scale */}
            <Card>
              <CardHeader>
                <CardTitle>Grading Scale</CardTitle>
                <CardDescription>Understanding your grades</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="text-center p-3 bg-green-50 rounded-lg">
                    <div className="font-bold text-green-600">A+</div>
                    <div className="text-sm text-green-700">90-100%</div>
                    <div className="text-xs text-green-600">Outstanding</div>
                  </div>
                  <div className="text-center p-3 bg-blue-50 rounded-lg">
                    <div className="font-bold text-blue-600">A</div>
                    <div className="text-sm text-blue-700">80-89%</div>
                    <div className="text-xs text-blue-600">Excellent</div>
                  </div>
                  <div className="text-center p-3 bg-yellow-50 rounded-lg">
                    <div className="font-bold text-yellow-600">B+</div>
                    <div className="text-sm text-yellow-700">70-79%</div>
                    <div className="text-xs text-yellow-600">Very Good</div>
                  </div>
                  <div className="text-center p-3 bg-orange-50 rounded-lg">
                    <div className="font-bold text-orange-600">B</div>
                    <div className="text-sm text-orange-700">60-69%</div>
                    <div className="text-xs text-orange-600">Good</div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Performance Trends */}
            <Card className="border-dashed border-2 border-gray-300">
              <CardContent className="text-center py-8">
                <div className="text-4xl mb-4">📊</div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">Advanced Analytics Coming Soon</h3>
                <p className="text-gray-500 mb-4">
                  Detailed grade trends, progress tracking, and performance insights are currently under development.
                </p>
                <div className="flex flex-wrap justify-center gap-2">
                  <Badge variant="outline">Grade Trends</Badge>
                  <Badge variant="outline">Progress Reports</Badge>
                  <Badge variant="outline">Performance Analytics</Badge>
                  <Badge variant="outline">Goal Setting</Badge>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </StudentLayout>
  )
}
