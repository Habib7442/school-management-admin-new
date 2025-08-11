'use client'

import { useState, useEffect, useMemo, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import AdminLayout from '@/components/admin/AdminLayout'

import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/lib/stores/auth-store'
import { toast } from 'sonner'
import type { AdmissionApplication, AdmissionStatus } from '@repo/types'

// Cache configuration
const CACHE_DURATION = 5 * 60 * 1000 // 5 minutes
const CACHE_KEY = 'admission_applications'

// Simple in-memory cache
let applicationCache: {
  data: AdmissionApplication[]
  timestamp: number
} | null = null

export default function AdmissionManagement() {
  const [applications, setApplications] = useState<AdmissionApplication[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedStatus, setSelectedStatus] = useState<AdmissionStatus | 'all'>('all')
  const [selectedApplication, setSelectedApplication] = useState<AdmissionApplication | null>(null)
  const [showDetailModal, setShowDetailModal] = useState(false)
  const [showInterviewModal, setShowInterviewModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [showRejectDialog, setShowRejectDialog] = useState(false)
  const [applicationToReject, setApplicationToReject] = useState<AdmissionApplication | null>(null)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [applicationToDelete, setApplicationToDelete] = useState<AdmissionApplication | null>(null)
  const [lastFetch, setLastFetch] = useState<number>(0)
  const [interviewData, setInterviewData] = useState({
    interview_date: '',
    interview_notes: ''
  })
  const [editData, setEditData] = useState({
    status: 'pending' as AdmissionStatus,
    notes: ''
  })
  const [actionLoading, setActionLoading] = useState<Record<string, boolean>>({})
  const { user } = useAuthStore()

  useEffect(() => {
    // Initialize cache from localStorage on mount
    try {
      const cachedData = localStorage.getItem(CACHE_KEY)
      if (cachedData) {
        const parsed = JSON.parse(cachedData)
        if (parsed.data && Array.isArray(parsed.data)) {
          const now = Date.now()
          if ((now - parsed.timestamp) < CACHE_DURATION) {
            applicationCache = parsed
            console.log('📦 Initialized cache from localStorage')
          }
        }
      }
    } catch (e) {
      console.warn('Failed to initialize cache from localStorage:', e)
    }

    fetchApplications()

    // Safety timeout to prevent infinite loading
    const loadingTimeout = setTimeout(() => {
      if (loading) {
        console.warn('⚠️ Loading timeout reached, forcing loading to false')
        setLoading(false)
        toast.error('Loading took too long. Please try refreshing manually.')
      }
    }, 30000) // 30 seconds timeout

    return () => clearTimeout(loadingTimeout)
  }, [])

  // Additional effect to handle stuck loading states
  useEffect(() => {
    if (loading) {
      const stuckTimeout = setTimeout(() => {
        console.warn('⚠️ Loading appears stuck, resetting...')
        setLoading(false)
        toast.error('Loading appears stuck. Please try again.')
      }, 15000) // 15 seconds for individual operations

      return () => clearTimeout(stuckTimeout)
    }
  }, [loading])

  const fetchApplications = useCallback(async (forceRefresh = false) => {
    console.log('🚀 fetchApplications called with forceRefresh:', forceRefresh)

    try {
      const now = Date.now()

      // Check if we have valid cached data and don't need to force refresh
      if (!forceRefresh && applicationCache && (now - applicationCache.timestamp) < CACHE_DURATION) {
        console.log('📦 Using cached admission data')
        setApplications(applicationCache.data)
        setLastFetch(applicationCache.timestamp)
        setLoading(false)
        return
      }

      console.log('🔄 Fetching fresh admission data from API')
      setLoading(true)

      // Check if user is authenticated
      const { data: { user: currentUser } } = await supabase.auth.getUser()
      if (!currentUser) {
        console.error('User not authenticated')
        toast.error('Please log in to view applications')
        setLoading(false)
        return
      }

      console.log('👤 User authenticated:', currentUser.id)

      const { data, error } = await supabase
        .from('admissions')
        .select(`
          id,
          full_name,
          email,
          phone,
          date_of_birth,
          gender,
          class,
          address,
          parent_name,
          parent_phone,
          parent_email,
          photograph_url,
          documents,
          status,
          applied_date,
          interview_date,
          interview_notes,
          decision_date,
          decided_by,
          school_id,
          created_at,
          updated_at
        `)
        .order('created_at', { ascending: false })

      if (error) {
        console.error('Supabase error:', error)
        toast.error(`Failed to fetch applications: ${error.message}`)
        throw error
      }

      const fetchedData = data || []
      console.log('✅ Successfully fetched applications:', fetchedData.length, 'records')

      // Update cache
      applicationCache = {
        data: fetchedData,
        timestamp: now
      }

      setApplications(fetchedData)
      setLastFetch(now)

      // Store in localStorage as backup cache
      try {
        localStorage.setItem(CACHE_KEY, JSON.stringify({
          data: fetchedData,
          timestamp: now
        }))
        console.log('💾 Cache stored in localStorage')
      } catch (e) {
        console.warn('Failed to store cache in localStorage:', e)
      }

    } catch (error) {
      console.error('❌ Error fetching applications:', error)
      toast.error(`Failed to load applications: ${error instanceof Error ? error.message : 'Unknown error'}`)

      // Try to load from localStorage cache as fallback
      try {
        const cachedData = localStorage.getItem(CACHE_KEY)
        if (cachedData) {
          const parsed = JSON.parse(cachedData)
          if (parsed.data && Array.isArray(parsed.data)) {
            console.log('📦 Using localStorage fallback cache')
            setApplications(parsed.data)
            setLastFetch(parsed.timestamp)
            toast.info('Showing cached data due to network error')
          }
        }
      } catch (e) {
        console.warn('Failed to load fallback cache:', e)
      }
    } finally {
      console.log('🏁 fetchApplications completed, setting loading to false')
      setLoading(false)
    }
  }, []) // Keep empty dependency array since we don't want to recreate this function

  // Memoized filtered applications for better performance
  const filteredApplications = useMemo(() => {
    return applications.filter(app => {
      const matchesSearch = app.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           app.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           (app.phone && app.phone.includes(searchTerm))
      const matchesStatus = selectedStatus === 'all' || app.status === selectedStatus
      return matchesSearch && matchesStatus
    })
  }, [applications, searchTerm, selectedStatus])

  const getStatusColor = (status: AdmissionStatus) => {
    const colors = {
      pending: 'bg-yellow-100 text-yellow-800',
      interview_scheduled: 'bg-blue-100 text-blue-800',
      accepted: 'bg-green-100 text-green-800',
      rejected: 'bg-red-100 text-red-800'
    }
    return colors[status] || 'bg-gray-100 text-gray-800'
  }

  const getStatusLabel = (status: AdmissionStatus) => {
    const labels = {
      pending: 'Pending',
      interview_scheduled: 'Interview Scheduled',
      accepted: 'Accepted',
      rejected: 'Rejected'
    }
    return labels[status] || status
  }



  const handleViewDetails = (application: AdmissionApplication) => {
    setSelectedApplication(application)
    setShowDetailModal(true)
  }

  const handleScheduleInterview = async () => {
    if (!selectedApplication || !user?.id) return

    try {
      const { error } = await supabase
        .from('admissions')
        .update({
          status: 'interview_scheduled',
          interview_date: interviewData.interview_date,
          interview_notes: interviewData.interview_notes,
          updated_at: new Date().toISOString()
        })
        .eq('id', selectedApplication.id)

      if (error) throw error

      toast.success('Interview scheduled successfully', {
        description: `Date: ${new Date(interviewData.interview_date).toLocaleDateString()}`
      })

      setShowInterviewModal(false)
      fetchApplications(true) // Force refresh after interview scheduling
    } catch (error) {
      console.error('Error scheduling interview:', error)
      toast.error('Failed to schedule interview')
    }
  }

  const handleEditStatus = (application: AdmissionApplication) => {
    setSelectedApplication(application)
    setEditData({
      status: application.status,
      notes: ''
    })
    setShowEditModal(true)
  }

  const handleUpdateStatus = async () => {
    if (!selectedApplication || !user?.id) return

    try {
      const updateData: any = {
        status: editData.status,
        updated_at: new Date().toISOString()
      }

      // If changing to rejected, we might want to keep the record for audit
      if (editData.status === 'rejected') {
        updateData.decision_date = new Date().toISOString()
        updateData.decided_by = user.id
      } else if (editData.status === 'accepted') {
        updateData.decision_date = new Date().toISOString()
        updateData.decided_by = user.id
      }

      const { error } = await supabase
        .from('admissions')
        .update(updateData)
        .eq('id', selectedApplication.id)

      if (error) throw error

      toast.success('Status updated successfully', {
        description: `Changed to: ${getStatusLabel(editData.status)}`
      })

      setShowEditModal(false)
      fetchApplications(true) // Force refresh after status update
    } catch (error) {
      console.error('Error updating status:', error)
      toast.error('Failed to update status')
    }
  }

  const handleConfirmReject = async () => {
    if (!applicationToReject || !user?.id) return

    const actionKey = `${applicationToReject.id}-reject`
    setActionLoading(prev => ({ ...prev, [actionKey]: true }))

    try {
      // Use the reject API endpoint
      const response = await fetch('/api/admission/reject', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          applicationId: applicationToReject.id,
          adminId: user.id,
          reason: 'Rejected by admin'
        })
      })

      const result = await response.json()

      if (!response.ok || !result.success) {
        throw new Error(result.error || 'Failed to reject application')
      }

      toast.success('Application rejected and data cleaned up successfully', {
        description: `${result.deletedFiles} files were deleted from storage`,
        duration: 5000
      })

      setShowRejectDialog(false)
      setApplicationToReject(null)
      fetchApplications(true) // Force refresh after rejection
    } catch (error) {
      console.error('Error rejecting application:', error)
      toast.error('Failed to reject application', {
        description: error instanceof Error ? error.message : 'Unknown error occurred'
      })
    } finally {
      setActionLoading(prev => ({ ...prev, [actionKey]: false }))
    }
  }

  const handleDeleteAcceptedApplication = (application: AdmissionApplication) => {
    setApplicationToDelete(application)
    setShowDeleteDialog(true)
  }

  const handleConfirmDelete = async () => {
    if (!applicationToDelete || !user?.id) return

    const actionKey = `${applicationToDelete.id}-delete`
    setActionLoading(prev => ({ ...prev, [actionKey]: true }))

    try {
      // Use the delete API endpoint (similar to reject but for accepted applications)
      const response = await fetch('/api/admission/delete', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          applicationId: applicationToDelete.id,
          adminId: user.id,
          reason: 'Deleted accepted application'
        })
      })

      const result = await response.json()

      if (!response.ok || !result.success) {
        throw new Error(result.error || 'Failed to delete application')
      }

      toast.success('Accepted application deleted successfully', {
        description: `${result.deletedFiles} files were deleted from storage`,
        duration: 5000
      })

      setShowDeleteDialog(false)
      setApplicationToDelete(null)
      fetchApplications(true) // Force refresh after deletion
    } catch (error) {
      console.error('Error deleting application:', error)
      toast.error('Failed to delete application', {
        description: error instanceof Error ? error.message : 'Unknown error occurred'
      })
    } finally {
      setActionLoading(prev => ({ ...prev, [actionKey]: false }))
    }
  }

  const handleQuickAction = async (applicationId: string, action: 'accept' | 'reject' | 'schedule_interview') => {
    if (!user?.id) {
      toast.error('User not authenticated')
      return
    }

    const actionKey = `${applicationId}-${action}`
    setActionLoading(prev => ({ ...prev, [actionKey]: true }))

    try {
      if (action === 'accept') {
        // Use the accept API endpoint
        const response = await fetch('/api/admission/accept', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            applicationId,
            adminId: user.id
          })
        })

        const result = await response.json()

        if (!response.ok || !result.success) {
          throw new Error(result.error || 'Failed to accept application')
        }

        toast.success('🎉 Application accepted successfully!', {
          description: `Student: ${result.student.name} | Password: ${result.student.password}`,
          duration: 15000,
          action: {
            label: 'Copy Password',
            onClick: () => {
              navigator.clipboard.writeText(result.student.password)
              toast.success('Password copied to clipboard!')
            }
          }
        })
      } else if (action === 'reject') {
        // Show rejection confirmation dialog
        const application = applications.find(app => app.id === applicationId)
        if (application) {
          setApplicationToReject(application)
          setShowRejectDialog(true)
        }
        setActionLoading(prev => ({ ...prev, [actionKey]: false }))
        return
      } else if (action === 'schedule_interview') {
        // Open interview scheduling modal
        const application = applications.find(app => app.id === applicationId)
        if (application) {
          setSelectedApplication(application)
          setInterviewData({
            interview_date: '',
            interview_notes: ''
          })
          setShowInterviewModal(true)
        }
        setActionLoading(prev => ({ ...prev, [actionKey]: false }))
        return
      }

      fetchApplications(true) // Force refresh after any action
    } catch (error) {
      console.error(`Error ${action}:`, error)
      toast.error(`Failed to ${action.replace('_', ' ')} application`, {
        description: error instanceof Error ? error.message : 'Unknown error occurred'
      })
    } finally {
      setActionLoading(prev => ({ ...prev, [actionKey]: false }))
    }
  }

  return (
    <AdminLayout title="Admission Management">
      <div className="space-y-6">
        {/* Header Actions */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="flex flex-col sm:flex-row gap-4 flex-1">
            <div className="flex-1 max-w-sm">
              <Input
                placeholder="Search applications..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full"
              />
            </div>
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value as AdmissionStatus | 'all')}
              className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Status</option>
              <option value="pending">Pending</option>
              <option value="interview_scheduled">Interview Scheduled</option>
              <option value="accepted">Accepted</option>
              <option value="rejected">Rejected</option>
            </select>
          </div>
          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              onClick={() => {
                console.log('🔄 Refresh button clicked')
                fetchApplications(true)
              }}
              disabled={loading}
              className="flex items-center space-x-2"
            >
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                  <span>Refreshing...</span>
                </>
              ) : (
                <>
                  <span>🔄</span>
                  <span>Refresh</span>
                </>
              )}
            </Button>
            {loading && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  console.log('🛑 Force stop loading clicked')
                  setLoading(false)
                  toast.info('Loading stopped manually')
                }}
                className="text-red-600 hover:text-red-700 ml-2"
              >
                Stop Loading
              </Button>
            )}
            {lastFetch > 0 && !loading && (
              <span className="text-xs text-gray-500 ml-2">
                Last updated: {new Date(lastFetch).toLocaleTimeString()}
              </span>
            )}
          </div>
        </div>

        {/* Applications Table */}
        <Card>
          <CardHeader>
            <div className="flex justify-between items-center">
              <div>
                <CardTitle className="flex items-center space-x-2">
                  <span>Applications ({filteredApplications.length})</span>
                  {applicationCache && (
                    <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded-full">
                      📦 Cached
                    </span>
                  )}
                </CardTitle>
                <CardDescription>Manage student admission applications</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-8">Loading applications...</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-200">
                      <th className="text-left py-3 px-4 font-medium text-gray-600">Student</th>
                      <th className="text-left py-3 px-4 font-medium text-gray-600">Class</th>
                      <th className="text-left py-3 px-4 font-medium text-gray-600">Applied Date</th>
                      <th className="text-left py-3 px-4 font-medium text-gray-600">Status</th>
                      <th className="text-left py-3 px-4 font-medium text-gray-600">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredApplications.map((application) => (
                      <tr key={application.id} className="border-b border-gray-100 hover:bg-gray-50">
                        <td className="py-3 px-4">
                          <div className="flex items-center space-x-3">
                            <div className="w-10 h-10 rounded-full overflow-hidden bg-gray-200 flex-shrink-0">
                              {application.photograph_url ? (
                                <img
                                  src={application.photograph_url}
                                  alt={application.full_name}
                                  className="w-full h-full object-cover"
                                  onError={(e) => {
                                    console.error('Image failed to load:', application.photograph_url)
                                    e.currentTarget.style.display = 'none'
                                    e.currentTarget.nextElementSibling?.classList.remove('hidden')
                                  }}
                                />
                              ) : null}
                              <div className={`w-full h-full bg-gradient-to-r from-blue-500 to-purple-500 flex items-center justify-center text-white font-semibold text-sm ${application.photograph_url ? 'hidden' : ''}`}>
                                {application.full_name.charAt(0).toUpperCase()}
                              </div>
                            </div>
                            <div>
                              <div className="font-medium text-gray-900">{application.full_name}</div>
                              <div className="text-sm text-gray-500">{application.email}</div>
                              <div className="text-sm text-gray-500">{application.phone}</div>
                            </div>
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800">
                            Class {application.class}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-sm text-gray-500">
                          {new Date(application.applied_date).toLocaleDateString()}
                        </td>
                        <td className="py-3 px-4">
                          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(application.status)}`}>
                            {getStatusLabel(application.status)}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex items-center space-x-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleViewDetails(application)}
                            >
                              View
                            </Button>

                            {/* Quick Actions for Pending Applications */}
                            {application.status === 'pending' && (
                              <>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleQuickAction(application.id, 'accept')}
                                  disabled={actionLoading[`${application.id}-accept`]}
                                  className="text-green-600 hover:text-green-700"
                                >
                                  {actionLoading[`${application.id}-accept`] ? (
                                    <div className="flex items-center space-x-1">
                                      <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-green-600"></div>
                                      <span>Accepting...</span>
                                    </div>
                                  ) : (
                                    'Accept'
                                  )}
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleQuickAction(application.id, 'reject')}
                                  disabled={actionLoading[`${application.id}-reject`]}
                                  className="text-red-600 hover:text-red-700"
                                >
                                  {actionLoading[`${application.id}-reject`] ? (
                                    <div className="flex items-center space-x-1">
                                      <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-red-600"></div>
                                      <span>Rejecting...</span>
                                    </div>
                                  ) : (
                                    'Reject'
                                  )}
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleQuickAction(application.id, 'schedule_interview')}
                                  disabled={actionLoading[`${application.id}-schedule_interview`]}
                                  className="text-blue-600 hover:text-blue-700"
                                >
                                  {actionLoading[`${application.id}-schedule_interview`] ? (
                                    <div className="flex items-center space-x-1">
                                      <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-blue-600"></div>
                                      <span>Scheduling...</span>
                                    </div>
                                  ) : (
                                    'Interview'
                                  )}
                                </Button>
                              </>
                            )}

                            {/* Action Button - Delete for accepted, Edit for others (non-pending) */}
                            {application.status === 'accepted' ? (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleDeleteAcceptedApplication(application)}
                                className="text-red-600 hover:text-red-700 border-red-300 hover:border-red-400"
                              >
                                Delete
                              </Button>
                            ) : application.status !== 'pending' && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleEditStatus(application)}
                                className="text-purple-600 hover:text-purple-700"
                              >
                                Edit
                              </Button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                
                {filteredApplications.length === 0 && (
                  <div className="text-center py-8 text-gray-500">
                    No applications found
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Rejection Confirmation Dialog */}
      <AlertDialog open={showRejectDialog} onOpenChange={setShowRejectDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="text-red-600">
              ⚠️ Confirm Application Rejection
            </AlertDialogTitle>
            <AlertDialogDescription className="text-gray-600">
              Are you sure you want to reject{' '}
              <span className="font-semibold text-gray-900">
                {applicationToReject?.full_name}
              </span>
              's application?
            </AlertDialogDescription>
            <div className="mt-4 space-y-3">
              <div className="text-red-600 font-medium text-sm">
                This action will permanently delete:
              </div>
              <ul className="list-disc list-inside space-y-1 text-sm text-gray-600 ml-4">
                <li>The complete application record</li>
                <li>Student's photograph</li>
                <li>All uploaded documents</li>
                <li>All associated files from storage</li>
              </ul>
              <div className="font-medium text-gray-900 text-sm bg-red-50 p-3 rounded-md border border-red-200">
                ⚠️ This action cannot be undone.
              </div>
            </div>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel
              onClick={() => {
                setShowRejectDialog(false)
                setApplicationToReject(null)
              }}
            >
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmReject}
              disabled={actionLoading[`${applicationToReject?.id}-reject`]}
              className="bg-red-600 hover:bg-red-700 focus:ring-red-600"
            >
              {actionLoading[`${applicationToReject?.id}-reject`] ? (
                <div className="flex items-center space-x-2">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  <span>Rejecting...</span>
                </div>
              ) : (
                'Confirm Rejection'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Accepted Application Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="text-red-600">
              🗑️ Delete Accepted Application
            </AlertDialogTitle>
            <AlertDialogDescription className="text-gray-600">
              Are you sure you want to permanently delete{' '}
              <span className="font-semibold text-gray-900">
                {applicationToDelete?.full_name}
              </span>
              's accepted application?
            </AlertDialogDescription>
            <div className="mt-4 space-y-3">
              <div className="text-red-600 font-medium text-sm">
                This action will permanently delete:
              </div>
              <ul className="list-disc list-inside space-y-1 text-sm text-gray-600 ml-4">
                <li>The complete application record</li>
                <li>Student's photograph</li>
                <li>All uploaded documents</li>
                <li>All associated files from storage</li>
              </ul>
              <div className="font-medium text-gray-900 text-sm bg-red-50 p-3 rounded-md border border-red-200">
                ⚠️ This action cannot be undone. The student will need to reapply if needed.
              </div>
            </div>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel
              onClick={() => {
                setShowDeleteDialog(false)
                setApplicationToDelete(null)
              }}
            >
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDelete}
              disabled={actionLoading[`${applicationToDelete?.id}-delete`]}
              className="bg-red-600 hover:bg-red-700 focus:ring-red-600"
            >
              {actionLoading[`${applicationToDelete?.id}-delete`] ? (
                <div className="flex items-center space-x-2">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  <span>Deleting...</span>
                </div>
              ) : (
                'Delete Application'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Interview Scheduling Modal */}
      {showInterviewModal && selectedApplication && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-md w-full">
            <div className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-semibold">Schedule Interview</h2>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowInterviewModal(false)}
                >
                  Close
                </Button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-gray-600">Student</label>
                  <p className="text-gray-900 font-semibold">{selectedApplication.full_name}</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Interview Date & Time
                  </label>
                  <Input
                    type="datetime-local"
                    value={interviewData.interview_date}
                    onChange={(e) => setInterviewData(prev => ({ ...prev, interview_date: e.target.value }))}
                    className="w-full"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Notes (Optional)
                  </label>
                  <textarea
                    value={interviewData.interview_notes}
                    onChange={(e) => setInterviewData(prev => ({ ...prev, interview_notes: e.target.value }))}
                    className="w-full p-2 border border-gray-300 rounded-md resize-none"
                    rows={3}
                    placeholder="Add any notes about the interview..."
                  />
                </div>

                <div className="flex space-x-3 pt-4">
                  <Button
                    onClick={handleScheduleInterview}
                    disabled={!interviewData.interview_date}
                    className="flex-1"
                  >
                    Schedule Interview
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => setShowInterviewModal(false)}
                    className="flex-1"
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Status Edit Modal */}
      {showEditModal && selectedApplication && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-md w-full">
            <div className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-semibold">Edit Application Status</h2>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowEditModal(false)}
                >
                  Close
                </Button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-gray-600">Student</label>
                  <p className="text-gray-900 font-semibold">{selectedApplication.full_name}</p>
                </div>

                <div>
                  <label className="text-sm font-medium text-gray-600">Current Status</label>
                  <p className="text-gray-900">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(selectedApplication.status)}`}>
                      {getStatusLabel(selectedApplication.status)}
                    </span>
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    New Status
                  </label>
                  <select
                    value={editData.status}
                    onChange={(e) => setEditData(prev => ({ ...prev, status: e.target.value as AdmissionStatus }))}
                    className="w-full p-2 border border-gray-300 rounded-md"
                  >
                    <option value="pending">Pending</option>
                    <option value="interview_scheduled">Interview Scheduled</option>
                    <option value="accepted">Accepted</option>
                    <option value="rejected">Rejected</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Reason for Change (Optional)
                  </label>
                  <textarea
                    value={editData.notes}
                    onChange={(e) => setEditData(prev => ({ ...prev, notes: e.target.value }))}
                    className="w-full p-2 border border-gray-300 rounded-md resize-none"
                    rows={3}
                    placeholder="Explain why you're changing the status..."
                  />
                </div>

                <div className="flex space-x-3 pt-4">
                  <Button
                    onClick={handleUpdateStatus}
                    className="flex-1"
                  >
                    Update Status
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => setShowEditModal(false)}
                    className="flex-1"
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Detail Modal */}
      {showDetailModal && selectedApplication && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-semibold">Application Details</h2>
                <Button
                  variant="outline"
                  onClick={() => setShowDetailModal(false)}
                >
                  Close
                </Button>
              </div>
              
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-gray-600">Full Name</label>
                    <p className="text-gray-900">{selectedApplication.full_name}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-600">Email</label>
                    <p className="text-gray-900">{selectedApplication.email}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-600">Phone</label>
                    <p className="text-gray-900">{selectedApplication.phone}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-600">Class</label>
                    <p className="text-gray-900">Class {selectedApplication.class}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-600">Date of Birth</label>
                    <p className="text-gray-900">{selectedApplication.date_of_birth}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-600">Gender</label>
                    <p className="text-gray-900 capitalize">{selectedApplication.gender}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-600">Status</label>
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(selectedApplication.status)}`}>
                      {getStatusLabel(selectedApplication.status)}
                    </span>
                  </div>
                  {selectedApplication.interview_date && (
                    <div>
                      <label className="text-sm font-medium text-gray-600">Interview Date</label>
                      <p className="text-gray-900">
                        {new Date(selectedApplication.interview_date).toLocaleString()}
                      </p>
                    </div>
                  )}
                </div>

                {selectedApplication.address && (
                  <div>
                    <label className="text-sm font-medium text-gray-600">Address</label>
                    <p className="text-gray-900">{selectedApplication.address}</p>
                  </div>
                )}

                {selectedApplication.interview_notes && (
                  <div>
                    <label className="text-sm font-medium text-gray-600">Interview Notes</label>
                    <p className="text-gray-900">{selectedApplication.interview_notes}</p>
                  </div>
                )}
                
                <div className="border-t pt-4">
                  <h3 className="font-medium text-gray-900 mb-2">Parent/Guardian Information</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium text-gray-600">Name</label>
                      <p className="text-gray-900">{selectedApplication.parent_name}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-600">Phone</label>
                      <p className="text-gray-900">{selectedApplication.parent_phone}</p>
                    </div>
                    {selectedApplication.parent_email && (
                      <div>
                        <label className="text-sm font-medium text-gray-600">Email</label>
                        <p className="text-gray-900">{selectedApplication.parent_email}</p>
                      </div>
                    )}
                  </div>
                </div>
                
                {selectedApplication.photograph_url && (
                  <div className="border-t pt-4">
                    <label className="text-sm font-medium text-gray-600">Student Photograph</label>
                    <div className="mt-2">
                      <img 
                        src={selectedApplication.photograph_url} 
                        alt={selectedApplication.full_name}
                        className="w-32 h-32 object-cover rounded-lg border"
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  )
}
