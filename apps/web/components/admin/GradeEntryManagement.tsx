'use client'

import { useState, useEffect } from 'react'
import { toast } from 'sonner'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { 
  Edit, 
  Search,
  Calendar,
  Users,
  BookOpen,
  CheckCircle,
  Clock,
  AlertTriangle,
  Filter
} from 'lucide-react'
import { supabase } from '@/lib/supabase'
import GradeEntryModal from './GradeEntryModal'

interface ExamForGrading {
  id: string
  name: string
  exam_date: string
  max_marks: number
  pass_marks: number
  status: string
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
    id: string
    name: string
    section: string
    grade_level: number
  }
  grade_stats: {
    total_students: number
    grades_entered: number
    completion_percentage: number
  }
}

interface Class {
  id: string
  name: string
  section: string
  grade_level: number
}

interface Subject {
  id: string
  name: string
  code: string
}

interface ExamType {
  id: string
  name: string
}

export default function GradeEntryManagement() {
  const [exams, setExams] = useState<ExamForGrading[]>([])
  const [classes, setClasses] = useState<Class[]>([])
  const [subjects, setSubjects] = useState<Subject[]>([])
  const [examTypes, setExamTypes] = useState<ExamType[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [classFilter, setClassFilter] = useState<string>('all')
  const [subjectFilter, setSubjectFilter] = useState<string>('all')
  const [typeFilter, setTypeFilter] = useState<string>('all')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [showGradeModal, setShowGradeModal] = useState(false)
  const [selectedExam, setSelectedExam] = useState<ExamForGrading | null>(null)

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    setLoading(true)
    try {
      await Promise.all([
        fetchExams(),
        fetchClasses(),
        fetchSubjects(),
        fetchExamTypes()
      ])
    } catch (error) {
      console.error('Error fetching data:', error)
      toast.error('Failed to load data')
    } finally {
      setLoading(false)
    }
  }

  const fetchExams = async () => {
    const { data: examsData, error } = await supabase
      .from('exams')
      .select(`
        *,
        exam_type:exam_types(name, weightage),
        subject:subjects(name, code),
        class:classes(id, name, section, grade_level)
      `)
      .order('exam_date', { ascending: false })

    if (error) throw error

    // Fetch grade statistics for each exam
    const examsWithStats = await Promise.all(
      (examsData || []).map(async (exam) => {
        // Get total students in class
        const { data: enrollments, error: enrollmentError } = await supabase
          .from('class_enrollments')
          .select('student_id')
          .eq('class_id', exam.class.id)
          .eq('status', 'active')

        if (enrollmentError) throw enrollmentError

        const totalStudents = enrollments?.length || 0

        // Get grades entered for this exam
        const { data: grades, error: gradesError } = await supabase
          .from('exam_grades')
          .select('id')
          .eq('exam_id', exam.id)

        if (gradesError) throw gradesError

        const gradesEntered = grades?.length || 0
        const completionPercentage = totalStudents > 0 ? (gradesEntered / totalStudents) * 100 : 0

        return {
          ...exam,
          grade_stats: {
            total_students: totalStudents,
            grades_entered: gradesEntered,
            completion_percentage: completionPercentage
          }
        }
      })
    )

    setExams(examsWithStats)
  }

  const fetchClasses = async () => {
    const { data, error } = await supabase
      .from('classes')
      .select('id, name, section, grade_level')
      .eq('is_active', true)
      .order('grade_level', { ascending: true })
      .order('name')

    if (error) throw error
    setClasses(data || [])
  }

  const fetchSubjects = async () => {
    const { data, error } = await supabase
      .from('subjects')
      .select('id, name, code')
      .eq('is_active', true)
      .order('name')

    if (error) throw error
    setSubjects(data || [])
  }

  const fetchExamTypes = async () => {
    const { data, error } = await supabase
      .from('exam_types')
      .select('id, name')
      .eq('is_active', true)
      .order('name')

    if (error) throw error
    setExamTypes(data || [])
  }

  const handleGradeEntry = (exam: ExamForGrading) => {
    setSelectedExam(exam)
    setShowGradeModal(true)
  }

  const getStatusBadge = (exam: ExamForGrading) => {
    const { completion_percentage } = exam.grade_stats
    
    if (completion_percentage === 100) {
      return <Badge className="bg-green-100 text-green-800">Complete</Badge>
    } else if (completion_percentage > 0) {
      return <Badge className="bg-yellow-100 text-yellow-800">In Progress</Badge>
    } else {
      return <Badge className="bg-gray-100 text-gray-800">Not Started</Badge>
    }
  }

  const getStatusIcon = (exam: ExamForGrading) => {
    const { completion_percentage } = exam.grade_stats
    
    if (completion_percentage === 100) {
      return <CheckCircle className="h-4 w-4 text-green-500" />
    } else if (completion_percentage > 0) {
      return <Clock className="h-4 w-4 text-yellow-500" />
    } else {
      return <AlertTriangle className="h-4 w-4 text-gray-500" />
    }
  }

  const filteredExams = exams.filter(exam => {
    const matchesSearch = exam.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         exam.subject.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         exam.class.name.toLowerCase().includes(searchTerm.toLowerCase())
    
    const matchesClass = classFilter === 'all' || exam.class.id === classFilter
    const matchesSubject = subjectFilter === 'all' || exam.subject.name === subjectFilter
    const matchesType = typeFilter === 'all' || exam.exam_type.name === typeFilter
    
    let matchesStatus = true
    if (statusFilter !== 'all') {
      const { completion_percentage } = exam.grade_stats
      if (statusFilter === 'complete' && completion_percentage !== 100) matchesStatus = false
      if (statusFilter === 'progress' && (completion_percentage === 0 || completion_percentage === 100)) matchesStatus = false
      if (statusFilter === 'pending' && completion_percentage !== 0) matchesStatus = false
    }
    
    return matchesSearch && matchesClass && matchesSubject && matchesType && matchesStatus
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
      {/* Header and Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Grade Entry Management</CardTitle>
          <CardDescription>
            Enter and manage student grades for completed examinations
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search exams..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            
            <Select value={classFilter} onValueChange={setClassFilter}>
              <SelectTrigger>
                <SelectValue placeholder="All Classes" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Classes</SelectItem>
                {classes.map((cls) => (
                  <SelectItem key={cls.id} value={cls.id}>
                    {cls.name} - Section {cls.section}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={subjectFilter} onValueChange={setSubjectFilter}>
              <SelectTrigger>
                <SelectValue placeholder="All Subjects" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Subjects</SelectItem>
                {subjects.map((subject) => (
                  <SelectItem key={subject.id} value={subject.name}>
                    {subject.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger>
                <SelectValue placeholder="All Types" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                {examTypes.map((type) => (
                  <SelectItem key={type.id} value={type.name}>
                    {type.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger>
                <SelectValue placeholder="All Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="progress">In Progress</SelectItem>
                <SelectItem value="complete">Complete</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="text-sm text-gray-500">
            {filteredExams.length} of {exams.length} exams
          </div>
        </CardContent>
      </Card>

      {/* Exams List */}
      <div className="space-y-4">
        {filteredExams.length === 0 ? (
          <Card>
            <CardContent className="text-center py-8">
              <Edit className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No Exams Found</h3>
              <p className="text-gray-500">
                {searchTerm || classFilter !== 'all' || subjectFilter !== 'all' || typeFilter !== 'all' || statusFilter !== 'all'
                  ? 'No exams match your current filters.'
                  : 'No exams are available for grade entry.'}
              </p>
            </CardContent>
          </Card>
        ) : (
          filteredExams.map((exam) => (
            <Card key={exam.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-lg font-semibold text-gray-900">{exam.name}</h3>
                      {getStatusBadge(exam)}
                      {exam.grades_published && (
                        <Badge variant="outline" className="text-green-600 border-green-600">
                          Published
                        </Badge>
                      )}
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-sm text-gray-600 mb-3">
                      <div className="flex items-center">
                        <BookOpen className="h-4 w-4 mr-2" />
                        <span>{exam.subject.name} ({exam.subject.code})</span>
                      </div>
                      <div className="flex items-center">
                        <Users className="h-4 w-4 mr-2" />
                        <span>{exam.class.name} - Section {exam.class.section}</span>
                      </div>
                      <div className="flex items-center">
                        <Calendar className="h-4 w-4 mr-2" />
                        <span>{new Date(exam.exam_date).toLocaleDateString()}</span>
                      </div>
                      <div className="flex items-center">
                        {getStatusIcon(exam)}
                        <span className="ml-2">
                          {exam.grade_stats.grades_entered}/{exam.grade_stats.total_students} students
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-4 text-sm text-gray-500">
                      <span>Type: {exam.exam_type.name}</span>
                      <span>Max Marks: {exam.max_marks}</span>
                      <span>Pass Marks: {exam.pass_marks}</span>
                      <span>Progress: {exam.grade_stats.completion_percentage.toFixed(1)}%</span>
                    </div>

                    {/* Progress Bar */}
                    <div className="mt-3">
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div 
                          className={`h-2 rounded-full ${
                            exam.grade_stats.completion_percentage === 100 ? 'bg-green-500' :
                            exam.grade_stats.completion_percentage > 0 ? 'bg-yellow-500' : 'bg-gray-300'
                          }`}
                          style={{ width: `${exam.grade_stats.completion_percentage}%` }}
                        ></div>
                      </div>
                    </div>
                  </div>

                  <div className="ml-4">
                    <Button 
                      onClick={() => handleGradeEntry(exam)}
                      disabled={exam.status !== 'completed' && exam.status !== 'ongoing'}
                    >
                      <Edit className="h-4 w-4 mr-2" />
                      Enter Grades
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Grade Entry Modal */}
      <GradeEntryModal
        exam={selectedExam}
        isOpen={showGradeModal}
        onClose={() => {
          setShowGradeModal(false)
          setSelectedExam(null)
        }}
        onGradesSaved={fetchExams}
      />
    </div>
  )
}
