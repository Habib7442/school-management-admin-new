'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import AdminLayout from '@/components/admin/AdminLayout'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useAuthStore } from '@/lib/stores/auth-store'
import { supabase } from '@/lib/supabase'
import { toast } from 'sonner'
import { Loader2, MapPin, Upload, X } from 'lucide-react'
import LocationMap from '@/components/ui/location-map'
import ConfirmationDialog from '@/components/ui/confirmation-dialog'

interface SchoolData {
  id: string
  name: string
  logo_url?: string | null
  address?: string | null
  geo_lat?: number | null
  geo_lng?: number | null
  contact_email?: string | null
  contact_phone?: string | null
  school_code: string
  academic_start?: string | null
  academic_end?: string | null
  timezone: string
  language: string
  motto?: string | null
  principal_name?: string | null
  website_url?: string | null
}

interface FormData {
  name: string
  address: string
  contact_email: string
  contact_phone: string
  principal_name: string
  motto: string
  website_url: string
  academic_start: string
  academic_end: string
  timezone: string
  language: string
  geo_lat: string
  geo_lng: string
}

const timezones = [
  'UTC',
  'America/New_York',
  'America/Chicago',
  'America/Denver',
  'America/Los_Angeles',
  'Europe/London',
  'Europe/Paris',
  'Europe/Berlin',
  'Asia/Tokyo',
  'Asia/Shanghai',
  'Asia/Kolkata',
  'Asia/Dubai',
  'Australia/Sydney',
  'Pacific/Auckland'
]

const languages = [
  { code: 'en', name: 'English' },
  { code: 'es', name: 'Spanish' },
  { code: 'fr', name: 'French' },
  { code: 'de', name: 'German' },
  { code: 'it', name: 'Italian' },
  { code: 'pt', name: 'Portuguese' },
  { code: 'ru', name: 'Russian' },
  { code: 'ja', name: 'Japanese' },
  { code: 'ko', name: 'Korean' },
  { code: 'zh', name: 'Chinese' },
  { code: 'ar', name: 'Arabic' },
  { code: 'hi', name: 'Hindi' },
  { code: 'bn', name: 'Bengali' },
  { code: 'ur', name: 'Urdu' }
]

