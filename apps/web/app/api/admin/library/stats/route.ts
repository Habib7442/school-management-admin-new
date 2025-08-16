import { NextRequest, NextResponse } from 'next/server'
import { createAdminSupabaseClient } from '@/lib/supabase'

// GET /api/admin/library/stats - Get library statistics and dashboard data
export async function GET(request: NextRequest) {
  try {
    const supabase = createAdminSupabaseClient()
    const { searchParams } = new URL(request.url)

    const schoolId = searchParams.get('school_id')
    const userId = searchParams.get('user_id')

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

    // Get total books count
    const { count: totalBooks } = await supabase
      .from('books')
      .select('*', { count: 'exact', head: true })
      .eq('school_id', schoolId)
      .eq('status', 'active')

    // Get total active members count
    const { count: totalMembers } = await supabase
      .from('library_members')
      .select('*', { count: 'exact', head: true })
      .eq('school_id', schoolId)
      .eq('status', 'active')

    // Get active transactions (currently borrowed books)
    const { count: activeTransactions } = await supabase
      .from('borrowing_transactions')
      .select('*', { count: 'exact', head: true })
      .eq('school_id', schoolId)
      .eq('status', 'active')

    // Get overdue books count
    const { count: overdueBooks } = await supabase
      .from('borrowing_transactions')
      .select('*', { count: 'exact', head: true })
      .eq('school_id', schoolId)
      .eq('status', 'active')
      .lt('due_date', new Date().toISOString().split('T')[0])

    // Get pending reservations count
    const { count: reservations } = await supabase
      .from('reservations')
      .select('*', { count: 'exact', head: true })
      .eq('school_id', schoolId)
      .in('status', ['pending', 'available'])

    // Get total fines collected this month
    const startOfMonth = new Date()
    startOfMonth.setDate(1)
    startOfMonth.setHours(0, 0, 0, 0)

    const { data: finesData } = await supabase
      .from('fines')
      .select('amount_paid')
      .eq('school_id', schoolId)
      .eq('status', 'paid')
      .gte('payment_date', startOfMonth.toISOString())

    const finesCollected = finesData?.reduce((sum, fine) => sum + (fine.amount_paid || 0), 0) || 0

    // Get popular books (most borrowed this month)
    const { data: popularBooksData } = await supabase
      .from('borrowing_transactions')
      .select(`
        book_copies!inner(
          books!inner(
            id,
            title,
            authors
          )
        )
      `)
      .eq('school_id', schoolId)
      .gte('checkout_date', startOfMonth.toISOString())

    // Process popular books data
    const bookCheckouts: { [key: string]: { id: string, title: string, authors: string[], count: number } } = {}
    
    popularBooksData?.forEach(transaction => {
      const book = transaction.book_copies?.books
      if (book) {
        if (bookCheckouts[book.id]) {
          bookCheckouts[book.id].count++
        } else {
          bookCheckouts[book.id] = {
            id: book.id,
            title: book.title,
            authors: book.authors,
            count: 1
          }
        }
      }
    })

    const popularBooks = Object.values(bookCheckouts)
      .sort((a, b) => b.count - a.count)
      .slice(0, 5)
      .map(book => ({
        id: book.id,
        title: book.title,
        author: book.authors[0] || 'Unknown Author',
        checkouts: book.count
      }))

    // Get recent activity (last 10 transactions)
    const { data: recentActivityData } = await supabase
      .from('borrowing_transactions')
      .select(`
        id,
        transaction_type,
        checkout_date,
        return_date,
        library_members!inner(
          profile_id,
          profiles!inner(
            name
          )
        ),
        book_copies!inner(
          books!inner(
            title
          )
        )
      `)
      .eq('school_id', schoolId)
      .order('created_at', { ascending: false })
      .limit(10)

    const recentActivity = recentActivityData?.map(transaction => ({
      id: transaction.id,
      type: transaction.return_date ? 'return' : 'checkout',
      memberName: transaction.library_members?.profiles?.name || 'Unknown Member',
      bookTitle: transaction.book_copies?.books?.title || 'Unknown Book',
      timestamp: transaction.return_date || transaction.checkout_date
    })) || []

    // Get recent reservations for activity feed
    const { data: recentReservationsData } = await supabase
      .from('reservations')
      .select(`
        id,
        reservation_date,
        library_members!inner(
          profile_id,
          profiles!inner(
            name
          )
        ),
        books!inner(
          title
        )
      `)
      .eq('school_id', schoolId)
      .order('created_at', { ascending: false })
      .limit(5)

    const recentReservations = recentReservationsData?.map(reservation => ({
      id: reservation.id,
      type: 'reservation' as const,
      memberName: reservation.library_members?.profiles?.name || 'Unknown Member',
      bookTitle: reservation.books?.title || 'Unknown Book',
      timestamp: reservation.reservation_date
    })) || []

    // Combine and sort all recent activity
    const allRecentActivity = [...recentActivity, ...recentReservations]
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, 10)

    const stats = {
      totalBooks: totalBooks || 0,
      totalMembers: totalMembers || 0,
      activeTransactions: activeTransactions || 0,
      overdueBooks: overdueBooks || 0,
      reservations: reservations || 0,
      finesCollected: Number(finesCollected.toFixed(2)),
      popularBooks,
      recentActivity: allRecentActivity
    }

    return NextResponse.json(stats)

  } catch (error) {
    console.error('Error fetching library stats:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
