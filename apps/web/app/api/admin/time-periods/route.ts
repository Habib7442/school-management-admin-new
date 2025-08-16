/**
 * Time Periods API Route
 * Handles CRUD operations for school time periods/slots
 */

import { NextRequest, NextResponse } from 'next/server'
import { createAdminSupabaseClient } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

// GET /api/admin/time-periods - Fetch all time periods for the school
export async function GET(request: NextRequest) {
  try {
    const supabase = createAdminSupabaseClient()
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

    // Fetch time periods ordered by period_order
    const { data: timePeriods, error } = await supabase
      .from('time_periods')
      .select('*')
      .eq('school_id', profile.school_id)
      .eq('is_active', true)
      .order('period_order')

    if (error) {
      console.error('Error fetching time periods:', error)
      return NextResponse.json({ error: 'Failed to fetch time periods' }, { status: 500 })
    }

    return NextResponse.json({ data: timePeriods })

  } catch (error) {
    console.error('Time periods API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST /api/admin/time-periods - Create new time period
export async function POST(request: NextRequest) {
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

    // Validate required fields
    const { name, start_time, end_time, period_order, is_break } = body

    if (!name || !start_time || !end_time || period_order === undefined) {
      return NextResponse.json({ 
        error: 'Missing required fields: name, start_time, end_time, period_order' 
      }, { status: 400 })
    }

    // Validate time range
    if (start_time >= end_time) {
      return NextResponse.json({ 
        error: 'Start time must be before end time' 
      }, { status: 400 })
    }

    // Check for duplicate period order
    const { data: existingPeriod } = await supabase
      .from('time_periods')
      .select('id')
      .eq('school_id', profile.school_id)
      .eq('period_order', period_order)
      .eq('is_active', true)
      .single()

    if (existingPeriod) {
      return NextResponse.json({ 
        error: 'A time period with this order already exists' 
      }, { status: 409 })
    }

    // Check for duplicate name
    const { data: existingName } = await supabase
      .from('time_periods')
      .select('id')
      .eq('school_id', profile.school_id)
      .eq('name', name)
      .eq('is_active', true)
      .single()

    if (existingName) {
      return NextResponse.json({ 
        error: 'A time period with this name already exists' 
      }, { status: 409 })
    }

    // Create time period
    const { data: timePeriod, error } = await supabase
      .from('time_periods')
      .insert({
        school_id: profile.school_id,
        name,
        start_time,
        end_time,
        period_order,
        is_break: is_break || false,
        is_active: true
      })
      .select()
      .single()

    if (error) {
      console.error('Error creating time period:', error)
      return NextResponse.json({ error: 'Failed to create time period' }, { status: 500 })
    }

    return NextResponse.json({ data: timePeriod }, { status: 201 })

  } catch (error) {
    console.error('Time periods POST API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// PUT /api/admin/time-periods - Bulk update time periods
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

    const { timePeriods } = body

    if (!Array.isArray(timePeriods) || timePeriods.length === 0) {
      return NextResponse.json({ error: 'Invalid time periods data' }, { status: 400 })
    }

    // Process bulk updates
    const results = []
    for (const periodData of timePeriods) {
      const { id, ...updateData } = periodData
      
      if (id) {
        // Update existing
        const { data, error } = await supabase
          .from('time_periods')
          .update({
            ...updateData,
            updated_at: new Date().toISOString()
          })
          .eq('id', id)
          .eq('school_id', profile.school_id)
          .select()
          .single()

        if (error) {
          console.error(`Error updating time period ${id}:`, error)
          results.push({ id, error: error.message })
        } else {
          results.push({ id, data })
        }
      } else {
        // Create new
        const { data, error } = await supabase
          .from('time_periods')
          .insert({
            ...updateData,
            school_id: profile.school_id
          })
          .select()
          .single()

        if (error) {
          console.error('Error creating time period:', error)
          results.push({ error: error.message })
        } else {
          results.push({ data })
        }
      }
    }

    return NextResponse.json({ results })

  } catch (error) {
    console.error('Time periods PUT API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
