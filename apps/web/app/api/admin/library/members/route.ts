import { NextRequest, NextResponse } from 'next/server'
import { createAdminSupabaseClient } from '@/lib/supabase'

// GET /api/admin/library/members - Fetch library members with filters
export async function GET(request: NextRequest) {
  try {
    const supabase = createAdminSupabaseClient()
    const { searchParams } = new URL(request.url)
    
    const schoolId = searchParams.get('school_id')
    const userId = searchParams.get('user_id')
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')
    const search = searchParams.get('search') || ''
    const memberType = searchParams.get('member_type') || 'all'
    const status = searchParams.get('status') || 'all'

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

    // Build query with joins
    let query = supabase
      .from('library_members')
      .select(`
        *,
        profiles!inner(
          id,
          name,
          email,
          phone,
          role
        )
      `)
      .eq('school_id', schoolId)

    // Apply filters
    if (memberType !== 'all') {
      query = query.eq('member_type', memberType)
    }

    if (status !== 'all') {
      query = query.eq('status', status)
    }

    // Apply search
    if (search) {
      query = query.or(`
        library_card_number.ilike.%${search}%,
        barcode.ilike.%${search}%,
        profiles.name.ilike.%${search}%,
        profiles.email.ilike.%${search}%
      `)
    }

    // Get total count for pagination
    const { count } = await query.select('*', { count: 'exact', head: true })

    // Apply pagination and ordering
    const offset = (page - 1) * limit
    const { data: members, error } = await query
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    if (error) {
      console.error('Error fetching library members:', error)
      return NextResponse.json({ error: 'Failed to fetch library members' }, { status: 500 })
    }

    const totalPages = Math.ceil((count || 0) / limit)

    return NextResponse.json({
      members: members || [],
      pagination: {
        currentPage: page,
        totalPages,
        totalItems: count || 0,
        itemsPerPage: limit
      }
    })

  } catch (error) {
    console.error('Error in library members GET API:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST /api/admin/library/members - Create a new library member
export async function POST(request: NextRequest) {
  try {
    const supabase = createAdminSupabaseClient()
    const body = await request.json()

    const {
      school_id,
      user_id,
      profile_id,
      member_type,
      max_books_allowed,
      max_days_allowed,
      membership_end_date,
      can_reserve,
      can_renew,
      max_renewals,
      email_notifications,
      sms_notifications,
      emergency_contact_name,
      emergency_contact_phone
    } = body

    if (!school_id || !user_id || !profile_id || !member_type) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    // Verify user has access to this school
    const { data: profile } = await supabase
      .from('profiles')
      .select('school_id, role')
      .eq('id', user_id)
      .single()

    if (!profile || profile.school_id !== school_id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    // Check if profile exists and belongs to this school
    const { data: targetProfile } = await supabase
      .from('profiles')
      .select('id, school_id')
      .eq('id', profile_id)
      .eq('school_id', school_id)
      .single()

    if (!targetProfile) {
      return NextResponse.json({ error: 'Profile not found or not in this school' }, { status: 404 })
    }

    // Check if member already exists
    const { data: existingMember } = await supabase
      .from('library_members')
      .select('id')
      .eq('profile_id', profile_id)
      .eq('school_id', school_id)
      .single()

    if (existingMember) {
      return NextResponse.json({ error: 'User is already a library member' }, { status: 409 })
    }

    // Generate unique library card number and barcode
    const cardNumber = `LIB${Date.now().toString().slice(-8)}`
    const barcode = `${school_id.slice(0, 8)}${Date.now().toString().slice(-8)}`

    // Create library member
    const { data: newMember, error } = await supabase
      .from('library_members')
      .insert({
        profile_id,
        school_id,
        library_card_number: cardNumber,
        barcode,
        member_type,
        max_books_allowed: max_books_allowed || (member_type === 'student' ? 3 : 5),
        max_days_allowed: max_days_allowed || 14,
        membership_end_date: membership_end_date || null,
        can_reserve: can_reserve !== false,
        can_renew: can_renew !== false,
        max_renewals: max_renewals || 2,
        email_notifications: email_notifications !== false,
        sms_notifications: sms_notifications || false,
        emergency_contact_name: emergency_contact_name || null,
        emergency_contact_phone: emergency_contact_phone || null,
        created_by: user_id
      })
      .select(`
        *,
        profiles(
          id,
          name,
          email,
          phone,
          role
        )
      `)
      .single()

    if (error) {
      console.error('Error creating library member:', error)
      return NextResponse.json({ error: 'Failed to create library member' }, { status: 500 })
    }

    return NextResponse.json(newMember, { status: 201 })

  } catch (error) {
    console.error('Error in library members POST API:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
