import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { cookies } from 'next/headers'

// GET - Fetch students for a class and existing attendance
export async function GET(request: NextRequest) {
  try {
    const cookieStore = cookies()
    const token = cookieStore.get('supabase-auth-token')?.value

    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const classId = searchParams.get('classId')
    const date = searchParams.get('date')

    if (!classId) {
      return NextResponse.json({ error: 'Class ID is required' }, { status: 400 })
    }

    // Fetch students for the class
    const { data: students, error: studentsError } = await supabase
      .from('students')
      .select(`
        id,
        roll_number,
        admission_number,
        class_id,
        profiles!inner(
          name
        )
      `)
      .eq('class_id', classId)
      .eq('is_active', true)
      .order('roll_number', { nullsLast: true })

    if (studentsError) {
      console.error('Error fetching students:', studentsError)
      return NextResponse.json({ error: 'Failed to fetch students' }, { status: 500 })
    }

    // Transform students data
    const studentsData = (students || []).map((student: any) => ({
      id: student.id,
      name: student.profiles.name,
      roll_number: student.roll_number,
      admission_number: student.admission_number,
      class_id: student.class_id
    }))

    let attendanceData = []
    let existingAttendance = false

    // If date is provided, fetch existing attendance
    if (date) {
      const { data: attendance, error: attendanceError } = await supabase
        .from('student_attendance')
        .select('student_id, status')
        .eq('class_id', classId)
        .eq('attendance_date', date)

      if (attendanceError) {
        console.error('Error fetching attendance:', attendanceError)
        return NextResponse.json({ error: 'Failed to fetch attendance' }, { status: 500 })
      }

      attendanceData = attendance || []
      existingAttendance = attendanceData.length > 0
    }

    return NextResponse.json({
      students: studentsData,
      attendance: attendanceData,
      existingAttendance
    })

  } catch (error) {
    console.error('Error in enhanced attendance GET:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST - Save or update attendance records
export async function POST(request: NextRequest) {
  try {
    const cookieStore = cookies()
    const token = cookieStore.get('supabase-auth-token')?.value

    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { classId, date, attendance, schoolId, userId } = body

    if (!classId || !date || !attendance || !schoolId || !userId) {
      return NextResponse.json({ 
        error: 'Missing required fields: classId, date, attendance, schoolId, userId' 
      }, { status: 400 })
    }

    // Check if attendance already exists for this date
    const { data: existingRecords, error: checkError } = await supabase
      .from('student_attendance')
      .select('id')
      .eq('class_id', classId)
      .eq('attendance_date', date)

    if (checkError) {
      console.error('Error checking existing attendance:', checkError)
      return NextResponse.json({ error: 'Failed to check existing attendance' }, { status: 500 })
    }

    // If records exist, delete them first
    if (existingRecords && existingRecords.length > 0) {
      const { error: deleteError } = await supabase
        .from('student_attendance')
        .delete()
        .eq('class_id', classId)
        .eq('attendance_date', date)

      if (deleteError) {
        console.error('Error deleting existing attendance:', deleteError)
        return NextResponse.json({ error: 'Failed to delete existing attendance' }, { status: 500 })
      }
    }

    // Prepare attendance records for insertion
    const attendanceRecords = Object.entries(attendance).map(([studentId, status]) => ({
      student_id: studentId,
      class_id: classId,
      school_id: schoolId,
      attendance_date: date,
      status: status as 'present' | 'absent',
      marked_by: userId,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }))

    // Insert new attendance records
    const { error: insertError } = await supabase
      .from('student_attendance')
      .insert(attendanceRecords)

    if (insertError) {
      console.error('Error inserting attendance:', insertError)
      return NextResponse.json({ error: 'Failed to save attendance' }, { status: 500 })
    }

    return NextResponse.json({ 
      message: 'Attendance saved successfully',
      recordsCount: attendanceRecords.length
    })

  } catch (error) {
    console.error('Error in enhanced attendance POST:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// PUT - Update specific attendance record
export async function PUT(request: NextRequest) {
  try {
    const cookieStore = cookies()
    const token = cookieStore.get('supabase-auth-token')?.value

    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { studentId, classId, date, status, userId } = body

    if (!studentId || !classId || !date || !status || !userId) {
      return NextResponse.json({ 
        error: 'Missing required fields: studentId, classId, date, status, userId' 
      }, { status: 400 })
    }

    // Update the specific attendance record
    const { error: updateError } = await supabase
      .from('student_attendance')
      .update({ 
        status: status as 'present' | 'absent',
        marked_by: userId,
        updated_at: new Date().toISOString()
      })
      .eq('student_id', studentId)
      .eq('class_id', classId)
      .eq('attendance_date', date)

    if (updateError) {
      console.error('Error updating attendance:', updateError)
      return NextResponse.json({ error: 'Failed to update attendance' }, { status: 500 })
    }

    return NextResponse.json({ message: 'Attendance updated successfully' })

  } catch (error) {
    console.error('Error in enhanced attendance PUT:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// DELETE - Remove attendance records for a specific date
export async function DELETE(request: NextRequest) {
  try {
    const cookieStore = cookies()
    const token = cookieStore.get('supabase-auth-token')?.value

    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const classId = searchParams.get('classId')
    const date = searchParams.get('date')

    if (!classId || !date) {
      return NextResponse.json({ 
        error: 'Missing required parameters: classId, date' 
      }, { status: 400 })
    }

    // Delete attendance records for the specified class and date
    const { error: deleteError } = await supabase
      .from('student_attendance')
      .delete()
      .eq('class_id', classId)
      .eq('attendance_date', date)

    if (deleteError) {
      console.error('Error deleting attendance:', deleteError)
      return NextResponse.json({ error: 'Failed to delete attendance' }, { status: 500 })
    }

    return NextResponse.json({ message: 'Attendance records deleted successfully' })

  } catch (error) {
    console.error('Error in enhanced attendance DELETE:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
