'use client'

import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import AdminLayout from '@/components/admin/AdminLayout'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { 
  Plus, 
  Search, 
  Calendar, 
  Clock, 
  Users, 
  BookOpen,
  FileText,
  TrendingUp,
  Filter,
  MoreHorizontal,
  Edit,
  Trash2,
  Eye
} from 'lucide-react'
import { supabase } from '@/lib/supabase'
import CreateExamModal from '@/components/admin/CreateExamModal'
import GradeEntryModal from '@/components/admin/GradeEntryModal'
import ReportCardGenerator from '@/components/admin/ReportCardGenerator'
import ExamTypesManagement from '@/components/admin/ExamTypesManagement'
import SubjectsManagement from '@/components/admin/SubjectsManagement'
import GradeEntryManagement from '@/components/admin/GradeEntryManagement'

interface ExamType {
  id: string
  name: string
  description: string
  weightage: number
  is_active: boolean
}

interface Subject {
  id: string
  name: string
  code: string
  grade_level: number
  is_core_subject: boolean
  max_marks: number
  pass_marks: number
}

interface Class {
  id: string
  name: string
  section: string
  grade_level: number
}

interface Exam {
  id: string
  name: string
  description: string
  exam_date: string
  start_time: string
  end_time: string
  duration_minutes: number
  max_marks: number
  pass_marks: number
  allow_decimal_marks: boolean
  status: 'scheduled' | 'ongoing' | 'completed' | 'cancelled'
  grades_published: boolean
  exam_type: ExamType
  subject: Subject
  class: Class
  created_at: string
}

interface ExamStats {
  totalExams: number
  scheduledExams: number
  completedExams: number
  publishedResults: number
}

