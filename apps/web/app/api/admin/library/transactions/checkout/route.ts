import { NextRequest, NextResponse } from 'next/server'
import { createAdminSupabaseClient } from '@/lib/supabase'

// POST /api/admin/library/transactions/checkout - Checkout a book
export async function POST(request: NextRequest) {
  try {
    const supabase = createAdminSupabaseClient()
    const body = await request.json()

    const {
      school_id,
      user_id,
      memberCardNumber,
      bookBarcode,
      dueDays,
      notes
    } = body

    if (!school_id || !user_id || !memberCardNumber || !bookBarcode) {
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

    // Find the library member
    const { data: member, error: memberError } = await supabase
      .from('library_members')
      .select(`
        *,
        profiles(name, email)
      `)
      .eq('library_card_number', memberCardNumber)
      .eq('school_id', school_id)
      .eq('status', 'active')
      .single()

    if (memberError || !member) {
      return NextResponse.json({ error: 'Member not found or inactive' }, { status: 404 })
    }

    // Find the book copy
    const { data: bookCopy, error: bookError } = await supabase
      .from('book_copies')
      .select(`
        *,
        books(
          id,
          title,
          authors,
          isbn,
          is_reference_only
        )
      `)
      .eq('barcode', bookBarcode)
      .eq('school_id', school_id)
      .eq('status', 'available')
      .single()

    if (bookError || !bookCopy) {
      return NextResponse.json({ error: 'Book not found or not available' }, { status: 404 })
    }

    // Check if book is reference only
    if (bookCopy.books.is_reference_only) {
      return NextResponse.json({ error: 'This book is reference only and cannot be borrowed' }, { status: 400 })
    }

    // Check member's current active loans
    const { data: activeLoans, error: loansError } = await supabase
      .from('borrowing_transactions')
      .select('id')
      .eq('member_id', member.id)
      .eq('status', 'active')

    if (loansError) {
      console.error('Error checking active loans:', loansError)
      return NextResponse.json({ error: 'Failed to check member status' }, { status: 500 })
    }

    // Check if member has reached borrowing limit
    if (activeLoans && activeLoans.length >= member.max_books_allowed) {
      return NextResponse.json({ 
        error: `Member has reached maximum borrowing limit of ${member.max_books_allowed} books` 
      }, { status: 400 })
    }

    // Check for unpaid fines
    const { data: unpaidFines, error: finesError } = await supabase
      .from('fines')
      .select('amount')
      .eq('member_id', member.id)
      .eq('status', 'unpaid')

    if (finesError) {
      console.error('Error checking fines:', finesError)
      return NextResponse.json({ error: 'Failed to check member fines' }, { status: 500 })
    }

    const totalFines = unpaidFines?.reduce((sum, fine) => sum + fine.amount, 0) || 0
    if (totalFines > 0) {
      return NextResponse.json({ 
        error: `Member has unpaid fines of $${totalFines.toFixed(2)}. Please clear fines before borrowing.` 
      }, { status: 400 })
    }

    // Calculate due date
    const checkoutDate = new Date()
    const dueDate = new Date()
    dueDate.setDate(dueDate.getDate() + (dueDays || member.max_days_allowed))

    // Create the transaction
    const { data: transaction, error: transactionError } = await supabase
      .from('borrowing_transactions')
      .insert({
        member_id: member.id,
        book_copy_id: bookCopy.id,
        school_id: school_id,
        checkout_date: checkoutDate.toISOString(),
        due_date: dueDate.toISOString(),
        status: 'active',
        notes: notes || null,
        checked_out_by: user_id
      })
      .select(`
        *,
        library_members(
          library_card_number,
          profiles(name, email)
        ),
        book_copies(
          barcode,
          books(title, authors, isbn)
        )
      `)
      .single()

    if (transactionError) {
      console.error('Error creating transaction:', transactionError)
      return NextResponse.json({ error: 'Failed to create checkout transaction' }, { status: 500 })
    }

    // Update book copy status to checked out
    const { error: updateError } = await supabase
      .from('book_copies')
      .update({ 
        status: 'checked_out',
        updated_at: new Date().toISOString()
      })
      .eq('id', bookCopy.id)

    if (updateError) {
      console.error('Error updating book copy status:', updateError)
      // Rollback transaction if book update fails
      await supabase
        .from('borrowing_transactions')
        .delete()
        .eq('id', transaction.id)
      
      return NextResponse.json({ error: 'Failed to update book status' }, { status: 500 })
    }

    // Update member's total books borrowed count
    await supabase
      .from('library_members')
      .update({ 
        total_books_borrowed: member.total_books_borrowed + 1,
        updated_at: new Date().toISOString()
      })
      .eq('id', member.id)

    return NextResponse.json({
      transaction,
      message: `Book "${bookCopy.books.title}" checked out to ${member.profiles.name}. Due: ${dueDate.toLocaleDateString()}`
    }, { status: 201 })

  } catch (error) {
    console.error('Error in checkout API:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
