import { NextRequest, NextResponse } from 'next/server'
import { unstable_cache } from 'next/cache'
import { createAdminSupabaseClient } from '@/lib/supabase'

// Create Supabase admin client for protected operations
const supabase = createAdminSupabaseClient()

// Types for reports
interface ReportFilters {
  school_id: string
  report_type: 'collection' | 'outstanding' | 'refunds' | 'summary'
  period_start: string
  period_end: string
  class_filter?: string[]
  fee_type_filter?: string[]
  payment_status_filter?: string[]
}

// Cached function for generating reports
const getCachedReport = unstable_cache(
  async (filters: ReportFilters) => {
    console.log('🔄 Generating fresh financial report:', filters.report_type)
    
    const { school_id, report_type, period_start, period_end } = filters

    switch (report_type) {
      case 'collection':
        return await generateCollectionReport(school_id, period_start, period_end, filters)
      case 'outstanding':
        return await generateOutstandingReport(school_id, period_start, period_end, filters)
      case 'refunds':
        return await generateRefundsReport(school_id, period_start, period_end, filters)
      case 'summary':
        return await generateSummaryReport(school_id, period_start, period_end, filters)
      default:
        throw new Error('Invalid report type')
    }
  },
  ['financial-reports'], // Cache key
  {
    tags: ['financial-reports'], // Tags for revalidation
    revalidate: 600 // 10 minutes
  }
)

// Collection Report - Payments received in period
async function generateCollectionReport(schoolId: string, periodStart: string, periodEnd: string, filters: ReportFilters) {
  let query = supabase
    .from('payments')
    .select(`
      *,
      students(
        id,
        student_id,
        admission_number,
        profiles(id, name, email),
        classes(id, name, grade_level, section)
      )
    `)
    .eq('school_id', schoolId)
    .gte('payment_date', periodStart)
    .lte('payment_date', periodEnd)
    .eq('status', 'paid')
    .order('payment_date', { ascending: false })

  const { data: payments, error } = await query

  if (error) throw error

  // Apply filters
  let filteredPayments = payments || []
  
  if (filters.class_filter && filters.class_filter.length > 0) {
    filteredPayments = filteredPayments.filter(payment => 
      filters.class_filter!.includes(payment.student?.class_id)
    )
  }

  if (filters.fee_type_filter && filters.fee_type_filter.length > 0) {
    filteredPayments = filteredPayments.filter(payment =>
      payment.payment_allocations?.some(alloc =>
        filters.fee_type_filter!.includes(alloc.student_fee_assignment?.fee_structure?.fee_type)
      )
    )
  }

  // Calculate summary statistics
  const totalAmount = filteredPayments.reduce((sum, payment) => sum + payment.amount, 0)
  const totalPayments = filteredPayments.length
  const paymentsByMethod = filteredPayments.reduce((acc, payment) => {
    acc[payment.payment_method] = (acc[payment.payment_method] || 0) + payment.amount
    return acc
  }, {} as Record<string, number>)

  const paymentsByFeeType = { 'general': totalAmount } // Simplified since we don't have allocation details

  const paymentsByClass = filteredPayments.reduce((acc, payment) => {
    const className = payment.students?.classes?.name || 'Unknown'
    acc[className] = (acc[className] || 0) + payment.amount
    return acc
  }, {} as Record<string, number>)

  return {
    report_type: 'collection',
    period: { start: periodStart, end: periodEnd },
    summary: {
      total_amount: totalAmount,
      total_payments: totalPayments,
      average_payment: totalPayments > 0 ? totalAmount / totalPayments : 0,
      payments_by_method: paymentsByMethod,
      payments_by_fee_type: paymentsByFeeType,
      payments_by_class: paymentsByClass
    },
    details: filteredPayments.map(payment => ({
      payment_date: payment.payment_date,
      student_name: payment.students?.profiles?.name || 'Unknown',
      student_admission_number: payment.students?.admission_number || '',
      class_name: payment.students?.classes?.name || 'Unknown',
      amount: payment.amount,
      payment_method: payment.payment_method,
      reference_number: payment.reference_number,
      status: payment.status
    })),
    timestamp: Date.now()
  }
}

