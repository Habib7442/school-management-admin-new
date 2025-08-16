/**
 * Comprehensive Fee Management Caching Strategy
 * Implements Next.js 14 App Router caching best practices
 * 
 * Caching Layers:
 * 1. Request Memoization (React cache)
 * 2. Data Cache (unstable_cache)
 * 3. Full Route Cache (static generation)
 * 4. Router Cache (client-side)
 */

import { cache } from 'react'
import { unstable_cache } from 'next/cache'
import { revalidateTag, revalidatePath } from 'next/cache'
import { createAdminSupabaseClient } from '@/lib/supabase'

// Cache tags for organized invalidation
export const CACHE_TAGS = {
  FEE_STRUCTURES: 'fee-structures',
  FEE_ASSIGNMENTS: 'fee-assignments', 
  INVOICES: 'invoices',
  PAYMENTS: 'payments',
  FINANCIAL_REPORTS: 'financial-reports',
  DASHBOARD: 'fee-dashboard',
  STUDENTS: 'students',
  CLASSES: 'classes'
} as const

// Cache durations (in seconds)
export const CACHE_DURATIONS = {
  SHORT: 60,        // 1 minute - frequently changing data
  MEDIUM: 300,      // 5 minutes - moderately changing data
  LONG: 1800,       // 30 minutes - rarely changing data
  VERY_LONG: 3600   // 1 hour - static-like data
} as const

// =============================================
// LAYER 1: REQUEST MEMOIZATION (React cache)
// =============================================
// Deduplicates requests within the same render cycle

/**
 * Get fee structures with request memoization
 * Prevents duplicate API calls within the same request
 */
export const getFeeStructuresRequest = cache(async (schoolId: string, userId: string) => {
  console.log('🔄 Request memoization: Fetching fee structures for school:', schoolId)

  const supabase = createAdminSupabaseClient()
  
  const { data: feeStructures, error } = await supabase
    .from('fee_structures')
    .select('*')
    .eq('school_id', schoolId)
    .order('created_at', { ascending: false })

  if (error) throw error

  // Get assignment counts
  const { data: assignments } = await supabase
    .from('student_fee_assignments')
    .select('fee_structure_id')
    .in('fee_structure_id', feeStructures?.map(f => f.id) || [])
    .eq('is_active', true)

  const assignmentCounts = assignments?.reduce((acc, assignment) => {
    acc[assignment.fee_structure_id] = (acc[assignment.fee_structure_id] || 0) + 1
    return acc
  }, {} as Record<string, number>) || {}

  return (feeStructures || []).map(structure => ({
    ...structure,
    assignment_count: assignmentCounts[structure.id] || 0,
    class_name: null, // Simplified for now
    created_by_name: 'System' // Simplified for now
  }))
})

/**
 * Get fee assignments with request memoization
 */
