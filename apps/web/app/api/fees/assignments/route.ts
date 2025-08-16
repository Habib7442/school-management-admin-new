import { NextRequest, NextResponse } from 'next/server'
import { unstable_cache } from 'next/cache'
import { revalidateTag } from 'next/cache'
import { createAdminSupabaseClient } from '@/lib/supabase'

// Create Supabase admin client for protected operations
const supabase = createAdminSupabaseClient()

// Types for fee assignments
interface FeeAssignment {
  id?: string
  school_id: string
  student_id: string
  fee_structure_id: string
  assigned_amount: number
  discount_amount?: number
  discount_percentage?: number
  due_date: string
  academic_year: string
  installments_enabled?: boolean
  total_installments?: number
  is_active?: boolean
  waiver_applied?: boolean
  waiver_amount?: number
  waiver_reason?: string
  notes?: string
}

// Cached function for fetching fee assignments
const getCachedFeeAssignments = unstable_cache(
  async (schoolId: string, userId: string, studentId?: string) => {
    console.log('🔄 Fetching fresh fee assignments from database for school:', schoolId)
    
    let query = supabase
      .from('student_fee_assignments')
      .select(`
        *,
        students(
          id,
          student_id,
          admission_number,
          profiles(id, name, email)
        ),
        fee_structures(
          id,
          name,
          fee_type,
          base_amount,
          currency,
          frequency,
          classes(id, name, grade_level, section)
        )
      `)
      .eq('school_id', schoolId)
      .order('assigned_at', { ascending: false })

    // Filter by student if provided
    if (studentId) {
      query = query.eq('student_id', studentId)
    }

    const { data: assignments, error: assignmentError } = await query

    if (assignmentError) throw assignmentError

    // Get payment information for each assignment
    let paymentInfo: Record<string, any> = {}
    if (assignments && assignments.length > 0) {
      try {
        const { data: payments } = await supabase
          .from('payment_allocations')
          .select(`
            student_fee_assignment_id,
            allocated_amount,
            payment:payments(
              id,
              payment_date,
              amount,
              payment_method,
              status
            )
          `)
          .in('student_fee_assignment_id', assignments.map(a => a.id))

        if (payments) {
          paymentInfo = payments.reduce((acc, payment) => {
            const assignmentId = payment.student_fee_assignment_id
            if (!acc[assignmentId]) {
              acc[assignmentId] = {
                total_paid: 0,
                payments: []
              }
            }
            acc[assignmentId].total_paid += payment.allocated_amount
            acc[assignmentId].payments.push({
              ...payment.payment,
              allocated_amount: payment.allocated_amount
            })
            return acc
          }, {} as Record<string, any>)
        }
      } catch (paymentError) {
        console.warn('Could not fetch payment information:', paymentError)
      }
    }

    // Transform assignments data
    const transformedAssignments = (assignments || []).map(assignment => {
      const paymentData = paymentInfo[assignment.id] || { total_paid: 0, payments: [] }
      const finalAmount = assignment.final_amount || assignment.assigned_amount
      const balanceAmount = finalAmount - paymentData.total_paid

      return {
        ...assignment,
        student_name: assignment.students?.profiles?.name || 'Unknown Student',
        student_admission_number: assignment.students?.admission_number || '',
        fee_structure_name: assignment.fee_structures?.name || 'Unknown Fee',
        fee_type: assignment.fee_structures?.fee_type || '',
        class_name: assignment.fee_structures?.classes?.name || '',
        total_paid: paymentData.total_paid,
        balance_amount: balanceAmount,
        payment_status: balanceAmount <= 0 ? 'paid' :
                       paymentData.total_paid > 0 ? 'partial' : 'pending',
        payments: paymentData.payments
      }
    })

    return {
      assignments: transformedAssignments,
      timestamp: Date.now()
    }
  },
  ['fee-assignments'], // Cache key
  {
    tags: ['fee-assignments'], // Tags for revalidation
    revalidate: 300 // 5 minutes
  }
)

