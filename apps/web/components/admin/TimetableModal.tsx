'use client'

import { useState, useEffect } from 'react'
import { toast } from 'sonner'
import { useAuthStore } from '@/lib/stores/auth-store'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { AlertTriangle, Clock, Users, MapPin, BookOpen } from 'lucide-react'

interface TimetableModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
  timetable?: any
  mode: 'create' | 'edit'
}

interface FormData {
  academic_year_id: string
  class_id: string
  subject_id: string
  teacher_id: string
  room_id: string
  time_period_id: string
  day_of_week: string
  selected_days: string[] // New field for multiple day selection
  notes: string
}

export default function TimetableModal({
  isOpen,
  onClose,
  onSuccess,
  timetable,
  mode
}: TimetableModalProps) {
  const { user } = useAuthStore()
  const [loading, setLoading] = useState(false)
  const [conflicts, setConflicts] = useState<any[]>([])
  const [checkingConflicts, setCheckingConflicts] = useState(false)
  const [schoolId, setSchoolId] = useState<string | null>(null)

  // Form data
  const [formData, setFormData] = useState<FormData>({
    academic_year_id: '',
    class_id: '',
    subject_id: '',
    teacher_id: '',
    room_id: '',
    time_period_id: '',
    day_of_week: '',
    selected_days: [], // Initialize as empty array
    notes: ''
  })

  // Options data
  const [academicYears, setAcademicYears] = useState<any[]>([])
  const [classes, setClasses] = useState<any[]>([])
  const [subjects, setSubjects] = useState<any[]>([])
  const [teachers, setTeachers] = useState<any[]>([])
  const [rooms, setRooms] = useState<any[]>([])
  const [timePeriods, setTimePeriods] = useState<any[]>([])

  // Helper function to make API calls with required parameters
  const apiCall = async (url: string, options: RequestInit = {}) => {
    if (!user?.id || !schoolId) {
      throw new Error('User not authenticated or missing school context')
    }

    // Add query parameters for GET requests
    const urlWithParams = new URL(url, window.location.origin)
    if (!options.method || options.method === 'GET') {
      urlWithParams.searchParams.set('school_id', schoolId)
      urlWithParams.searchParams.set('user_id', user.id)
    }

    return fetch(urlWithParams.toString(), {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers
      }
    })
  }

  // Get school_id from user or fetch it
  useEffect(() => {
    const getSchoolId = async () => {
      if (user?.id && !schoolId) {
        console.log('User object:', user)

        // First check if user already has school_id
        if (user.school_id) {
          console.log('Using school_id from user object:', user.school_id)
          setSchoolId(user.school_id)
          return
        }

        // If not, fetch from profiles table
        try {
          console.log('Fetching school_id for user:', user.id)
          const { supabase } = await import('@/lib/supabase')
          const { data: profile, error } = await supabase
            .from('profiles')
            .select('school_id')
            .eq('id', user.id)
            .single()

          console.log('Profile fetch result:', { profile, error })

          if (profile?.school_id) {
            console.log('Setting school_id from profile:', profile.school_id)
            setSchoolId(profile.school_id)
          } else {
            console.error('No school_id found in profile')
            toast.error('Unable to determine your school. Please contact support.')
          }
        } catch (error) {
          console.error('Failed to fetch school_id:', error)
          toast.error('Failed to load school information')
        }
      }
    }
    getSchoolId()
  }, [user?.id, user?.school_id, schoolId])

  // Load initial data
  useEffect(() => {
    console.log('useEffect triggered:', { isOpen, schoolId, userId: user?.id })
    if (isOpen && schoolId && user?.id) {
      console.log('All conditions met, loading options...')
      loadOptions()
      if (mode === 'edit' && timetable) {
        setFormData({
          academic_year_id: timetable.academic_years.id,
          class_id: timetable.classes.id,
          subject_id: timetable.subjects.id,
          teacher_id: timetable.teachers?.id || 'none',
          room_id: timetable.rooms?.id || 'none',
          time_period_id: timetable.time_periods.id,
          day_of_week: timetable.day_of_week,
          selected_days: [timetable.day_of_week], // Initialize with current day for edit mode
          notes: timetable.notes || ''
        })
      }
    }
  }, [isOpen, schoolId, mode, timetable])

  // Check for conflicts when key fields change
  useEffect(() => {
    if (formData.academic_year_id && formData.time_period_id && formData.day_of_week) {
      checkConflicts()
    }
  }, [
    formData.academic_year_id,
    formData.class_id,
    formData.teacher_id,
    formData.room_id,
    formData.time_period_id,
    formData.day_of_week
  ])

  const loadOptions = async () => {
    try {
      console.log('Loading options with:', { userId: user?.id, schoolId })

      if (!user?.id || !schoolId) {
        console.error('Missing user or school context:', { userId: user?.id, schoolId })
        toast.error('Missing user or school context')
        return
      }

      const [
        academicYearsRes,
        classesRes,
        subjectsRes,
        teachersRes,
        roomsRes,
        timePeriodsRes
      ] = await Promise.all([
        apiCall('/api/admin/academic-years'),
        apiCall('/api/admin/classes'),
        apiCall('/api/admin/subjects'),
        apiCall('/api/admin/teachers'),
        apiCall('/api/admin/rooms'),
        apiCall('/api/admin/time-periods')
      ])

      const [
        academicYearsData,
        classesData,
        subjectsData,
        teachersData,
        roomsData,
        timePeriodsData
      ] = await Promise.all([
        academicYearsRes.json(),
        classesRes.json(),
        subjectsRes.json(),
        teachersRes.json(),
        roomsRes.json(),
        timePeriodsRes.json()
      ])



      setAcademicYears(Array.isArray(academicYearsData) ? academicYearsData : [])
      setClasses(Array.isArray(classesData) ? classesData : [])
      setSubjects(Array.isArray(subjectsData) ? subjectsData : [])
      setTeachers(Array.isArray(teachersData) ? teachersData : [])
      setRooms(Array.isArray(roomsData?.data) ? roomsData.data : [])
      setTimePeriods(Array.isArray(timePeriodsData?.data) ? timePeriodsData.data : [])

      // Set default academic year to current
      const currentYear = academicYearsData?.find((year: any) => year.is_current)
      if (currentYear && mode === 'create') {
        setFormData(prev => ({ ...prev, academic_year_id: currentYear.id }))
      }
    } catch (error) {
      console.error('Error loading options:', error)
      toast.error('Failed to load form options')
    }
  }

  const checkConflicts = async () => {
    if (!formData.academic_year_id || !formData.time_period_id || !formData.day_of_week) {
      setConflicts([])
      return
    }

    setCheckingConflicts(true)
    try {
      // Convert "none" values to null for conflict checking
      const conflictData = {
        ...formData,
        teacher_id: formData.teacher_id === 'none' ? null : formData.teacher_id,
        room_id: formData.room_id === 'none' ? null : formData.room_id,
        exclude_timetable_id: mode === 'edit' ? timetable?.id : undefined
      }

      const response = await fetch('/api/admin/timetables/conflicts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...conflictData,
          school_id: schoolId,
          user_id: user?.id
        })
      })

      if (response.ok) {
        const data = await response.json()
        setConflicts(data.conflicts || [])
      }
    } catch (error) {
      console.error('Error checking conflicts:', error)
    } finally {
      setCheckingConflicts(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    // For create mode, check selected_days; for edit mode, check day_of_week
    const daysToValidate = mode === 'create' ? formData.selected_days : [formData.day_of_week]

    if (!formData.academic_year_id || !formData.class_id || !formData.subject_id ||
        !formData.time_period_id || daysToValidate.length === 0) {
      toast.error('Please fill in all required fields')
      return
    }

    if (conflicts.length > 0) {
      if (!confirm('There are scheduling conflicts. Do you want to proceed anyway?')) {
        return
      }
    }

    setLoading(true)
    try {
      if (mode === 'edit') {
        // Edit mode: single day update
        const url = `/api/admin/timetables/${timetable.id}`

        const apiData = {
          ...formData,
          teacher_id: formData.teacher_id === 'none' ? null : formData.teacher_id,
          room_id: formData.room_id === 'none' ? null : formData.room_id
        }

        const response = await fetch(url, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            ...apiData,
            school_id: schoolId,
            user_id: user?.id
          })
        })

        if (response.ok) {
          toast.success('Timetable entry updated successfully')
          onSuccess()
          onClose()
          resetForm()
        } else {
          const error = await response.json()
          toast.error(error.error || 'Failed to update timetable entry')
        }
      } else {
        // Create mode: multiple days support
        const daysToCreate = formData.selected_days.length > 0 ? formData.selected_days : [formData.day_of_week]
        let successCount = 0
        let errorCount = 0
        const errors: string[] = []

        for (const day of daysToCreate) {
          const apiData = {
            ...formData,
            day_of_week: day,
            teacher_id: formData.teacher_id === 'none' ? null : formData.teacher_id,
            room_id: formData.room_id === 'none' ? null : formData.room_id
          }

          try {
            const response = await fetch('/api/admin/timetables', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                ...apiData,
                school_id: schoolId,
                user_id: user?.id
              })
            })

            if (response.ok) {
              successCount++
            } else {
              const error = await response.json()
              errors.push(`${day}: ${error.error || 'Failed to create'}`)
              errorCount++
            }
          } catch (error) {
            errors.push(`${day}: Network error`)
            errorCount++
          }
        }

        // Show results
        if (successCount > 0 && errorCount === 0) {
          toast.success(`Successfully created ${successCount} timetable ${successCount === 1 ? 'entry' : 'entries'}`)
          onSuccess()
          onClose()
          resetForm()
        } else if (successCount > 0 && errorCount > 0) {
          toast.success(`Created ${successCount} entries, ${errorCount} failed`)
          if (errors.length > 0) {
            toast.error(`Errors: ${errors.join(', ')}`)
          }
          onSuccess() // Still refresh the data
        } else {
          toast.error(`Failed to create timetable entries: ${errors.join(', ')}`)
        }
      }
    } catch (error) {
      console.error(`Error ${mode}ing timetable:`, error)
      toast.error(`Failed to ${mode} timetable entry`)
    } finally {
      setLoading(false)
    }
  }

  const resetForm = () => {
    setFormData({
      academic_year_id: '',
      class_id: '',
      subject_id: '',
      teacher_id: 'none',
      room_id: 'none',
      time_period_id: '',
      day_of_week: '',
      selected_days: [],
      notes: ''
    })
    setConflicts([])
  }

  const handleClose = () => {
    onClose()
    resetForm()
  }

  const dayOptions = [
    { value: 'monday', label: 'Monday' },
    { value: 'tuesday', label: 'Tuesday' },
    { value: 'wednesday', label: 'Wednesday' },
    { value: 'thursday', label: 'Thursday' },
    { value: 'friday', label: 'Friday' },
    { value: 'saturday', label: 'Saturday' }
  ]

  // Handle day selection for create mode (multiple days)
  const handleDayToggle = (dayValue: string, checked: boolean) => {
    setFormData(prev => {
      const newSelectedDays = checked
        ? [...prev.selected_days, dayValue]
        : prev.selected_days.filter(day => day !== dayValue)

      return {
        ...prev,
        selected_days: newSelectedDays
      }
    })
  }

  // Select all days
  const handleSelectAllDays = () => {
    setFormData(prev => ({
      ...prev,
      selected_days: dayOptions.map(day => day.value)
    }))
  }

  // Clear all days
  const handleClearAllDays = () => {
    setFormData(prev => ({
      ...prev,
      selected_days: []
    }))
  }

  // Show loading state if we don't have required data yet
  if (isOpen && (!schoolId || !user?.id)) {
    return (
      <Dialog open={isOpen} onOpenChange={handleClose}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Loading...</DialogTitle>
            <DialogDescription>
              Preparing timetable form...
            </DialogDescription>
          </DialogHeader>
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        </DialogContent>
      </Dialog>
    )
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {mode === 'edit' ? 'Edit Timetable Entry' : 'Create Timetable Entry'}
          </DialogTitle>
          <DialogDescription>
            {mode === 'edit'
              ? 'Update the timetable entry details below.'
              : 'Add a new entry to the class timetable. You can select multiple days to create the same schedule across different days.'
            }
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Academic Year */}
          <div>
            <Label htmlFor="academic_year_id">Academic Year *</Label>
            <Select 
              value={formData.academic_year_id} 
              onValueChange={(value) => setFormData(prev => ({ ...prev, academic_year_id: value }))}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select academic year" />
              </SelectTrigger>
              <SelectContent>
                {academicYears?.map((year) => (
                  <SelectItem key={year.id} value={year.id}>
                    {year.name || 'Unknown Year'} {year.is_current && '(Current)'}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Class and Subject */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="class_id">Class *</Label>
              <Select 
                value={formData.class_id} 
                onValueChange={(value) => setFormData(prev => ({ ...prev, class_id: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select class" />
                </SelectTrigger>
                <SelectContent>
                  {classes?.map((cls) => (
                    <SelectItem key={cls.id} value={cls.id}>
                      {cls.name || 'Unknown Class'} - {cls.section || ''}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="subject_id">Subject *</Label>
              <Select 
                value={formData.subject_id} 
                onValueChange={(value) => setFormData(prev => ({ ...prev, subject_id: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select subject" />
                </SelectTrigger>
                <SelectContent>
                  {subjects?.map((subject) => (
                    <SelectItem key={subject.id} value={subject.id}>
                      {subject.name || 'Unknown Subject'} ({subject.code || 'N/A'})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Teacher and Room */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="teacher_id">Teacher</Label>
              <Select 
                value={formData.teacher_id} 
                onValueChange={(value) => setFormData(prev => ({ ...prev, teacher_id: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select teacher (optional)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No teacher assigned</SelectItem>
                  {teachers?.map((teacher) => (
                    <SelectItem key={teacher.id} value={teacher.id}>
                      {teacher.name || 'Unknown Teacher'}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="room_id">Room</Label>
              <Select 
                value={formData.room_id} 
                onValueChange={(value) => setFormData(prev => ({ ...prev, room_id: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select room (optional)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No room assigned</SelectItem>
                  {rooms?.map((room) => (
                    <SelectItem key={room.id} value={room.id}>
                      {room.name || 'Unknown Room'} {room.room_number && `(${room.room_number})`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Day and Time Period */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="day_of_week">Day *</Label>
              {mode === 'create' ? (
                // Create mode: Multiple day selection with checkboxes
                <div className="space-y-3 p-3 border rounded-md bg-gray-50">
                  <div className="flex items-center justify-between">
                    <p className="text-sm text-gray-600">Select multiple days for the same schedule:</p>
                    <div className="flex gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={handleSelectAllDays}
                        className="text-xs h-6 px-2"
                      >
                        Select All
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={handleClearAllDays}
                        className="text-xs h-6 px-2"
                      >
                        Clear All
                      </Button>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    {dayOptions.map((day) => (
                      <div key={day.value} className="flex items-center space-x-2">
                        <Checkbox
                          id={`day-${day.value}`}
                          checked={formData.selected_days.includes(day.value)}
                          onCheckedChange={(checked) => handleDayToggle(day.value, checked as boolean)}
                        />
                        <Label
                          htmlFor={`day-${day.value}`}
                          className="text-sm font-normal cursor-pointer"
                        >
                          {day.label}
                        </Label>
                      </div>
                    ))}
                  </div>
                  {formData.selected_days.length > 0 && (
                    <div className="mt-2">
                      <p className="text-xs text-gray-500">
                        Selected: {formData.selected_days.map(day =>
                          dayOptions.find(d => d.value === day)?.label
                        ).join(', ')}
                      </p>
                    </div>
                  )}
                </div>
              ) : (
                // Edit mode: Single day selection with dropdown
                <Select
                  value={formData.day_of_week}
                  onValueChange={(value) => setFormData(prev => ({ ...prev, day_of_week: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select day" />
                  </SelectTrigger>
                  <SelectContent>
                    {dayOptions.map((day) => (
                      <SelectItem key={day.value} value={day.value}>
                        {day.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>

            <div>
              <Label htmlFor="time_period_id">Time Period *</Label>
              <Select 
                value={formData.time_period_id} 
                onValueChange={(value) => setFormData(prev => ({ ...prev, time_period_id: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select time period" />
                </SelectTrigger>
                <SelectContent>
                  {timePeriods?.map((period) => (
                    <SelectItem key={period.id} value={period.id}>
                      {period.name || 'Unknown Period'} ({period.start_time} - {period.end_time})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Notes */}
          <div>
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              value={formData.notes}
              onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
              placeholder="Additional notes or instructions (optional)"
              rows={3}
            />
          </div>

          {/* Conflicts Warning */}
          {conflicts.length > 0 && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <div className="flex items-center mb-2">
                <AlertTriangle className="h-5 w-5 text-yellow-600 mr-2" />
                <h4 className="font-medium text-yellow-800">Scheduling Conflicts Detected</h4>
              </div>
              <div className="space-y-2">
                {conflicts.map((conflict, index) => (
                  <div key={index} className="text-sm text-yellow-700">
                    <Badge variant="outline" className="mr-2">
                      {conflict.type.replace('_', ' ').toUpperCase()}
                    </Badge>
                    {conflict.message}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Form Actions */}
          <div className="flex justify-end space-x-2 pt-4">
            <Button type="button" variant="outline" onClick={handleClose}>
              Cancel
            </Button>
            <Button 
              type="submit" 
              disabled={loading || checkingConflicts}
              className={conflicts.length > 0 ? 'bg-yellow-600 hover:bg-yellow-700' : ''}
            >
              {loading ? 'Saving...' : checkingConflicts ? 'Checking...' : 
               mode === 'edit' ? 'Update Entry' : 'Create Entry'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
