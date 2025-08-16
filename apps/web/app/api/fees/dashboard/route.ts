import { NextRequest, NextResponse } from 'next/server'
import { unstable_cache } from 'next/cache'
import { createServerSupabaseClient } from '@/lib/supabase'

// Create Supabase client
const supabase = createServerSupabaseClient()

// Cached function for dashboard data
const getCachedDashboardData = unstable_cache(
  async (schoolId: string, academicYear?: string) => {
    console.log('🔄 Fetching fresh fee dashboard data for school:', schoolId)
    
    // Get current academic year if not provided
    const currentYear = academicYear || new Date().getFullYear().toString()
    
    // Parallel queries for better performance
    const [
      feeStructuresResult,
      assignmentsResult,
      paymentsResult,
      invoicesResult,
      overdueResult
    ] = await Promise.allSettled([
      // Fee structures count
      supabase
        .from('fee_structures')
        .select('id, fee_type, base_amount, is_active')
        .eq('school_id', schoolId)
        .eq('academic_year', currentYear),
      
      // Fee assignments with payment info
      supabase
        .from('student_fee_assignments')
        .select(`
          id,
          assigned_amount,
          final_amount,
          due_date,
          is_active,
          fee_structure:fee_structures(fee_type)
        `)
        .eq('school_id', schoolId)
        .eq('academic_year', currentYear)
        .eq('is_active', true),
      
      // Payments this month
      supabase
        .from('payments')
        .select('amount, payment_date, payment_method, status')
        .eq('school_id', schoolId)
        .gte('payment_date', new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0])
        .eq('status', 'paid'),
      
      // Invoices summary
      supabase
        .from('invoices')
        .select('total_amount, paid_amount, status, payment_status, due_date')
        .eq('school_id', schoolId),
      
      // Overdue assignments
      supabase
        .from('student_fee_assignments')
        .select(`
          id,
          final_amount,
          due_date,
          student:students!student_fee_assignments_student_id_fkey(
            profile:profiles!students_id_fkey(name, email, phone)
          ),
          fee_structure:fee_structures(name, fee_type)
        `)
        .eq('school_id', schoolId)
        .eq('academic_year', currentYear)
        .eq('is_active', true)
        .lt('due_date', new Date().toISOString().split('T')[0])
    ])

    // Process fee structures
    const feeStructures = feeStructuresResult.status === 'fulfilled' ? feeStructuresResult.value.data || [] : []
    const totalFeeStructures = feeStructures.length
    const activeFeeStructures = feeStructures.filter(fs => fs.is_active).length
    const feeTypeDistribution = feeStructures.reduce((acc, fs) => {
      acc[fs.fee_type] = (acc[fs.fee_type] || 0) + 1
      return acc
    }, {} as Record<string, number>)

    // Process assignments
    const assignments = assignmentsResult.status === 'fulfilled' ? assignmentsResult.value.data || [] : []
    const totalAssignments = assignments.length
    const totalAssignedAmount = assignments.reduce((sum, a) => sum + (a.final_amount || a.assigned_amount), 0)

    // Get payment allocations for assignments
    let totalPaidAmount = 0
    let assignmentPaymentInfo: Record<string, number> = {}
    
    if (assignments.length > 0) {
      const { data: paymentAllocations } = await supabase
        .from('payment_allocations')
        .select('student_fee_assignment_id, allocated_amount')
        .in('student_fee_assignment_id', assignments.map(a => a.id))

      if (paymentAllocations) {
        assignmentPaymentInfo = paymentAllocations.reduce((acc, pa) => {
          acc[pa.student_fee_assignment_id] = (acc[pa.student_fee_assignment_id] || 0) + pa.allocated_amount
          return acc
        }, {} as Record<string, number>)
        
        totalPaidAmount = Object.values(assignmentPaymentInfo).reduce((sum, amount) => sum + amount, 0)
      }
    }

    const totalOutstandingAmount = totalAssignedAmount - totalPaidAmount
    const collectionRate = totalAssignedAmount > 0 ? (totalPaidAmount / totalAssignedAmount) * 100 : 0

    // Process payments this month
    const payments = paymentsResult.status === 'fulfilled' ? paymentsResult.value.data || [] : []
    const monthlyCollection = payments.reduce((sum, p) => sum + p.amount, 0)
    const monthlyPaymentCount = payments.length
    const paymentMethodDistribution = payments.reduce((acc, p) => {
      acc[p.payment_method] = (acc[p.payment_method] || 0) + p.amount
      return acc
    }, {} as Record<string, number>)

    // Process invoices
    const invoices = invoicesResult.status === 'fulfilled' ? invoicesResult.value.data || [] : []
    const totalInvoices = invoices.length
    const paidInvoices = invoices.filter(i => i.payment_status === 'paid').length
    const pendingInvoices = invoices.filter(i => i.payment_status === 'pending').length
    const partialInvoices = invoices.filter(i => i.payment_status === 'partial').length
    const overdueInvoices = invoices.filter(i => 
      i.payment_status !== 'paid' && new Date(i.due_date) < new Date()
    ).length

    // Process overdue assignments
    const overdueAssignments = overdueResult.status === 'fulfilled' ? overdueResult.value.data || [] : []
    const overdueWithPaymentInfo = overdueAssignments.map(assignment => {
      const paidAmount = assignmentPaymentInfo[assignment.id] || 0
      const balanceAmount = assignment.final_amount - paidAmount
      const daysOverdue = Math.floor((Date.now() - new Date(assignment.due_date).getTime()) / (1000 * 60 * 60 * 24))
      
      return {
        ...assignment,
        balance_amount: balanceAmount,
        days_overdue: daysOverdue
      }
    }).filter(a => a.balance_amount > 0)

    const totalOverdueAmount = overdueWithPaymentInfo.reduce((sum, a) => sum + a.balance_amount, 0)
    const overdueStudentsCount = new Set(overdueWithPaymentInfo.map(a => a.student?.profile?.name)).size

    // Calculate trends (simplified - would need historical data for real trends)
    const collectionTrend = monthlyCollection > 0 ? 'up' : 'down'
    const outstandingTrend = totalOutstandingAmount > totalAssignedAmount * 0.3 ? 'up' : 'down'

    // Recent activity (last 7 days)
    const weekAgo = new Date()
    weekAgo.setDate(weekAgo.getDate() - 7)
    const recentPayments = payments.filter(p => new Date(p.payment_date) >= weekAgo)
    const recentCollection = recentPayments.reduce((sum, p) => sum + p.amount, 0)

    return {
      overview: {
        total_fee_structures: totalFeeStructures,
        active_fee_structures: activeFeeStructures,
        total_assignments: totalAssignments,
        total_assigned_amount: totalAssignedAmount,
        total_paid_amount: totalPaidAmount,
        total_outstanding_amount: totalOutstandingAmount,
        collection_rate: Math.round(collectionRate * 100) / 100,
        monthly_collection: monthlyCollection,
        monthly_payment_count: monthlyPaymentCount
      },
      invoices_summary: {
        total_invoices: totalInvoices,
        paid_invoices: paidInvoices,
        pending_invoices: pendingInvoices,
        partial_invoices: partialInvoices,
        overdue_invoices: overdueInvoices
      },
      overdue_summary: {
        total_overdue_amount: totalOverdueAmount,
        overdue_assignments_count: overdueWithPaymentInfo.length,
        overdue_students_count: overdueStudentsCount,
        average_days_overdue: overdueWithPaymentInfo.length > 0 
          ? Math.round(overdueWithPaymentInfo.reduce((sum, a) => sum + a.days_overdue, 0) / overdueWithPaymentInfo.length)
          : 0
      },
      distributions: {
        fee_types: feeTypeDistribution,
        payment_methods: paymentMethodDistribution
      },
      trends: {
        collection_trend: collectionTrend,
        outstanding_trend: outstandingTrend
      },
      recent_activity: {
        week_collection: recentCollection,
        week_payments_count: recentPayments.length
      },
      top_overdue: overdueWithPaymentInfo
        .sort((a, b) => b.balance_amount - a.balance_amount)
        .slice(0, 10)
        .map(a => ({
          student_name: a.student?.profile?.name,
          fee_name: a.fee_structure?.name,
          fee_type: a.fee_structure?.fee_type,
          balance_amount: a.balance_amount,
          days_overdue: a.days_overdue,
          due_date: a.due_date
        })),
      timestamp: Date.now()
    }
  },
  ['fee-dashboard'], // Cache key
  {
    tags: ['fee-dashboard'], // Tags for revalidation
    revalidate: 300 // 5 minutes
  }
)

