'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { toast } from 'sonner'
// Local type definitions
type Gender = 'male' | 'female' | 'other'

interface AdmissionFormData {
  full_name: string
  email: string
  phone: string
  date_of_birth: string
  gender: Gender
  class_level: string
  address: string
  parent_name: string
  parent_phone: string
  parent_email: string
}

export default function AdmissionForm() {
  const [formData, setFormData] = useState<AdmissionFormData>({
    full_name: '',
    email: '',
    phone: '',
    date_of_birth: '',
    gender: 'male',
    class_level: '1',
    address: '',
    parent_name: '',
    parent_phone: '',
    parent_email: '',
  })
  const [photograph, setPhotograph] = useState<File | null>(null)
  const [documents, setDocuments] = useState<File[]>([])
  const [loading, setLoading] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [applicationId, setApplicationId] = useState<string>('')

  const handleInputChange = (field: keyof AdmissionFormData, value: string) => {
    setFormData((prev: AdmissionFormData) => ({ ...prev, [field]: value }))
  }

  const handlePhotographChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      // Validate file size (max 2MB)
      if (file.size > 2 * 1024 * 1024) {
        toast.error('Photograph must be less than 2MB')
        return
      }
      // Validate file type
      if (!['image/jpeg', 'image/jpg', 'image/png'].includes(file.type)) {
        toast.error('Photograph must be JPG or PNG format')
        return
      }
      setPhotograph(file)
    }
  }

  const handleDocumentsChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    // Validate each file
    const validFiles = files.filter(file => {
      if (file.size > 5 * 1024 * 1024) {
        toast.error(`${file.name} is too large (max 5MB)`)
        return false
      }
      if (!['application/pdf', 'image/jpeg', 'image/jpg', 'image/png'].includes(file.type)) {
        toast.error(`${file.name} must be PDF, JPG, or PNG format`)
        return false
      }
      return true
    })
    setDocuments(validFiles)
  }

  const validateForm = (): boolean => {
    if (!formData.full_name.trim()) {
      toast.error('Full name is required')
      return false
    }
    if (!formData.email.trim()) {
      toast.error('Email is required')
      return false
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      toast.error('Please enter a valid email address')
      return false
    }
    if (!formData.phone.trim()) {
      toast.error('Phone number is required')
      return false
    }
    if (!formData.date_of_birth) {
      toast.error('Date of birth is required')
      return false
    }
    if (!formData.parent_name.trim()) {
      toast.error('Parent/Guardian name is required')
      return false
    }
    if (!formData.parent_phone.trim()) {
      toast.error('Parent/Guardian phone is required')
      return false
    }
    if (!photograph) {
      toast.error('Student photograph is required')
      return false
    }
    return true
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!validateForm()) return

    setLoading(true)
    const loadingToast = toast.loading('Submitting application...', { duration: Infinity })

    try {
      const submitData = new FormData()
      
      // Add form fields
      Object.entries(formData).forEach(([key, value]) => {
        submitData.append(key, String(value))
      })
      
      // Add files
      if (photograph) {
        submitData.append('photograph', photograph)
      }
      documents.forEach((doc, index) => {
        submitData.append(`document_${index}`, doc)
      })

      const response = await fetch('/api/admission/submit', {
        method: 'POST',
        body: submitData
      })

      const result = await response.json()

      if (!response.ok || !result.success) {
        throw new Error(result.error || 'Failed to submit application')
      }

      toast.dismiss(loadingToast)
      toast.success('Application submitted successfully!', {
        description: `Your application ID is: ${result.applicationId}`,
        duration: 10000
      })

      setApplicationId(result.applicationId)
      setSubmitted(true)

    } catch (error) {
      console.error('Error submitting application:', error)
      toast.dismiss(loadingToast)
      toast.error('Failed to submit application', {
        description: error instanceof Error ? error.message : 'Unknown error occurred',
        duration: 5000
      })
    } finally {
      setLoading(false)
    }
  }

  if (submitted) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
              <span className="text-2xl">✅</span>
            </div>
            <CardTitle className="text-green-600">Application Submitted!</CardTitle>
            <CardDescription>
              Your admission application has been successfully submitted.
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center space-y-4">
            <div className="bg-gray-50 p-4 rounded-lg">
              <p className="text-sm text-gray-600 mb-2">Your Application ID:</p>
              <p className="font-mono text-lg font-semibold text-gray-900">{applicationId}</p>
            </div>
            <p className="text-sm text-gray-600">
              Please save this ID for future reference. You will be contacted via email regarding the next steps.
            </p>
            <Button 
              onClick={() => window.location.href = '/'}
              className="w-full"
            >
              Return to Home
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 py-8 px-4">
      <div className="max-w-2xl mx-auto">
        <Card>
          <CardHeader>
            <CardTitle className="text-2xl text-center">Student Admission Form</CardTitle>
            <CardDescription className="text-center">
              Please fill out all required information to apply for admission
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Student Information */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-gray-900 border-b pb-2">
                  Student Information
                </h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="full_name">Full Name *</Label>
                    <Input
                      id="full_name"
                      value={formData.full_name}
                      onChange={(e) => handleInputChange('full_name', e.target.value)}
                      placeholder="Enter student's full name"
                      required
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="email">Email Address *</Label>
                    <Input
                      id="email"
                      type="email"
                      value={formData.email}
                      onChange={(e) => handleInputChange('email', e.target.value)}
                      placeholder="student@example.com"
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="phone">Phone Number *</Label>
                    <Input
                      id="phone"
                      value={formData.phone}
                      onChange={(e) => handleInputChange('phone', e.target.value)}
                      placeholder="+1234567890"
                      required
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="date_of_birth">Date of Birth *</Label>
                    <Input
                      id="date_of_birth"
                      type="date"
                      value={formData.date_of_birth}
                      onChange={(e) => handleInputChange('date_of_birth', e.target.value)}
                      required
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="gender">Gender</Label>
                    <select
                      id="gender"
                      value={formData.gender}
                      onChange={(e) => handleInputChange('gender', e.target.value as Gender)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="male">Male</option>
                      <option value="female">Female</option>
                      <option value="other">Other</option>
                    </select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="class_level">Applying for Class *</Label>
                  <select
                    id="class_level"
                    value={formData.class_level}
                    onChange={(e) => handleInputChange('class_level', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  >
                    {Array.from({ length: 12 }, (_, i) => i + 1).map(num => (
                      <option key={num} value={num.toString()}>
                        Class {num}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="address">Address</Label>
                  <Textarea
                    id="address"
                    value={formData.address}
                    onChange={(e) => handleInputChange('address', e.target.value)}
                    placeholder="Enter complete address"
                    rows={3}
                  />
                </div>
              </div>

              {/* Parent/Guardian Information */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-gray-900 border-b pb-2">
                  Parent/Guardian Information
                </h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="parent_name">Parent/Guardian Name *</Label>
                    <Input
                      id="parent_name"
                      value={formData.parent_name}
                      onChange={(e) => handleInputChange('parent_name', e.target.value)}
                      placeholder="Enter parent/guardian name"
                      required
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="parent_phone">Parent/Guardian Phone *</Label>
                    <Input
                      id="parent_phone"
                      value={formData.parent_phone}
                      onChange={(e) => handleInputChange('parent_phone', e.target.value)}
                      placeholder="+1234567890"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="parent_email">Parent/Guardian Email</Label>
                  <Input
                    id="parent_email"
                    type="email"
                    value={formData.parent_email}
                    onChange={(e) => handleInputChange('parent_email', e.target.value)}
                    placeholder="parent@example.com"
                  />
                </div>
              </div>

              {/* File Uploads */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-gray-900 border-b pb-2">
                  Documents
                </h3>
                
                <div className="space-y-2">
                  <Label htmlFor="photograph">Student Photograph * (Max 2MB, JPG/PNG)</Label>
                  <Input
                    id="photograph"
                    type="file"
                    accept="image/jpeg,image/jpg,image/png"
                    onChange={handlePhotographChange}
                    required
                  />
                  {photograph && (
                    <p className="text-sm text-green-600">✓ {photograph.name}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="documents">Additional Documents (Optional, Max 5MB each)</Label>
                  <Input
                    id="documents"
                    type="file"
                    accept="application/pdf,image/jpeg,image/jpg,image/png"
                    multiple
                    onChange={handleDocumentsChange}
                  />
                  {documents.length > 0 && (
                    <div className="text-sm text-green-600">
                      ✓ {documents.length} document(s) selected
                    </div>
                  )}
                </div>
              </div>

              <Button 
                type="submit" 
                disabled={loading}
                className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
              >
                {loading ? (
                  <div className="flex items-center space-x-2">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    <span>Submitting...</span>
                  </div>
                ) : (
                  'Submit Application'
                )}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
