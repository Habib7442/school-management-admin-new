import { NextRequest, NextResponse } from 'next/server'
import { createAdminSupabaseClient } from '@/lib/supabase'

export async function POST(request: NextRequest) {
  try {
    const schoolData = await request.json()
    
    // Validate required fields
    if (!schoolData.name || !schoolData.admin_id || !schoolData.school_code) {
      return NextResponse.json(
        { error: 'Missing required fields: name, admin_id, school_code' },
        { status: 400 }
      )
    }

    // Use admin client to bypass RLS
    const supabase = createAdminSupabaseClient()

    // Check if school code already exists
    const { data: existingSchool } = await supabase
      .from('schools')
      .select('id')
      .eq('school_code', schoolData.school_code)
      .single()

    if (existingSchool) {
      return NextResponse.json(
        { error: 'School code already exists' },
        { status: 409 }
      )
    }

    // Create the school
    const { data: school, error: schoolError } = await supabase
      .from('schools')
      .insert(schoolData)
      .select()
      .single()

    if (schoolError) {
      console.error('School creation error:', schoolError)
      return NextResponse.json(
        { error: `Failed to create school: ${schoolError.message}` },
        { status: 500 }
      )
    }

    return NextResponse.json(school, { status: 201 })
  } catch (error) {
    console.error('Error in schools POST API:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const adminId = searchParams.get('admin_id')

    if (!adminId) {
      return NextResponse.json(
        { error: 'admin_id parameter is required' },
        { status: 400 }
      )
    }

    const supabase = createAdminSupabaseClient()

    const { data: school, error } = await supabase
      .from('schools')
      .select('*')
      .eq('admin_id', adminId)
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json(
          { error: 'School not found' },
          { status: 404 }
        )
      }
      console.error('Error fetching school:', error)
      return NextResponse.json(
        { error: 'Failed to fetch school' },
        { status: 500 }
      )
    }

    return NextResponse.json(school)
  } catch (error) {
    console.error('Error in schools GET API:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
