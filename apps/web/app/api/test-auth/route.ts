import { NextRequest, NextResponse } from 'next/server'
import { createAdminSupabaseClient } from '@/lib/supabase'

export async function GET(request: NextRequest) {
  try {
    console.log('🔍 Testing admin authentication...')
    console.log('🔑 Service Role Key exists:', !!process.env.SUPABASE_SERVICE_ROLE_KEY)
    console.log('🔑 Service Role Key length:', process.env.SUPABASE_SERVICE_ROLE_KEY?.length || 0)
    
    const supabase = createAdminSupabaseClient()
    console.log('✅ Admin client created')
    
    // Test a simple query
    const { data, error } = await supabase
      .from('schools')
      .select('id, name')
      .limit(1)
    
    console.log('📊 Query result:', { data: data?.length, error })
    
    if (error) {
      console.error('❌ Database error:', error)
      return NextResponse.json({
        success: false,
        error: error.message,
        details: error
      }, { status: 401 })
    }
    
    return NextResponse.json({
      success: true,
      message: 'Admin authentication working',
      data: data
    })
    
  } catch (error) {
    console.error('❌ Test error:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
