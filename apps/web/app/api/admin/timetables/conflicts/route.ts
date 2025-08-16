/**
 * Timetable Conflicts API Route
 * Handles conflict detection and resolution for timetable scheduling
 */

import { NextRequest, NextResponse } from 'next/server'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { Database } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

// GET /api/admin/timetables/conflicts - Get all conflicts
export async function GET(request: NextRequest) {
  try {
    const cookieStore = await cookies()
    const supabase = createRouteHandlerClient<Database>({ cookies: () => cookieStore })
    const { searchParams } = new URL(request.url)
    
    // Get query parameters
    const status = searchParams.get('status') || 'active'
    const conflictType = searchParams.get('conflict_type')

    // Verify user authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('school_id')
      .eq('id', user.id)
      .single()

    if (!profile?.school_id) {
      return NextResponse.json({ error: 'School not found' }, { status: 404 })
    }

    // Build query
    let query = supabase
      .from('timetable_conflicts')
      .select(`
        *,
        teachers:teacher_id (
          profiles:id (name, email)
        ),
        rooms:room_id (
          name, room_number, building
        ),
        classes:class_id (
          name, grade_level, section
        ),
        time_periods:time_period_id (
          name, start_time, end_time
        )
      `)
      .eq('school_id', profile.school_id)
      .order('created_at', { ascending: false })

    // Apply filters
    if (status) query = query.eq('status', status)
    if (conflictType) query = query.eq('conflict_type', conflictType)

    const { data: conflicts, error } = await query

    if (error) {
      console.error('Error fetching conflicts:', error)
      return NextResponse.json({ error: 'Failed to fetch conflicts' }, { status: 500 })
    }

    return NextResponse.json({ data: conflicts })

  } catch (error) {
    console.error('Conflicts API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST /api/admin/timetables/conflicts - Detect conflicts for a specific schedule
export async function POST(request: NextRequest) {
  try {
    const cookieStore = await cookies()
    const supabase = createRouteHandlerClient<Database>({ cookies: () => cookieStore })
    const body = await request.json()

    // Verify user authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('school_id')
      .eq('id', user.id)
      .single()

    if (!profile?.school_id) {
      return NextResponse.json({ error: 'School not found' }, { status: 404 })
    }

    const {
      academic_year_id,
      class_id,
      teacher_id,
      room_id,
      time_period_id,
      day_of_week,
      exclude_timetable_id
    } = body

    if (!academic_year_id || !time_period_id || !day_of_week) {
      return NextResponse.json({ 
        error: 'Missing required fields: academic_year_id, time_period_id, day_of_week' 
      }, { status: 400 })
    }

    const conflicts = []

    // Check for class conflicts
    if (class_id) {
      let classQuery = supabase
        .from('timetables')
        .select(`
          id,
          subjects:subject_id (name),
          teachers:teacher_id (profiles:id (name)),
          rooms:room_id (name)
        `)
        .eq('school_id', profile.school_id)
        .eq('academic_year_id', academic_year_id)
        .eq('class_id', class_id)
        .eq('day_of_week', day_of_week)
        .eq('time_period_id', time_period_id)
        .eq('is_active', true)

      if (exclude_timetable_id) {
        classQuery = classQuery.neq('id', exclude_timetable_id)
      }

      const { data: classConflicts } = await classQuery

      if (classConflicts && classConflicts.length > 0) {
        conflicts.push({
          type: 'class_double_booking',
          message: `Class is already scheduled for this time slot`,
          conflicting_entries: classConflicts
        })
      }
    }

    // Check for teacher conflicts
    if (teacher_id) {
      let teacherQuery = supabase
        .from('timetables')
        .select(`
          id,
          classes:class_id (name, grade_level, section),
          subjects:subject_id (name),
          rooms:room_id (name)
        `)
        .eq('school_id', profile.school_id)
        .eq('academic_year_id', academic_year_id)
        .eq('teacher_id', teacher_id)
        .eq('day_of_week', day_of_week)
        .eq('time_period_id', time_period_id)
        .eq('is_active', true)

      if (exclude_timetable_id) {
        teacherQuery = teacherQuery.neq('id', exclude_timetable_id)
      }

      const { data: teacherConflicts } = await teacherQuery

      if (teacherConflicts && teacherConflicts.length > 0) {
        conflicts.push({
          type: 'teacher_double_booking',
          message: `Teacher is already assigned to another class at this time`,
          conflicting_entries: teacherConflicts
        })
      }
    }

    // Check for room conflicts
    if (room_id) {
      let roomQuery = supabase
        .from('timetables')
        .select(`
          id,
          classes:class_id (name, grade_level, section),
          subjects:subject_id (name),
          teachers:teacher_id (profiles:id (name))
        `)
        .eq('school_id', profile.school_id)
        .eq('academic_year_id', academic_year_id)
        .eq('room_id', room_id)
        .eq('day_of_week', day_of_week)
        .eq('time_period_id', time_period_id)
        .eq('is_active', true)

      if (exclude_timetable_id) {
        roomQuery = roomQuery.neq('id', exclude_timetable_id)
      }

      const { data: roomConflicts } = await roomQuery

      if (roomConflicts && roomConflicts.length > 0) {
        conflicts.push({
          type: 'room_double_booking',
          message: `Room is already booked for another class at this time`,
          conflicting_entries: roomConflicts
        })
      }
    }

    return NextResponse.json({ 
      has_conflicts: conflicts.length > 0,
      conflicts 
    })

  } catch (error) {
    console.error('Conflict detection API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// PUT /api/admin/timetables/conflicts - Resolve conflicts
export async function PUT(request: NextRequest) {
  try {
    const supabase = createRouteHandlerClient<Database>({ cookies })
    const body = await request.json()

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

    const { conflict_ids, resolution_action, resolution_notes } = body

    if (!Array.isArray(conflict_ids) || conflict_ids.length === 0) {
      return NextResponse.json({ error: 'No conflict IDs provided' }, { status: 400 })
    }

    if (!['resolved', 'ignored'].includes(resolution_action)) {
      return NextResponse.json({ error: 'Invalid resolution action' }, { status: 400 })
    }

    // Update conflicts
    const { data: resolvedConflicts, error } = await supabase
      .from('timetable_conflicts')
      .update({
        status: resolution_action,
        resolved_by: user.id,
        resolved_at: new Date().toISOString(),
        resolution_notes: resolution_notes || null,
        updated_at: new Date().toISOString()
      })
      .in('id', conflict_ids)
      .eq('school_id', profile.school_id)
      .select()

    if (error) {
      console.error('Error resolving conflicts:', error)
      return NextResponse.json({ error: 'Failed to resolve conflicts' }, { status: 500 })
    }

    return NextResponse.json({ 
      message: `${conflict_ids.length} conflict(s) ${resolution_action}`,
      data: resolvedConflicts 
    })

  } catch (error) {
    console.error('Conflict resolution API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