// GET endpoint - Fetch fee assignments
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const schoolId = searchParams.get('school_id')
    const userId = searchParams.get('user_id')
    const studentId = searchParams.get('student_id')
    const academicYear = searchParams.get('academic_year')
    const paymentStatus = searchParams.get('payment_status')
    const isActive = searchParams.get('is_active')

    if (!schoolId || !userId) {
      return NextResponse.json(
        { error: 'Missing school_id or user_id parameter' },
        { status: 400 }
      )
    }

    // Get cached data
    let data = await getCachedFeeAssignments(schoolId, userId, studentId || undefined)

    // Apply filters if provided
    if (academicYear || paymentStatus || isActive !== null) {
      data.assignments = data.assignments.filter(assignment => {
        if (academicYear && assignment.academic_year !== academicYear) return false
        if (paymentStatus && assignment.payment_status !== paymentStatus) return false
        if (isActive !== null && assignment.is_active !== (isActive === 'true')) return false
        return true
      })
    }

    return NextResponse.json({
      success: true,
      data,
      cached: true,
      timestamp: data.timestamp
    })

  } catch (error) {
    console.error('Error fetching fee assignments:', error)
    return NextResponse.json(
      { 
        error: 'Failed to fetch fee assignments',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

// POST endpoint - Create new fee assignment
export async function POST(request: NextRequest) {
  try {
    const assignmentData: FeeAssignment = await request.json()

    // Validate required fields
    if (!assignmentData.school_id || !assignmentData.student_id || 
        !assignmentData.fee_structure_id || !assignmentData.assigned_amount || 
        !assignmentData.due_date || !assignmentData.academic_year) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    // Validate amount is positive
    if (assignmentData.assigned_amount <= 0) {
      return NextResponse.json(
        { error: 'Assigned amount must be positive' },
        { status: 400 }
      )
    }

    // Check if assignment already exists
    const { data: existingAssignment, error: checkError } = await supabase
      .from('student_fee_assignments')
      .select('id')
      .eq('student_id', assignmentData.student_id)
      .eq('fee_structure_id', assignmentData.fee_structure_id)
      .eq('academic_year', assignmentData.academic_year)
      .limit(1)

    if (checkError) {
      console.error('Error checking existing assignment:', checkError)
      return NextResponse.json(
        { error: 'Failed to check existing assignments' },
        { status: 500 }
      )
    }

    if (existingAssignment && existingAssignment.length > 0) {
      return NextResponse.json(
        { error: 'Fee assignment already exists for this student and fee structure' },
        { status: 400 }
      )
    }

    // Since we're using admin client, we'll set assigned_by to null
    // In a real app, you'd get this from the request headers or JWT token

    // Create fee assignment - only include fields that exist in the database
    // Note: final_amount is a generated column and will be calculated automatically
    const insertData = {
      school_id: assignmentData.school_id,
      student_id: assignmentData.student_id,
      fee_structure_id: assignmentData.fee_structure_id,
      assigned_amount: assignmentData.assigned_amount,
      discount_percentage: assignmentData.discount_percentage || 0,
      discount_amount: assignmentData.discount_amount || 0,
      due_date: assignmentData.due_date,
      academic_year: assignmentData.academic_year,
      installments_enabled: assignmentData.installments_enabled || false,
      total_installments: assignmentData.total_installments || 1,
      is_active: assignmentData.is_active !== false,
      notes: assignmentData.notes || null,
      assigned_by: null
    }

    const { data: newAssignment, error: createError } = await supabase
      .from('student_fee_assignments')
      .insert(insertData)
      .select()
      .single()

    if (createError) {
      console.error('Error creating fee assignment:', createError)
      return NextResponse.json(
        { error: 'Failed to create fee assignment', details: createError.message },
        { status: 500 }
      )
    }

    // Create installment plans if enabled
    if (assignmentData.installments_enabled && assignmentData.total_installments && assignmentData.total_installments > 1) {
      const installmentAmount = assignmentData.assigned_amount / assignmentData.total_installments
      const installmentPlans = []

      for (let i = 1; i <= assignmentData.total_installments; i++) {
        const dueDate = new Date(assignmentData.due_date)
        dueDate.setMonth(dueDate.getMonth() + (i - 1))

        installmentPlans.push({
          student_fee_assignment_id: newAssignment.id,
          installment_number: i,
          amount: installmentAmount,
          due_date: dueDate.toISOString().split('T')[0],
          description: `Installment ${i} of ${assignmentData.total_installments}`
        })
      }

      const { error: installmentError } = await supabase
        .from('installment_plans')
        .insert(installmentPlans)

      if (installmentError) {
        console.error('Error creating installment plans:', installmentError)
        // Don't fail the entire operation, just log the error
      }
    }

    // Revalidate cache
    revalidateTag('fee-assignments')

    return NextResponse.json({
      success: true,
      data: newAssignment,
      message: 'Fee assignment created successfully'
    })

  } catch (error) {
    console.error('Error creating fee assignment:', error)
    return NextResponse.json(
      { 
        error: 'Failed to create fee assignment',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}