// Outstanding Report - Unpaid fees
async function generateOutstandingReport(schoolId: string, periodStart: string, periodEnd: string, filters: ReportFilters) {
  let query = supabase
    .from('student_fee_assignments')
    .select(`
      *,
      students(
        id,
        student_id,
        admission_number,
        profiles(id, name, email),
        classes(id, name, grade_level, section)
      ),
      fee_structure:fee_structures(
        id,
        name,
        fee_type,
        base_amount,
        currency
      )
    `)
    .eq('school_id', schoolId)
    .gte('due_date', periodStart)
    .lte('due_date', periodEnd)
    .eq('is_active', true)

  const { data: assignments, error } = await query

  if (error) throw error

  // Simplified outstanding calculation (assuming no payments for now)
  const outstandingAssignments = (assignments || [])
    .map(assignment => {
      const balanceAmount = assignment.final_amount || assignment.assigned_amount
      const isOverdue = new Date(assignment.due_date) < new Date()

      return {
        ...assignment,
        total_paid: 0, // Simplified
        balance_amount: balanceAmount,
        is_overdue: isOverdue,
        days_overdue: isOverdue ? Math.floor((Date.now() - new Date(assignment.due_date).getTime()) / (1000 * 60 * 60 * 24)) : 0
      }
    })
    .filter(assignment => assignment.balance_amount > 0)

  // Apply filters
  let filteredAssignments = outstandingAssignments

  if (filters.class_filter && filters.class_filter.length > 0) {
    filteredAssignments = filteredAssignments.filter(assignment => 
      filters.class_filter!.includes(assignment.student?.class_id)
    )
  }

  if (filters.fee_type_filter && filters.fee_type_filter.length > 0) {
    filteredAssignments = filteredAssignments.filter(assignment =>
      filters.fee_type_filter!.includes(assignment.fee_structure?.fee_type)
    )
  }

  // Calculate summary statistics
  const totalOutstanding = filteredAssignments.reduce((sum, assignment) => sum + assignment.balance_amount, 0)
  const totalOverdue = filteredAssignments.filter(a => a.is_overdue).reduce((sum, assignment) => sum + assignment.balance_amount, 0)
  const totalStudents = new Set(filteredAssignments.map(a => a.student_id)).size

  const outstandingByFeeType = filteredAssignments.reduce((acc, assignment) => {
    const feeType = assignment.fee_structure?.fee_type || 'unknown'
    acc[feeType] = (acc[feeType] || 0) + assignment.balance_amount
    return acc
  }, {} as Record<string, number>)

  const outstandingByClass = filteredAssignments.reduce((acc, assignment) => {
    const className = assignment.students?.classes?.name || 'Unknown'
    acc[className] = (acc[className] || 0) + assignment.balance_amount
    return acc
  }, {} as Record<string, number>)

  return {
    report_type: 'outstanding',
    period: { start: periodStart, end: periodEnd },
    summary: {
      total_outstanding: totalOutstanding,
      total_overdue: totalOverdue,
      total_students: totalStudents,
      overdue_percentage: totalOutstanding > 0 ? (totalOverdue / totalOutstanding) * 100 : 0,
      outstanding_by_fee_type: outstandingByFeeType,
      outstanding_by_class: outstandingByClass
    },
    details: filteredAssignments.map(assignment => ({
      student_name: assignment.students?.profiles?.name || 'Unknown',
      student_admission_number: assignment.students?.admission_number || '',
      class_name: assignment.students?.classes?.name || 'Unknown',
      fee_name: assignment.fee_structure?.name,
      fee_type: assignment.fee_structure?.fee_type,
      assigned_amount: assignment.assigned_amount,
      final_amount: assignment.final_amount,
      total_paid: assignment.total_paid,
      balance_amount: assignment.balance_amount,
      due_date: assignment.due_date,
      is_overdue: assignment.is_overdue,
      days_overdue: assignment.days_overdue,
      student_phone: assignment.student?.profile?.phone,
      student_email: assignment.student?.profile?.email
    })),
    timestamp: Date.now()
  }
}

// Refunds Report - Refunds processed in period
async function generateRefundsReport(schoolId: string, periodStart: string, periodEnd: string, filters: ReportFilters) {
  // Since refunds table doesn't exist yet, return empty data
  return {
    report_type: 'refunds',
    period: { start: periodStart, end: periodEnd },
    summary: {
      total_refunds: 0,
      total_count: 0,
      average_refund: 0,
      refunds_by_status: {}
    },
    details: [],
    timestamp: Date.now()
  }
}

// Summary Report - Overall financial summary
async function generateSummaryReport(schoolId: string, periodStart: string, periodEnd: string, filters: ReportFilters) {
  // Get all the individual reports
  const [collectionReport, outstandingReport, refundsReport] = await Promise.all([
    generateCollectionReport(schoolId, periodStart, periodEnd, filters),
    generateOutstandingReport(schoolId, periodStart, periodEnd, filters),
    generateRefundsReport(schoolId, periodStart, periodEnd, filters)
  ])

  return {
    report_type: 'summary',
    period: { start: periodStart, end: periodEnd },
    summary: {
      collections: {
        total_amount: collectionReport.summary.total_amount,
        total_payments: collectionReport.summary.total_payments,
        payments_by_method: collectionReport.summary.payments_by_method
      },
      outstanding: {
        total_outstanding: outstandingReport.summary.total_outstanding,
        total_overdue: outstandingReport.summary.total_overdue,
        total_students: outstandingReport.summary.total_students
      },
      refunds: {
        total_refunds: refundsReport.summary.total_refunds,
        total_count: refundsReport.summary.total_count
      },
      net_collection: collectionReport.summary.total_amount - refundsReport.summary.total_refunds
    },
    timestamp: Date.now()
  }
}

// GET endpoint - Generate financial reports
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const schoolId = searchParams.get('school_id')
    const reportType = searchParams.get('report_type') as 'collection' | 'outstanding' | 'refunds' | 'summary'
    const periodStart = searchParams.get('period_start')
    const periodEnd = searchParams.get('period_end')
    const classFilter = searchParams.get('class_filter')?.split(',')
    const feeTypeFilter = searchParams.get('fee_type_filter')?.split(',')
    const paymentStatusFilter = searchParams.get('payment_status_filter')?.split(',')

    if (!schoolId || !reportType || !periodStart || !periodEnd) {
      return NextResponse.json(
        { error: 'Missing required parameters: school_id, report_type, period_start, period_end' },
        { status: 400 }
      )
    }

    const validReportTypes = ['collection', 'outstanding', 'refunds', 'summary']
    if (!validReportTypes.includes(reportType)) {
      return NextResponse.json(
        { error: 'Invalid report type. Must be one of: collection, outstanding, refunds, summary' },
        { status: 400 }
      )
    }

    const filters: ReportFilters = {
      school_id: schoolId,
      report_type: reportType,
      period_start: periodStart,
      period_end: periodEnd,
      class_filter: classFilter,
      fee_type_filter: feeTypeFilter,
      payment_status_filter: paymentStatusFilter
    }

    // Generate report
    const reportData = await getCachedReport(filters)

    return NextResponse.json({
      success: true,
      data: reportData,
      cached: true
    })

  } catch (error) {
    console.error('Error generating financial report:', error)
    return NextResponse.json(
      { 
        error: 'Failed to generate financial report',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}
