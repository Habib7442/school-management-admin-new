import { NextRequest, NextResponse } from 'next/server'
import { createAdminSupabaseClient } from '@/lib/supabase'
import { revalidateTag } from 'next/cache'

// GET endpoint - Fetch single invoice
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params
    const { searchParams } = new URL(request.url)
    const schoolId = searchParams.get('school_id')
    const userId = searchParams.get('user_id')

    if (!schoolId || !userId) {
      return NextResponse.json(
        { error: 'Missing school_id or user_id parameter' },
        { status: 400 }
      )
    }

    const supabase = createAdminSupabaseClient()

    // Fetch invoice with related data
    const { data: invoice, error } = await supabase
      .from('invoices')
      .select(`
        *,
        student:students!invoices_student_id_fkey(
          id,
          student_id,
          admission_number,
          profile:profiles!students_id_fkey(id, name, email, phone)
        ),
        line_items:invoice_line_items(
          id,
          description,
          quantity,
          unit_price,
          discount_amount,
          discount_percentage
        ),
        created_by_profile:profiles!invoices_created_by_fkey(id, name, email)
      `)
      .eq('id', id)
      .eq('school_id', schoolId)
      .single()

    if (error || !invoice) {
      return NextResponse.json(
        { error: 'Invoice not found' },
        { status: 404 }
      )
    }

    // Get payment information
    const { data: payments } = await supabase
      .from('payment_allocations')
      .select(`
        allocated_amount,
        payment:payments(
          id,
          payment_date,
          amount,
          payment_method,
          status,
          reference_number
        )
      `)
      .eq('invoice_id', id)

    const totalPaid = payments?.reduce((sum, p) => sum + p.allocated_amount, 0) || 0
    const balanceAmount = (invoice.total_amount || 0) - totalPaid

    const transformedInvoice = {
      ...invoice,
      student_name: invoice.student?.profile?.name || 'Unknown Student',
      student_admission_number: invoice.student?.admission_number || '',
      student_email: invoice.student?.profile?.email || '',
      student_phone: invoice.student?.profile?.phone || '',
      generated_by_name: invoice.created_by_profile?.name || 'System',
      total_paid: totalPaid,
      balance_amount: balanceAmount,
      payment_status: balanceAmount <= 0 ? 'paid' : 
                     totalPaid > 0 ? 'partial' : 'pending',
      payments: payments?.map(p => ({ ...p.payment, allocated_amount: p.allocated_amount })) || [],
      is_overdue: new Date(invoice.due_date) < new Date() && balanceAmount > 0
    }

    return NextResponse.json({
      success: true,
      data: transformedInvoice
    })

  } catch (error) {
    console.error('Error fetching invoice:', error)
    return NextResponse.json(
      { 
        error: 'Failed to fetch invoice',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

// PUT endpoint - Update invoice
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params
    const updateData = await request.json()
    const supabase = createAdminSupabaseClient()

    // Check if invoice exists and is editable
    const { data: existingInvoice, error: checkError } = await supabase
      .from('invoices')
      .select('id, status, payment_status, school_id')
      .eq('id', id)
      .single()

    if (checkError || !existingInvoice) {
      return NextResponse.json(
        { error: 'Invoice not found' },
        { status: 404 }
      )
    }

    // Prevent editing paid invoices
    if (existingInvoice.payment_status === 'paid') {
      return NextResponse.json(
        { error: 'Cannot edit paid invoices' },
        { status: 400 }
      )
    }

    // Update invoice
    const { data: updatedInvoice, error: updateError } = await supabase
      .from('invoices')
      .update({
        ...updateData,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single()

    if (updateError) {
      console.error('Error updating invoice:', updateError)
      return NextResponse.json(
        { error: 'Failed to update invoice', details: updateError.message },
        { status: 500 }
      )
    }

    // Revalidate cache
    revalidateTag('invoices')

    return NextResponse.json({
      success: true,
      data: updatedInvoice,
      message: 'Invoice updated successfully'
    })

  } catch (error) {
    console.error('Error updating invoice:', error)
    return NextResponse.json(
      { 
        error: 'Failed to update invoice',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

// DELETE endpoint - Delete invoice
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params
    const { searchParams } = new URL(request.url)
    const schoolId = searchParams.get('school_id')
    const userId = searchParams.get('user_id')

    if (!schoolId || !userId) {
      return NextResponse.json(
        { error: 'Missing school_id or user_id parameter' },
        { status: 400 }
      )
    }

    const supabase = createAdminSupabaseClient()

    // Check if invoice exists and can be deleted
    const { data: existingInvoice, error: checkError } = await supabase
      .from('invoices')
      .select('id, status, payment_status, school_id')
      .eq('id', id)
      .eq('school_id', schoolId)
      .single()

    if (checkError || !existingInvoice) {
      return NextResponse.json(
        { error: 'Invoice not found' },
        { status: 404 }
      )
    }

    // Prevent deleting paid invoices
    if (existingInvoice.payment_status === 'paid') {
      return NextResponse.json(
        { error: 'Cannot delete paid invoices' },
        { status: 400 }
      )
    }

    // Delete invoice (line items will be deleted by cascade)
    const { error: deleteError } = await supabase
      .from('invoices')
      .delete()
      .eq('id', id)

    if (deleteError) {
      console.error('Error deleting invoice:', deleteError)
      return NextResponse.json(
        { error: 'Failed to delete invoice', details: deleteError.message },
        { status: 500 }
      )
    }

    // Revalidate cache
    revalidateTag('invoices')

    return NextResponse.json({
      success: true,
      message: 'Invoice deleted successfully'
    })

  } catch (error) {
    console.error('Error deleting invoice:', error)
    return NextResponse.json(
      { 
        error: 'Failed to delete invoice',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}
