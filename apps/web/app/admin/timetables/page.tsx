'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import AdminLayout from '@/components/admin/AdminLayout'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Calendar,
  Clock,
  Users,
  MapPin,
  Plus,
  Search,
  Filter,
  Eye,
  Edit,
  Trash2,
  AlertTriangle,
  Grid3X3,
  List
} from 'lucide-react'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { useAuthStore } from '@/lib/stores/auth-store'
import { Database } from '@/lib/supabase'
import TimetableModal from '@/components/admin/TimetableModal'

interface TimePeriod {
  id: string
  name: string
  start_time: string
  end_time: string
  period_order: number
  is_break: boolean
}

interface Room {
  id: string
  name: string
  room_number?: string
  building?: string
  capacity: number
  room_type: string
}

interface TimetableEntry {
  id: string
  day_of_week: string
  notes?: string
  is_active: boolean
  classes: {
    id: string
    name: string
    grade_level: number
    section: string
  }
  subjects: {
    id: string
    name: string
    code: string
  }
  teachers: {
    id: string
    profiles: {
      name: string
      email: string
    }
  } | null
  rooms: {
    id: string
    name: string
    room_number?: string
  } | null
  time_periods: {
    id: string
    name: string
    start_time: string
    end_time: string
    period_order: number
  }
  academic_years: {
    id: string
    name: string
  }
}

interface Class {
  id: string
  name: string
  grade_level: number
  section: string
}

interface Subject {
  id: string
  name: string
  code: string
}

interface Teacher {
  id: string
  name: string
  email: string
  phone?: string
}

interface TimetableTeacher {
  id: string
  profiles: {
    name: string
    email: string
  }
}

interface AcademicYear {
  id: string
  name: string
  is_current: boolean
}

