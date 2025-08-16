import { NextRequest, NextResponse } from 'next/server'
import { createAdminSupabaseClient } from '@/lib/supabase'
import { revalidateTag } from 'next/cache'

const supabase = createAdminSupabaseClient()

// PATCH endpoint - Update fee assignment
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const assignmentId = params.id
    const updateData = await request.json()

    if (!assignmentId) {
      return NextResponse.json(
        { error: 'Assignment ID is required' },
        { status: 400 }
      )
    }

    // Validate required fields
    if (updateData.total_amount !== undefined && updateData.total_amount <= 0) {
      return NextResponse.json(
        { error: 'Total amount must be greater than 0' },
        { status: 400 }
      )
    }

    // Update the assignment
    const { data: updatedAssignment, error: updateError } = await supabase
      .from('student_fee_assignments')
      .update({
        ...updateData,
        updated_at: new Date().toISOString()
      })
      .eq('id', assignmentId)
      .select()
      .single()

    if (updateError) {
      console.error('Error updating assignment:', updateError)
      return NextResponse.json(
        { error: 'Failed to update assignment', details: updateError.message },
        { status: 500 }
      )
    }

    // Revalidate cache
    revalidateTag('fee-assignments')

    return NextResponse.json({
      success: true,
      data: updatedAssignment,
      message: 'Assignment updated successfully'
    })

  } catch (error) {
    console.error('Error updating assignment:', error)
    return NextResponse.json(
      { 
        error: 'Failed to update assignment',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

// DELETE endpoint - Delete fee assignment
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const assignmentId = params.id

    if (!assignmentId) {
      return NextResponse.json(
        { error: 'Assignment ID is required' },
        { status: 400 }
      )
    }

    // Check if assignment has any payments
    const { data: payments, error: paymentsError } = await supabase
      .from('payment_allocations')
      .select('id')
      .eq('student_fee_assignment_id', assignmentId)
      .limit(1)

    if (paymentsError) {
      console.error('Error checking payments:', paymentsError)
      return NextResponse.json(
        { error: 'Failed to check assignment payments' },
        { status: 500 }
      )
    }

    if (payments && payments.length > 0) {
      return NextResponse.json(
        { error: 'Cannot delete assignment with existing payments' },
        { status: 400 }
      )
    }

    // Delete the assignment
    const { error: deleteError } = await supabase
      .from('student_fee_assignments')
      .delete()
      .eq('id', assignmentId)

    if (deleteError) {
      console.error('Error deleting assignment:', deleteError)
      return NextResponse.json(
        { error: 'Failed to delete assignment', details: deleteError.message },
        { status: 500 }
      )
    }

    // Revalidate cache
    revalidateTag('fee-assignments')

    return NextResponse.json({
      success: true,
      message: 'Assignment deleted successfully'
    })

  } catch (error) {
    console.error('Error deleting assignment:', error)
    return NextResponse.json(
      { 
        error: 'Failed to delete assignment',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}
