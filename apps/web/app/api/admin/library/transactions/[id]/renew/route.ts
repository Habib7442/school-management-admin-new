import { NextRequest, NextResponse } from 'next/server'
import { createAdminSupabaseClient } from '@/lib/supabase'

// POST /api/admin/library/transactions/[id]/renew - Renew a book
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = createAdminSupabaseClient()
    const body = await request.json()
    const transactionId = params.id

    const {
      school_id,
      user_id,
      renewal_days
    } = body

    if (!school_id || !user_id || !transactionId) {
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

    // Get the transaction with related data
    const { data: transaction, error: transactionError } = await supabase
      .from('borrowing_transactions')
      .select(`
        *,
        library_members(
          id,
          max_renewals,
          can_renew,
          max_days_allowed,
          current_fines,
          library_card_number,
          profiles(name, email)
        ),
        book_copies(
          id,
          barcode,
          books(title, authors, is_reference_only)
        )
      `)
      .eq('id', transactionId)
      .eq('school_id', school_id)
      .eq('status', 'active')
      .single()

    if (transactionError || !transaction) {
      return NextResponse.json({ error: 'Transaction not found or not active' }, { status: 404 })
    }

    // Check if member can renew books
    if (!transaction.library_members.can_renew) {
      return NextResponse.json({ error: 'Member is not allowed to renew books' }, { status: 400 })
    }

    // Check if book is reference only
    if (transaction.book_copies.books.is_reference_only) {
      return NextResponse.json({ error: 'Reference books cannot be renewed' }, { status: 400 })
    }

    // Check renewal limit
    if (transaction.renewal_count >= transaction.library_members.max_renewals) {
      return NextResponse.json({ 
        error: `Maximum renewals (${transaction.library_members.max_renewals}) reached for this book` 
      }, { status: 400 })
    }

    // Check for unpaid fines
    if (transaction.library_members.current_fines > 0) {
      return NextResponse.json({ 
        error: `Cannot renew book. Member has unpaid fines of $${transaction.library_members.current_fines.toFixed(2)}` 
      }, { status: 400 })
    }

    // Check if there are reservations for this book
    const { data: reservations, error: reservationError } = await supabase
      .from('reservations')
      .select('id')
      .eq('book_id', transaction.book_copies.books.id)
      .eq('status', 'active')
      .limit(1)

    if (reservationError) {
      console.error('Error checking reservations:', reservationError)
      return NextResponse.json({ error: 'Failed to check book reservations' }, { status: 500 })
    }

    if (reservations && reservations.length > 0) {
      return NextResponse.json({ 
        error: 'Cannot renew book. There are pending reservations for this book.' 
      }, { status: 400 })
    }

    // Calculate new due date
    const currentDueDate = new Date(transaction.due_date)
    const newDueDate = new Date(currentDueDate)
    const daysToAdd = renewal_days || transaction.library_members.max_days_allowed
    newDueDate.setDate(newDueDate.getDate() + daysToAdd)

    // Update the transaction
    const { data: updatedTransaction, error: updateError } = await supabase
      .from('borrowing_transactions')
      .update({
        due_date: newDueDate.toISOString(),
        renewal_count: transaction.renewal_count + 1,
        last_renewed_date: new Date().toISOString(),
        renewed_by: user_id,
        updated_at: new Date().toISOString()
      })
      .eq('id', transactionId)
      .select(`
        *,
        library_members(
          library_card_number,
          profiles(name, email)
        ),
        book_copies(
          barcode,
          books(title, authors)
        )
      `)
      .single()

    if (updateError) {
      console.error('Error updating transaction:', updateError)
      return NextResponse.json({ error: 'Failed to renew book' }, { status: 500 })
    }

    // Log the renewal activity
    await supabase
      .from('library_activity_logs')
      .insert({
        school_id: school_id,
        member_id: transaction.library_members.id,
        book_copy_id: transaction.book_copies.id,
        transaction_id: transactionId,
        activity_type: 'renewal',
        description: `Book "${transaction.book_copies.books.title}" renewed. New due date: ${newDueDate.toLocaleDateString()}`,
        performed_by: user_id
      })

    return NextResponse.json({
      transaction: updatedTransaction,
      message: `Book "${transaction.book_copies.books.title}" renewed successfully. New due date: ${newDueDate.toLocaleDateString()}`,
      new_due_date: newDueDate.toISOString(),
      renewals_remaining: transaction.library_members.max_renewals - (transaction.renewal_count + 1)
    })

  } catch (error) {
    console.error('Error in renew API:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
