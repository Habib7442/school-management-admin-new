import { NextRequest, NextResponse } from 'next/server'
import { createAdminSupabaseClient } from '@/lib/supabase'
import { revalidateTag } from 'next/cache'

// GET /api/admin/library/books/[id] - Get a specific book
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = createAdminSupabaseClient()
    const { searchParams } = new URL(request.url)
    const schoolId = searchParams.get('school_id')
    const userId = searchParams.get('user_id')

    if (!schoolId || !userId) {
      return NextResponse.json({ error: 'Missing required parameters' }, { status: 400 })
    }

    // Verify user has access
    const { data: profile } = await supabase
      .from('profiles')
      .select('school_id, role')
      .eq('id', userId)
      .single()

    if (!profile || profile.school_id !== schoolId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    // Fetch book with related data
    const { data: book, error } = await supabase
      .from('books')
      .select(`
        *,
        library_categories(
          id,
          name,
          code,
          color_code
        ),
        book_copies(
          id,
          barcode,
          copy_number,
          status,
          condition,
          location,
          total_checkouts,
          last_checkout_date
        )
      `)
      .eq('id', params.id)
      .eq('school_id', schoolId)
      .single()

    if (error || !book) {
      return NextResponse.json({ error: 'Book not found' }, { status: 404 })
    }

    return NextResponse.json({ book })

  } catch (error) {
    console.error('Error fetching book:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// PUT /api/admin/library/books/[id] - Update a book
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = createAdminSupabaseClient()
    const body = await request.json()

    const {
      school_id,
      user_id,
      isbn,
      title,
      subtitle,
      authors,
      publisher,
      publication_year,
      edition,
      language,
      pages,
      category_id,
      dewey_decimal,
      call_number,
      format,
      dimensions,
      weight_grams,
      description,
      table_of_contents,
      subjects,
      target_audience,
      reading_level,
      cover_image_url,
      ebook_url,
      preview_url,
      acquisition_cost,
      supplier,
      is_reference_only,
      is_digital,
      status
    } = body

    if (!school_id || !user_id) {
      return NextResponse.json({ error: 'Missing required parameters' }, { status: 400 })
    }

    // Verify user has permission
    const { data: profile } = await supabase
      .from('profiles')
      .select('school_id, role')
      .eq('id', user_id)
      .single()

    if (!profile || profile.school_id !== school_id || !['admin', 'sub-admin'].includes(profile.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    // Check if book exists and belongs to school
    const { data: existingBook } = await supabase
      .from('books')
      .select('id, isbn, total_copies')
      .eq('id', params.id)
      .eq('school_id', school_id)
      .single()

    if (!existingBook) {
      return NextResponse.json({ error: 'Book not found' }, { status: 404 })
    }

    // Check for duplicate ISBN (if changed)
    if (isbn && isbn !== existingBook.isbn) {
      const { data: duplicateBook } = await supabase
        .from('books')
        .select('id')
        .eq('school_id', school_id)
        .eq('isbn', isbn)
        .neq('id', params.id)
        .single()

      if (duplicateBook) {
        return NextResponse.json({ error: 'Book with this ISBN already exists' }, { status: 409 })
      }
    }

    // Update the book
    const { data: book, error: updateError } = await supabase
      .from('books')
      .update({
        isbn,
        title,
        subtitle,
        authors,
        publisher,
        publication_year,
        edition,
        language,
        pages,
        category_id,
        dewey_decimal,
        call_number,
        format,
        dimensions,
        weight_grams,
        description,
        table_of_contents,
        subjects,
        target_audience,
        reading_level,
        cover_image_url,
        ebook_url,
        preview_url,
        acquisition_cost,
        supplier,
        is_reference_only,
        is_digital,
        status,
        updated_at: new Date().toISOString()
      })
      .eq('id', params.id)
      .eq('school_id', school_id)
      .select()
      .single()

    if (updateError) {
      console.error('Error updating book:', updateError)
      return NextResponse.json({ error: 'Failed to update book' }, { status: 500 })
    }

    // Revalidate cache
    revalidateTag(`library-books-${school_id}`)
    revalidateTag(`library-book-${params.id}`)

    return NextResponse.json({ book })

  } catch (error) {
    console.error('Error updating book:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// DELETE /api/admin/library/books/[id] - Delete a book
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = createAdminSupabaseClient()
    const { searchParams } = new URL(request.url)
    const schoolId = searchParams.get('school_id')
    const userId = searchParams.get('user_id')

    if (!schoolId || !userId) {
      return NextResponse.json({ error: 'Missing required parameters' }, { status: 400 })
    }

    // Verify user has permission
    const { data: profile } = await supabase
      .from('profiles')
      .select('school_id, role')
      .eq('id', userId)
      .single()

    if (!profile || profile.school_id !== schoolId || !['admin', 'sub-admin'].includes(profile.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    // Check if book has active transactions
    const { data: activeTransactions } = await supabase
      .from('borrowing_transactions')
      .select('id')
      .eq('school_id', schoolId)
      .in('book_copy_id', 
        supabase
          .from('book_copies')
          .select('id')
          .eq('book_id', params.id)
      )
      .eq('status', 'active')

    if (activeTransactions && activeTransactions.length > 0) {
      return NextResponse.json({ 
        error: 'Cannot delete book with active borrowing transactions' 
      }, { status: 409 })
    }

    // Check if book has pending reservations
    const { data: activeReservations } = await supabase
      .from('reservations')
      .select('id')
      .eq('book_id', params.id)
      .eq('school_id', schoolId)
      .in('status', ['pending', 'available'])

    if (activeReservations && activeReservations.length > 0) {
      return NextResponse.json({ 
        error: 'Cannot delete book with active reservations' 
      }, { status: 409 })
    }

    // Delete book copies first (due to foreign key constraints)
    const { error: copiesError } = await supabase
      .from('book_copies')
      .delete()
      .eq('book_id', params.id)
      .eq('school_id', schoolId)

    if (copiesError) {
      console.error('Error deleting book copies:', copiesError)
      return NextResponse.json({ error: 'Failed to delete book copies' }, { status: 500 })
    }

    // Delete the book
    const { error: deleteError } = await supabase
      .from('books')
      .delete()
      .eq('id', params.id)
      .eq('school_id', schoolId)

    if (deleteError) {
      console.error('Error deleting book:', deleteError)
      return NextResponse.json({ error: 'Failed to delete book' }, { status: 500 })
    }

    // Revalidate cache
    revalidateTag(`library-books-${schoolId}`)

    return NextResponse.json({ message: 'Book deleted successfully' })

  } catch (error) {
    console.error('Error deleting book:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