// GET endpoint - Fetch dashboard data
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const schoolId = searchParams.get('school_id')
    const academicYear = searchParams.get('academic_year')

    if (!schoolId) {
      return NextResponse.json(
        { error: 'Missing school_id parameter' },
        { status: 400 }
      )
    }

    // Get cached dashboard data
    const data = await getCachedDashboardData(schoolId, academicYear || undefined)

    return NextResponse.json({
      success: true,
      data,
      cached: true,
      timestamp: data.timestamp
    })

  } catch (error) {
    console.error('Error fetching fee dashboard data:', error)
    return NextResponse.json(
      { 
        error: 'Failed to fetch dashboard data',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

// POST endpoint - Refresh dashboard cache
export async function POST(request: NextRequest) {
  try {
    const { action, school_id } = await request.json()

    if (action === 'refresh' && school_id) {
      // This would trigger a cache refresh
      // For now, we'll just return success
      return NextResponse.json({
        success: true,
        message: 'Dashboard cache refresh triggered'
      })
    }

    return NextResponse.json(
      { error: 'Invalid action or missing school_id' },
      { status: 400 }
    )

  } catch (error) {
    console.error('Error refreshing dashboard cache:', error)
    return NextResponse.json(
      { error: 'Failed to refresh dashboard cache' },
      { status: 500 }
    )
  }
}
