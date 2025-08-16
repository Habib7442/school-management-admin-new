import { NextRequest, NextResponse } from 'next/server'
import { createAdminSupabaseClient } from '@/lib/supabase'

export async function GET(request: NextRequest) {
  try {
    const supabase = createAdminSupabaseClient()
    const { searchParams } = new URL(request.url)

    // Get query parameters
    const schoolId = searchParams.get('school_id')
    const userId = searchParams.get('user_id')

    if (!schoolId || !userId) {
      return NextResponse.json({ error: 'Missing school_id or user_id parameter' }, { status: 400 })
    }

    // Verify user has access to this school
    const { data: profile } = await supabase
      .from('profiles')
      .select('school_id, role')
      .eq('id', userId)
      .single()

    if (!profile || profile.school_id !== schoolId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get academic years
    const { data: academicYears, error } = await supabase
      .from('academic_years')
      .select('*')
      .eq('school_id', schoolId)
      .order('start_date', { ascending: false })

    if (error) {
      console.error('Error fetching academic years:', error)
      return NextResponse.json({ error: 'Failed to fetch academic years' }, { status: 500 })
    }

    return NextResponse.json(academicYears)
  } catch (error) {
    console.error('Error in academic years API:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = createAdminSupabaseClient()
    const body = await request.json()
    const { year, start_date, end_date, is_current, school_id, user_id } = body

    // Validate required fields
    if (!year || !start_date || !end_date || !school_id || !user_id) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
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

    // If this is set as current, unset all other current academic years for this school
    if (is_current) {
      await supabase
        .from('academic_years')
        .update({ is_current: false })
        .eq('school_id', school_id)
    }

    // Create academic year
    const { data: newAcademicYear, error } = await supabase
      .from('academic_years')
      .insert({
        school_id,
        year,
        start_date,
        end_date,
        is_current: is_current || false
      })
      .select()
      .single()

    if (error) {
      console.error('Error creating academic year:', error)
      return NextResponse.json({ error: 'Failed to create academic year' }, { status: 500 })
    }

    return NextResponse.json(newAcademicYear, { status: 201 })
  } catch (error) {
    console.error('Error in academic years POST API:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
