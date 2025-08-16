import { NextRequest, NextResponse } from 'next/server'
import { createAdminSupabaseClient } from '@/lib/supabase'
import type { UserRole } from '@repo/types'

// Create Supabase client with service role key for admin operations
const supabaseAdmin = createAdminSupabaseClient()

export async function POST(request: NextRequest) {
  try {
    const { email, password, name, role, school_id } = await request.json()

    console.log('Creating user:', { email, name, role, school_id })

    // Validate required fields
    if (!email || !password || !name || !role || !school_id) {
      console.error('Missing required fields:', { email: !!email, password: !!password, name: !!name, role: !!role, school_id: !!school_id })
      return NextResponse.json(
        { success: false, error: 'Missing required fields' },
        { status: 400 }
      )
    }

    // Validate role
    const validRoles: UserRole[] = ['admin', 'sub-admin', 'teacher', 'student']
    if (!validRoles.includes(role)) {
      console.error('Invalid role:', role)
      return NextResponse.json(
        { success: false, error: 'Invalid role' },
        { status: 400 }
      )
    }

    // Create user in Supabase Auth with optimized settings
    console.log('Creating auth user...')
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email: email.toLowerCase(),
      password,
      user_metadata: {
        name,
        role,
        school_id
      },
      email_confirm: true // Skip email confirmation for admin-created users
    })

    if (authError) {
      console.error('Auth error:', authError)
      // Handle duplicate email error specifically
      if (authError.message.includes('already registered')) {
        return NextResponse.json(
          { success: false, error: 'A user with this email already exists' },
          { status: 400 }
        )
      }
      return NextResponse.json(
        { success: false, error: authError.message },
        { status: 400 }
      )
    }

    if (!authData.user) {
      console.error('No user data returned from auth creation')
      return NextResponse.json(
        { success: false, error: 'Failed to create user' },
        { status: 400 }
      )
    }

    console.log('Auth user created successfully:', authData.user.id)

    // Wait a moment for the trigger to create the profile
    await new Promise(resolve => setTimeout(resolve, 100))

    // Update the profile with school_id since the trigger doesn't have access to it
    const { error: profileError } = await supabaseAdmin
      .from('profiles')
      .update({
        school_id,
        updated_at: new Date().toISOString()
      })
      .eq('id', authData.user.id)

    if (profileError) {
      console.error('Profile update error:', profileError)
      // Clean up auth user if profile update fails
      await supabaseAdmin.auth.admin.deleteUser(authData.user.id)
      return NextResponse.json(
        { success: false, error: `Failed to update profile: ${profileError.message}` },
        { status: 400 }
      )
    }

    // Create role-specific record in parallel with profile
    console.log('Creating role-specific record for:', role)
    const { error: roleError } = await createRoleSpecificRecord(authData.user.id, role, school_id)

    if (roleError) {
      console.error('Role-specific record error:', roleError)
      // Clean up if role-specific record creation fails
      console.log('Cleaning up auth user due to role-specific record failure')
      await supabaseAdmin.auth.admin.deleteUser(authData.user.id)
      return NextResponse.json(
        { success: false, error: `Failed to create role-specific record: ${roleError.message}` },
        { status: 400 }
      )
    }

    console.log('User creation completed successfully:', authData.user.id)

    // Verify the profile was created correctly
    const { data: finalProfile } = await supabaseAdmin
      .from('profiles')
      .select('id, email, name, role, school_id')
      .eq('id', authData.user.id)
      .single()

    console.log('Final profile verification:', finalProfile)

    return NextResponse.json({
      success: true,
      user: {
        id: authData.user.id,
        email: finalProfile?.email || email,
        name: finalProfile?.name || name,
        role: finalProfile?.role || role,
        school_id: finalProfile?.school_id || school_id
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

// Create role-specific record with optimized error handling
async function createRoleSpecificRecord(userId: string, role: UserRole, schoolId: string) {
  const timestamp = new Date().toISOString()

  switch (role) {
    case 'admin':
      return await supabaseAdmin.from('admins').insert({
        id: userId,
        school_id: schoolId,
        can_create_sub_admins: true,
        can_manage_finances: true,
        can_manage_staff: true,
        created_at: timestamp,
        updated_at: timestamp
      })

    case 'sub-admin':
      return await supabaseAdmin.from('sub_admins').insert({
        id: userId,
        school_id: schoolId,
        can_view_reports: false,
        can_manage_students: false,
        can_manage_teachers: false,
        created_at: timestamp,
        updated_at: timestamp
      })

    case 'teacher':
      return await supabaseAdmin.from('teachers').insert({
        id: userId,
        school_id: schoolId,
        is_active: true,
        created_at: timestamp,
        updated_at: timestamp
      })

    case 'student':
      return await supabaseAdmin.from('students').insert({
        id: userId,
        school_id: schoolId,
        is_active: true,
        admission_type: 'manual',
        created_at: timestamp,
        updated_at: timestamp
      })

    default:
      return { error: new Error(`Unknown role: ${role}`) }
  }
}
