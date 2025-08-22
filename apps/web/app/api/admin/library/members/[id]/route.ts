import { NextRequest, NextResponse } from 'next/server'
import { createAdminSupabaseClient } from '@/lib/supabase'

// GET /api/admin/library/members/[id] - Get a specific library member
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = createAdminSupabaseClient()
    const { searchParams } = new URL(request.url)
    const schoolId = searchParams.get('school_id')
    const userId = searchParams.get('user_id')
    const memberId = params.id

    if (!schoolId || !userId || !memberId) {
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

    // Fetch the member with related data
    const { data: member, error } = await supabase
      .from('library_members')
      .select(`
        *,
        profiles(
          id,
          name,
          email,
          phone,
          role,
          avatar_url
        )
      `)
      .eq('id', memberId)
      .eq('school_id', schoolId)
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json({ error: 'Member not found' }, { status: 404 })
      }
      console.error('Error fetching member:', error)
      return NextResponse.json({ error: 'Failed to fetch member' }, { status: 500 })
    }

    return NextResponse.json(member)

  } catch (error) {
    console.error('Error in members GET API:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// PATCH /api/admin/library/members/[id] - Update a library member
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = createAdminSupabaseClient()
    const body = await request.json()
    const memberId = params.id

    const {
      school_id,
      user_id,
      member_type,
      max_books_allowed,
      max_days_allowed,
      membership_end_date,
      can_reserve,
      can_renew,
      max_renewals,
      email_notifications,
      sms_notifications,
      status,
      suspension_reason,
      suspension_until,
      emergency_contact_name,
      emergency_contact_phone
    } = body

    if (!school_id || !user_id || !memberId) {
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

    // Check if member exists and belongs to this school
    const { data: existingMember } = await supabase
      .from('library_members')
      .select('id')
      .eq('id', memberId)
      .eq('school_id', school_id)
      .single()

    if (!existingMember) {
      return NextResponse.json({ error: 'Member not found' }, { status: 404 })
    }

    // Prepare update data
    const updateData: any = {
      updated_at: new Date().toISOString()
    }

    if (member_type !== undefined) updateData.member_type = member_type
    if (max_books_allowed !== undefined) updateData.max_books_allowed = max_books_allowed
    if (max_days_allowed !== undefined) updateData.max_days_allowed = max_days_allowed
    if (membership_end_date !== undefined) updateData.membership_end_date = membership_end_date
    if (can_reserve !== undefined) updateData.can_reserve = can_reserve
    if (can_renew !== undefined) updateData.can_renew = can_renew
    if (max_renewals !== undefined) updateData.max_renewals = max_renewals
    if (email_notifications !== undefined) updateData.email_notifications = email_notifications
    if (sms_notifications !== undefined) updateData.sms_notifications = sms_notifications
    if (status !== undefined) updateData.status = status
    if (suspension_reason !== undefined) updateData.suspension_reason = suspension_reason
    if (suspension_until !== undefined) updateData.suspension_until = suspension_until
    if (emergency_contact_name !== undefined) updateData.emergency_contact_name = emergency_contact_name
    if (emergency_contact_phone !== undefined) updateData.emergency_contact_phone = emergency_contact_phone

    // Update the member
    const { data: updatedMember, error } = await supabase
      .from('library_members')
      .update(updateData)
      .eq('id', memberId)
      .eq('school_id', school_id)
      .select(`
        *,
        profiles(
          id,
          name,
          email,
          phone,
          role,
          avatar_url
        )
      `)
      .single()

    if (error) {
      console.error('Error updating member:', error)
      return NextResponse.json({ error: 'Failed to update member' }, { status: 500 })
    }

    return NextResponse.json(updatedMember)

  } catch (error) {
    console.error('Error in members PATCH API:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// DELETE /api/admin/library/members/[id] - Remove a library member
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = createAdminSupabaseClient()
    const { searchParams } = new URL(request.url)
    const schoolId = searchParams.get('school_id')
    const userId = searchParams.get('user_id')
    const memberId = params.id

    if (!schoolId || !userId || !memberId) {
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

    // Check if member has active transactions
    const { data: activeTransactions } = await supabase
      .from('borrowing_transactions')
      .select('id')
      .eq('member_id', memberId)
      .eq('status', 'active')
      .limit(1)

    if (activeTransactions && activeTransactions.length > 0) {
      return NextResponse.json({ 
        error: 'Cannot remove member with active book transactions' 
      }, { status: 400 })
    }

    // Check if member has unpaid fines
    const { data: unpaidFines } = await supabase
      .from('fines')
      .select('id, amount')
      .eq('member_id', memberId)
      .eq('status', 'unpaid')
      .limit(1)

    if (unpaidFines && unpaidFines.length > 0) {
      return NextResponse.json({ 
        error: 'Cannot remove member with unpaid fines' 
      }, { status: 400 })
    }

    // Soft delete the member (set status to 'deleted')
    const { error } = await supabase
      .from('library_members')
      .update({ 
        status: 'deleted',
        updated_at: new Date().toISOString()
      })
      .eq('id', memberId)
      .eq('school_id', schoolId)

    if (error) {
      console.error('Error deleting member:', error)
      return NextResponse.json({ error: 'Failed to remove member' }, { status: 500 })
    }

    return NextResponse.json({ message: 'Member removed successfully' })

  } catch (error) {
    console.error('Error in members DELETE API:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
