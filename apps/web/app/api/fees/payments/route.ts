import { NextRequest, NextResponse } from 'next/server'
import { unstable_cache } from 'next/cache'
import { revalidateTag } from 'next/cache'
import { createAdminSupabaseClient } from '@/lib/supabase'

// Create Supabase admin client for protected operations
const supabase = createAdminSupabaseClient()

// Types for payments
interface Payment {
  id?: string
  school_id: string
  student_id: string
  invoice_id?: string
  payment_date?: string
  amount: number
  payment_method: string
  reference_number?: string
  bank_name?: string
  branch_name?: string
  gateway_transaction_id?: string
  gateway_name?: string
  gateway_fee?: number
  notes?: string
}

interface PaymentAllocation {
  invoice_id?: string
  student_fee_assignment_id?: string
  allocated_amount: number
  notes?: string
}

// Cached function for fetching payments
const getCachedPayments = unstable_cache(
  async (schoolId: string, userId: string, studentId?: string) => {
    console.log('🔄 Fetching fresh payments from database for school:', schoolId)
    
    let query = supabase
      .from('payments')
      .select(`
        *,
        students(
          id,
          student_id,
          admission_number,
          profiles(id, name, email)
        ),
        recorded_by_profile:profiles!payments_recorded_by_fkey(id, name, email),
        verified_by_profile:profiles!payments_verified_by_fkey(id, name, email)
      `)
      .eq('school_id', schoolId)
      .order('created_at', { ascending: false })

    // Filter by student if provided
    if (studentId) {
      query = query.eq('student_id', studentId)
    }

    const { data: payments, error: paymentError } = await query

    if (paymentError) throw paymentError

    // Transform payments data
    const transformedPayments = (payments || []).map(payment => ({
      ...payment,
      student_name: payment.students?.profiles?.name || 'Unknown Student',
      student_admission_number: payment.students?.admission_number || '',
      student_email: payment.students?.profiles?.email || '',
      recorded_by_name: payment.recorded_by_profile?.name || 'System',
      verified_by_name: payment.verified_by_profile?.name || '',
      is_verified: !!payment.verified_at
    }))

    return {
      payments: transformedPayments,
      timestamp: Date.now()
    }
  },
  ['payments'], // Cache key
  {
    tags: ['payments'], // Tags for revalidation
    revalidate: 300 // 5 minutes
  }
)

