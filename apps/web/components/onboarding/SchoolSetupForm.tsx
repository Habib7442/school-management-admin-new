'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { useAuthStore } from '@/lib/stores/auth-store'
import { supabase } from '@/lib/supabase'
import { toast } from 'sonner'

interface SchoolFormData {
  name: string
  address: string
  contactEmail: string
  contactPhone: string
  principalName: string
  motto: string
  websiteUrl: string
  academicStart: string
  academicEnd: string
  timezone: string
  language: string
}

export default function SchoolSetupForm() {
  const [formData, setFormData] = useState<SchoolFormData>({
    name: '',
    address: '',
    contactEmail: '',
    contactPhone: '',
    principalName: '',
    motto: '',
    websiteUrl: '',
    academicStart: '',
    academicEnd: '',
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    language: 'en'
  })
  
  const [logoFile, setLogoFile] = useState<File | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [currentStep, setCurrentStep] = useState(1)
  
  const { user, setUser } = useAuthStore()
  const router = useRouter()

  const handleInputChange = (field: keyof SchoolFormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      // Validate file type and size
      if (!file.type.startsWith('image/')) {
        toast.error('Please select a valid image file')
        return
      }
      
      if (file.size > 5 * 1024 * 1024) { // 5MB limit
        toast.error('Image file must be less than 5MB')
        return
      }
      
      setLogoFile(file)
    }
  }

  const uploadLogo = async (): Promise<string | null> => {
    if (!logoFile || !user) return null

    try {
      console.log('Starting logo upload...')
      console.log('File:', logoFile.name, 'Size:', logoFile.size, 'Type:', logoFile.type)
      console.log('User ID:', user.id)

      // Validate file size (5MB limit)
      if (logoFile.size > 5 * 1024 * 1024) {
        toast.error('File size must be less than 5MB')
        return null
      }

      // Validate file type
      if (!logoFile.type.startsWith('image/')) {
        toast.error('Please upload an image file')
        return null
      }

      const fileExt = logoFile.name.split('.').pop()
      const fileName = `${user.id}-${Date.now()}.${fileExt}`
      const filePath = `school-logos/${fileName}`

      console.log('Uploading to path:', filePath)

      const { data, error: uploadError } = await supabase.storage
        .from('school-assets')
        .upload(filePath, logoFile, {
          cacheControl: '3600',
          upsert: false
        })

      if (uploadError) {
        console.error('Logo upload error:', uploadError)
        toast.error(`Failed to upload logo: ${uploadError.message}`)
        return null
      }

      console.log('Upload successful:', data)

      const { data: { publicUrl } } = supabase.storage
        .from('school-assets')
        .getPublicUrl(filePath)

      console.log('Public URL:', publicUrl)
      return publicUrl
    } catch (error) {
      console.error('Logo upload error:', error)
      toast.error(`Failed to upload logo: ${error instanceof Error ? error.message : 'Unknown error'}`)
      return null
    }
  }

  const generateSchoolCode = async (): Promise<string> => {
    try {
      const { data, error } = await supabase.rpc('generate_school_code')
      
      if (error || !data) {
        // Fallback to client-side generation
        return Math.random().toString(36).substring(2, 8).toUpperCase()
      }
      
      return data
    } catch (error) {
      // Fallback to client-side generation
      return Math.random().toString(36).substring(2, 8).toUpperCase()
    }
  }

  const validateForm = (): boolean => {
    if (!formData.name.trim()) {
      toast.error('School name is required')
      return false
    }
    
    if (!formData.contactEmail.trim()) {
      toast.error('Contact email is required')
      return false
    }
    
    if (!formData.contactEmail.includes('@')) {
      toast.error('Please enter a valid email address')
      return false
    }
    
    if (formData.academicStart && formData.academicEnd) {
      const startDate = new Date(formData.academicStart)
      const endDate = new Date(formData.academicEnd)
      
      if (startDate >= endDate) {
        toast.error('Academic year end date must be after start date')
        return false
      }
    }
    
    return true
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    console.log('Form submission started')
    console.log('Current step:', currentStep)
    console.log('Form data:', formData)
    console.log('User:', user)

    if (!validateForm() || !user) {
      console.log('Validation failed or no user')
      return
    }

    setIsSubmitting(true)
    const loadingToast = toast.loading('Setting up your school...', { duration: Infinity })

    try {
      // Upload logo if provided
      console.log('Uploading logo...')
      const logoUrl = await uploadLogo()
      console.log('Logo URL:', logoUrl)

      // Generate unique school code
      console.log('Generating school code...')
      const schoolCode = await generateSchoolCode()
      console.log('School code:', schoolCode)

      // Create school record
      console.log('Creating school record...')
      const schoolData = {
        admin_id: user.id,
        name: formData.name.trim(),
        logo_url: logoUrl,
        address: formData.address.trim() || null,
        contact_email: formData.contactEmail.trim(),
        contact_phone: formData.contactPhone.trim() || null,
        school_code: schoolCode,
        academic_start: formData.academicStart || null,
        academic_end: formData.academicEnd || null,
        timezone: formData.timezone,
        language: formData.language,
        motto: formData.motto.trim() || null,
        principal_name: formData.principalName.trim() || null,
        website_url: formData.websiteUrl.trim() || null
      }
      console.log('School data to insert:', schoolData)

      const { data: school, error: schoolError } = await supabase
        .from('schools')
        .insert(schoolData)
        .select()
        .single()

      if (schoolError) {
        console.error('School creation error:', schoolError)
        toast.error(`Failed to create school: ${schoolError.message}`)
        return
      }

      console.log('School created successfully:', school)

      // Update user profile with onboarding completion and school_id
      console.log('Updating user profile...')
      const profileUpdateData = {
        onboarding_completed: true,
        school_id: school.id
      }
      console.log('Profile update data:', profileUpdateData)

      const { error: profileError } = await supabase
        .from('profiles')
        .update(profileUpdateData)
        .eq('id', user.id)

      if (profileError) {
        console.error('Profile update error:', profileError)
        toast.error(`Failed to complete onboarding: ${profileError.message}`)
        return
      }

      console.log('Profile updated successfully')

      // Update local user state
      const updatedUser = {
        ...user,
        onboarding_completed: true,
        school_id: school.id
      }
      console.log('Updating local user state:', updatedUser)
      setUser(updatedUser)

      toast.dismiss(loadingToast)
      toast.success('School setup completed successfully!', {
        description: `Your school code is: ${schoolCode}. Share this with teachers and students for registration.`,
        duration: 8000
      })

      console.log('Redirecting to admin dashboard...')
      // Redirect to admin dashboard
      router.push('/admin')

    } catch (error) {
      console.error('School setup error:', error)
      toast.error(`An unexpected error occurred: ${error instanceof Error ? error.message : 'Unknown error'}`)
    } finally {
      console.log('Form submission completed, setting isSubmitting to false')
      setIsSubmitting(false)
      toast.dismiss(loadingToast)
    }
  }

  const nextStep = (e?: React.MouseEvent) => {
    // Prevent any form submission
    if (e) {
      e.preventDefault()
      e.stopPropagation()
    }

    if (currentStep === 1) {
      if (!formData.name.trim()) {
        toast.error('School name is required')
        return
      }
      if (!formData.contactEmail.trim() || !formData.contactEmail.includes('@')) {
        toast.error('Valid contact email is required')
        return
      }
    }

    if (currentStep === 2) {
      // No validation required for step 2, just move to step 3
      console.log('Moving from step 2 to step 3')
    }

    setCurrentStep(prev => Math.min(prev + 1, 3))
  }

  const prevStep = () => {
    setCurrentStep(prev => Math.max(prev - 1, 1))
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-purple-50 p-4">
      <Card className="w-full max-w-2xl shadow-xl">
        <CardHeader className="text-center space-y-2">
          <CardTitle className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
            School Setup
          </CardTitle>
          <CardDescription className="text-lg">
            Let's set up your school management system
          </CardDescription>
          <div className="flex justify-center space-x-2 mt-4">
            {[1, 2, 3].map((step) => (
              <div
                key={step}
                className={`w-3 h-3 rounded-full ${
                  step <= currentStep ? 'bg-blue-600' : 'bg-gray-300'
                }`}
              />
            ))}
          </div>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Step 1: Basic Information */}
            {currentStep === 1 && (
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-gray-900">Basic Information</h3>
                
                <div className="space-y-2">
                  <Label htmlFor="name">School Name *</Label>
                  <Input
                    id="name"
                    type="text"
                    placeholder="Enter your school name"
                    value={formData.name}
                    onChange={(e) => handleInputChange('name', e.target.value)}
                    disabled={isSubmitting}
                    required
                    className="w-full"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="contactEmail">Contact Email *</Label>
                  <Input
                    id="contactEmail"
                    type="email"
                    placeholder="school@example.com"
                    value={formData.contactEmail}
                    onChange={(e) => handleInputChange('contactEmail', e.target.value)}
                    disabled={isSubmitting}
                    required
                    className="w-full"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="contactPhone">Contact Phone</Label>
                  <Input
                    id="contactPhone"
                    type="tel"
                    placeholder="+1 (555) 123-4567"
                    value={formData.contactPhone}
                    onChange={(e) => handleInputChange('contactPhone', e.target.value)}
                    disabled={isSubmitting}
                    className="w-full"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="address">School Address</Label>
                  <Textarea
                    id="address"
                    placeholder="Enter complete school address"
                    value={formData.address}
                    onChange={(e) => handleInputChange('address', e.target.value)}
                    disabled={isSubmitting}
                    className="w-full"
                    rows={3}
                  />
                </div>
              </div>
            )}

            {/* Step 2: Additional Details */}
            {currentStep === 2 && (
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-gray-900">Additional Details</h3>
                
                <div className="space-y-2">
                  <Label htmlFor="logo">School Logo</Label>
                  <Input
                    id="logo"
                    type="file"
                    accept="image/*"
                    onChange={handleLogoChange}
                    disabled={isSubmitting}
                    className="w-full"
                  />
                  <p className="text-xs text-gray-500">Upload a logo (max 5MB, PNG/JPG/GIF)</p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="principalName">Principal Name</Label>
                  <Input
                    id="principalName"
                    type="text"
                    placeholder="Principal's full name"
                    value={formData.principalName}
                    onChange={(e) => handleInputChange('principalName', e.target.value)}
                    disabled={isSubmitting}
                    className="w-full"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="motto">School Motto</Label>
                  <Input
                    id="motto"
                    type="text"
                    placeholder="Excellence in Education"
                    value={formData.motto}
                    onChange={(e) => handleInputChange('motto', e.target.value)}
                    disabled={isSubmitting}
                    className="w-full"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="websiteUrl">Website URL</Label>
                  <Input
                    id="websiteUrl"
                    type="url"
                    placeholder="https://www.yourschool.edu"
                    value={formData.websiteUrl}
                    onChange={(e) => handleInputChange('websiteUrl', e.target.value)}
                    disabled={isSubmitting}
                    className="w-full"
                  />
                </div>
              </div>
            )}

            {/* Step 3: Academic Settings */}
            {currentStep === 3 && (
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-gray-900">Academic Settings</h3>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="academicStart">Academic Year Start</Label>
                    <Input
                      id="academicStart"
                      type="date"
                      value={formData.academicStart}
                      onChange={(e) => handleInputChange('academicStart', e.target.value)}
                      disabled={isSubmitting}
                      className="w-full"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="academicEnd">Academic Year End</Label>
                    <Input
                      id="academicEnd"
                      type="date"
                      value={formData.academicEnd}
                      onChange={(e) => handleInputChange('academicEnd', e.target.value)}
                      disabled={isSubmitting}
                      className="w-full"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="timezone">Timezone</Label>
                    <select
                      id="timezone"
                      value={formData.timezone}
                      onChange={(e) => handleInputChange('timezone', e.target.value)}
                      disabled={isSubmitting}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="UTC">UTC</option>
                      <option value="America/New_York">Eastern Time</option>
                      <option value="America/Chicago">Central Time</option>
                      <option value="America/Denver">Mountain Time</option>
                      <option value="America/Los_Angeles">Pacific Time</option>
                      <option value="Europe/London">London</option>
                      <option value="Asia/Tokyo">Tokyo</option>
                      <option value="Asia/Kolkata">India</option>
                    </select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="language">Primary Language</Label>
                    <select
                      id="language"
                      value={formData.language}
                      onChange={(e) => handleInputChange('language', e.target.value)}
                      disabled={isSubmitting}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="en">English</option>
                      <option value="es">Spanish</option>
                      <option value="fr">French</option>
                      <option value="de">German</option>
                      <option value="hi">Hindi</option>
                      <option value="zh">Chinese</option>
                    </select>
                  </div>
                </div>

                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <h4 className="font-semibold text-blue-900 mb-2">Important Note</h4>
                  <p className="text-blue-800 text-sm">
                    After setup, you'll receive a unique school code that teachers and students 
                    will use during registration to join your school.
                  </p>
                </div>
              </div>
            )}

            {/* Navigation Buttons */}
            <div className="flex justify-between pt-6">
              {currentStep > 1 && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={prevStep}
                  disabled={isSubmitting}
                >
                  Previous
                </Button>
              )}
              
              {currentStep < 3 ? (
                <Button
                  type="button"
                  onClick={(e) => nextStep(e)}
                  disabled={isSubmitting}
                  className="ml-auto bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
                >
                  Next
                </Button>
              ) : (
                <Button
                  type="submit"
                  disabled={isSubmitting}
                  className="ml-auto bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
                >
                  {isSubmitting ? (
                    <div className="flex items-center space-x-2">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      <span>Setting up...</span>
                    </div>
                  ) : (
                    'Complete Setup'
                  )}
                </Button>
              )}
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
