import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase'

// POST endpoint - Verify payment
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const paymentId = params.id
    const { verified_by } = await request.json()

    if (!paymentId || !verified_by) {
      return NextResponse.json(
        { error: 'Payment ID and verified_by are required' },
        { status: 400 }
      )
    }

    const supabase = createServerSupabaseClient()

    const { data: payment, error } = await supabase
      .from('payments')
      .update({
        status: 'paid',
        verified_by,
        verified_at: new Date().toISOString()
      })
      .eq('id', paymentId)
      .select()
      .single()

    if (error) {
      console.error('Error verifying payment:', error)
      return NextResponse.json(
        { error: 'Failed to verify payment', details: error.message },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      data: payment,
      message: 'Payment verified successfully'
    })

  } catch (error) {
    console.error('Error verifying payment:', error)
    return NextResponse.json(
      { 
        error: 'Failed to verify payment',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}
