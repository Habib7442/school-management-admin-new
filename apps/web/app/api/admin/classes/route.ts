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

    // Get classes
    const { data: classes, error } = await supabase
      .from('classes')
      .select('*')
      .eq('school_id', schoolId)
      .order('grade_level', { ascending: true })
      .order('section', { ascending: true })

    if (error) {
      console.error('Error fetching classes:', error)
      return NextResponse.json({ error: 'Failed to fetch classes' }, { status: 500 })
    }

    return NextResponse.json(classes)
  } catch (error) {
    console.error('Error in classes API:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const cookieStore = await cookies()
    const supabase = createRouteHandlerClient<Database>({ cookies: () => cookieStore })

    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { name, section, academic_year_id, capacity, description } = body

    // Validate required fields
    if (!name || !academic_year_id) {
      return NextResponse.json({ error: 'Name and academic year are required' }, { status: 400 })
    }

    // Get user's school_id
    const { data: profile } = await supabase
      .from('profiles')
      .select('school_id')
      .eq('id', user.id)
      .single()

    if (!profile?.school_id) {
      return NextResponse.json({ error: 'School not found' }, { status: 400 })
    }

    // Create class
    const { data: newClass, error } = await supabase
      .from('classes')
      .insert({
        school_id: profile.school_id,
        name,
        section,
        academic_year_id,
        capacity,
        description
      })
      .select(`
        *,
        academic_years (
          id,
          year,
          start_date,
          end_date,
          is_current
        )
      `)
      .single()

    if (error) {
      console.error('Error creating class:', error)
      return NextResponse.json({ error: 'Failed to create class' }, { status: 500 })
    }

    return NextResponse.json(newClass, { status: 201 })
  } catch (error) {
    console.error('Error in classes POST API:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
