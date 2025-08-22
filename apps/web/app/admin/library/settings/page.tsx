'use client'

import { useState, useEffect } from 'react'
import { useAuthStore } from '@/lib/stores/auth-store'
import AdminLayout from '@/components/admin/AdminLayout'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { toast } from 'sonner'
import { 
  Settings, 
  Save, 
  Clock, 
  DollarSign, 
  Users, 
  BookOpen,
  Mail,
  Bell,
  Shield
} from 'lucide-react'

interface LibrarySettings {
  // Borrowing Rules
  default_loan_period_days: number
  max_renewals: number
  max_books_student: number
  max_books_teacher: number
  max_books_staff: number
  
  // Fine Settings
  overdue_fine_per_day: number
  max_fine_amount: number
  grace_period_days: number
  
  // Reservation Settings
  reservation_expiry_days: number
  max_reservations_per_member: number
  
  // Notification Settings
  email_notifications_enabled: boolean
  sms_notifications_enabled: boolean
  overdue_reminder_days: number
  reservation_reminder_days: number
  
  // Library Hours
  library_hours: {
    monday: { open: string; close: string; closed: boolean }
    tuesday: { open: string; close: string; closed: boolean }
    wednesday: { open: string; close: string; closed: boolean }
    thursday: { open: string; close: string; closed: boolean }
    friday: { open: string; close: string; closed: boolean }
    saturday: { open: string; close: string; closed: boolean }
    sunday: { open: string; close: string; closed: boolean }
  }
  
  // Other Settings
  allow_self_checkout: boolean
  require_approval_for_new_members: boolean
  auto_generate_barcodes: boolean
}

