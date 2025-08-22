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

    // Get teachers (users with teacher role in this school)
    const { data: teachers, error } = await supabase
      .from('profiles')
      .select('id, name, email, phone')
      .eq('role', 'teacher')
      .eq('school_id', schoolId)
      .order('name')

    if (error) {
      console.error('Error fetching teachers:', error)
      return NextResponse.json({ error: 'Failed to fetch teachers' }, { status: 500 })
    }

    return NextResponse.json(teachers)
  } catch (error) {
    console.error('Error in teachers API:', error)
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
    const { name, email, phone, address, password } = body

    // Validate required fields
    if (!name || !email) {
      return NextResponse.json({ error: 'Name and email are required' }, { status: 400 })
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

    // Create user account
    const { data: authData, error: createUserError } = await supabase.auth.admin.createUser({
      email,
      password: password || `${name.replace(/\s+/g, '')}123`, // Default password
      email_confirm: true
    })

    if (createUserError) {
      console.error('Error creating teacher auth:', createUserError)
      return NextResponse.json({ error: 'Failed to create teacher account' }, { status: 500 })
    }

    // Create user record
    const { data: newUser, error: userError } = await supabase
      .from('users')
      .insert({
        id: authData.user.id,
        role: 'teacher'
      })
      .select()
      .single()

    if (userError) {
      console.error('Error creating teacher user record:', userError)
      return NextResponse.json({ error: 'Failed to create teacher user record' }, { status: 500 })
    }

    // Create profile
    const { data: newProfile, error: profileError } = await supabase
      .from('profiles')
      .insert({
        id: authData.user.id,
        name,
        email,
        phone,
        address,
        school_id: profile.school_id
      })
      .select()
      .single()

    if (profileError) {
      console.error('Error creating teacher profile:', profileError)
      return NextResponse.json({ error: 'Failed to create teacher profile' }, { status: 500 })
    }

    // Create teacher record (this was missing!)
    const { data: newTeacher, error: teacherError } = await supabase
      .from('teachers')
      .insert({
        id: authData.user.id,
        school_id: profile.school_id,
        employee_id: `EMP${Date.now()}`, // Generate a unique employee ID
        designation: 'Teacher',
        joining_date: new Date().toISOString().split('T')[0], // Today's date
        is_active: true
      })
      .select()
      .single()

    if (teacherError) {
      console.error('Error creating teacher record:', teacherError)
      return NextResponse.json({ error: 'Failed to create teacher record' }, { status: 500 })
    }

    // Verify that the teacher record was created successfully
    const { data: verifyTeacher, error: verifyError } = await supabase
      .from('teachers')
      .select('id')
      .eq('id', authData.user.id)
      .single()

    if (verifyError || !verifyTeacher) {
      console.error('Teacher record verification failed:', verifyError)
      return NextResponse.json({ error: 'Teacher record creation verification failed' }, { status: 500 })
    }

    // Return the complete teacher data
    const teacherData = {
      id: newUser.id,
      profiles: newProfile,
      teachers: newTeacher
    }

    return NextResponse.json({
      message: 'Teacher created successfully',
      teacher: teacherData
    }, { status: 201 })
  } catch (error) {
    console.error('Error in teachers POST API:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
