/**
 * Rooms API Route
 * Handles CRUD operations for school rooms and venues
 */

import { NextRequest, NextResponse } from 'next/server'
import { createAdminSupabaseClient } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

// GET /api/admin/rooms - Fetch all rooms for the school
export async function GET(request: NextRequest) {
  try {
    const supabase = createAdminSupabaseClient()
    const { searchParams } = new URL(request.url)

    // Get query parameters
    const schoolId = searchParams.get('school_id')
    const userId = searchParams.get('user_id')
    const roomType = searchParams.get('room_type')
    const building = searchParams.get('building')
    const search = searchParams.get('search')

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

    // Build query
    let query = supabase
      .from('rooms')
      .select('*')
      .eq('school_id', schoolId)
      .eq('is_active', true)
      .order('building')
      .order('floor_number')
      .order('room_number')

    // Apply filters
    if (roomType) query = query.eq('room_type', roomType)
    if (building) query = query.eq('building', building)
    if (search) {
      query = query.or(`name.ilike.%${search}%,room_number.ilike.%${search}%`)
    }

    const { data: rooms, error } = await query

    if (error) {
      console.error('Error fetching rooms:', error)
      return NextResponse.json({ error: 'Failed to fetch rooms' }, { status: 500 })
    }

    return NextResponse.json({ data: rooms })

  } catch (error) {
    console.error('Rooms API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST /api/admin/rooms - Create new room
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
    const { 
      name, 
      room_number, 
      building, 
      floor_number, 
      capacity, 
      room_type, 
      facilities 
    } = body

    if (!name) {
      return NextResponse.json({ 
        error: 'Missing required field: name' 
      }, { status: 400 })
    }

    // Check for duplicate room number if provided
    if (room_number) {
      const { data: existingRoom } = await supabase
        .from('rooms')
        .select('id')
        .eq('school_id', profile.school_id)
        .eq('room_number', room_number)
        .eq('is_active', true)
        .single()

      if (existingRoom) {
        return NextResponse.json({ 
          error: 'A room with this number already exists' 
        }, { status: 409 })
      }
    }

    // Check for duplicate name
    const { data: existingName } = await supabase
      .from('rooms')
      .select('id')
      .eq('school_id', profile.school_id)
      .eq('name', name)
      .eq('is_active', true)
      .single()

    if (existingName) {
      return NextResponse.json({ 
        error: 'A room with this name already exists' 
      }, { status: 409 })
    }

    // Create room
    const { data: room, error } = await supabase
      .from('rooms')
      .insert({
        school_id: profile.school_id,
        name,
        room_number: room_number || null,
        building: building || null,
        floor_number: floor_number || null,
        capacity: capacity || 30,
        room_type: room_type || 'classroom',
        facilities: facilities || [],
        is_active: true
      })
      .select()
      .single()

    if (error) {
      console.error('Error creating room:', error)
      return NextResponse.json({ error: 'Failed to create room' }, { status: 500 })
    }

    return NextResponse.json({ data: room }, { status: 201 })

  } catch (error) {
    console.error('Rooms POST API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// PUT /api/admin/rooms - Bulk update rooms
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

    const { rooms } = body

    if (!Array.isArray(rooms) || rooms.length === 0) {
      return NextResponse.json({ error: 'Invalid rooms data' }, { status: 400 })
    }

    // Process bulk updates
    const results = []
    for (const roomData of rooms) {
      const { id, ...updateData } = roomData
      
      if (id) {
        // Update existing
        const { data, error } = await supabase
          .from('rooms')
          .update({
            ...updateData,
            updated_at: new Date().toISOString()
          })
          .eq('id', id)
          .eq('school_id', profile.school_id)
          .select()
          .single()

        if (error) {
          console.error(`Error updating room ${id}:`, error)
          results.push({ id, error: error.message })
        } else {
          results.push({ id, data })
        }
      } else {
        // Create new
        const { data, error } = await supabase
          .from('rooms')
          .insert({
            ...updateData,
            school_id: profile.school_id
          })
          .select()
          .single()

        if (error) {
          console.error('Error creating room:', error)
          results.push({ error: error.message })
        } else {
          results.push({ data })
        }
      }
    }

    return NextResponse.json({ results })

  } catch (error) {
    console.error('Rooms PUT API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
