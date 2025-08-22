import { NextRequest, NextResponse } from 'next/server'
import { createAdminSupabaseClient } from '@/lib/supabase'

// POST /api/admin/library/transactions/[id]/return - Return a book
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
      condition = 'good',
      notes = ''
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
          library_card_number,
          profiles(name, email)
        ),
        book_copies(
          id,
          barcode,
          books(title, authors)
        )
      `)
      .eq('id', transactionId)
      .eq('school_id', school_id)
      .eq('status', 'active')
      .single()

    if (transactionError || !transaction) {
      return NextResponse.json({ error: 'Transaction not found or already returned' }, { status: 404 })
    }

    const returnDate = new Date()
    const dueDate = new Date(transaction.due_date)
    const isOverdue = returnDate > dueDate

    // Calculate fine if overdue
    let fineAmount = 0
    if (isOverdue) {
      const daysOverdue = Math.ceil((returnDate.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24))
      fineAmount = daysOverdue * 0.50 // $0.50 per day overdue
    }

    // Update the transaction
    const { data: updatedTransaction, error: updateError } = await supabase
      .from('borrowing_transactions')
      .update({
        return_date: returnDate.toISOString(),
        status: 'returned',
        return_condition: condition,
        return_notes: notes,
        fine_amount: fineAmount,
        returned_by: user_id,
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
      return NextResponse.json({ error: 'Failed to update transaction' }, { status: 500 })
    }

    // Update book copy status based on condition
    let bookStatus = 'available'
    if (condition === 'damaged' || condition === 'poor') {
      bookStatus = 'damaged'
    }

    const { error: bookUpdateError } = await supabase
      .from('book_copies')
      .update({ 
        status: bookStatus,
        condition: condition,
        updated_at: new Date().toISOString()
      })
      .eq('id', transaction.book_copies.id)

    if (bookUpdateError) {
      console.error('Error updating book copy:', bookUpdateError)
      return NextResponse.json({ error: 'Failed to update book status' }, { status: 500 })
    }

    // Create fine record if there's a fine
    if (fineAmount > 0) {
      const { error: fineError } = await supabase
        .from('fines')
        .insert({
          member_id: transaction.library_members.id,
          transaction_id: transactionId,
          school_id: school_id,
          amount: fineAmount,
          reason: 'overdue',
          description: `Overdue fine for "${transaction.book_copies.books.title}"`,
          status: 'unpaid',
          created_by: user_id
        })

      if (fineError) {
        console.error('Error creating fine:', fineError)
        // Don't fail the return, just log the error
      }

      // Update member's current fines
      await supabase
        .from('library_members')
        .update({ 
          current_fines: transaction.library_members.current_fines + fineAmount,
          updated_at: new Date().toISOString()
        })
        .eq('id', transaction.library_members.id)
    }

    let message = `Book "${transaction.book_copies.books.title}" returned successfully`
    if (fineAmount > 0) {
      message += `. Fine of $${fineAmount.toFixed(2)} applied for overdue return.`
    }

    return NextResponse.json({
      transaction: updatedTransaction,
      fine_amount: fineAmount,
      message
    })

  } catch (error) {
    console.error('Error in return API:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