// GET endpoint - Fetch payments
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const schoolId = searchParams.get('school_id')
    const userId = searchParams.get('user_id')
    const studentId = searchParams.get('student_id')
    const paymentMethod = searchParams.get('payment_method')
    const status = searchParams.get('status')
    const isVerified = searchParams.get('is_verified')
    const dateFrom = searchParams.get('date_from')
    const dateTo = searchParams.get('date_to')

    if (!schoolId || !userId) {
      return NextResponse.json(
        { error: 'Missing school_id or user_id parameter' },
        { status: 400 }
      )
    }

    // Get cached data
    let data = await getCachedPayments(schoolId, userId, studentId || undefined)

    // Apply filters if provided
    data.payments = data.payments.filter(payment => {
      if (paymentMethod && payment.payment_method !== paymentMethod) return false
      if (status && payment.status !== status) return false
      if (isVerified !== null && payment.is_verified !== (isVerified === 'true')) return false
      if (dateFrom && payment.payment_date < dateFrom) return false
      if (dateTo && payment.payment_date > dateTo) return false
      return true
    })

    return NextResponse.json({
      success: true,
      data,
      cached: true,
      timestamp: data.timestamp
    })

  } catch (error) {
    console.error('Error fetching payments:', error)
    return NextResponse.json(
      { 
        error: 'Failed to fetch payments',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

// POST endpoint - Record new payment
export async function POST(request: NextRequest) {
  try {
    const { payment, allocations }: { payment: Payment, allocations: PaymentAllocation[] } = await request.json()

    // Validate required fields
    if (!payment.school_id || !payment.student_id || !payment.amount ||
        !payment.payment_method || payment.amount <= 0) {
      return NextResponse.json(
        { error: 'Missing required fields or invalid amount' },
        { status: 400 }
      )
    }

    // Validate allocations if provided
    if (allocations && allocations.length > 0) {
      const totalAllocated = allocations.reduce((sum, alloc) => sum + alloc.allocated_amount, 0)
      if (totalAllocated > payment.amount) {
        return NextResponse.json(
          { error: 'Total allocated amount exceeds payment amount' },
          { status: 400 }
        )
      }

      for (const allocation of allocations) {
        // student_fee_assignment_id is required for fee assignment payments
        if (!allocation.student_fee_assignment_id || allocation.allocated_amount <= 0) {
          return NextResponse.json(
            { error: 'Invalid allocation: student_fee_assignment_id and positive allocated_amount required' },
            { status: 400 }
          )
        }
      }
    }

    // Since we're using admin client, we'll set received_by to null
    // In a real app, you'd get this from the request headers or JWT token

    // Generate payment number
    const { data: paymentNumber, error: numberError } = await supabase
      .rpc('generate_payment_number', { school_id: payment.school_id })

    if (numberError) {
      console.error('Error generating payment number:', numberError)
      return NextResponse.json(
        { error: 'Failed to generate payment number' },
        { status: 500 }
      )
    }

    // Create payment
    const { data: newPayment, error: createError } = await supabase
      .from('payments')
      .insert({
        ...payment,
        payment_number: paymentNumber,
        payment_date: payment.payment_date || new Date().toISOString().split('T')[0],
        status: 'paid',
        is_verified: false,
        gateway_fee: payment.gateway_fee || 0,
        recorded_by: null
      })
      .select()
      .single()

    if (createError) {
      console.error('Error creating payment:', createError)
      return NextResponse.json(
        { error: 'Failed to create payment', details: createError.message },
        { status: 500 }
      )
    }

    // Create payment allocations if provided
    if (allocations && allocations.length > 0) {
      const allocationsToCreate = allocations.map(allocation => ({
        payment_id: newPayment.id,
        student_fee_assignment_id: allocation.student_fee_assignment_id,
        allocated_amount: allocation.allocated_amount
        // Note: invoice_id and notes columns don't exist in payment_allocations table
      }))

      const { error: allocationsError } = await supabase
        .from('payment_allocations')
        .insert(allocationsToCreate)

      if (allocationsError) {
        console.error('Error creating payment allocations:', allocationsError)
        // Try to clean up the payment
        await supabase.from('payments').delete().eq('id', newPayment.id)
        return NextResponse.json(
          { error: 'Failed to create payment allocations', details: allocationsError.message },
          { status: 500 }
        )
      }

      // Update fee assignment status and balance
      for (const allocation of allocations) {
        if (allocation.student_fee_assignment_id) {
          // Get current assignment details
          const { data: assignment } = await supabase
            .from('student_fee_assignments')
            .select('total_amount, paid_amount, balance_amount')
            .eq('id', allocation.student_fee_assignment_id)
            .single()

          if (assignment) {
            const newPaidAmount = (assignment.paid_amount || 0) + allocation.allocated_amount
            const newBalanceAmount = assignment.total_amount - newPaidAmount
            const newStatus = newBalanceAmount <= 0 ? 'paid' : newBalanceAmount < assignment.total_amount ? 'partial' : 'pending'

            // Update assignment
            await supabase
              .from('student_fee_assignments')
              .update({
                paid_amount: newPaidAmount,
                balance_amount: newBalanceAmount,
                status: newStatus,
                updated_at: new Date().toISOString()
              })
              .eq('id', allocation.student_fee_assignment_id)
          }
        }
      }
    }

    // Create financial transaction record (optional - don't fail if this fails)
    try {
      await supabase
        .from('financial_transactions')
        .insert({
          school_id: payment.school_id,
          student_id: payment.student_id,
          transaction_number: paymentNumber,
          transaction_date: payment.payment_date || new Date().toISOString().split('T')[0],
          transaction_type: 'payment',
          amount: payment.amount,
          balance_before: 0,
          payment_id: newPayment.id,
          invoice_id: payment.invoice_id || null,
          description: `Payment received via ${payment.payment_method}`,
          notes: payment.notes || '',
          processed_by: null
        })
    } catch (transactionError) {
      console.error('Error creating financial transaction:', transactionError)
      // Don't fail the entire operation, just log the error
    }

    // Revalidate cache
    revalidateTag('payments')
    revalidateTag('invoices')
    revalidateTag('fee-assignments')

    return NextResponse.json({
      success: true,
      data: newPayment,
      message: 'Payment recorded successfully'
    })

  } catch (error) {
    console.error('Error recording payment:', error)
    return NextResponse.json(
      { 
        error: 'Failed to record payment',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

// PUT endpoint - Update payment (verify, add notes, etc.)
export async function PUT(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const paymentId = searchParams.get('id')
    const updateData: Partial<Payment> & { is_verified?: boolean } = await request.json()

    if (!paymentId) {
      return NextResponse.json(
        { error: 'Missing payment ID' },
        { status: 400 }
      )
    }

    // Since we're using admin client, we'll set verified_by to null
    // In a real app, you'd get this from the request headers or JWT token

    // Prepare update data
    const updatePayload: any = {
      ...updateData,
      updated_at: new Date().toISOString()
    }

    // If verifying payment, add verification details
    if (updateData.is_verified === true) {
      updatePayload.verified_by = null
      updatePayload.verified_at = new Date().toISOString()
    }

    // Update payment
    const { data: updatedPayment, error: updateError } = await supabase
      .from('payments')
      .update(updatePayload)
      .eq('id', paymentId)
      .select()
      .single()

    if (updateError) {
      console.error('Error updating payment:', updateError)
      return NextResponse.json(
        { error: 'Failed to update payment', details: updateError.message },
        { status: 500 }
      )
    }

    // Revalidate cache
    revalidateTag('payments')

    return NextResponse.json({
      success: true,
      data: updatedPayment,
      message: 'Payment updated successfully'
    })

  } catch (error) {
    console.error('Error updating payment:', error)
    return NextResponse.json(
      { 
        error: 'Failed to update payment',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}