export default function TimetablesPage() {
  const router = useRouter()
  const supabase = createClientComponentClient<Database>()

  // State management
  const [timetables, setTimetables] = useState<TimetableEntry[]>([])
  const [timePeriods, setTimePeriods] = useState<TimePeriod[]>([])
  const [rooms, setRooms] = useState<Room[]>([])
  const [classes, setClasses] = useState<Class[]>([])
  const [subjects, setSubjects] = useState<Subject[]>([])
  const [teachers, setTeachers] = useState<Teacher[]>([])
  const [academicYears, setAcademicYears] = useState<AcademicYear[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedClass, setSelectedClass] = useState<string>('all')
  const [selectedTeacher, setSelectedTeacher] = useState<string>('all')
  const [selectedAcademicYear, setSelectedAcademicYear] = useState<string>('')
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')

  // Modal states
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [selectedTimetable, setSelectedTimetable] = useState<TimetableEntry | null>(null)

  // Authentication
  const { user } = useAuthStore()

  // Fetch data
  useEffect(() => {
    // Only fetch if we have user data
    if (!user?.school_id) {
      console.log('⏳ Waiting for user data...')
      return
    }

    console.log('🔄 Initial data fetch for school:', user.school_id)
    fetchInitialData()
  }, [user?.school_id])

  // Refetch timetables when filters change
  useEffect(() => {
    if (user?.school_id && user?.id) {
      fetchTimetables()
    }
  }, [selectedClass, selectedTeacher, selectedAcademicYear, user?.school_id, user?.id])

  const fetchInitialData = async () => {
    try {
      setLoading(true)

      // Ensure we have user data
      if (!user?.school_id) {
        console.warn('No user or school_id available')
        setLoading(false)
        return
      }

      await Promise.all([
        fetchTimetables(),
        fetchTimePeriods(),
        fetchRooms(),
        fetchClasses(),
        fetchSubjects(),
        fetchTeachers(),
        fetchAcademicYears()
      ])
    } catch (error) {
      console.error('Error fetching initial data:', error)
      toast.error('Failed to load timetable data')
    } finally {
      setLoading(false)
    }
  }

  const fetchTimetables = async () => {
    if (!user?.school_id || !user?.id) return

    const params = new URLSearchParams()
    params.append('school_id', user.school_id)
    params.append('user_id', user.id)
    if (selectedClass !== 'all') params.append('class_id', selectedClass)
    if (selectedTeacher !== 'all') params.append('teacher_id', selectedTeacher)
    if (selectedAcademicYear) params.append('academic_year_id', selectedAcademicYear)

    const response = await fetch(`/api/admin/timetables?${params}`)
    if (response.ok) {
      const data = await response.json()
      setTimetables(data.data || [])
    } else {
      console.error('Failed to fetch timetables:', response.status, response.statusText)
    }
  }

  const fetchTimePeriods = async () => {
    if (!user?.school_id || !user?.id) return

    const params = new URLSearchParams()
    params.append('school_id', user.school_id)
    params.append('user_id', user.id)

    const response = await fetch(`/api/admin/time-periods?${params}`)
    if (response.ok) {
      const data = await response.json()
      setTimePeriods(data.data || [])
    }
  }

  const fetchRooms = async () => {
    if (!user?.school_id || !user?.id) return

    const params = new URLSearchParams()
    params.append('school_id', user.school_id)
    params.append('user_id', user.id)

    const response = await fetch(`/api/admin/rooms?${params}`)
    if (response.ok) {
      const data = await response.json()
      setRooms(data.data || [])
    }
  }

  const fetchClasses = async () => {
    if (!user?.school_id || !user?.id) return

    const params = new URLSearchParams()
    params.append('school_id', user.school_id)
    params.append('user_id', user.id)

    const response = await fetch(`/api/admin/classes?${params}`)
    if (response.ok) {
      const data = await response.json()
      setClasses(data || [])

      // Set default class selection to first available class (instead of "all")
      if ((data || []).length > 0 && selectedClass === 'all') {
        setSelectedClass(data[0].id)
      }
    } else {
      console.error('Failed to fetch classes:', response.status, response.statusText)
    }
  }

  const fetchSubjects = async () => {
    if (!user?.school_id || !user?.id) return

    const params = new URLSearchParams()
    params.append('school_id', user.school_id)
    params.append('user_id', user.id)

    const response = await fetch(`/api/admin/subjects?${params}`)
    if (response.ok) {
      const data = await response.json()
      setSubjects(data || [])
    }
  }

  const fetchTeachers = async () => {
    if (!user?.school_id || !user?.id) return

    const params = new URLSearchParams()
    params.append('school_id', user.school_id)
    params.append('user_id', user.id)

    const response = await fetch(`/api/admin/teachers?${params}`)
    if (response.ok) {
      const data = await response.json()
      setTeachers(data || [])
    } else {
      console.error('Failed to fetch teachers:', response.status, response.statusText)
    }
  }

  const fetchAcademicYears = async () => {
    if (!user?.school_id || !user?.id) return

    const params = new URLSearchParams()
    params.append('school_id', user.school_id)
    params.append('user_id', user.id)

    const response = await fetch(`/api/admin/academic-years?${params}`)
    if (response.ok) {
      const data = await response.json()
      setAcademicYears(data || [])
      // Set current academic year as default
      const currentYear = data?.find((year: AcademicYear) => year.is_current)
      if (currentYear) {
        setSelectedAcademicYear(currentYear.id)
      }
    } else {
      console.error('Failed to fetch academic years:', response.status, response.statusText)
    }
  }

  // Filter timetables based on search and filters
  const filteredTimetables = timetables.filter(timetable => {
    const matchesSearch = searchTerm === '' ||
      timetable.classes?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      timetable.subjects?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      timetable.teachers?.profiles?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      timetable.rooms?.name?.toLowerCase().includes(searchTerm.toLowerCase())

    const matchesClass = selectedClass === 'all' || timetable.class_id === selectedClass

    return matchesSearch && matchesClass
  })

  // Group timetables by day and time period for grid view
  const groupedTimetables = () => {
    const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday']
    const grouped: { [key: string]: { [key: string]: TimetableEntry[] } } = {}



    days.forEach(day => {
      grouped[day] = {}
      timePeriods.forEach(period => {
        grouped[day][period.id] = filteredTimetables.filter(
          t => t.day_of_week === day && t.time_periods.id === period.id
        )
      })
    })

    return grouped
  }

  const handleDeleteTimetable = async (id: string) => {
    if (!confirm('Are you sure you want to delete this timetable entry?')) return

    try {
      const response = await fetch(`/api/admin/timetables/${id}`, {
        method: 'DELETE'
      })

      if (response.ok) {
        toast.success('Timetable entry deleted successfully')
        fetchTimetables()
      } else {
        toast.error('Failed to delete timetable entry')
      }
    } catch (error) {
      console.error('Error deleting timetable:', error)
      toast.error('Failed to delete timetable entry')
    }
  }



  if (loading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </AdminLayout>
    )
  }

  return (
    <AdminLayout title="Timetable Management">
      <div className="space-y-6">
        {/* Header Actions */}
        <div className="flex items-center justify-end">
          <Button size="sm" onClick={() => setShowCreateModal(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Add Schedule
          </Button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Periods</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{timetables.length}</div>
              <p className="text-xs text-muted-foreground">
                Across all classes
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Classes</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{classes.length}</div>
              <p className="text-xs text-muted-foreground">
                With schedules
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Available Rooms</CardTitle>
              <MapPin className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{rooms.length}</div>
              <p className="text-xs text-muted-foreground">
                For scheduling
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Time Slots</CardTitle>
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{timePeriods.length}</div>
              <p className="text-xs text-muted-foreground">
                Per day
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Filters and Search */}
        <Card>
          <CardHeader>
            <CardTitle>Filters</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search by class, subject, teacher, or room..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              <Select value={selectedAcademicYear} onValueChange={setSelectedAcademicYear}>
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="Academic Year" />
                </SelectTrigger>
                <SelectContent>
                  {academicYears.map((year) => (
                    <SelectItem key={year.id} value={year.id}>
                      {year.name} {year.is_current && '(Current)'}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={selectedClass} onValueChange={setSelectedClass}>
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="All Classes" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Classes</SelectItem>
                  {classes.map((cls) => (
                    <SelectItem key={cls.id} value={cls.id}>
                      {cls.name} - {cls.section}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={selectedTeacher} onValueChange={setSelectedTeacher}>
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="All Teachers" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Teachers</SelectItem>
                  {teachers.map((teacher) => (
                    <SelectItem key={teacher.id} value={teacher.id}>
                      {teacher.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <div className="flex items-center space-x-2">
                <Button
                  variant={viewMode === 'grid' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setViewMode('grid')}
                >
                  <Grid3X3 className="h-4 w-4" />
                </Button>
                <Button
                  variant={viewMode === 'list' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setViewMode('list')}
                >
                  <List className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Timetable Content */}
        <Tabs defaultValue="schedule" className="space-y-4">
          <TabsList>
            <TabsTrigger value="schedule">Schedule View</TabsTrigger>
            <TabsTrigger value="conflicts">Conflicts</TabsTrigger>
            <TabsTrigger value="settings">Settings</TabsTrigger>
          </TabsList>

          <TabsContent value="schedule" className="space-y-4">
            {viewMode === 'grid' ? (
              <TimetableGridView
                groupedTimetables={groupedTimetables()}
                timePeriods={timePeriods}
                selectedClass={selectedClass}
                classes={classes}
                onEdit={(timetable) => {
                  setSelectedTimetable(timetable)
                  setShowEditModal(true)
                }}
                onDelete={handleDeleteTimetable}
              />
            ) : (
              <TimetableListView 
                timetables={filteredTimetables}
                onEdit={(timetable) => {
                  setSelectedTimetable(timetable)
                  setShowEditModal(true)
                }}
                onDelete={handleDeleteTimetable}
              />
            )}
          </TabsContent>

          <TabsContent value="conflicts">
            <ConflictsView />
          </TabsContent>

          <TabsContent value="settings">
            <TimetableSettings 
              timePeriods={timePeriods}
              rooms={rooms}
              onTimePeriodsUpdate={fetchTimePeriods}
              onRoomsUpdate={fetchRooms}
            />
          </TabsContent>
        </Tabs>

        {/* Modals */}
        <TimetableModal
          isOpen={showCreateModal}
          onClose={() => setShowCreateModal(false)}
          onSuccess={() => {
            fetchTimetables()
            setShowCreateModal(false)
          }}
          mode="create"
        />

        <TimetableModal
          isOpen={showEditModal}
          onClose={() => {
            setShowEditModal(false)
            setSelectedTimetable(null)
          }}
          onSuccess={() => {
            fetchTimetables()
            setShowEditModal(false)
            setSelectedTimetable(null)
          }}
          timetable={selectedTimetable}
          mode="edit"
        />
      </div>
    </AdminLayout>
  )
}

// Timetable Grid View Component
function TimetableGridView({
  groupedTimetables,
  timePeriods,
  selectedClass,
  classes,
  onEdit,
  onDelete
}: {
  groupedTimetables: { [key: string]: { [key: string]: TimetableEntry[] } }
  timePeriods: TimePeriod[]
  selectedClass: string
  classes: Class[]
  onEdit: (timetable: TimetableEntry) => void
  onDelete: (id: string) => void
}) {
  const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday']
  const dayNames = {
    monday: 'Monday',
    tuesday: 'Tuesday',
    wednesday: 'Wednesday',
    thursday: 'Thursday',
    friday: 'Friday',
    saturday: 'Saturday'
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Weekly Schedule Grid</CardTitle>
        <CardDescription>
          {selectedClass === 'all'
            ? 'Visual representation of the weekly timetable for all classes'
            : `Timetable for ${classes.find(c => c.id === selectedClass)?.name || 'Selected Class'} - ${classes.find(c => c.id === selectedClass)?.section || ''}`
          }
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr>
                <th className="border p-2 bg-muted font-medium text-left min-w-24">Time</th>
                {days.map(day => (
                  <th key={day} className="border p-2 bg-muted font-medium text-center min-w-32">
                    {dayNames[day as keyof typeof dayNames]}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {timePeriods.map(period => (
                <tr key={period.id}>
                  <td className="border p-2 bg-muted/50 font-medium">
                    <div className="text-sm">
                      <div>{period.name}</div>
                      <div className="text-xs text-muted-foreground">
                        {period.start_time} - {period.end_time}
                      </div>
                    </div>
                  </td>
                  {days.map(day => (
                    <td key={`${day}-${period.id}`} className="border p-1 align-top">
                      <div className="space-y-1">
                        {groupedTimetables[day]?.[period.id]?.map(timetable => (
                          <div
                            key={timetable.id}
                            className="bg-primary/10 border border-primary/20 rounded p-2 text-xs hover:bg-primary/20 transition-colors cursor-pointer group"
                            onClick={() => onEdit(timetable)}
                          >
                            <div className="font-medium text-primary">
                              {timetable.classes.name}-{timetable.classes.section}
                            </div>
                            <div className="text-muted-foreground">
                              {timetable.subjects?.name}
                            </div>
                            {timetable.teachers?.profiles?.name && (
                              <div className="text-muted-foreground">
                                {timetable.teachers.profiles.name}
                              </div>
                            )}
                            {timetable.rooms && (
                              <div className="text-muted-foreground flex items-center">
                                <MapPin className="h-3 w-3 mr-1" />
                                {timetable.rooms.name}
                              </div>
                            )}
                            <div className="opacity-0 group-hover:opacity-100 transition-opacity mt-1 flex space-x-1">
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-6 w-6 p-0"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  onEdit(timetable)
                                }}
                              >
                                <Edit className="h-3 w-3" />
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-6 w-6 p-0 text-destructive hover:text-destructive"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  onDelete(timetable.id)
                                }}
                              >
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  )
}

// Timetable List View Component
function TimetableListView({
  timetables,
  onEdit,
  onDelete
}: {
  timetables: TimetableEntry[]
  onEdit: (timetable: TimetableEntry) => void
  onDelete: (id: string) => void
}) {
  const dayNames = {
    monday: 'Monday',
    tuesday: 'Tuesday',
    wednesday: 'Wednesday',
    thursday: 'Thursday',
    friday: 'Friday',
    saturday: 'Saturday',
    sunday: 'Sunday'
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Schedule List</CardTitle>
        <CardDescription>
          Detailed list view of all timetable entries
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {timetables.length === 0 ? (
            <div className="text-center py-8">
              <Calendar className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium">No schedules found</h3>
              <p className="text-muted-foreground">
                No timetable entries match your current filters.
              </p>
            </div>
          ) : (
            timetables.map(timetable => (
              <div
                key={timetable.id}
                className="border rounded-lg p-4 hover:bg-muted/50 transition-colors"
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-4">
                      <Badge variant="outline">
                        {dayNames[timetable.day_of_week as keyof typeof dayNames]}
                      </Badge>
                      <Badge variant="secondary">
                        {timetable.time_periods.name}
                      </Badge>
                      <span className="text-sm text-muted-foreground">
                        {timetable.time_periods.start_time} - {timetable.time_periods.end_time}
                      </span>
                    </div>
                    <div className="mt-2 grid grid-cols-1 md:grid-cols-4 gap-4">
                      <div>
                        <div className="text-sm font-medium">Class</div>
                        <div className="text-sm text-muted-foreground">
                          {timetable.classes.name} - {timetable.classes.section}
                        </div>
                      </div>
                      <div>
                        <div className="text-sm font-medium">Subject</div>
                        <div className="text-sm text-muted-foreground">
                          {timetable.subjects.name}
                        </div>
                      </div>
                      <div>
                        <div className="text-sm font-medium">Teacher</div>
                        <div className="text-sm text-muted-foreground">
                          {timetable.teachers?.profiles?.name || 'Not assigned'}
                        </div>
                      </div>
                      <div>
                        <div className="text-sm font-medium">Room</div>
                        <div className="text-sm text-muted-foreground">
                          {timetable.rooms?.name || 'Not assigned'}
                        </div>
                      </div>
                    </div>
                    {timetable.notes && (
                      <div className="mt-2">
                        <div className="text-sm font-medium">Notes</div>
                        <div className="text-sm text-muted-foreground">
                          {timetable.notes}
                        </div>
                      </div>
                    )}
                  </div>
                  <div className="flex items-center space-x-2">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => onEdit(timetable)}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => onDelete(timetable.id)}
                      className="text-destructive hover:text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  )
}

// Conflicts View Component
function ConflictsView() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center">
          <AlertTriangle className="h-5 w-5 mr-2 text-yellow-500" />
          Scheduling Conflicts
        </CardTitle>
        <CardDescription>
          Detect and resolve timetable conflicts
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="text-center py-8">
          <AlertTriangle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-medium">No conflicts detected</h3>
          <p className="text-muted-foreground">
            All timetable entries are properly scheduled without conflicts.
          </p>
        </div>
      </CardContent>
    </Card>
  )
}

// Timetable Settings Component
function TimetableSettings({
  timePeriods,
  rooms,
  onTimePeriodsUpdate,
  onRoomsUpdate
}: {
  timePeriods: TimePeriod[]
  rooms: Room[]
  onTimePeriodsUpdate: () => void
  onRoomsUpdate: () => void
}) {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Time Periods</CardTitle>
          <CardDescription>
            Manage school time periods and class durations
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {timePeriods.map(period => (
              <div key={period.id} className="flex items-center justify-between p-3 border rounded">
                <div>
                  <div className="font-medium">{period.name}</div>
                  <div className="text-sm text-muted-foreground">
                    {period.start_time} - {period.end_time}
                    {period.is_break && <Badge variant="secondary" className="ml-2">Break</Badge>}
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <Button size="sm" variant="ghost">
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button size="sm" variant="ghost" className="text-destructive">
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
            <Button variant="outline" className="w-full">
              <Plus className="h-4 w-4 mr-2" />
              Add Time Period
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Rooms & Venues</CardTitle>
          <CardDescription>
            Manage available rooms and their capacities
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {rooms.slice(0, 5).map(room => (
              <div key={room.id} className="flex items-center justify-between p-3 border rounded">
                <div>
                  <div className="font-medium">{room.name}</div>
                  <div className="text-sm text-muted-foreground">
                    {room.room_number && `Room ${room.room_number} • `}
                    {room.building && `${room.building} • `}
                    Capacity: {room.capacity} • {room.room_type}
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <Button size="sm" variant="ghost">
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button size="sm" variant="ghost" className="text-destructive">
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
            <Button variant="outline" className="w-full">
              <Plus className="h-4 w-4 mr-2" />
              Add Room
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
