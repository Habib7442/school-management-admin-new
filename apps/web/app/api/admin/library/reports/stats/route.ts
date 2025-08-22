import { NextRequest, NextResponse } from 'next/server'
import { createAdminSupabaseClient } from '@/lib/supabase'

// GET /api/admin/library/reports/stats - Get detailed library statistics for reports
export async function GET(request: NextRequest) {
  try {
    const supabase = createAdminSupabaseClient()
    const { searchParams } = new URL(request.url)

    const schoolId = searchParams.get('school_id')
    const userId = searchParams.get('user_id')
    const period = searchParams.get('period') || 'month' // month, quarter, year

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

    // Calculate date ranges based on period
    const now = new Date()
    let startDate: Date
    let endDate = new Date()

    switch (period) {
      case 'week':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
        break
      case 'quarter':
        startDate = new Date(now.getFullYear(), Math.floor(now.getMonth() / 3) * 3, 1)
        break
      case 'year':
        startDate = new Date(now.getFullYear(), 0, 1)
        break
      case 'month':
      default:
        startDate = new Date(now.getFullYear(), now.getMonth(), 1)
        break
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

    // Get active loans (currently borrowed books)
    const { count: activeLoans } = await supabase
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

    // Get total fines for the period
    const { data: finesData } = await supabase
      .from('fines')
      .select('amount, amount_paid')
      .eq('school_id', schoolId)
      .gte('created_at', startDate.toISOString())
      .lte('created_at', endDate.toISOString())

    const totalFines = finesData?.reduce((sum, fine) => sum + (fine.amount_paid || 0), 0) || 0

    // Get books added this period
    const { count: booksAddedThisMonth } = await supabase
      .from('books')
      .select('*', { count: 'exact', head: true })
      .eq('school_id', schoolId)
      .gte('created_at', startDate.toISOString())
      .lte('created_at', endDate.toISOString())

    // Get popular books (most borrowed in period)
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
      .gte('checkout_date', startDate.toISOString())
      .lte('checkout_date', endDate.toISOString())

    // Process popular books data
    const bookCheckouts: { [key: string]: { title: string, authors: string[], count: number } } = {}
    
    popularBooksData?.forEach(transaction => {
      const book = transaction.book_copies?.books
      if (book) {
        const key = book.id
        if (bookCheckouts[key]) {
          bookCheckouts[key].count++
        } else {
          bookCheckouts[key] = {
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
        title: book.title,
        authors: book.authors,
        borrowCount: book.count
      }))

    // Get member activity by type
    const { data: memberActivityData } = await supabase
      .from('library_members')
      .select('member_type')
      .eq('school_id', schoolId)
      .eq('status', 'active')

    const memberTypeCounts: { [key: string]: number } = {}
    memberActivityData?.forEach(member => {
      const type = member.member_type || 'student'
      memberTypeCounts[type] = (memberTypeCounts[type] || 0) + 1
    })

    const totalMembersForActivity = Object.values(memberTypeCounts).reduce((sum, count) => sum + count, 0)
    const memberActivity = Object.entries(memberTypeCounts).map(([type, count]) => ({
      memberType: type,
      count,
      percentage: totalMembersForActivity > 0 ? Math.round((count / totalMembersForActivity) * 100) : 0
    }))

    // Get monthly stats for the last 6 months
    const monthlyStats = []
    for (let i = 5; i >= 0; i--) {
      const monthStart = new Date(now.getFullYear(), now.getMonth() - i, 1)
      const monthEnd = new Date(now.getFullYear(), now.getMonth() - i + 1, 0)
      
      const { count: checkouts } = await supabase
        .from('borrowing_transactions')
        .select('*', { count: 'exact', head: true })
        .eq('school_id', schoolId)
        .gte('checkout_date', monthStart.toISOString())
        .lte('checkout_date', monthEnd.toISOString())

      const { count: returns } = await supabase
        .from('borrowing_transactions')
        .select('*', { count: 'exact', head: true })
        .eq('school_id', schoolId)
        .gte('return_date', monthStart.toISOString())
        .lte('return_date', monthEnd.toISOString())
        .not('return_date', 'is', null)

      const { count: newMembers } = await supabase
        .from('library_members')
        .select('*', { count: 'exact', head: true })
        .eq('school_id', schoolId)
        .gte('created_at', monthStart.toISOString())
        .lte('created_at', monthEnd.toISOString())

      monthlyStats.push({
        month: monthStart.toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
        checkouts: checkouts || 0,
        returns: returns || 0,
        newMembers: newMembers || 0
      })
    }

    // Get category statistics
    const { data: categoryStatsData } = await supabase
      .from('library_categories')
      .select(`
        id,
        name,
        books(count),
        books!inner(
          book_copies!inner(
            borrowing_transactions(count)
          )
        )
      `)
      .eq('school_id', schoolId)
      .eq('is_active', true)

    const categoryStats = categoryStatsData?.map(category => ({
      categoryName: category.name,
      bookCount: category.books?.[0]?.count || 0,
      borrowCount: 0 // Will need to calculate this properly
    })) || []

    const stats = {
      totalBooks: totalBooks || 0,
      totalMembers: totalMembers || 0,
      activeLoans: activeLoans || 0,
      overdueBooks: overdueBooks || 0,
      totalFines: Number(totalFines.toFixed(2)),
      booksAddedThisMonth: booksAddedThisMonth || 0,
      popularBooks,
      memberActivity,
      monthlyStats,
      categoryStats
    }

    return NextResponse.json(stats)

  } catch (error) {
    console.error('Error fetching library reports stats:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
