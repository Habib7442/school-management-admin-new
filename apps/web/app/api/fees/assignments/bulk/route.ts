import { NextRequest, NextResponse } from 'next/server'
import { revalidateTag } from 'next/cache'
import { createServerSupabaseClient } from '@/lib/supabase'

// Create Supabase client
const supabase = createServerSupabaseClient()

// Types for bulk assignment
interface BulkAssignmentRequest {
  school_id: string
  fee_structure_id: string
  student_ids: string[]
  academic_year: string
  due_date: string
  discount_percentage?: number
  discount_amount?: number
  installments_enabled?: boolean
  total_installments?: number
  notes?: string
}

interface BulkAssignmentResult {
  success_count: number
  error_count: number
  errors: Array<{
    student_id: string
    student_name?: string
    error: string
  }>
  created_assignments: string[]
}

// POST endpoint - Bulk assign fees to students
export async function POST(request: NextRequest) {
  try {
    const bulkData: BulkAssignmentRequest = await request.json()

    // Validate required fields
    if (!bulkData.school_id || !bulkData.fee_structure_id || 
        !bulkData.student_ids || !Array.isArray(bulkData.student_ids) ||
        bulkData.student_ids.length === 0 || !bulkData.academic_year || 
        !bulkData.due_date) {
      return NextResponse.json(
        { error: 'Missing required fields or empty student list' },
        { status: 400 }
      )
    }

    // Validate student_ids array
    if (bulkData.student_ids.length > 1000) {
      return NextResponse.json(
        { error: 'Too many students selected. Maximum 1000 students allowed per bulk operation.' },
        { status: 400 }
      )
    }

    // Get current user for assigned_by field
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    // Get fee structure details
    const { data: feeStructure, error: feeError } = await supabase
      .from('fee_structures')
      .select('id, name, base_amount, school_id')
      .eq('id', bulkData.fee_structure_id)
      .eq('school_id', bulkData.school_id)
      .single()

    if (feeError || !feeStructure) {
      return NextResponse.json(
        { error: 'Fee structure not found or access denied' },
        { status: 404 }
      )
    }

    // Get student details
    const { data: students, error: studentsError } = await supabase
      .from('students')
      .select(`
        id,
        student_id,
        admission_number,
        profile:profiles!students_id_fkey(id, name, email)
      `)
      .in('id', bulkData.student_ids)
      .eq('school_id', bulkData.school_id)
      .eq('is_active', true)

    if (studentsError) {
      console.error('Error fetching students:', studentsError)
      return NextResponse.json(
        { error: 'Failed to fetch student details' },
        { status: 500 }
      )
    }

    if (!students || students.length === 0) {
      return NextResponse.json(
        { error: 'No valid students found' },
        { status: 404 }
      )
    }

    // Check for existing assignments
    const { data: existingAssignments, error: existingError } = await supabase
      .from('student_fee_assignments')
      .select('student_id')
      .in('student_id', bulkData.student_ids)
      .eq('fee_structure_id', bulkData.fee_structure_id)
      .eq('academic_year', bulkData.academic_year)

    if (existingError) {
      console.error('Error checking existing assignments:', existingError)
      return NextResponse.json(
        { error: 'Failed to check existing assignments' },
        { status: 500 }
      )
    }

    const existingStudentIds = new Set(existingAssignments?.map(a => a.student_id) || [])

    // Prepare bulk assignment data
    const result: BulkAssignmentResult = {
      success_count: 0,
      error_count: 0,
      errors: [],
      created_assignments: []
    }

    const assignmentsToCreate = []
    const installmentPlansToCreate = []

    for (const student of students) {
      try {
        // Skip if assignment already exists
        if (existingStudentIds.has(student.id)) {
          result.error_count++
          result.errors.push({
            student_id: student.id,
            student_name: student.profile?.name,
            error: 'Fee assignment already exists for this academic year'
          })
          continue
        }

        // Calculate final amount
        const baseAmount = feeStructure.base_amount
        const discountAmount = bulkData.discount_amount || 0
        const discountPercentage = bulkData.discount_percentage || 0
        const discountFromPercentage = baseAmount * (discountPercentage / 100)
        const finalAmount = baseAmount - discountAmount - discountFromPercentage

        if (finalAmount < 0) {
          result.error_count++
          result.errors.push({
            student_id: student.id,
            student_name: student.profile?.name,
            error: 'Discount amount exceeds base amount'
          })
          continue
        }

        // Prepare assignment data
        const assignmentData = {
          school_id: bulkData.school_id,
          student_id: student.id,
          fee_structure_id: bulkData.fee_structure_id,
          assigned_amount: baseAmount,
          discount_amount: discountAmount,
          discount_percentage: discountPercentage,
          due_date: bulkData.due_date,
          academic_year: bulkData.academic_year,
          installments_enabled: bulkData.installments_enabled || false,
          total_installments: bulkData.total_installments || 1,
          is_active: true,
          notes: bulkData.notes || '',
          assigned_by: user.id
        }

        assignmentsToCreate.push(assignmentData)

      } catch (error) {
        result.error_count++
        result.errors.push({
          student_id: student.id,
          student_name: student.profile?.name,
          error: error instanceof Error ? error.message : 'Unknown error'
        })
      }
    }

    // Bulk insert assignments
    if (assignmentsToCreate.length > 0) {
      const { data: createdAssignments, error: createError } = await supabase
        .from('student_fee_assignments')
        .insert(assignmentsToCreate)
        .select('id, student_id')

      if (createError) {
        console.error('Error creating bulk assignments:', createError)
        return NextResponse.json(
          { error: 'Failed to create fee assignments', details: createError.message },
          { status: 500 }
        )
      }

      result.success_count = createdAssignments?.length || 0
      result.created_assignments = createdAssignments?.map(a => a.id) || []

      // Create installment plans if enabled
      if (bulkData.installments_enabled && bulkData.total_installments && bulkData.total_installments > 1) {
        for (const assignment of createdAssignments || []) {
          const baseAmount = feeStructure.base_amount
          const installmentAmount = baseAmount / bulkData.total_installments

          for (let i = 1; i <= bulkData.total_installments; i++) {
            const dueDate = new Date(bulkData.due_date)
            dueDate.setMonth(dueDate.getMonth() + (i - 1))

            installmentPlansToCreate.push({
              student_fee_assignment_id: assignment.id,
              installment_number: i,
              amount: installmentAmount,
              due_date: dueDate.toISOString().split('T')[0],
              description: `Installment ${i} of ${bulkData.total_installments}`
            })
          }
        }

        if (installmentPlansToCreate.length > 0) {
          const { error: installmentError } = await supabase
            .from('installment_plans')
            .insert(installmentPlansToCreate)

          if (installmentError) {
            console.error('Error creating installment plans:', installmentError)
            // Don't fail the entire operation, just log the error
          }
        }
      }
    }

    // Revalidate cache
    revalidateTag('fee-assignments')

    return NextResponse.json({
      success: true,
      data: result,
      message: `Bulk assignment completed. ${result.success_count} assignments created, ${result.error_count} errors.`
    })

  } catch (error) {
    console.error('Error in bulk fee assignment:', error)
    return NextResponse.json(
      { 
        error: 'Failed to process bulk fee assignment',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

// GET endpoint - Get bulk assignment preview
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const schoolId = searchParams.get('school_id')
    const feeStructureId = searchParams.get('fee_structure_id')
    const classId = searchParams.get('class_id')
    const academicYear = searchParams.get('academic_year')

    if (!schoolId || !feeStructureId || !academicYear) {
      return NextResponse.json(
        { error: 'Missing required parameters' },
        { status: 400 }
      )
    }

    // Get fee structure details
    const { data: feeStructure, error: feeError } = await supabase
      .from('fee_structures')
      .select('id, name, base_amount, fee_type')
      .eq('id', feeStructureId)
      .eq('school_id', schoolId)
      .single()

    if (feeError || !feeStructure) {
      return NextResponse.json(
        { error: 'Fee structure not found' },
        { status: 404 }
      )
    }

    // Get eligible students
    let studentsQuery = supabase
      .from('students')
      .select(`
        id,
        student_id,
        admission_number,
        class_id,
        profile:profiles!students_id_fkey(id, name, email),
        class:classes(id, name, grade_level, section)
      `)
      .eq('school_id', schoolId)
      .eq('is_active', true)

    if (classId) {
      studentsQuery = studentsQuery.eq('class_id', classId)
    }

    const { data: students, error: studentsError } = await studentsQuery

    if (studentsError) {
      console.error('Error fetching students:', studentsError)
      return NextResponse.json(
        { error: 'Failed to fetch students' },
        { status: 500 }
      )
    }

    // Check existing assignments
    const { data: existingAssignments, error: existingError } = await supabase
      .from('student_fee_assignments')
      .select('student_id')
      .in('student_id', students?.map(s => s.id) || [])
      .eq('fee_structure_id', feeStructureId)
      .eq('academic_year', academicYear)

    if (existingError) {
      console.error('Error checking existing assignments:', existingError)
      return NextResponse.json(
        { error: 'Failed to check existing assignments' },
        { status: 500 }
      )
    }

    const existingStudentIds = new Set(existingAssignments?.map(a => a.student_id) || [])

    // Filter out students with existing assignments
    const eligibleStudents = (students || []).filter(student => !existingStudentIds.has(student.id))

    return NextResponse.json({
      success: true,
      data: {
        fee_structure: feeStructure,
        eligible_students: eligibleStudents,
        total_eligible: eligibleStudents.length,
        already_assigned: existingStudentIds.size
      }
    })

  } catch (error) {
    console.error('Error getting bulk assignment preview:', error)
    return NextResponse.json(
      { 
        error: 'Failed to get bulk assignment preview',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}