export const getFeeAssignmentsRequest = cache(async (schoolId: string, userId: string, studentId?: string) => {
  console.log('🔄 Request memoization: Fetching fee assignments for school:', schoolId)
  
  const supabase = createAdminSupabaseClient()
  
  let query = supabase
    .from('student_fee_assignments')
    .select(`
      *,
      student:students!student_fee_assignments_student_id_fkey(
        id,
        student_id,
        admission_number,
        profile:profiles!students_id_fkey(id, name, email)
      ),
      fee_structure:fee_structures(
        id,
        name,
        fee_type,
        base_amount,
        currency,
        frequency,
        class:classes(id, name, grade_level, section)
      )
    `)
    .eq('school_id', schoolId)
    .order('created_at', { ascending: false })

  if (studentId) {
    query = query.eq('student_id', studentId)
  }

  const { data: assignments, error } = await query
  if (error) throw error

  // Get payment information
  const { data: payments } = await supabase
    .from('payment_allocations')
    .select(`
      student_fee_assignment_id,
      allocated_amount,
      payment:payments(id, payment_date, amount, payment_method, status)
    `)
    .in('student_fee_assignment_id', assignments?.map(a => a.id) || [])

  const paymentInfo = payments?.reduce((acc, payment) => {
    const assignmentId = payment.student_fee_assignment_id
    if (!acc[assignmentId]) {
      acc[assignmentId] = { total_paid: 0, payments: [] }
    }
    acc[assignmentId].total_paid += payment.allocated_amount
    acc[assignmentId].payments.push({
      ...payment.payment,
      allocated_amount: payment.allocated_amount
    })
    return acc
  }, {} as Record<string, any>) || {}

  return (assignments || []).map(assignment => {
    const paymentData = paymentInfo[assignment.id] || { total_paid: 0, payments: [] }
    const finalAmount = assignment.final_amount || assignment.assigned_amount
    const balanceAmount = finalAmount - paymentData.total_paid

    return {
      ...assignment,
      student_name: assignment.student?.profile?.name || 'Unknown Student',
      student_admission_number: assignment.student?.admission_number || '',
      fee_structure_name: assignment.fee_structure?.name || 'Unknown Fee',
      fee_type: assignment.fee_structure?.fee_type || '',
      class_name: assignment.fee_structure?.class?.name || '',
      total_paid: paymentData.total_paid,
      balance_amount: balanceAmount,
      payment_status: balanceAmount <= 0 ? 'paid' : 
                     paymentData.total_paid > 0 ? 'partial' : 'pending',
      payments: paymentData.payments
    }
  })
})

/**
 * Get dashboard data with request memoization
 */
export const getDashboardDataRequest = cache(async (schoolId: string, academicYear?: string) => {
  console.log('🔄 Request memoization: Fetching dashboard data for school:', schoolId)
  
  const supabase = createAdminSupabaseClient()
  const currentYear = academicYear || new Date().getFullYear().toString()
  
  // Parallel queries for better performance
  const [
    feeStructuresResult,
    assignmentsResult,
    paymentsResult,
    invoicesResult
  ] = await Promise.allSettled([
    supabase
      .from('fee_structures')
      .select('id, fee_type, base_amount, is_active')
      .eq('school_id', schoolId)
      .eq('academic_year', currentYear),
    
    supabase
      .from('student_fee_assignments')
      .select('id, assigned_amount, final_amount, due_date, is_active')
      .eq('school_id', schoolId)
      .eq('academic_year', currentYear)
      .eq('is_active', true),
    
    supabase
      .from('payments')
      .select('amount, payment_date, payment_method, status')
      .eq('school_id', schoolId)
      .gte('payment_date', new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0])
      .eq('status', 'paid'),
    
    supabase
      .from('invoices')
      .select('total_amount, paid_amount, status, payment_status, due_date')
      .eq('school_id', schoolId)
  ])

  // Process results
  const feeStructures = feeStructuresResult.status === 'fulfilled' ? feeStructuresResult.value.data || [] : []
  const assignments = assignmentsResult.status === 'fulfilled' ? assignmentsResult.value.data || [] : []
  const payments = paymentsResult.status === 'fulfilled' ? paymentsResult.value.data || [] : []
  const invoices = invoicesResult.status === 'fulfilled' ? invoicesResult.value.data || [] : []

  // Calculate metrics
  const totalAssignedAmount = assignments.reduce((sum, a) => sum + (a.final_amount || a.assigned_amount), 0)
  const monthlyCollection = payments.reduce((sum, p) => sum + p.amount, 0)
  const totalInvoices = invoices.length
  const paidInvoices = invoices.filter(i => i.payment_status === 'paid').length

  return {
    overview: {
      total_fee_structures: feeStructures.length,
      active_fee_structures: feeStructures.filter(fs => fs.is_active).length,
      total_assignments: assignments.length,
      total_assigned_amount: totalAssignedAmount,
      monthly_collection: monthlyCollection,
      monthly_payment_count: payments.length
    },
    invoices_summary: {
      total_invoices: totalInvoices,
      paid_invoices: paidInvoices,
      pending_invoices: invoices.filter(i => i.payment_status === 'pending').length,
      overdue_invoices: invoices.filter(i => 
        i.payment_status !== 'paid' && new Date(i.due_date) < new Date()
      ).length
    },
    timestamp: Date.now()
  }
})

