import { NextRequest, NextResponse } from 'next/server'
import { createAdminSupabaseClient } from '@/lib/supabase'
import { revalidateTag } from 'next/cache'

// POST endpoint - Send invoice
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params
    const body = await request.json()
    const { school_id, user_id } = body

    if (!school_id || !user_id) {
      return NextResponse.json(
        { error: 'Missing school_id or user_id' },
        { status: 400 }
      )
    }

    const supabase = createAdminSupabaseClient()

    // Check if invoice exists and can be sent
    const { data: invoice, error: checkError } = await supabase
      .from('invoices')
      .select(`
        id,
        status,
        payment_status,
        school_id,
        invoice_number,
        student:students!invoices_student_id_fkey(
          profile:profiles!students_id_fkey(name, email)
        )
      `)
      .eq('id', id)
      .eq('school_id', school_id)
      .single()

    if (checkError || !invoice) {
      return NextResponse.json(
        { error: 'Invoice not found' },
        { status: 404 }
      )
    }

    // Check if invoice can be sent
    if (invoice.status !== 'draft') {
      return NextResponse.json(
        { error: 'Only draft invoices can be sent' },
        { status: 400 }
      )
    }

    // Update invoice status to sent
    const { data: updatedInvoice, error: updateError } = await supabase
      .from('invoices')
      .update({
        status: 'sent',
        sent_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single()

    if (updateError) {
      console.error('Error updating invoice status:', updateError)
      return NextResponse.json(
        { error: 'Failed to send invoice', details: updateError.message },
        { status: 500 }
      )
    }

    // TODO: In a real implementation, you would:
    // 1. Generate PDF invoice
    // 2. Send email to student/parent
    // 3. Log the communication
    // 4. Update notification status

    // For now, we'll just update the status
    console.log(`Invoice ${invoice.invoice_number} sent to ${invoice.student?.profile?.email}`)

    // Revalidate cache
    revalidateTag('invoices')

    return NextResponse.json({
      success: true,
      data: updatedInvoice,
      message: 'Invoice sent successfully'
    })

  } catch (error) {
    console.error('Error sending invoice:', error)
    return NextResponse.json(
      { 
        error: 'Failed to send invoice',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}
