import { NextRequest, NextResponse } from 'next/server'
import { createAdminSupabaseClient } from '@/lib/supabase'

// GET /api/admin/library/settings - Get library settings for a school
export async function GET(request: NextRequest) {
  try {
    const supabase = createAdminSupabaseClient()
    const { searchParams } = new URL(request.url)
    const schoolId = searchParams.get('school_id')
    const userId = searchParams.get('user_id')

    if (!schoolId || !userId) {
      return NextResponse.json({ error: 'Missing required parameters' }, { status: 400 })
    }

    // Verify user has access to this school
    const { data: profile } = await supabase
      .from('profiles')
      .select('school_id, role')
      .eq('id', userId)
      .single()

    if (!profile || profile.school_id !== schoolId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    // Fetch library settings
    const { data: settings, error } = await supabase
      .from('library_settings')
      .select('*')
      .eq('school_id', schoolId)
      .single()

    if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
      console.error('Error fetching library settings:', error)
      return NextResponse.json({ error: 'Failed to fetch library settings' }, { status: 500 })
    }

    // If no settings exist, return default settings
    if (!settings) {
      const defaultSettings = {
        // Borrowing Rules
        default_loan_period_days: 14,
        max_renewals: 2,
        max_books_student: 3,
        max_books_teacher: 10,
        max_books_staff: 5,
        
        // Fine Settings
        overdue_fine_per_day: 0.50,
        max_fine_amount: 50.00,
        grace_period_days: 1,
        
        // Reservation Settings
        reservation_expiry_days: 3,
        max_reservations_per_member: 5,
        
        // Notification Settings
        email_notifications_enabled: true,
        sms_notifications_enabled: false,
        overdue_reminder_days: 3,
        reservation_reminder_days: 1,
        
        // Library Hours
        library_hours: {
          monday: { open: "08:00", close: "17:00", closed: false },
          tuesday: { open: "08:00", close: "17:00", closed: false },
          wednesday: { open: "08:00", close: "17:00", closed: false },
          thursday: { open: "08:00", close: "17:00", closed: false },
          friday: { open: "08:00", close: "17:00", closed: false },
          saturday: { open: "09:00", close: "13:00", closed: false },
          sunday: { open: "10:00", close: "16:00", closed: true }
        },
        
        // Other Settings
        allow_self_checkout: false,
        require_approval_for_new_members: true,
        auto_generate_barcodes: true
      }

      return NextResponse.json(defaultSettings)
    }

    // Transform database settings to match frontend interface
    const transformedSettings = {
      // Borrowing Rules
      default_loan_period_days: settings.default_loan_period_days,
      max_renewals: settings.max_renewals,
      max_books_student: settings.student_max_books,
      max_books_teacher: settings.teacher_max_books,
      max_books_staff: settings.staff_max_books,

      // Fine Settings
      overdue_fine_per_day: settings.daily_overdue_fine,
      max_fine_amount: settings.max_fine_amount,
      grace_period_days: settings.grace_period_days || 1,

      // Reservation Settings
      reservation_expiry_days: settings.reservation_expiry_days,
      max_reservations_per_member: settings.max_reservations_per_member,

      // Notification Settings
      email_notifications_enabled: settings.email_notifications_enabled !== false, // Default true
      sms_notifications_enabled: settings.sms_notifications_enabled || false,
      overdue_reminder_days: settings.overdue_notice_days,
      reservation_reminder_days: settings.reminder_days_before_due,

      // Library Hours - parse from JSONB
      library_hours: settings.opening_hours || {
        monday: { open: "08:00", close: "17:00", closed: false },
        tuesday: { open: "08:00", close: "17:00", closed: false },
        wednesday: { open: "08:00", close: "17:00", closed: false },
        thursday: { open: "08:00", close: "17:00", closed: false },
        friday: { open: "08:00", close: "17:00", closed: false },
        saturday: { open: "09:00", close: "13:00", closed: false },
        sunday: { open: "10:00", close: "16:00", closed: true }
      },

      // Other Settings
      allow_self_checkout: settings.allow_self_checkout || false,
      require_approval_for_new_members: !settings.allow_guest_membership,
      auto_generate_barcodes: settings.auto_generate_barcodes
    }

    return NextResponse.json(transformedSettings)

  } catch (error) {
    console.error('Error fetching library settings:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// PUT /api/admin/library/settings - Update library settings
export async function PUT(request: NextRequest) {
  try {
    const supabase = createAdminSupabaseClient()
    const body = await request.json()
    
    const {
      school_id,
      user_id,
      default_loan_period_days,
      max_renewals,
      max_books_student,
      max_books_teacher,
      max_books_staff,
      overdue_fine_per_day,
      max_fine_amount,
      grace_period_days,
      reservation_expiry_days,
      max_reservations_per_member,
      email_notifications_enabled,
      sms_notifications_enabled,
      overdue_reminder_days,
      reservation_reminder_days,
      library_hours,
      allow_self_checkout,
      require_approval_for_new_members,
      auto_generate_barcodes
    } = body

    if (!school_id || !user_id) {
      return NextResponse.json({ error: 'Missing required parameters' }, { status: 400 })
    }

    // Verify user has permission
    const { data: profile } = await supabase
      .from('profiles')
      .select('school_id, role')
      .eq('id', user_id)
      .single()

    if (!profile || profile.school_id !== school_id || !['admin', 'sub-admin'].includes(profile.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    // Transform frontend settings to database format
    const dbSettings = {
      school_id,
      default_loan_period_days,
      max_renewals,
      renewal_period_days: default_loan_period_days, // Same as loan period
      student_max_books: max_books_student,
      teacher_max_books: max_books_teacher,
      staff_max_books: max_books_staff,
      guest_max_books: 2, // Default for guests
      daily_overdue_fine: overdue_fine_per_day,
      max_fine_amount,
      grace_period_days,
      lost_book_fine_multiplier: 1.0, // Default
      damaged_book_fine_percentage: 50, // Default 50%
      reservation_expiry_days: reservation_expiry_days,
      pickup_deadline_days: reservation_expiry_days, // Same as expiry
      max_reservations_per_member,
      email_notifications_enabled,
      sms_notifications_enabled,
      overdue_notice_days: overdue_reminder_days,
      reminder_days_before_due: reservation_reminder_days,
      max_notification_attempts: 3, // Default
      opening_hours: library_hours,
      barcode_prefix: 'LIB', // Default
      auto_generate_barcodes,
      allow_self_checkout,
      require_member_photo: false, // Default
      allow_guest_membership: !require_approval_for_new_members,
      updated_at: new Date().toISOString()
    }

    // Upsert settings (insert or update)
    const { error } = await supabase
      .from('library_settings')
      .upsert(dbSettings, {
        onConflict: 'school_id'
      })

    if (error) {
      console.error('Error saving library settings:', error)
      return NextResponse.json({ error: 'Failed to save library settings' }, { status: 500 })
    }

    return NextResponse.json({ message: 'Library settings saved successfully' })

  } catch (error) {
    console.error('Error saving library settings:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