export default function LibrarySettingsPage() {
  const { user } = useAuthStore()
  const [settings, setSettings] = useState<LibrarySettings | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    fetchSettings()
  }, [])

  const fetchSettings = async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/admin/library/settings?school_id=${user?.school_id}&user_id=${user?.id}`)
      if (response.ok) {
        const data = await response.json()
        setSettings(data)
      } else {
        toast.error('Failed to fetch library settings')
      }
    } catch (error) {
      console.error('Error fetching settings:', error)
      toast.error('Failed to fetch library settings')
    } finally {
      setLoading(false)
    }
  }

  const handleSaveSettings = async () => {
    if (!settings) return

    setSaving(true)
    try {
      const response = await fetch('/api/admin/library/settings', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...settings,
          school_id: user?.school_id,
          user_id: user?.id
        }),
      })

      if (response.ok) {
        toast.success('Library settings saved successfully!')
      } else {
        const error = await response.json()
        toast.error(error.error || 'Failed to save settings')
      }
    } catch (error) {
      console.error('Error saving settings:', error)
      toast.error('Failed to save settings')
    } finally {
      setSaving(false)
    }
  }

  const updateSetting = (key: keyof LibrarySettings, value: any) => {
    setSettings(prev => prev ? ({ ...prev, [key]: value }) : null)
  }

  const updateLibraryHours = (day: string, field: string, value: any) => {
    setSettings(prev => prev ? ({
      ...prev,
      library_hours: {
        ...prev.library_hours,
        [day]: {
          ...prev.library_hours[day as keyof typeof prev.library_hours],
          [field]: value
        }
      }
    }) : null)
  }

  if (loading) {
    return (
      <AdminLayout title="Library Settings">
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </AdminLayout>
    )
  }

  if (!settings) {
    return (
      <AdminLayout title="Library Settings">
        <div className="text-center py-8">
          <p className="text-gray-500">Failed to load settings</p>
          <Button onClick={fetchSettings} className="mt-4">
            Retry
          </Button>
        </div>
      </AdminLayout>
    )
  }

  return (
    <AdminLayout title="Library Settings">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold">Library Settings</h2>
            <p className="text-muted-foreground">
              Configure library policies and preferences
            </p>
          </div>
          <Button onClick={handleSaveSettings} disabled={saving}>
            {saving ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Saving...
              </>
            ) : (
              <>
                <Save className="h-4 w-4 mr-2" />
                Save Settings
              </>
            )}
          </Button>
        </div>

        <Tabs defaultValue="borrowing" className="w-full">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="borrowing">Borrowing</TabsTrigger>
            <TabsTrigger value="fines">Fines</TabsTrigger>
            <TabsTrigger value="notifications">Notifications</TabsTrigger>
            <TabsTrigger value="hours">Library Hours</TabsTrigger>
            <TabsTrigger value="general">General</TabsTrigger>
          </TabsList>

          {/* Borrowing Rules */}
          <TabsContent value="borrowing">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <BookOpen className="h-5 w-5 mr-2" />
                  Borrowing Rules
                </CardTitle>
                <CardDescription>
                  Configure loan periods and borrowing limits
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="loan_period">Default Loan Period (days)</Label>
                    <Input
                      id="loan_period"
                      type="number"
                      value={settings.default_loan_period_days}
                      onChange={(e) => updateSetting('default_loan_period_days', parseInt(e.target.value))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="max_renewals">Maximum Renewals</Label>
                    <Input
                      id="max_renewals"
                      type="number"
                      value={settings.max_renewals}
                      onChange={(e) => updateSetting('max_renewals', parseInt(e.target.value))}
                    />
                  </div>
                </div>

                <div className="space-y-4">
                  <h4 className="font-medium">Borrowing Limits by Member Type</h4>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="max_books_student">Students</Label>
                      <Input
                        id="max_books_student"
                        type="number"
                        value={settings.max_books_student}
                        onChange={(e) => updateSetting('max_books_student', parseInt(e.target.value))}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="max_books_teacher">Teachers</Label>
                      <Input
                        id="max_books_teacher"
                        type="number"
                        value={settings.max_books_teacher}
                        onChange={(e) => updateSetting('max_books_teacher', parseInt(e.target.value))}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="max_books_staff">Staff</Label>
                      <Input
                        id="max_books_staff"
                        type="number"
                        value={settings.max_books_staff}
                        onChange={(e) => updateSetting('max_books_staff', parseInt(e.target.value))}
                      />
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="reservation_expiry">Reservation Expiry (days)</Label>
                    <Input
                      id="reservation_expiry"
                      type="number"
                      value={settings.reservation_expiry_days}
                      onChange={(e) => updateSetting('reservation_expiry_days', parseInt(e.target.value))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="max_reservations">Max Reservations per Member</Label>
                    <Input
                      id="max_reservations"
                      type="number"
                      value={settings.max_reservations_per_member}
                      onChange={(e) => updateSetting('max_reservations_per_member', parseInt(e.target.value))}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Fine Settings */}
          <TabsContent value="fines">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <DollarSign className="h-5 w-5 mr-2" />
                  Fine Settings
                </CardTitle>
                <CardDescription>
                  Configure overdue fines and penalties
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="fine_per_day">Fine per Day ($)</Label>
                    <Input
                      id="fine_per_day"
                      type="number"
                      step="0.01"
                      value={settings.overdue_fine_per_day}
                      onChange={(e) => updateSetting('overdue_fine_per_day', parseFloat(e.target.value))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="max_fine">Maximum Fine Amount ($)</Label>
                    <Input
                      id="max_fine"
                      type="number"
                      step="0.01"
                      value={settings.max_fine_amount}
                      onChange={(e) => updateSetting('max_fine_amount', parseFloat(e.target.value))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="grace_period">Grace Period (days)</Label>
                    <Input
                      id="grace_period"
                      type="number"
                      value={settings.grace_period_days}
                      onChange={(e) => updateSetting('grace_period_days', parseInt(e.target.value))}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Notification Settings */}
          <TabsContent value="notifications">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Bell className="h-5 w-5 mr-2" />
                  Notification Settings
                </CardTitle>
                <CardDescription>
                  Configure automated notifications and reminders
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Email Notifications</Label>
                      <p className="text-sm text-gray-500">Send email notifications to members</p>
                    </div>
                    <Switch
                      checked={settings.email_notifications_enabled}
                      onCheckedChange={(checked) => updateSetting('email_notifications_enabled', checked)}
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>SMS Notifications</Label>
                      <p className="text-sm text-gray-500">Send SMS notifications to members</p>
                    </div>
                    <Switch
                      checked={settings.sms_notifications_enabled}
                      onCheckedChange={(checked) => updateSetting('sms_notifications_enabled', checked)}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="overdue_reminder">Overdue Reminder (days before)</Label>
                    <Input
                      id="overdue_reminder"
                      type="number"
                      value={settings.overdue_reminder_days}
                      onChange={(e) => updateSetting('overdue_reminder_days', parseInt(e.target.value))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="reservation_reminder">Reservation Reminder (days before expiry)</Label>
                    <Input
                      id="reservation_reminder"
                      type="number"
                      value={settings.reservation_reminder_days}
                      onChange={(e) => updateSetting('reservation_reminder_days', parseInt(e.target.value))}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Library Hours */}
          <TabsContent value="hours">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Clock className="h-5 w-5 mr-2" />
                  Library Hours
                </CardTitle>
                <CardDescription>
                  Set operating hours for each day of the week
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {Object.entries(settings.library_hours).map(([day, hours]) => (
                  <div key={day} className="flex items-center space-x-4">
                    <div className="w-24">
                      <Label className="capitalize">{day}</Label>
                    </div>
                    <Switch
                      checked={!hours.closed}
                      onCheckedChange={(checked) => updateLibraryHours(day, 'closed', !checked)}
                    />
                    {!hours.closed && (
                      <>
                        <Input
                          type="time"
                          value={hours.open}
                          onChange={(e) => updateLibraryHours(day, 'open', e.target.value)}
                          className="w-32"
                        />
                        <span>to</span>
                        <Input
                          type="time"
                          value={hours.close}
                          onChange={(e) => updateLibraryHours(day, 'close', e.target.value)}
                          className="w-32"
                        />
                      </>
                    )}
                    {hours.closed && (
                      <span className="text-gray-500">Closed</span>
                    )}
                  </div>
                ))}
              </CardContent>
            </Card>
          </TabsContent>

          {/* General Settings */}
          <TabsContent value="general">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Settings className="h-5 w-5 mr-2" />
                  General Settings
                </CardTitle>
                <CardDescription>
                  Other library configuration options
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Allow Self-Checkout</Label>
                      <p className="text-sm text-gray-500">Allow members to check out books themselves</p>
                    </div>
                    <Switch
                      checked={settings.allow_self_checkout}
                      onCheckedChange={(checked) => updateSetting('allow_self_checkout', checked)}
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Require Approval for New Members</Label>
                      <p className="text-sm text-gray-500">New member registrations need admin approval</p>
                    </div>
                    <Switch
                      checked={settings.require_approval_for_new_members}
                      onCheckedChange={(checked) => updateSetting('require_approval_for_new_members', checked)}
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Auto-Generate Barcodes</Label>
                      <p className="text-sm text-gray-500">Automatically generate barcodes for new books</p>
                    </div>
                    <Switch
                      checked={settings.auto_generate_barcodes}
                      onCheckedChange={(checked) => updateSetting('auto_generate_barcodes', checked)}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </AdminLayout>
  )
}
