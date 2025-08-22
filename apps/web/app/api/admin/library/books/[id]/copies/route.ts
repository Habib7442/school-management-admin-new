import { NextRequest, NextResponse } from 'next/server'
import { createAdminSupabaseClient } from '@/lib/supabase'

// GET /api/admin/library/books/[id]/copies - Get all copies for a book
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = createAdminSupabaseClient()
    const { searchParams } = new URL(request.url)
    const schoolId = searchParams.get('school_id')
    const userId = searchParams.get('user_id')

    if (!schoolId || !userId) {
      return NextResponse.json({ error: 'Missing required parameters' }, { status: 400 })
    }

    // Verify user has access
    const { data: profile } = await supabase
      .from('profiles')
      .select('school_id, role')
      .eq('id', userId)
      .single()

    if (!profile || profile.school_id !== schoolId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    // Fetch book copies
    const { data: copies, error } = await supabase
      .from('book_copies')
      .select('*')
      .eq('book_id', params.id)
      .eq('school_id', schoolId)
      .order('copy_number', { ascending: true })

    if (error) {
      console.error('Error fetching book copies:', error)
      return NextResponse.json({ error: 'Failed to fetch book copies' }, { status: 500 })
    }

    return NextResponse.json({ copies })

  } catch (error) {
    console.error('Error fetching book copies:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST /api/admin/library/books/[id]/copies - Add new copies
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = createAdminSupabaseClient()
    const body = await request.json()
    const { count, school_id: schoolId, user_id: userId } = body

    if (!schoolId || !userId || !count || count < 1) {
      return NextResponse.json({ error: 'Missing required parameters' }, { status: 400 })
    }

    // Verify user has access
    const { data: profile } = await supabase
      .from('profiles')
      .select('school_id, role')
      .eq('id', userId)
      .single()

    if (!profile || profile.school_id !== schoolId || !['admin', 'sub-admin'].includes(profile.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    // Get the book to verify it exists
    const { data: book } = await supabase
      .from('books')
      .select('id, title')
      .eq('id', params.id)
      .eq('school_id', schoolId)
      .single()

    if (!book) {
      return NextResponse.json({ error: 'Book not found' }, { status: 404 })
    }

    // Get the current highest copy number
    const { data: lastCopy } = await supabase
      .from('book_copies')
      .select('copy_number')
      .eq('book_id', params.id)
      .eq('school_id', schoolId)
      .order('copy_number', { ascending: false })
      .limit(1)
      .single()

    const startCopyNumber = (lastCopy?.copy_number || 0) + 1

    // Create new copies
    const newCopies = []
    for (let i = 0; i < count; i++) {
      const copyNumber = startCopyNumber + i
      const barcode = `${params.id.slice(0, 8)}-${copyNumber.toString().padStart(3, '0')}`
      
      newCopies.push({
        book_id: params.id,
        school_id: schoolId,
        copy_number: copyNumber,
        barcode: barcode,
        status: 'available',
        condition: 'good',
        created_by: userId
      })
    }

    const { error: insertError } = await supabase
      .from('book_copies')
      .insert(newCopies)

    if (insertError) {
      console.error('Error creating book copies:', insertError)
      return NextResponse.json({ error: 'Failed to create book copies' }, { status: 500 })
    }

    return NextResponse.json({ 
      message: `${count} copies added successfully`,
      copies: newCopies 
    })

  } catch (error) {
    console.error('Error creating book copies:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
