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

    // Get subjects
    const { data: subjects, error } = await supabase
      .from('subjects')
      .select('*')
      .eq('school_id', schoolId)
      .order('name')

    if (error) {
      console.error('Error fetching subjects:', error)
      return NextResponse.json({ error: 'Failed to fetch subjects' }, { status: 500 })
    }

    return NextResponse.json(subjects)
  } catch (error) {
    console.error('Error in subjects API:', error)
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
    const { name, code, description, credits } = body

    // Validate required fields
    if (!name) {
      return NextResponse.json({ error: 'Subject name is required' }, { status: 400 })
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

    // Create subject
    const { data: newSubject, error } = await supabase
      .from('subjects')
      .insert({
        school_id: profile.school_id,
        name,
        code,
        description,
        credits
      })
      .select()
      .single()

    if (error) {
      console.error('Error creating subject:', error)
      return NextResponse.json({ error: 'Failed to create subject' }, { status: 500 })
    }

    return NextResponse.json(newSubject, { status: 201 })
  } catch (error) {
    console.error('Error in subjects POST API:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
