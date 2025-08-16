import { NextRequest, NextResponse } from 'next/server'
import { unstable_cache } from 'next/cache'
import { revalidateTag } from 'next/cache'
import { createAdminSupabaseClient } from '@/lib/supabase'

// Create Supabase admin client for protected operations
const supabase = createAdminSupabaseClient()

// Cached function for fetching classes data
const getCachedClassesData = unstable_cache(
  async (schoolId: string, userId: string) => {
    console.log('🔄 Fetching fresh classes data from database for school:', schoolId)
    
    // Fetch classes
    const { data: classesData, error: classesError } = await supabase
      .from('classes')
      .select('*')
      .eq('school_id', schoolId)
      .order('grade_level', { ascending: true })
      .order('section', { ascending: true })

    if (classesError) throw classesError

    // Fetch teachers separately
    let teacherData: Record<string, any> = {}
    if (classesData && classesData.length > 0) {
      const teacherIds = classesData
        .map(c => c.class_teacher_id || c.teacher_id)
        .filter(Boolean)
      
      if (teacherIds.length > 0) {
        const { data: teachers } = await supabase
          .from('profiles')
          .select('id, name, email')
          .in('id', teacherIds)
          .eq('role', 'teacher')
        
        if (teachers) {
          teacherData = teachers.reduce((acc, teacher) => {
            acc[teacher.id] = teacher
            return acc
          }, {})
        }
      }
    }

    // Fetch subjects
    const { data: subjectsData, error: subjectsError } = await supabase
      .from('subjects')
      .select('*')
      .eq('school_id', schoolId)
      .eq('is_active', true)
      .order('name')

    if (subjectsError) throw subjectsError

    // Fetch all teachers for the school
    const { data: teachersData, error: teachersError } = await supabase
      .from('profiles')
      .select('id, name, email')
      .eq('role', 'teacher')
      .eq('school_id', schoolId)
      .order('name')

    if (teachersError) throw teachersError

    // Get enrollment counts
    let enrollmentCounts: Record<string, number> = {}
    if (classesData && classesData.length > 0) {
      try {
        const { data: enrollments } = await supabase
          .from('class_enrollments')
          .select('class_id')
          .in('class_id', classesData.map(c => c.id))
        
        if (enrollments) {
          enrollmentCounts = enrollments.reduce((acc, enrollment) => {
            acc[enrollment.class_id] = (acc[enrollment.class_id] || 0) + 1
            return acc
          }, {} as Record<string, number>)
        }
      } catch (enrollmentError) {
        console.warn('Could not fetch enrollment counts:', enrollmentError)
      }
    }

    // Transform classes data
    const transformedClasses = (classesData || []).map(classItem => ({
      ...classItem,
      teacher: teacherData[classItem.class_teacher_id || classItem.teacher_id] || null,
      enrollment_count: enrollmentCounts[classItem.id] || 0,
      subjects: [] // We'll add subjects later if needed
    }))

    return {
      classes: transformedClasses,
      subjects: subjectsData || [],
      teachers: teachersData || [],
      timestamp: Date.now()
    }
  },
  ['classes-data'], // Cache key
  {
    tags: ['classes'], // Tags for revalidation
    revalidate: 300 // 5 minutes
  }
)

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const schoolId = searchParams.get('school_id')
    const userId = searchParams.get('user_id')

    if (!schoolId || !userId) {
      return NextResponse.json(
        { error: 'Missing school_id or user_id parameter' },
        { status: 400 }
      )
    }

    // Get cached data
    const data = await getCachedClassesData(schoolId, userId)

    return NextResponse.json({
      success: true,
      data,
      cached: true,
      timestamp: data.timestamp
    })

  } catch (error) {
    console.error('Error fetching classes data:', error)
    return NextResponse.json(
      { 
        error: 'Failed to fetch classes data',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

// POST endpoint for cache invalidation
export async function POST(request: NextRequest) {
  try {
    const { action, schoolId } = await request.json()

    if (action === 'revalidate' && schoolId) {
      // Revalidate cache for specific school
      revalidateTag('classes')
      console.log('🔄 Cache revalidated for classes')
      
      return NextResponse.json({
        success: true,
        message: 'Cache revalidated successfully'
      })
    }

    return NextResponse.json(
      { error: 'Invalid action or missing schoolId' },
      { status: 400 }
    )

  } catch (error) {
    console.error('Error revalidating cache:', error)
    return NextResponse.json(
      { error: 'Failed to revalidate cache' },
      { status: 500 }
    )
  }
}
