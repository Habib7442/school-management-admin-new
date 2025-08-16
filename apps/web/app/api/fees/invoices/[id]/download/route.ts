import { NextRequest, NextResponse } from 'next/server'
import { createAdminSupabaseClient } from '@/lib/supabase'

// GET endpoint - Download invoice as PDF
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

    // Fetch invoice with all related data
    const { data: invoice, error } = await supabase
      .from('invoices')
      .select(`
        *,
        student:students!invoices_student_id_fkey(
          id,
          student_id,
          admission_number,
          profile:profiles!students_id_fkey(id, name, email, phone, address)
        ),
        line_items:invoice_line_items(
          id,
          description,
          quantity,
          unit_price,
          discount_amount,
          discount_percentage
        ),
        school:schools(
          id,
          name,
          address,
          contact_email,
          contact_phone,
          logo_url
        )
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

    // For now, return the invoice data as JSON
    // In a real implementation, you would:
    // 1. Generate a PDF using a library like puppeteer or jsPDF
    // 2. Return the PDF as a blob with proper headers
    // 3. Include school branding and formatting

    // Calculate totals
    const lineItemsTotal = invoice.line_items?.reduce((sum: number, item: any) => {
      const quantity = item.quantity || 1
      const itemTotal = quantity * item.unit_price
      const discountAmount = item.discount_amount || 0
      const discountPercentage = item.discount_percentage || 0
      const discountFromPercentage = itemTotal * (discountPercentage / 100)
      return sum + (itemTotal - discountAmount - discountFromPercentage)
    }, 0) || 0

    const subtotal = lineItemsTotal
    const discountAmount = invoice.discount_amount || 0
    const taxAmount = invoice.tax_amount || 0
    const lateFeeAmount = invoice.late_fee_amount || 0
    const totalAmount = subtotal - discountAmount + taxAmount + lateFeeAmount

    const invoiceData = {
      ...invoice,
      student_name: invoice.student?.profile?.name || 'Unknown Student',
      student_admission_number: invoice.student?.admission_number || '',
      student_email: invoice.student?.profile?.email || '',
      student_phone: invoice.student?.profile?.phone || '',
      student_address: invoice.student?.profile?.address || '',
      school_name: invoice.school?.name || 'School',
      school_address: invoice.school?.address || '',
      school_email: invoice.school?.contact_email || '',
      school_phone: invoice.school?.contact_phone || '',
      school_logo: invoice.school?.logo_url || '',
      calculated_subtotal: subtotal,
      calculated_total: totalAmount
    }

    // For now, return JSON data that can be used to generate PDF on frontend
    // In production, this should return actual PDF bytes
    return NextResponse.json({
      success: true,
      data: invoiceData,
      message: 'Invoice data ready for download'
    })

  } catch (error) {
    console.error('Error preparing invoice download:', error)
    return NextResponse.json(
      { 
        error: 'Failed to prepare invoice download',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}