export default function SchoolProfilePage() {
  const { user } = useAuthStore()
  const router = useRouter()
  const [schoolData, setSchoolData] = useState<SchoolData | null>(null)
  const [formData, setFormData] = useState<FormData>({
    name: '',
    address: '',
    contact_email: '',
    contact_phone: '',
    principal_name: '',
    motto: '',
    website_url: '',
    academic_start: '',
    academic_end: '',
    timezone: 'UTC',
    language: 'en',
    geo_lat: '',
    geo_lng: ''
  })
  const [logoFile, setLogoFile] = useState<File | null>(null)
  const [logoPreview, setLogoPreview] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [hasChanges, setHasChanges] = useState(false)
  const [showConfirmDialog, setShowConfirmDialog] = useState(false)

  useEffect(() => {
    if (!user || !['admin', 'sub-admin'].includes(user.role)) {
      router.push('/unauthorized')
      return
    }

    fetchSchoolData()
  }, [user, router])

  const fetchSchoolData = async () => {
    try {
      setIsLoading(true)
      
      const { data, error } = await supabase
        .from('schools')
        .select('*')
        .eq('admin_id', user?.id)
        .single()

      if (error) {
        console.error('Error fetching school data:', error)
        toast.error('Failed to load school information')
        return
      }

      if (data) {
        setSchoolData(data)
        setFormData({
          name: data.name || '',
          address: data.address || '',
          contact_email: data.contact_email || '',
          contact_phone: data.contact_phone || '',
          principal_name: data.principal_name || '',
          motto: data.motto || '',
          website_url: data.website_url || '',
          academic_start: data.academic_start || '',
          academic_end: data.academic_end || '',
          timezone: data.timezone || 'UTC',
          language: data.language || 'en',
          geo_lat: data.geo_lat?.toString() || '',
          geo_lng: data.geo_lng?.toString() || ''
        })
        
        if (data.logo_url) {
          setLogoPreview(data.logo_url)
        }
      }
    } catch (error) {
      console.error('Error fetching school data:', error)
      toast.error('Failed to load school information')
    } finally {
      setIsLoading(false)
    }
  }

  const handleInputChange = (field: keyof FormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    setHasChanges(true)
  }

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      // Validate file size (5MB limit)
      if (file.size > 5 * 1024 * 1024) {
        toast.error('File size must be less than 5MB')
        return
      }

      // Validate file type
      if (!file.type.startsWith('image/')) {
        toast.error('Please upload an image file')
        return
      }

      setLogoFile(file)
      setHasChanges(true)

      // Create preview
      const reader = new FileReader()
      reader.onload = (e) => {
        setLogoPreview(e.target?.result as string)
      }
      reader.readAsDataURL(file)
    }
  }

  const removeLogo = () => {
    setLogoFile(null)
    setLogoPreview(schoolData?.logo_url || null)
    setHasChanges(true)
  }

  const validateForm = (): boolean => {
    if (!formData.name.trim()) {
      toast.error('School name is required')
      return false
    }

    if (!formData.contact_email.trim()) {
      toast.error('Contact email is required')
      return false
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(formData.contact_email)) {
      toast.error('Please enter a valid email address')
      return false
    }

    // Validate coordinates if provided
    if (formData.geo_lat && (isNaN(Number(formData.geo_lat)) || Number(formData.geo_lat) < -90 || Number(formData.geo_lat) > 90)) {
      toast.error('Latitude must be between -90 and 90')
      return false
    }

    if (formData.geo_lng && (isNaN(Number(formData.geo_lng)) || Number(formData.geo_lng) < -180 || Number(formData.geo_lng) > 180)) {
      toast.error('Longitude must be between -180 and 180')
      return false
    }

    // Validate website URL if provided
    if (formData.website_url && formData.website_url.trim()) {
      try {
        new URL(formData.website_url.startsWith('http') ? formData.website_url : `https://${formData.website_url}`)
      } catch {
        toast.error('Please enter a valid website URL')
        return false
      }
    }

    return true
  }

  const uploadLogo = async (): Promise<string | null> => {
    if (!logoFile || !user) {
      return null
    }

    try {
      const fileExt = logoFile.name.split('.').pop()
      const fileName = `${user.id}-${Date.now()}.${fileExt}`
      const filePath = `school-logos/${fileName}`

      const { data, error: uploadError } = await supabase.storage
        .from('school-assets')
        .upload(filePath, logoFile, {
          cacheControl: '3600',
          upsert: false
        })

      if (uploadError) {
        console.error('Logo upload error:', uploadError)
        return null
      }

      const { data: { publicUrl } } = supabase.storage
        .from('school-assets')
        .getPublicUrl(filePath)

      return publicUrl
    } catch (error) {
      console.error('Logo upload error:', error)
      return null
    }
  }

  const handleSave = async () => {
    if (!validateForm() || !schoolData) {
      return
    }

    setIsSaving(true)

    try {
      // Upload new logo if provided
      let logoUrl = schoolData.logo_url
      if (logoFile) {
        toast.loading('Uploading logo...', { id: 'save-toast' })
        const newLogoUrl = await uploadLogo()
        if (newLogoUrl) {
          logoUrl = newLogoUrl
        } else {
          toast.error('Failed to upload logo', { id: 'save-toast' })
          setIsSaving(false)
          return
        }
      }

      // Prepare update data
      toast.loading('Saving school profile...', { id: 'save-toast' })

      const updateData = {
        name: formData.name.trim(),
        address: formData.address.trim() || null,
        contact_email: formData.contact_email.trim(),
        contact_phone: formData.contact_phone.trim() || null,
        principal_name: formData.principal_name.trim() || null,
        motto: formData.motto.trim() || null,
        website_url: formData.website_url.trim() || null,
        academic_start: formData.academic_start || null,
        academic_end: formData.academic_end || null,
        timezone: formData.timezone,
        language: formData.language,
        geo_lat: formData.geo_lat ? parseFloat(formData.geo_lat) : null,
        geo_lng: formData.geo_lng ? parseFloat(formData.geo_lng) : null,
        logo_url: logoUrl,
        updated_at: new Date().toISOString()
      }

      const { data, error } = await supabase
        .from('schools')
        .update(updateData)
        .eq('id', schoolData.id)
        .select()

      if (error) {
        console.error('Database error:', error)
        toast.error(`Failed to save changes: ${error.message}`, { id: 'save-toast' })
        setIsSaving(false)
        return
      }

      // Update local state
      setSchoolData(prev => prev ? { ...prev, ...updateData } : null)
      setHasChanges(false)
      setLogoFile(null)

      toast.success('School profile updated successfully!', { id: 'save-toast' })

      // Redirect to settings page after successful save
      setTimeout(() => {
        router.push('/admin/settings?saved=true')
      }, 1500)

    } catch (error) {
      console.error('Unexpected error:', error)
      toast.error(`An unexpected error occurred: ${error instanceof Error ? error.message : 'Unknown error'}`, { id: 'save-toast' })
    } finally {
      setIsSaving(false)
    }
  }

  if (isLoading) {
    return (
      <AdminLayout title="School Profile Settings">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
            <p className="text-gray-600">Loading school information...</p>
          </div>
        </div>
      </AdminLayout>
    )
  }

  if (!schoolData) {
    return (
      <AdminLayout title="School Profile Settings">
        <div className="text-center py-12">
          <p className="text-gray-600 mb-4">No school data found</p>
          <Button onClick={() => router.push('/admin')}>
            Return to Dashboard
          </Button>
        </div>
      </AdminLayout>
    )
  }

  return (
    <AdminLayout title="School Profile Settings">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">School Profile Settings</h1>
            <p className="text-gray-600 mt-1">Manage your school's information and settings</p>
          </div>
          <div className="flex gap-2">
            {hasChanges && (
              <Button
                variant="outline"
                onClick={() => {
                  fetchSchoolData()
                  setHasChanges(false)
                  setLogoFile(null)
                }}
              >
                Reset Changes
              </Button>
            )}
          </div>
        </div>

        {/* School Code Display */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <span className="w-2 h-2 bg-green-500 rounded-full"></span>
              School Code
            </CardTitle>
            <CardDescription>
              This unique code identifies your school. Share it with teachers and students for registration.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="bg-gray-50 p-4 rounded-lg">
              <div className="text-2xl font-mono font-bold text-center text-blue-600">
                {schoolData.school_code}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Basic Information */}
        <Card>
          <CardHeader>
            <CardTitle>Basic Information</CardTitle>
            <CardDescription>
              Core details about your school
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">School Name *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => handleInputChange('name', e.target.value)}
                  placeholder="Enter school name"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="principal_name">Principal Name</Label>
                <Input
                  id="principal_name"
                  value={formData.principal_name}
                  onChange={(e) => handleInputChange('principal_name', e.target.value)}
                  placeholder="Enter principal's name"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="address">Address</Label>
              <Textarea
                id="address"
                value={formData.address}
                onChange={(e) => handleInputChange('address', e.target.value)}
                placeholder="Enter school address"
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="motto">School Motto</Label>
              <Input
                id="motto"
                value={formData.motto}
                onChange={(e) => handleInputChange('motto', e.target.value)}
                placeholder="Enter school motto"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="website_url">Website URL</Label>
              <Input
                id="website_url"
                value={formData.website_url}
                onChange={(e) => handleInputChange('website_url', e.target.value)}
                placeholder="https://www.yourschool.com"
              />
            </div>
          </CardContent>
        </Card>

        {/* Contact Information */}
        <Card>
          <CardHeader>
            <CardTitle>Contact Information</CardTitle>
            <CardDescription>
              How people can reach your school
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="contact_email">Contact Email *</Label>
                <Input
                  id="contact_email"
                  type="email"
                  value={formData.contact_email}
                  onChange={(e) => handleInputChange('contact_email', e.target.value)}
                  placeholder="contact@yourschool.com"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="contact_phone">Contact Phone</Label>
                <Input
                  id="contact_phone"
                  value={formData.contact_phone}
                  onChange={(e) => handleInputChange('contact_phone', e.target.value)}
                  placeholder="+1 (555) 123-4567"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* School Logo */}
        <Card>
          <CardHeader>
            <CardTitle>School Logo</CardTitle>
            <CardDescription>
              Upload your school's logo (max 5MB, image files only)
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-4">
              {logoPreview && (
                <div className="relative">
                  <img
                    src={logoPreview}
                    alt="School logo preview"
                    className="w-20 h-20 object-cover rounded-lg border"
                  />
                  <Button
                    size="sm"
                    variant="destructive"
                    className="absolute -top-2 -right-2 h-6 w-6 rounded-full p-0"
                    onClick={removeLogo}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              )}
              <div className="flex-1">
                <Label htmlFor="logo" className="cursor-pointer">
                  <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-gray-400 transition-colors">
                    <Upload className="h-8 w-8 mx-auto mb-2 text-gray-400" />
                    <p className="text-sm text-gray-600">
                      Click to upload or drag and drop
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      PNG, JPG, GIF up to 5MB
                    </p>
                  </div>
                  <Input
                    id="logo"
                    type="file"
                    accept="image/*"
                    onChange={handleLogoChange}
                    className="hidden"
                  />
                </Label>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Academic Settings */}
        <Card>
          <CardHeader>
            <CardTitle>Academic Settings</CardTitle>
            <CardDescription>
              Configure academic year and system preferences
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="academic_start">Academic Year Start</Label>
                <Input
                  id="academic_start"
                  type="date"
                  value={formData.academic_start}
                  onChange={(e) => handleInputChange('academic_start', e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="academic_end">Academic Year End</Label>
                <Input
                  id="academic_end"
                  type="date"
                  value={formData.academic_end}
                  onChange={(e) => handleInputChange('academic_end', e.target.value)}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="timezone">Timezone</Label>
                <Select
                  value={formData.timezone}
                  onValueChange={(value) => handleInputChange('timezone', value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select timezone" />
                  </SelectTrigger>
                  <SelectContent>
                    {timezones.map((tz) => (
                      <SelectItem key={tz} value={tz}>
                        {tz}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="language">Language</Label>
                <Select
                  value={formData.language}
                  onValueChange={(value) => handleInputChange('language', value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select language" />
                  </SelectTrigger>
                  <SelectContent>
                    {languages.map((lang) => (
                      <SelectItem key={lang.code} value={lang.code}>
                        {lang.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Geolocation */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MapPin className="h-5 w-5" />
              School Location
            </CardTitle>
            <CardDescription>
              Set your school's geographic coordinates for mapping and location services
            </CardDescription>
          </CardHeader>
          <CardContent>
            <LocationMap
              latitude={formData.geo_lat}
              longitude={formData.geo_lng}
              onLocationChange={(lat, lng) => {
                handleInputChange('geo_lat', lat)
                handleInputChange('geo_lng', lng)
              }}
            />
          </CardContent>
        </Card>

        {/* Save Actions */}
        <div className="flex justify-end gap-2 pb-6">
          <Button
            variant="outline"
            onClick={() => router.push('/admin/settings')}
            disabled={isSaving}
          >
            Cancel
          </Button>

          <Button
            onClick={() => {
              // Check if this is a critical change (school name or contact email)
              const isCriticalChange =
                schoolData?.name !== formData.name ||
                schoolData?.contact_email !== formData.contact_email

              if (isCriticalChange) {
                setShowConfirmDialog(true)
              } else {
                handleSave()
              }
            }}
            disabled={isSaving || !hasChanges}
          >
            {isSaving ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              'Save Changes'
            )}
          </Button>
        </div>

        {/* Confirmation Dialog */}
        <ConfirmationDialog
          open={showConfirmDialog}
          onOpenChange={setShowConfirmDialog}
          title="Confirm Critical Changes"
          description="You are about to change critical school information (name or contact email). This may affect how users access your school. Are you sure you want to continue?"
          confirmText="Save Changes"
          cancelText="Cancel"
          onConfirm={() => {
            setShowConfirmDialog(false)
            handleSave()
          }}
        />
      </div>
    </AdminLayout>
  )
}
