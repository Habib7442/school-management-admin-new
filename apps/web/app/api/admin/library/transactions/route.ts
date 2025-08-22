import { NextRequest, NextResponse } from 'next/server'
import { createAdminSupabaseClient } from '@/lib/supabase'

// GET /api/admin/library/transactions - Fetch library transactions with filters
export async function GET(request: NextRequest) {
  try {
    const supabase = createAdminSupabaseClient()
    const { searchParams } = new URL(request.url)
    
    const schoolId = searchParams.get('school_id')
    const userId = searchParams.get('user_id')
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')
    const search = searchParams.get('search') || ''
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
      .from('borrowing_transactions')
      .select(`
        *,
        library_members!inner(
          id,
          library_card_number,
          profiles!inner(
            id,
            name,
            email
          )
        ),
        book_copies!inner(
          id,
          barcode,
          books!inner(
            id,
            title,
            authors,
            isbn
          )
        )
      `)
      .eq('school_id', schoolId)

    // Apply status filter
    if (status !== 'all') {
      if (status === 'overdue') {
        // For overdue, we need active transactions past due date
        query = query
          .eq('status', 'active')
          .lt('due_date', new Date().toISOString())
      } else {
        query = query.eq('status', status)
      }
    }

    // Apply search
    if (search) {
      query = query.or(`
        library_members.library_card_number.ilike.%${search}%,
        library_members.profiles.name.ilike.%${search}%,
        book_copies.barcode.ilike.%${search}%,
        book_copies.books.title.ilike.%${search}%,
        book_copies.books.authors.cs.{${search}}
      `)
    }

    // Get total count for pagination
    const { count } = await query.select('*', { count: 'exact', head: true })

    // Apply pagination and ordering
    const offset = (page - 1) * limit
    const { data: transactions, error } = await query
      .order('checkout_date', { ascending: false })
      .range(offset, offset + limit - 1)

    if (error) {
      console.error('Error fetching transactions:', error)
      return NextResponse.json({ error: 'Failed to fetch transactions' }, { status: 500 })
    }

    // Transform data to match expected format
    const transformedTransactions = transactions?.map(transaction => ({
      ...transaction,
      member: transaction.library_members,
      book_copy: transaction.book_copies
    })) || []

    const totalPages = Math.ceil((count || 0) / limit)

    return NextResponse.json({
      transactions: transformedTransactions,
      pagination: {
        currentPage: page,
        totalPages,
        totalItems: count || 0,
        itemsPerPage: limit
      }
    })

  } catch (error) {
    console.error('Error in transactions GET API:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
