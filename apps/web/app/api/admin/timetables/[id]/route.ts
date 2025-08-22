/**
 * Individual Timetable Entry API Route
 * Handles operations for specific timetable entries
 */

import { NextRequest, NextResponse } from 'next/server'
import { createAdminSupabaseClient } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

// GET /api/admin/timetables/[id] - Get specific timetable entry
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = createAdminSupabaseClient()
    const { id } = params
    const { searchParams } = new URL(request.url)

    // Get query parameters
    const schoolId = searchParams.get('school_id')
    const userId = searchParams.get('user_id')

    if (!schoolId || !userId) {
      return NextResponse.json({ error: 'Missing school_id or user_id parameter' }, { status: 400 })
    }

    // Verify user has access to this school
    const { data: profile } = await supabase
      .from('profiles')
      .select('school_id, role')
      .eq('id', userId)
      .single()

    if (!profile || profile.school_id !== schoolId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Fetch timetable entry with related data
    const { data: timetable, error } = await supabase
      .from('timetables')
      .select(`
        *,
        classes:class_id (
          id,
          name,
          grade_level,
          section
        ),
        subjects:subject_id (
          id,
          name,
          code
        ),
        teachers:teacher_id (
          id,
          profiles!teachers_id_fkey (
            name,
            email
          )
        ),
        rooms:room_id (
          id,
          name,
          room_number,
          building
        ),
        time_periods:time_period_id (
          id,
          name,
          start_time,
          end_time,
          period_order
        ),
        academic_years:academic_year_id (
          id,
          name,
          start_date,
          end_date
        )
      `)
      .eq('id', id)
      .eq('school_id', profile.school_id)
      .single()

    if (error) {
      console.error('Error fetching timetable:', error)
      return NextResponse.json({ error: 'Timetable not found' }, { status: 404 })
    }

    return NextResponse.json({ data: timetable })

  } catch (error) {
    console.error('Timetable GET API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// PUT /api/admin/timetables/[id] - Update specific timetable entry
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = createAdminSupabaseClient()
    const { id } = params
    const body = await request.json()

    // Get user_id and school_id from request body
    const { user_id, school_id } = body

    if (!user_id || !school_id) {
      return NextResponse.json({ error: 'Missing user_id or school_id' }, { status: 400 })
    }

    // Verify user has access to this school
    const { data: profile } = await supabase
      .from('profiles')
      .select('school_id, role')
      .eq('id', user_id)
      .single()

    if (!profile || profile.school_id !== school_id || !['admin', 'sub-admin'].includes(profile.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if timetable exists and belongs to the school
    const { data: existingTimetable } = await supabase
      .from('timetables')
      .select('id, school_id')
      .eq('id', id)
      .eq('school_id', profile.school_id)
      .single()

    if (!existingTimetable) {
      return NextResponse.json({ error: 'Timetable not found' }, { status: 404 })
    }

    const {
      academic_year_id,
      class_id,
      subject_id,
      teacher_id,
      room_id,
      time_period_id,
      day_of_week,
      effective_from,
      effective_to,
      notes,
      is_active
    } = body

    // Check for conflicts if key fields are being updated
    if (academic_year_id || class_id || teacher_id || room_id || time_period_id || day_of_week) {
      const conflictCheck = await supabase
        .from('timetables')
        .select('id')
        .eq('school_id', profile.school_id)
        .eq('academic_year_id', academic_year_id || existingTimetable.academic_year_id)
        .eq('day_of_week', day_of_week || existingTimetable.day_of_week)
        .eq('time_period_id', time_period_id || existingTimetable.time_period_id)
        .eq('is_active', true)
        .neq('id', id) // Exclude current timetable
        .or(`class_id.eq.${class_id},teacher_id.eq.${teacher_id},room_id.eq.${room_id}`)

      const { data: conflicts } = await conflictCheck

      if (conflicts && conflicts.length > 0) {
        return NextResponse.json({ 
          error: 'Scheduling conflict detected. Class, teacher, or room is already booked for this time slot.' 
        }, { status: 409 })
      }
    }

    // Update timetable entry
    const { data: timetable, error } = await supabase
      .from('timetables')
      .update({
        academic_year_id,
        class_id,
        subject_id,
        teacher_id: teacher_id || null,
        room_id: room_id || null,
        time_period_id,
        day_of_week,
        effective_from: effective_from || null,
        effective_to: effective_to || null,
        notes: notes || null,
        is_active: is_active !== undefined ? is_active : true,
        created_by: user_id,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .eq('school_id', profile.school_id)
      .select(`
        *,
        classes:class_id (name, grade_level, section),
        subjects:subject_id (name, code),
        teachers:teacher_id (profiles!teachers_id_fkey (name)),
        rooms:room_id (name, room_number),
        time_periods:time_period_id (name, start_time, end_time)
      `)
      .single()

    if (error) {
      console.error('Error updating timetable:', error)
      return NextResponse.json({ error: 'Failed to update timetable entry' }, { status: 500 })
    }

    return NextResponse.json({ data: timetable })

  } catch (error) {
    console.error('Timetable PUT API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// DELETE /api/admin/timetables/[id] - Delete specific timetable entry
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const cookieStore = await cookies()
    const supabase = createRouteHandlerClient<Database>({ cookies: () => cookieStore })
    const { id } = params

    // Verify user authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('school_id, role')
      .eq('id', user.id)
      .single()

    if (!profile?.school_id || !['admin', 'sub-admin'].includes(profile.role)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    // Check if timetable exists and belongs to the school
    const { data: existingTimetable } = await supabase
      .from('timetables')
      .select('id')
      .eq('id', id)
      .eq('school_id', profile.school_id)
      .single()

    if (!existingTimetable) {
      return NextResponse.json({ error: 'Timetable not found' }, { status: 404 })
    }

    // Soft delete by setting is_active to false
    const { error } = await supabase
      .from('timetables')
      .update({ 
        is_active: false,
        created_by: user.id,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .eq('school_id', profile.school_id)

    if (error) {
      console.error('Error deleting timetable:', error)
      return NextResponse.json({ error: 'Failed to delete timetable entry' }, { status: 500 })
    }

    return NextResponse.json({ message: 'Timetable entry deleted successfully' })

  } catch (error) {
    console.error('Timetable DELETE API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