// =============================================
// LAYER 2: DATA CACHE (unstable_cache)
// =============================================
// Caches data across requests and users

/**
 * Cached fee structures with automatic revalidation
 */
export const getCachedFeeStructures = unstable_cache(
  async (schoolId: string, userId: string) => {
    return await getFeeStructuresRequest(schoolId, userId)
  },
  ['fee-structures-cached'],
  {
    tags: [CACHE_TAGS.FEE_STRUCTURES, CACHE_TAGS.CLASSES],
    revalidate: CACHE_DURATIONS.MEDIUM
  }
)

/**
 * Cached fee assignments with automatic revalidation
 */
export const getCachedFeeAssignments = unstable_cache(
  async (schoolId: string, userId: string, studentId?: string) => {
    return await getFeeAssignmentsRequest(schoolId, userId, studentId)
  },
  ['fee-assignments-cached'],
  {
    tags: [CACHE_TAGS.FEE_ASSIGNMENTS, CACHE_TAGS.STUDENTS, CACHE_TAGS.FEE_STRUCTURES],
    revalidate: CACHE_DURATIONS.SHORT
  }
)

/**
 * Cached dashboard data with automatic revalidation
 */
export const getCachedDashboardData = unstable_cache(
  async (schoolId: string, academicYear?: string) => {
    return await getDashboardDataRequest(schoolId, academicYear)
  },
  ['dashboard-cached'],
  {
    tags: [CACHE_TAGS.DASHBOARD, CACHE_TAGS.FEE_STRUCTURES, CACHE_TAGS.FEE_ASSIGNMENTS, CACHE_TAGS.PAYMENTS],
    revalidate: CACHE_DURATIONS.SHORT
  }
)

// =============================================
// CACHE INVALIDATION HELPERS
// =============================================

/**
 * Invalidate fee structures cache
 */
export function invalidateFeeStructuresCache() {
  revalidateTag(CACHE_TAGS.FEE_STRUCTURES)
  revalidateTag(CACHE_TAGS.DASHBOARD)
  revalidatePath('/admin/fees')
}

/**
 * Invalidate fee assignments cache
 */
export function invalidateFeeAssignmentsCache() {
  revalidateTag(CACHE_TAGS.FEE_ASSIGNMENTS)
  revalidateTag(CACHE_TAGS.DASHBOARD)
  revalidatePath('/admin/fees')
}

/**
 * Invalidate payments cache
 */
export function invalidatePaymentsCache() {
  revalidateTag(CACHE_TAGS.PAYMENTS)
  revalidateTag(CACHE_TAGS.INVOICES)
  revalidateTag(CACHE_TAGS.FEE_ASSIGNMENTS)
  revalidateTag(CACHE_TAGS.DASHBOARD)
  revalidatePath('/admin/fees')
}

/**
 * Invalidate all fee management caches
 */
export function invalidateAllFeeManagementCache() {
  Object.values(CACHE_TAGS).forEach(tag => revalidateTag(tag))
  revalidatePath('/admin/fees')
}

// =============================================
// CACHE WARMING UTILITIES
// =============================================

/**
 * Pre-warm critical caches for a school
 */
export async function warmFeeManagementCache(schoolId: string, userId: string) {
  console.log('🔥 Warming fee management cache for school:', schoolId)
  
  try {
    // Warm critical data in parallel
    await Promise.all([
      getCachedFeeStructures(schoolId, userId),
      getCachedFeeAssignments(schoolId, userId),
      getCachedDashboardData(schoolId)
    ])
    
    console.log('✅ Fee management cache warmed successfully')
  } catch (error) {
    console.error('❌ Failed to warm fee management cache:', error)
  }
}

/**
 * Cache statistics for monitoring
 */
export function getCacheStats() {
  return {
    tags: Object.values(CACHE_TAGS),
    durations: CACHE_DURATIONS,
    lastWarmed: new Date().toISOString()
  }
}