export default function ExaminationManagement() {
  const [exams, setExams] = useState<Exam[]>([])
  const [examTypes, setExamTypes] = useState<ExamType[]>([])
  const [subjects, setSubjects] = useState<Subject[]>([])
  const [classes, setClasses] = useState<Class[]>([])
  const [stats, setStats] = useState<ExamStats>({
    totalExams: 0,
    scheduledExams: 0,
    completedExams: 0,
    publishedResults: 0
  })
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [selectedClass, setSelectedClass] = useState<string>('all')
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showGradeModal, setShowGradeModal] = useState(false)
  const [selectedExam, setSelectedExam] = useState<Exam | null>(null)
  const [showReportModal, setShowReportModal] = useState(false)

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    setLoading(true)
    try {
      await Promise.all([
        fetchExams(),
        fetchExamTypes(),
        fetchSubjects(),
        fetchClasses(),
        fetchStats()
      ])
    } catch (error) {
      console.error('Error fetching data:', error)
      toast.error('Failed to load examination data')
    } finally {
      setLoading(false)
    }
  }

  const fetchExams = async () => {
    const { data, error } = await supabase
      .from('exams')
      .select(`
        *,
        exam_type:exam_types(id, name, description, weightage),
        subject:subjects(id, name, code, grade_level, is_core_subject),
        class:classes(id, name, section, grade_level)
      `)
      .order('exam_date', { ascending: false })

    if (error) {
      console.error('Error fetching exams:', error)
      return
    }

    setExams(data || [])
  }

  const fetchExamTypes = async () => {
    const { data, error } = await supabase
      .from('exam_types')
      .select('*')
      .eq('is_active', true)
      .order('name')

    if (error) {
      console.error('Error fetching exam types:', error)
      return
    }

    setExamTypes(data || [])
  }

  const fetchSubjects = async () => {
    const { data, error } = await supabase
      .from('subjects')
      .select('*')
      .eq('is_active', true)
      .order('grade_level', { ascending: true })
      .order('name')

    if (error) {
      console.error('Error fetching subjects:', error)
      return
    }

    setSubjects(data || [])
  }

  const fetchClasses = async () => {
    const { data, error } = await supabase
      .from('classes')
      .select('*')
      .eq('is_active', true)
      .order('grade_level', { ascending: true })
      .order('name')

    if (error) {
      console.error('Error fetching classes:', error)
      return
    }

    setClasses(data || [])
  }

  const fetchStats = async () => {
    const { data, error } = await supabase
      .from('exams')
      .select('status, grades_published')

    if (error) {
      console.error('Error fetching stats:', error)
      return
    }

    const totalExams = data?.length || 0
    const scheduledExams = data?.filter(exam => exam.status === 'scheduled').length || 0
    const completedExams = data?.filter(exam => exam.status === 'completed').length || 0
    const publishedResults = data?.filter(exam => exam.grades_published).length || 0

    setStats({
      totalExams,
      scheduledExams,
      completedExams,
      publishedResults
    })
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'scheduled':
        return 'bg-blue-100 text-blue-800'
      case 'ongoing':
        return 'bg-yellow-100 text-yellow-800'
      case 'completed':
        return 'bg-green-100 text-green-800'
      case 'cancelled':
        return 'bg-red-100 text-red-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const filteredExams = exams.filter(exam => {
    const matchesSearch = exam.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         exam.subject.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         exam.class.name.toLowerCase().includes(searchTerm.toLowerCase())

    const matchesStatus = statusFilter === 'all' || exam.status === statusFilter
    const matchesClass = selectedClass === 'all' || exam.class.id === selectedClass

    return matchesSearch && matchesStatus && matchesClass
  })

  const handleGradeEntry = (exam: Exam) => {
    setSelectedExam(exam)
    setShowGradeModal(true)
  }

  if (loading) {
    return (
      <AdminLayout title="Examination Management">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      </AdminLayout>
    )
  }

  return (
    <AdminLayout title="Examination Management">
      <div className="space-y-6">
        {/* Header with Stats */}
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

          <Card className="border-yellow-200 bg-yellow-50/50">
            <CardHeader className="pb-3">
              <CardDescription className="text-yellow-600">Scheduled</CardDescription>
              <CardTitle className="text-2xl text-yellow-700">{stats.scheduledExams}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center text-yellow-600">
                <Calendar className="h-4 w-4 mr-1" />
                <span className="text-sm">Upcoming exams</span>
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
                <Clock className="h-4 w-4 mr-1" />
                <span className="text-sm">Finished exams</span>
              </div>
            </CardContent>
          </Card>

          <Card className="border-purple-200 bg-purple-50/50">
            <CardHeader className="pb-3">
              <CardDescription className="text-purple-600">Published Results</CardDescription>
              <CardTitle className="text-2xl text-purple-700">{stats.publishedResults}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center text-purple-600">
                <TrendingUp className="h-4 w-4 mr-1" />
                <span className="text-sm">Results available</span>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Content */}
        <Tabs defaultValue="exams" className="space-y-4">
          <TabsList>
            <TabsTrigger value="exams">Examinations</TabsTrigger>
            <TabsTrigger value="types">Exam Types</TabsTrigger>
            <TabsTrigger value="subjects">Subjects</TabsTrigger>
            <TabsTrigger value="grades">Grade Entry</TabsTrigger>
          </TabsList>

          <TabsContent value="exams" className="space-y-4">
            {/* Filters and Actions */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Manage Examinations</CardTitle>
                    <CardDescription>
                      Create, schedule, and manage examinations for all classes
                    </CardDescription>
                  </div>
                  <div className="flex gap-2">
                    <Button onClick={() => setShowCreateModal(true)}>
                      <Plus className="h-4 w-4 mr-2" />
                      Create Exam
                    </Button>
                    <Button variant="outline" onClick={() => setShowReportModal(true)}>
                      <FileText className="h-4 w-4 mr-2" />
                      Generate Reports
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="search">Search Exams</Label>
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                      <Input
                        id="search"
                        placeholder="Search by name, subject, or class"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-10"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="status-filter">Status</Label>
                    <select
                      id="status-filter"
                      value={statusFilter}
                      onChange={(e) => setStatusFilter(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="all">All Status</option>
                      <option value="scheduled">Scheduled</option>
                      <option value="ongoing">Ongoing</option>
                      <option value="completed">Completed</option>
                      <option value="cancelled">Cancelled</option>
                    </select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="class-filter">Class</Label>
                    <select
                      id="class-filter"
                      value={selectedClass}
                      onChange={(e) => setSelectedClass(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="all">All Classes</option>
                      {classes.map((cls) => (
                        <option key={cls.id} value={cls.id}>
                          {cls.name} - Section {cls.section}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-2">
                    <Label>&nbsp;</Label>
                    <Button variant="outline" className="w-full">
                      <Filter className="h-4 w-4 mr-2" />
                      More Filters
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Exams List */}
            <div className="grid grid-cols-1 gap-4">
              {filteredExams.length === 0 ? (
                <Card>
                  <CardContent className="text-center py-8">
                    <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">No Exams Found</h3>
                    <p className="text-gray-500 mb-4">
                      {searchTerm || statusFilter !== 'all' || selectedClass !== 'all'
                        ? 'No exams match your current filters.'
                        : 'Get started by creating your first examination.'}
                    </p>
                    <Button onClick={() => setShowCreateModal(true)}>
                      <Plus className="h-4 w-4 mr-2" />
                      Create First Exam
                    </Button>
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
                            <Badge className={getStatusColor(exam.status)}>
                              {exam.status.charAt(0).toUpperCase() + exam.status.slice(1)}
                            </Badge>
                            {exam.grades_published && (
                              <Badge variant="outline" className="text-green-600 border-green-600">
                                Results Published
                              </Badge>
                            )}
                          </div>
                          
                          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-sm text-gray-600">
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
                              <Clock className="h-4 w-4 mr-2" />
                              <span>{exam.start_time} - {exam.end_time}</span>
                            </div>
                          </div>

                          <div className="mt-3 flex items-center gap-4 text-sm text-gray-500">
                            <span>Type: {exam.exam_type.name}</span>
                            <span>Max Marks: {exam.max_marks}</span>
                            <span>Pass Marks: {exam.pass_marks}</span>
                            {exam.duration_minutes && (
                              <span>Duration: {exam.duration_minutes} mins</span>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center gap-2 ml-4">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleGradeEntry(exam)}
                            title="Enter Grades"
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button variant="outline" size="sm" title="View Details">
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button variant="outline" size="sm" title="More Options">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          </TabsContent>

          <TabsContent value="types">
            <ExamTypesManagement />
          </TabsContent>

          <TabsContent value="subjects">
            <SubjectsManagement />
          </TabsContent>

          <TabsContent value="grades">
            <GradeEntryManagement />
          </TabsContent>
        </Tabs>

        {/* Create Exam Modal */}
        <CreateExamModal
          isOpen={showCreateModal}
          onClose={() => setShowCreateModal(false)}
          onExamCreated={fetchData}
        />

        {/* Grade Entry Modal */}
        <GradeEntryModal
          exam={selectedExam}
          isOpen={showGradeModal}
          onClose={() => {
            setShowGradeModal(false)
            setSelectedExam(null)
          }}
          onGradesSaved={fetchData}
        />

        {/* Report Card Generator */}
        <ReportCardGenerator
          isOpen={showReportModal}
          onClose={() => setShowReportModal(false)}
        />
      </div>
    </AdminLayout>
  )
}
