import { NextRequest, NextResponse } from 'next/server'
import { createAdminSupabaseClient } from '@/lib/supabase'

// GET endpoint - Fetch students
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const schoolId = searchParams.get('school_id')
    const userId = searchParams.get('user_id')
    const classId = searchParams.get('class_id')
    const gradeLevel = searchParams.get('grade_level')
    const isActive = searchParams.get('is_active')

    if (!schoolId || !userId) {
      return NextResponse.json(
        { error: 'Missing school_id or user_id parameter' },
        { status: 400 }
      )
    }

    const supabase = createAdminSupabaseClient()

    // Verify user has access to this school
    const { data: profile } = await supabase
      .from('profiles')
      .select('school_id, role')
      .eq('id', userId)
      .single()

    if (!profile || profile.school_id !== schoolId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Build query
    let query = supabase
      .from('students')
      .select(`
        id,
        student_id,
        admission_number,
        admission_date,
        is_active,
        profile:profiles!students_id_fkey(
          id,
          name,
          email,
          phone
        ),
        class:classes(
          id,
          name,
          grade_level,
          section,
          academic_year
        )
      `)
      .eq('school_id', schoolId)
      .order('admission_number', { ascending: true })

    // Apply filters
    if (classId) {
      query = query.eq('class_id', classId)
    }

    if (gradeLevel) {
      query = query.eq('class.grade_level', parseInt(gradeLevel))
    }

    if (isActive !== null && isActive !== undefined) {
      query = query.eq('is_active', isActive === 'true')
    }

    const { data: students, error } = await query

    if (error) {
      console.error('Error fetching students:', error)
      return NextResponse.json(
        { error: 'Failed to fetch students', details: error.message },
        { status: 500 }
      )
    }

    // Transform the data to include computed fields
    const transformedStudents = (students || []).map(student => ({
      ...student,
      full_name: student.profile?.name || 'Unknown',
      class_name: student.class?.name || 'No Class',
      grade_level: student.class?.grade_level || 0,
      section: student.class?.section || '',
      academic_year: student.class?.academic_year || '',
      age: null, // Age calculation removed since date_of_birth is not available
      enrollment_status: student.is_active ? 'enrolled' : 'not_enrolled'
    }))

    return NextResponse.json({
      success: true,
      data: {
        students: transformedStudents,
        total: transformedStudents.length,
        timestamp: Date.now()
      }
    })

  } catch (error) {
    console.error('Error in students API:', error)
    return NextResponse.json(
      { 
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

// POST endpoint - Create new student
export async function POST(request: NextRequest) {
  try {
    const studentData = await request.json()

    if (!studentData.school_id || !studentData.profile?.name || !studentData.admission_number) {
      return NextResponse.json(
        { error: 'Missing required fields: school_id, profile.name, admission_number' },
        { status: 400 }
      )
    }

    const supabase = createAdminSupabaseClient()

    // First create the profile
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .insert({
        name: studentData.profile.name,
        email: studentData.profile.email,
        phone: studentData.profile.phone,
        role: 'student',
        school_id: studentData.school_id
      })
      .select()
      .single()

    if (profileError) {
      console.error('Error creating profile:', profileError)
      return NextResponse.json(
        { error: 'Failed to create student profile', details: profileError.message },
        { status: 500 }
      )
    }

    // Then create the student record
    const { data: student, error: studentError } = await supabase
      .from('students')
      .insert({
        id: profile.id, // Use the same ID as the profile
        school_id: studentData.school_id,
        student_id: studentData.student_id || studentData.admission_number,
        admission_number: studentData.admission_number,
        admission_date: studentData.admission_date || new Date().toISOString().split('T')[0],
        class_id: studentData.class_id,
        is_active: studentData.is_active !== false
      })
      .select(`
        *,
        profile:profiles!students_id_fkey(*),
        class:classes(*)
      `)
      .single()

    if (studentError) {
      console.error('Error creating student:', studentError)
      // Clean up the profile if student creation failed
      await supabase.from('profiles').delete().eq('id', profile.id)
      
      return NextResponse.json(
        { error: 'Failed to create student', details: studentError.message },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      data: student,
      message: 'Student created successfully'
    })

  } catch (error) {
    console.error('Error creating student:', error)
    return NextResponse.json(
      { 
        error: 'Failed to create student',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

// PUT endpoint - Update student
export async function PUT(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const studentId = searchParams.get('id')
    const studentData = await request.json()

    if (!studentId) {
      return NextResponse.json(
        { error: 'Student ID is required' },
        { status: 400 }
      )
    }

    const supabase = createAdminSupabaseClient()

    // Update profile if profile data is provided
    if (studentData.profile) {
      const { error: profileError } = await supabase
        .from('profiles')
        .update({
          name: studentData.profile.name,
          email: studentData.profile.email,
          phone: studentData.profile.phone
        })
        .eq('id', studentId)

      if (profileError) {
        console.error('Error updating profile:', profileError)
        return NextResponse.json(
          { error: 'Failed to update student profile', details: profileError.message },
          { status: 500 }
        )
      }
    }

    // Update student record
    const { data: student, error: studentError } = await supabase
      .from('students')
      .update({
        student_id: studentData.student_id,
        admission_number: studentData.admission_number,
        admission_date: studentData.admission_date,
        class_id: studentData.class_id,
        is_active: studentData.is_active
      })
      .eq('id', studentId)
      .select(`
        *,
        profile:profiles!students_id_fkey(*),
        class:classes(*)
      `)
      .single()

    if (studentError) {
      console.error('Error updating student:', studentError)
      return NextResponse.json(
        { error: 'Failed to update student', details: studentError.message },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      data: student,
      message: 'Student updated successfully'
    })

  } catch (error) {
    console.error('Error updating student:', error)
    return NextResponse.json(
      { 
        error: 'Failed to update student',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

// DELETE endpoint - Delete student
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const studentId = searchParams.get('id')

    if (!studentId) {
      return NextResponse.json(
        { error: 'Student ID is required' },
        { status: 400 }
      )
    }

    const supabase = createAdminSupabaseClient()

    // Delete student (this will also delete the profile due to CASCADE)
    const { error } = await supabase
      .from('students')
      .delete()
      .eq('id', studentId)

    if (error) {
      console.error('Error deleting student:', error)
      return NextResponse.json(
        { error: 'Failed to delete student', details: error.message },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'Student deleted successfully'
    })

  } catch (error) {
    console.error('Error deleting student:', error)
    return NextResponse.json(
      { 
        error: 'Failed to delete student',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}
