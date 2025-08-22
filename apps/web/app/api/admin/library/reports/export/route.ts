import { NextRequest, NextResponse } from 'next/server'
import { createAdminSupabaseClient } from '@/lib/supabase'

// GET /api/admin/library/reports/export - Export library reports as CSV
export async function GET(request: NextRequest) {
  try {
    const supabase = createAdminSupabaseClient()
    const { searchParams } = new URL(request.url)

    const schoolId = searchParams.get('school_id')
    const userId = searchParams.get('user_id')
    const period = searchParams.get('period') || 'month'
    const type = searchParams.get('type') || 'overview'

    if (!schoolId || !userId) {
      return NextResponse.json({ error: 'Missing required parameters' }, { status: 400 })
    }

    // Verify user has access to this school
    const { data: profile } = await supabase
      .from('profiles')
      .select('school_id, role')
      .eq('id', userId)
      .single()

    if (!profile || profile.school_id !== schoolId || !['admin', 'sub-admin'].includes(profile.role)) {
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

    let csvContent = ''
    let filename = `library-${type}-report-${new Date().toISOString().split('T')[0]}.csv`

    switch (type) {
      case 'overview':
        csvContent = await generateOverviewReport(supabase, schoolId, startDate, endDate)
        break
      case 'transactions':
        csvContent = await generateTransactionsReport(supabase, schoolId, startDate, endDate)
        break
      case 'members':
        csvContent = await generateMembersReport(supabase, schoolId, startDate, endDate)
        break
      case 'books':
        csvContent = await generateBooksReport(supabase, schoolId, startDate, endDate)
        break
      case 'fines':
        csvContent = await generateFinesReport(supabase, schoolId, startDate, endDate)
        break
      default:
        csvContent = await generateOverviewReport(supabase, schoolId, startDate, endDate)
    }

    return new NextResponse(csvContent, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="${filename}"`
      }
    })

  } catch (error) {
    console.error('Error exporting library report:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

async function generateOverviewReport(supabase: any, schoolId: string, startDate: Date, endDate: Date): Promise<string> {
  // Get overview statistics
  const { count: totalBooks } = await supabase
    .from('books')
    .select('*', { count: 'exact', head: true })
    .eq('school_id', schoolId)
    .eq('status', 'active')

  const { count: totalMembers } = await supabase
    .from('library_members')
    .select('*', { count: 'exact', head: true })
    .eq('school_id', schoolId)
    .eq('status', 'active')

  const { count: activeLoans } = await supabase
    .from('borrowing_transactions')
    .select('*', { count: 'exact', head: true })
    .eq('school_id', schoolId)
    .eq('status', 'active')

  const { count: overdueBooks } = await supabase
    .from('borrowing_transactions')
    .select('*', { count: 'exact', head: true })
    .eq('school_id', schoolId)
    .eq('status', 'active')
    .lt('due_date', new Date().toISOString().split('T')[0])

  const { count: transactionsInPeriod } = await supabase
    .from('borrowing_transactions')
    .select('*', { count: 'exact', head: true })
    .eq('school_id', schoolId)
    .gte('checkout_date', startDate.toISOString())
    .lte('checkout_date', endDate.toISOString())

  let csv = 'Metric,Value\n'
  csv += `Total Books,${totalBooks || 0}\n`
  csv += `Total Members,${totalMembers || 0}\n`
  csv += `Active Loans,${activeLoans || 0}\n`
  csv += `Overdue Books,${overdueBooks || 0}\n`
  csv += `Transactions in Period,${transactionsInPeriod || 0}\n`
  csv += `Report Period,${startDate.toLocaleDateString()} - ${endDate.toLocaleDateString()}\n`
  csv += `Generated On,${new Date().toLocaleString()}\n`

  return csv
}

async function generateTransactionsReport(supabase: any, schoolId: string, startDate: Date, endDate: Date): Promise<string> {
  const { data: transactions } = await supabase
    .from('borrowing_transactions')
    .select(`
      id,
      transaction_type,
      checkout_date,
      due_date,
      return_date,
      status,
      library_members!inner(
        member_id,
        profiles!inner(name)
      ),
      book_copies!inner(
        barcode,
        books!inner(title, authors)
      )
    `)
    .eq('school_id', schoolId)
    .gte('checkout_date', startDate.toISOString())
    .lte('checkout_date', endDate.toISOString())
    .order('checkout_date', { ascending: false })

  let csv = 'Transaction ID,Member ID,Member Name,Book Title,Authors,Barcode,Checkout Date,Due Date,Return Date,Status\n'
  
  transactions?.forEach(transaction => {
    const memberName = transaction.library_members?.profiles?.name || 'Unknown'
    const memberId = transaction.library_members?.member_id || 'Unknown'
    const bookTitle = transaction.book_copies?.books?.title || 'Unknown'
    const authors = transaction.book_copies?.books?.authors?.join(', ') || 'Unknown'
    const barcode = transaction.book_copies?.barcode || 'Unknown'
    
    csv += `"${transaction.id}","${memberId}","${memberName}","${bookTitle}","${authors}","${barcode}","${transaction.checkout_date}","${transaction.due_date}","${transaction.return_date || 'Not Returned'}","${transaction.status}"\n`
  })

  return csv
}

async function generateMembersReport(supabase: any, schoolId: string, startDate: Date, endDate: Date): Promise<string> {
  const { data: members } = await supabase
    .from('library_members')
    .select(`
      member_id,
      member_type,
      status,
      membership_start_date,
      membership_end_date,
      max_books_allowed,
      profiles!inner(name, email)
    `)
    .eq('school_id', schoolId)
    .order('created_at', { ascending: false })

  let csv = 'Member ID,Name,Email,Member Type,Status,Start Date,End Date,Max Books Allowed\n'
  
  members?.forEach(member => {
    const name = member.profiles?.name || 'Unknown'
    const email = member.profiles?.email || 'Unknown'
    
    csv += `"${member.member_id}","${name}","${email}","${member.member_type}","${member.status}","${member.membership_start_date}","${member.membership_end_date || 'No End Date'}","${member.max_books_allowed}"\n`
  })

  return csv
}

async function generateBooksReport(supabase: any, schoolId: string, startDate: Date, endDate: Date): Promise<string> {
  const { data: books } = await supabase
    .from('books')
    .select(`
      id,
      isbn,
      title,
      authors,
      publisher,
      publication_year,
      total_copies,
      available_copies,
      status,
      library_categories(name)
    `)
    .eq('school_id', schoolId)
    .order('created_at', { ascending: false })

  let csv = 'Book ID,ISBN,Title,Authors,Publisher,Publication Year,Category,Total Copies,Available Copies,Status\n'
  
  books?.forEach(book => {
    const authors = book.authors?.join(', ') || 'Unknown'
    const category = book.library_categories?.name || 'Uncategorized'
    
    csv += `"${book.id}","${book.isbn || ''}","${book.title}","${authors}","${book.publisher || ''}","${book.publication_year || ''}","${category}","${book.total_copies}","${book.available_copies}","${book.status}"\n`
  })

  return csv
}

async function generateFinesReport(supabase: any, schoolId: string, startDate: Date, endDate: Date): Promise<string> {
  const { data: fines } = await supabase
    .from('fines')
    .select(`
      id,
      amount,
      amount_paid,
      status,
      fine_type,
      created_at,
      payment_date,
      library_members!inner(
        member_id,
        profiles!inner(name)
      )
    `)
    .eq('school_id', schoolId)
    .gte('created_at', startDate.toISOString())
    .lte('created_at', endDate.toISOString())
    .order('created_at', { ascending: false })

  let csv = 'Fine ID,Member ID,Member Name,Fine Type,Amount,Amount Paid,Status,Created Date,Payment Date\n'
  
  fines?.forEach(fine => {
    const memberName = fine.library_members?.profiles?.name || 'Unknown'
    const memberId = fine.library_members?.member_id || 'Unknown'
    
    csv += `"${fine.id}","${memberId}","${memberName}","${fine.fine_type}","${fine.amount}","${fine.amount_paid || 0}","${fine.status}","${fine.created_at}","${fine.payment_date || 'Not Paid'}"\n`
  })

  return csv
}
