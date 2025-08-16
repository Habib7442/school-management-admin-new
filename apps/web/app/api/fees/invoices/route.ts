import { NextRequest, NextResponse } from 'next/server'
import { unstable_cache } from 'next/cache'
import { revalidateTag } from 'next/cache'
import { createAdminSupabaseClient } from '@/lib/supabase'

// Create Supabase admin client for protected operations
const supabase = createAdminSupabaseClient()

// Types for invoices
interface Invoice {
  id?: string
  school_id: string
  student_id: string
  invoice_date?: string
  due_date: string
  subtotal: number
  discount_amount?: number
  late_fee_amount?: number
  tax_amount?: number
  notes?: string
  terms_and_conditions?: string
}

interface InvoiceLineItem {
  fee_structure_id?: string
  description: string
  quantity?: number
  unit_price: number
  discount_amount?: number
  discount_percentage?: number
}

// Cached function for fetching invoices
const getCachedInvoices = unstable_cache(
  async (schoolId: string, userId: string, studentId?: string) => {
    console.log('🔄 Fetching fresh invoices from database for school:', schoolId)
    
    let query = supabase
      .from('invoices')
      .select(`
        *,
        student:students!invoices_student_id_fkey(
          id,
          student_id,
          admission_number,
          profile:profiles!students_id_fkey(id, name, email, phone)
        ),
        created_by_profile:profiles!invoices_created_by_fkey(id, name, email)
      `)
      .eq('school_id', schoolId)
      .order('created_at', { ascending: false })

    // Filter by student if provided
    if (studentId) {
      query = query.eq('student_id', studentId)
    }

    const { data: invoices, error: invoiceError } = await query

    if (invoiceError) throw invoiceError

    // Get payment information for each invoice
    let paymentInfo: Record<string, any> = {}
    if (invoices && invoices.length > 0) {
      try {
        const { data: payments } = await supabase
          .from('payment_allocations')
          .select(`
            invoice_id,
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
          .in('invoice_id', invoices.map(i => i.id))

        if (payments) {
          paymentInfo = payments.reduce((acc, payment) => {
            const invoiceId = payment.invoice_id
            if (!acc[invoiceId]) {
              acc[invoiceId] = {
                total_paid: 0,
                payments: []
              }
            }
            acc[invoiceId].total_paid += payment.allocated_amount
            acc[invoiceId].payments.push({
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

    // Transform invoices data
    const transformedInvoices = (invoices || []).map(invoice => {
      const paymentData = paymentInfo[invoice.id] || { total_paid: 0, payments: [] }
      const totalAmount = invoice.total_amount || 0
      const balanceAmount = totalAmount - paymentData.total_paid

      return {
        ...invoice,
        student_name: invoice.student?.profile?.name || 'Unknown Student',
        student_admission_number: invoice.student?.admission_number || '',
        student_email: invoice.student?.profile?.email || '',
        student_phone: invoice.student?.profile?.phone || '',
        generated_by_name: invoice.generated_by_profile?.name || 'System',
        total_paid: paymentData.total_paid,
        balance_amount: balanceAmount,
        payment_status: balanceAmount <= 0 ? 'paid' : 
                       paymentData.total_paid > 0 ? 'partial' : 'pending',
        payments: paymentData.payments,
        is_overdue: new Date(invoice.due_date) < new Date() && balanceAmount > 0
      }
    })

    return {
      invoices: transformedInvoices,
      timestamp: Date.now()
    }
  },
  ['invoices'], // Cache key
  {
    tags: ['invoices'], // Tags for revalidation
    revalidate: 300 // 5 minutes
  }
)

// GET endpoint - Fetch invoices
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const schoolId = searchParams.get('school_id')
    const userId = searchParams.get('user_id')
    const studentId = searchParams.get('student_id')
    const status = searchParams.get('status')
    const paymentStatus = searchParams.get('payment_status')
    const isOverdue = searchParams.get('is_overdue')

    if (!schoolId || !userId) {
      return NextResponse.json(
        { error: 'Missing school_id or user_id parameter' },
        { status: 400 }
      )
    }

    // Get cached data
    let data = await getCachedInvoices(schoolId, userId, studentId || undefined)

    // Apply filters if provided
    if (status || paymentStatus || isOverdue !== null) {
      data.invoices = data.invoices.filter(invoice => {
        if (status && invoice.status !== status) return false
        if (paymentStatus && invoice.payment_status !== paymentStatus) return false
        if (isOverdue !== null && invoice.is_overdue !== (isOverdue === 'true')) return false
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
    console.error('Error fetching invoices:', error)
    return NextResponse.json(
      { 
        error: 'Failed to fetch invoices',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

// POST endpoint - Create new invoice
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { invoice, line_items, school_id, user_id } = body

    // Validate required fields
    if (!school_id || !user_id) {
      return NextResponse.json(
        { error: 'Missing school_id or user_id parameter' },
        { status: 400 }
      )
    }

    if (!invoice?.student_id || !invoice?.due_date ||
        !line_items || !Array.isArray(line_items) || line_items.length === 0) {
      return NextResponse.json(
        { error: 'Missing required fields or line items' },
        { status: 400 }
      )
    }

    // Validate line items
    for (const item of line_items) {
      if (!item.description || !item.unit_price || item.unit_price <= 0) {
        return NextResponse.json(
          { error: 'Invalid line item: description and positive unit_price required' },
          { status: 400 }
        )
      }
    }

    // Verify user has access to this school
    const { data: profile } = await supabase
      .from('profiles')
      .select('school_id, role')
      .eq('id', user_id)
      .single()

    if (!profile || profile.school_id !== school_id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Generate invoice number - try database function first, fallback to simple generation
    let invoiceNumber
    try {
      const { data, error } = await supabase.rpc('generate_invoice_number', { school_id })
      if (error || !data) {
        throw new Error('Database function failed')
      }
      invoiceNumber = data
    } catch (error) {
      console.log('Database function not available, using fallback invoice number generation')
      // Fallback to simple generation
      const currentYear = new Date().getFullYear()
      const { data: existingInvoices, error: countError } = await supabase
        .from('invoices')
        .select('id')
        .eq('school_id', school_id)
        .like('invoice_number', `INV-${currentYear}-%`)

      if (countError) {
        console.error('Error counting invoices:', countError)
        return NextResponse.json(
          { error: 'Failed to generate invoice number' },
          { status: 500 }
        )
      }

      const invoiceCount = (existingInvoices?.length || 0) + 1
      invoiceNumber = `INV-${currentYear}-${invoiceCount.toString().padStart(3, '0')}`
    }

    // Calculate subtotal from line items
    const subtotal = line_items.reduce((sum, item) => {
      const quantity = item.quantity || 1
      const itemTotal = quantity * item.unit_price
      const discountAmount = item.discount_amount || 0
      const discountPercentage = item.discount_percentage || 0
      const discountFromPercentage = itemTotal * (discountPercentage / 100)
      return sum + (itemTotal - discountAmount - discountFromPercentage)
    }, 0)

    // Create invoice with basic fields that should exist in most schemas
    let basicInvoiceData = {
      school_id: school_id,
      student_id: invoice.student_id,
      invoice_number: invoiceNumber,
      invoice_date: invoice.invoice_date || new Date().toISOString().split('T')[0],
      due_date: invoice.due_date,
      subtotal: subtotal
    }

    // Try to add optional fields that might not exist in all schemas
    let extendedInvoiceData = {
      ...basicInvoiceData,
      discount_amount: invoice.discount_amount || 0,
      late_fee_amount: invoice.late_fee_amount || 0,
      tax_amount: invoice.tax_amount || 0,
      status: 'draft',
      payment_status: 'pending',
      notes: invoice.notes || null,
      terms_and_conditions: invoice.terms_and_conditions || null
    }

    // First check if invoices table exists
    try {
      const { error: tableCheckError } = await supabase
        .from('invoices')
        .select('id')
        .limit(1)

      if (tableCheckError && tableCheckError.code === 'PGRST205') {
        return NextResponse.json(
          {
            error: 'Invoices table does not exist. Please run the database migration first.',
            details: 'Run database/minimal-invoices-schema.sql in your Supabase SQL Editor to create the invoices table.',
            migration_needed: true
          },
          { status: 500 }
        )
      }
    } catch (error) {
      console.error('Error checking invoices table:', error)
    }

    // Try to create invoice with progressive fallbacks for missing columns
    let newInvoice
    let attempts = [
      // Attempt 1: Full schema with generated_by
      { ...extendedInvoiceData, generated_by: user_id },
      // Attempt 2: Full schema without generated_by
      extendedInvoiceData,
      // Attempt 3: Basic schema with generated_by
      { ...basicInvoiceData, generated_by: user_id },
      // Attempt 4: Basic schema only
      basicInvoiceData
    ]

    for (let i = 0; i < attempts.length; i++) {
      try {
        const { data, error } = await supabase
          .from('invoices')
          .insert(attempts[i])
          .select()
          .single()

        if (error) {
          if (error.code === 'PGRST204' && i < attempts.length - 1) {
            console.log(`Attempt ${i + 1} failed (missing column), trying simpler schema...`)
            continue // Try next attempt
          } else {
            throw error
          }
        } else {
          newInvoice = data
          console.log(`Invoice created successfully on attempt ${i + 1}`)
          break
        }
      } catch (error) {
        if (i === attempts.length - 1) {
          // Last attempt failed
          console.error('All invoice creation attempts failed:', error)
          return NextResponse.json(
            { error: 'Failed to create invoice', details: error instanceof Error ? error.message : 'Unknown error' },
            { status: 500 }
          )
        }
      }
    }

    if (!newInvoice) {
      return NextResponse.json(
        { error: 'Failed to create invoice - no compatible schema found' },
        { status: 500 }
      )
    }

    // Try to create line items if the table exists, otherwise store in invoice notes
    let lineItemsCreated = false

    // Check if invoice_line_items table exists
    try {
      const { error: tableCheckError } = await supabase
        .from('invoice_line_items')
        .select('id')
        .limit(1)

      if (!tableCheckError) {
        // Table exists, try to create line items
        const basicLineItems = line_items.map(item => ({
          invoice_id: newInvoice.id,
          description: item.description,
          quantity: item.quantity || 1,
          unit_price: item.unit_price
        }))

        const extendedLineItems = line_items.map(item => ({
          invoice_id: newInvoice.id,
          fee_structure_id: item.fee_structure_id,
          description: item.description,
          quantity: item.quantity || 1,
          unit_price: item.unit_price,
          discount_amount: item.discount_amount || 0,
          discount_percentage: item.discount_percentage || 0
        }))

        // Try extended line items first, fallback to basic
        try {
          const { error } = await supabase
            .from('invoice_line_items')
            .insert(extendedLineItems)

          if (error) {
            console.log('Extended line items failed, trying basic line items...')
            const { error: basicError } = await supabase
              .from('invoice_line_items')
              .insert(basicLineItems)

            if (basicError) {
              throw basicError
            }
          }
          lineItemsCreated = true
          console.log('Line items created successfully')
        } catch (error) {
          console.error('Failed to create line items:', error)
          // Don't fail the whole invoice creation, just log the error
          console.log('Continuing without line items...')
        }
      }
    } catch (error) {
      console.log('invoice_line_items table does not exist, storing line items in notes')
    }

    // If line items couldn't be created, store them in the invoice notes
    if (!lineItemsCreated && line_items.length > 0) {
      const lineItemsText = line_items.map(item =>
        `${item.description}: ${item.quantity || 1} x $${item.unit_price} = $${(item.quantity || 1) * item.unit_price}`
      ).join('\n')

      const updatedNotes = newInvoice.notes
        ? `${newInvoice.notes}\n\nLine Items:\n${lineItemsText}`
        : `Line Items:\n${lineItemsText}`

      // Update the invoice with line items in notes
      try {
        await supabase
          .from('invoices')
          .update({ notes: updatedNotes })
          .eq('id', newInvoice.id)

        console.log('Line items stored in invoice notes')
      } catch (error) {
        console.error('Failed to update invoice notes with line items:', error)
      }
    }

    // Revalidate cache
    revalidateTag('invoices')

    return NextResponse.json({
      success: true,
      data: newInvoice,
      message: 'Invoice created successfully'
    })

  } catch (error) {
    console.error('Error creating invoice:', error)
    return NextResponse.json(
      { 
        error: 'Failed to create invoice',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

// PUT endpoint - Update invoice
export async function PUT(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const invoiceId = searchParams.get('id')
    const updateData: Partial<Invoice> = await request.json()

    if (!invoiceId) {
      return NextResponse.json(
        { error: 'Missing invoice ID' },
        { status: 400 }
      )
    }

    // Check if invoice exists and is editable
    const { data: existingInvoice, error: checkError } = await supabase
      .from('invoices')
      .select('id, status, payment_status')
      .eq('id', invoiceId)
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
      .eq('id', invoiceId)
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
