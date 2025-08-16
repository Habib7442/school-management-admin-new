/**
 * Timetables API Route
 * Handles CRUD operations for timetable management
 */

import { NextRequest, NextResponse } from 'next/server'
import { createAdminSupabaseClient } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

// GET /api/admin/timetables - Fetch timetables with filters
export async function GET(request: NextRequest) {
  try {
    const supabase = createAdminSupabaseClient()
    const { searchParams } = new URL(request.url)

    // Get query parameters
    const schoolId = searchParams.get('school_id')
    const userId = searchParams.get('user_id')
    const classId = searchParams.get('class_id')
    const teacherId = searchParams.get('teacher_id')
    const academicYearId = searchParams.get('academic_year_id')
    const dayOfWeek = searchParams.get('day_of_week')
    const roomId = searchParams.get('room_id')
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '50')
    const offset = (page - 1) * limit

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

    // Build query with joins
    let query = supabase
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
      .eq('school_id', schoolId)
      .eq('is_active', true)
      .order('day_of_week')
      .order('time_period_id')

    // Apply filters
    if (classId) query = query.eq('class_id', classId)
    if (teacherId) query = query.eq('teacher_id', teacherId)
    if (academicYearId) query = query.eq('academic_year_id', academicYearId)
    if (dayOfWeek) query = query.eq('day_of_week', dayOfWeek)
    if (roomId) query = query.eq('room_id', roomId)

    // Apply pagination
    query = query.range(offset, offset + limit - 1)

    const { data: timetables, error } = await query

    if (error) {
      console.error('Error fetching timetables:', error)
      return NextResponse.json({ error: 'Failed to fetch timetables' }, { status: 500 })
    }

    // Get total count for pagination
    let countQuery = supabase
      .from('timetables')
      .select('*', { count: 'exact', head: true })
      .eq('school_id', profile.school_id)
      .eq('is_active', true)

    if (classId) countQuery = countQuery.eq('class_id', classId)
    if (teacherId) countQuery = countQuery.eq('teacher_id', teacherId)
    if (academicYearId) countQuery = countQuery.eq('academic_year_id', academicYearId)
    if (dayOfWeek) countQuery = countQuery.eq('day_of_week', dayOfWeek)
    if (roomId) countQuery = countQuery.eq('room_id', roomId)

    const { count } = await countQuery

    return NextResponse.json({
      data: timetables,
      pagination: {
        page,
        limit,
        total: count || 0,
        totalPages: Math.ceil((count || 0) / limit)
      }
    })

  } catch (error) {
    console.error('Timetables API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST /api/admin/timetables - Create new timetable entry
export async function POST(request: NextRequest) {
  try {
    const supabase = createAdminSupabaseClient()
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

    // Validate required fields
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
      notes
    } = body

    if (!academic_year_id || !class_id || !subject_id || !time_period_id || !day_of_week) {
      return NextResponse.json({ 
        error: 'Missing required fields: academic_year_id, class_id, subject_id, time_period_id, day_of_week' 
      }, { status: 400 })
    }

    // Check for conflicts before creating
    const conflictCheck = await supabase
      .from('timetables')
      .select('id')
      .eq('school_id', profile.school_id)
      .eq('academic_year_id', academic_year_id)
      .eq('day_of_week', day_of_week)
      .eq('time_period_id', time_period_id)
      .eq('is_active', true)
      .or(`class_id.eq.${class_id},teacher_id.eq.${teacher_id},room_id.eq.${room_id}`)

    const { data: conflicts } = await conflictCheck

    if (conflicts && conflicts.length > 0) {
      return NextResponse.json({ 
        error: 'Scheduling conflict detected. Class, teacher, or room is already booked for this time slot.' 
      }, { status: 409 })
    }

    // Create timetable entry
    const { data: timetable, error } = await supabase
      .from('timetables')
      .insert({
        school_id: profile.school_id,
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
        created_by: user_id,
        is_active: true
      })
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
      console.error('Error creating timetable:', error)
      return NextResponse.json({ error: 'Failed to create timetable entry' }, { status: 500 })
    }

    return NextResponse.json({ data: timetable }, { status: 201 })

  } catch (error) {
    console.error('Timetables POST API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// PUT /api/admin/timetables - Bulk update timetables
export async function PUT(request: NextRequest) {
  try {
    const supabase = createAdminSupabaseClient()
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

    const { timetables } = body

    if (!Array.isArray(timetables) || timetables.length === 0) {
      return NextResponse.json({ error: 'Invalid timetables data' }, { status: 400 })
    }

    // Process bulk updates
    const results = []
    for (const timetableData of timetables) {
      const { id, ...updateData } = timetableData
      
      if (id) {
        // Update existing
        const { data, error } = await supabase
          .from('timetables')
          .update({
            ...updateData,
            created_by: user.id,
            updated_at: new Date().toISOString()
          })
          .eq('id', id)
          .eq('school_id', profile.school_id)
          .select()
          .single()

        if (error) {
          console.error(`Error updating timetable ${id}:`, error)
          results.push({ id, error: error.message })
        } else {
          results.push({ id, data })
        }
      } else {
        // Create new
        const { data, error } = await supabase
          .from('timetables')
          .insert({
            ...updateData,
            school_id: profile.school_id,
            created_by: user.id
          })
          .select()
          .single()

        if (error) {
          console.error('Error creating timetable:', error)
          results.push({ error: error.message })
        } else {
          results.push({ data })
        }
      }
    }

    return NextResponse.json({ results })

  } catch (error) {
    console.error('Timetables PUT API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
