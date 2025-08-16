'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { useAuthStore } from '@/lib/stores/auth-store'
import { supabase } from '@/lib/supabase'
import { toast } from 'sonner'

interface StudentProfile {
  id: string
  name: string
  email: string
  student_id?: string
  phone?: string
  date_of_birth?: string
  address?: string
  emergency_contact?: string
  emergency_phone?: string
  school_id: string
  created_at: string
  onboarding_completed: boolean
}

interface StudentDetails {
  admission_number?: string
  roll_number?: number
  class_name?: string
  section?: string
  academic_year?: string
  enrollment_date?: string
}

export default function StudentProfile() {
  const { user, updateProfile } = useAuthStore()
  const [profile, setProfile] = useState<StudentProfile | null>(null)
  const [studentDetails, setStudentDetails] = useState<StudentDetails | null>(null)
  const [isEditing, setIsEditing] = useState(false)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (user?.id) {
      fetchStudentProfile()
    }
  }, [user])

  const fetchStudentProfile = async () => {
    try {
      setLoading(true)

      // Fetch profile data
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single()

      if (profileError) {
        console.error('Error fetching profile:', profileError)
        toast.error('Failed to load profile')
        return
      }

      setProfile(profileData)

      // Fetch student enrollment details
      const { data: enrollmentData, error: enrollmentError } = await supabase
        .from('class_enrollments')
        .select(`
          roll_number,
          enrolled_at,
          classes (
            name,
            section,
            academic_year
          )
        `)
        .eq('student_id', user.id)
        .eq('status', 'active')
        .single()

      if (enrollmentError && enrollmentError.code !== 'PGRST116') {
        console.error('Error fetching enrollment:', enrollmentError)
      }

      if (enrollmentData) {
        setStudentDetails({
          roll_number: enrollmentData.roll_number,
          class_name: enrollmentData.classes?.name,
          section: enrollmentData.classes?.section,
          academic_year: enrollmentData.classes?.academic_year,
          enrollment_date: enrollmentData.enrolled_at
        })
      }

    } catch (error) {
      console.error('Error fetching student profile:', error)
      toast.error('Failed to load profile data')
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async () => {
    if (!profile) return

    try {
      setSaving(true)

      const { error } = await supabase
        .from('profiles')
        .update({
          name: profile.name,
          phone: profile.phone,
          date_of_birth: profile.date_of_birth,
          address: profile.address,
          emergency_contact: profile.emergency_contact,
          emergency_phone: profile.emergency_phone
        })
        .eq('id', user.id)

      if (error) {
        console.error('Error updating profile:', error)
        toast.error('Failed to update profile')
        return
      }

      // Update auth store
      await updateProfile({
        name: profile.name,
        phone: profile.phone
      })

      toast.success('Profile updated successfully')
      setIsEditing(false)

    } catch (error) {
      console.error('Error saving profile:', error)
      toast.error('Failed to save changes')
    } finally {
      setSaving(false)
    }
  }

  const handleCancel = () => {
    if (user) {
      setProfile({
        ...profile!,
        name: user.name || '',
        phone: user.phone || ''
      })
    }
    setIsEditing(false)
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <Card className="animate-pulse">
          <CardHeader>
            <div className="h-6 bg-gray-200 rounded w-1/4"></div>
            <div className="h-4 bg-gray-200 rounded w-1/2"></div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="h-10 bg-gray-200 rounded"></div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (!profile) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">Failed to load profile data</p>
        <Button onClick={fetchStudentProfile} className="mt-4">
          Try Again
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Profile Header */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>My Profile</CardTitle>
              <CardDescription>Manage your personal information</CardDescription>
            </div>
            <div className="flex space-x-2">
              {isEditing ? (
                <>
                  <Button variant="outline" onClick={handleCancel} disabled={saving}>
                    Cancel
                  </Button>
                  <Button onClick={handleSave} disabled={saving}>
                    {saving ? 'Saving...' : 'Save Changes'}
                  </Button>
                </>
              ) : (
                <Button onClick={() => setIsEditing(true)}>
                  Edit Profile
                </Button>
              )}
            </div>
          </div>
        </CardHeader>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Personal Information */}
        <Card>
          <CardHeader>
            <CardTitle>Personal Information</CardTitle>
            <CardDescription>Your basic details</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Full Name</Label>
              <Input
                id="name"
                value={profile.name || ''}
                onChange={(e) => setProfile({ ...profile, name: e.target.value })}
                disabled={!isEditing}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email Address</Label>
              <Input
                id="email"
                value={profile.email}
                disabled
                className="bg-gray-50"
              />
              <p className="text-xs text-gray-500">Email cannot be changed</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone">Phone Number</Label>
              <Input
                id="phone"
                value={profile.phone || ''}
                onChange={(e) => setProfile({ ...profile, phone: e.target.value })}
                disabled={!isEditing}
                placeholder="Enter your phone number"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="dob">Date of Birth</Label>
              <Input
                id="dob"
                type="date"
                value={profile.date_of_birth || ''}
                onChange={(e) => setProfile({ ...profile, date_of_birth: e.target.value })}
                disabled={!isEditing}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="address">Address</Label>
              <Input
                id="address"
                value={profile.address || ''}
                onChange={(e) => setProfile({ ...profile, address: e.target.value })}
                disabled={!isEditing}
                placeholder="Enter your address"
              />
            </div>
          </CardContent>
        </Card>

        {/* Academic Information */}
        <Card>
          <CardHeader>
            <CardTitle>Academic Information</CardTitle>
            <CardDescription>Your school and class details</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Student ID</Label>
              <div className="p-2 bg-gray-50 rounded border">
                {profile.student_id || 'Not assigned'}
              </div>
            </div>

            {studentDetails?.class_name && (
              <>
                <div className="space-y-2">
                  <Label>Current Class</Label>
                  <div className="p-2 bg-gray-50 rounded border">
                    {studentDetails.class_name}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Section</Label>
                  <div className="p-2 bg-gray-50 rounded border">
                    {studentDetails.section}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Roll Number</Label>
                  <div className="p-2 bg-gray-50 rounded border">
                    {studentDetails.roll_number || 'Not assigned'}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Academic Year</Label>
                  <div className="p-2 bg-gray-50 rounded border">
                    {studentDetails.academic_year}
                  </div>
                </div>
              </>
            )}

            <div className="space-y-2">
              <Label>Account Status</Label>
              <div>
                <Badge variant={profile.onboarding_completed ? 'default' : 'secondary'}>
                  {profile.onboarding_completed ? 'Active' : 'Pending Setup'}
                </Badge>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Member Since</Label>
              <div className="p-2 bg-gray-50 rounded border">
                {new Date(profile.created_at).toLocaleDateString()}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Emergency Contact */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Emergency Contact</CardTitle>
            <CardDescription>Contact information for emergencies</CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="emergency_contact">Emergency Contact Name</Label>
              <Input
                id="emergency_contact"
                value={profile.emergency_contact || ''}
                onChange={(e) => setProfile({ ...profile, emergency_contact: e.target.value })}
                disabled={!isEditing}
                placeholder="Enter emergency contact name"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="emergency_phone">Emergency Contact Phone</Label>
              <Input
                id="emergency_phone"
                value={profile.emergency_phone || ''}
                onChange={(e) => setProfile({ ...profile, emergency_phone: e.target.value })}
                disabled={!isEditing}
                placeholder="Enter emergency contact phone"
              />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
