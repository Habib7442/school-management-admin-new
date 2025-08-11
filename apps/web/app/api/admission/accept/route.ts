import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// Create Supabase client with service role key for admin operations
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
)

// Generate password based on student name
function generatePassword(name: string): string {
  const firstName = name.trim().split(' ')[0]
    .toLowerCase()
    .replace(/[^a-z]/g, '')
    .slice(0, 8)
  
  if (!firstName) return 'student1234'
  
  const randomNumber = Math.floor(1000 + Math.random() * 9000)
  return `${firstName}${randomNumber}`
}

export async function POST(request: NextRequest) {
  try {
    const { applicationId, adminId } = await request.json()

    console.log('Accepting admission application:', { applicationId, adminId })

    // Validate required fields
    if (!applicationId || !adminId) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields' },
        { status: 400 }
      )
    }

    // Get the admission application
    const { data: admission, error: admissionError } = await supabaseAdmin
      .from('admissions')
      .select('*')
      .eq('id', applicationId)
      .single()

    if (admissionError || !admission) {
      console.error('Admission not found:', admissionError)
      return NextResponse.json(
        { success: false, error: 'Admission application not found' },
        { status: 404 }
      )
    }

    if (admission.status !== 'pending' && admission.status !== 'interview_scheduled') {
      return NextResponse.json(
        { success: false, error: 'Application has already been processed' },
        { status: 400 }
      )
    }

    // Check if email already exists in profiles
    const { data: existingProfile } = await supabaseAdmin
      .from('profiles')
      .select('email')
      .eq('email', admission.email.toLowerCase())
      .single()

    if (existingProfile) {
      return NextResponse.json(
        { success: false, error: 'A user with this email already exists in the system' },
        { status: 400 }
      )
    }

    // Generate password
    const password = generatePassword(admission.full_name)

    // Create user in Supabase Auth
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email: admission.email.toLowerCase(),
      password,
      user_metadata: {
        name: admission.full_name,
        role: 'student',
        school_id: admission.school_id
      },
      email_confirm: true
    })

    if (authError || !authData.user) {
      console.error('Auth user creation error:', authError)
      return NextResponse.json(
        { success: false, error: 'Failed to create user account' },
        { status: 500 }
      )
    }

    console.log('Auth user created:', authData.user.id)

    // Wait for trigger to create profile
    await new Promise(resolve => setTimeout(resolve, 100))

    // Update profile with school_id
    const { error: profileError } = await supabaseAdmin
      .from('profiles')
      .update({
        school_id: admission.school_id,
        phone: admission.phone,
        updated_at: new Date().toISOString()
      })
      .eq('id', authData.user.id)

    if (profileError) {
      console.error('Profile update error:', profileError)
      // Clean up auth user
      await supabaseAdmin.auth.admin.deleteUser(authData.user.id)
      return NextResponse.json(
        { success: false, error: 'Failed to update profile' },
        { status: 500 }
      )
    }

    // Create student record
    const { error: studentError } = await supabaseAdmin
      .from('students')
      .insert({
        id: authData.user.id,
        school_id: admission.school_id,
        is_active: true,
        student_avatar_url: admission.photograph_url,
        admission_id: admission.id,
        admission_type: 'admission_form',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })

    if (studentError) {
      console.error('Student creation error:', studentError)
      // Clean up auth user
      await supabaseAdmin.auth.admin.deleteUser(authData.user.id)
      return NextResponse.json(
        { success: false, error: 'Failed to create student record' },
        { status: 500 }
      )
    }

    // Update admission status
    const { error: updateError } = await supabaseAdmin
      .from('admissions')
      .update({
        status: 'accepted',
        decision_date: new Date().toISOString(),
        decided_by: adminId,
        updated_at: new Date().toISOString()
      })
      .eq('id', applicationId)

    if (updateError) {
      console.error('Admission update error:', updateError)
      return NextResponse.json(
        { success: false, error: 'Failed to update admission status' },
        { status: 500 }
      )
    }

    console.log('Admission accepted successfully:', applicationId)

    // TODO: Send acceptance email with login credentials
    // TODO: Send notification to parents

    return NextResponse.json({
      success: true,
      message: 'Application accepted successfully',
      student: {
        id: authData.user.id,
        email: admission.email,
        name: admission.full_name,
        password: password
      }
    })

  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}
