import { NextRequest, NextResponse } from 'next/server'
import { createAdminSupabaseClient } from '@/lib/supabase'
import { revalidateTag } from 'next/cache'

// GET /api/admin/library/books - Fetch books with filters and search
export async function GET(request: NextRequest) {
  try {
    const supabase = createAdminSupabaseClient()
    const { searchParams } = new URL(request.url)

    // Get query parameters
    const schoolId = searchParams.get('school_id')
    const userId = searchParams.get('user_id')
    const search = searchParams.get('search')
    const category = searchParams.get('category')
    const status = searchParams.get('status') || 'active'
    const format = searchParams.get('format')
    const availability = searchParams.get('availability')
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')
    const sortBy = searchParams.get('sort_by') || 'title'
    const sortOrder = searchParams.get('sort_order') || 'asc'

    if (!schoolId || !userId) {
      return NextResponse.json({ error: 'Missing required parameters' }, { status: 400 })
    }

    // Verify user has access to this school
    const { data: profile } = await supabase
      .from('profiles')
      .select('school_id, role')
      .eq('id', userId)
      .single()

    if (!profile || profile.school_id !== schoolId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    // Build query with joins
    let query = supabase
      .from('books')
      .select(`
        *,
        library_categories(
          id,
          name,
          code,
          color_code
        ),
        book_copies(
          id,
          barcode,
          status,
          condition,
          location
        )
      `)
      .eq('school_id', schoolId)

    // Apply filters
    if (status !== 'all') {
      query = query.eq('status', status)
    }

    if (category && category !== 'all') {
      query = query.eq('category_id', category)
    }

    if (format && format !== 'all') {
      query = query.eq('format', format)
    }

    // Apply availability filter
    if (availability) {
      switch (availability) {
        case 'available':
          query = query.gt('available_copies', 0)
          break
        case 'unavailable':
          query = query.eq('available_copies', 0)
          break
        case 'reserved':
          query = query.gt('reserved_copies', 0)
          break
      }
    }

    // Apply search
    if (search) {
      query = query.or(`
        title.ilike.%${search}%,
        authors.cs.{${search}},
        isbn.ilike.%${search}%,
        subjects.cs.{${search}}
      `)
    }

    // Apply sorting
    const validSortFields = ['title', 'authors', 'publication_year', 'created_at', 'popularity_score']
    const sortField = validSortFields.includes(sortBy) ? sortBy : 'title'
    query = query.order(sortField, { ascending: sortOrder === 'asc' })

    // Apply pagination
    const offset = (page - 1) * limit
    query = query.range(offset, offset + limit - 1)

    const { data: books, error } = await query

    if (error) {
      console.error('Error fetching books:', error)
      return NextResponse.json({ error: 'Failed to fetch books' }, { status: 500 })
    }

    // Get total count for pagination
    let countQuery = supabase
      .from('books')
      .select('*', { count: 'exact', head: true })
      .eq('school_id', schoolId)

    if (status !== 'all') {
      countQuery = countQuery.eq('status', status)
    }
    if (category && category !== 'all') {
      countQuery = countQuery.eq('category_id', category)
    }
    if (format && format !== 'all') {
      countQuery = countQuery.eq('format', format)
    }
    if (search) {
      countQuery = countQuery.or(`
        title.ilike.%${search}%,
        authors.cs.{${search}},
        isbn.ilike.%${search}%,
        subjects.cs.{${search}}
      `)
    }

    const { count } = await countQuery

    return NextResponse.json({
      books,
      pagination: {
        page,
        limit,
        total: count || 0,
        totalPages: Math.ceil((count || 0) / limit)
      }
    })

  } catch (error) {
    console.error('Error in books API:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST /api/admin/library/books - Create a new book
export async function POST(request: NextRequest) {
  try {
    const supabase = createAdminSupabaseClient()
    const body = await request.json()

    const {
      school_id,
      user_id,
      isbn,
      title,
      subtitle,
      authors,
      publisher,
      publication_year,
      edition,
      language,
      pages,
      category_id,
      dewey_decimal,
      call_number,
      format,
      dimensions,
      weight_grams,
      description,
      table_of_contents,
      subjects,
      target_audience,
      reading_level,
      cover_image_url,
      ebook_url,
      preview_url,
      total_copies,
      acquisition_cost,
      supplier,
      is_reference_only,
      is_digital
    } = body

    if (!school_id || !user_id || !title || !authors || !total_copies) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    // Verify user has permission
    const { data: profile } = await supabase
      .from('profiles')
      .select('school_id, role')
      .eq('id', user_id)
      .single()

    if (!profile || profile.school_id !== school_id || !['admin', 'sub-admin'].includes(profile.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    // Check for duplicate ISBN
    if (isbn) {
      const { data: existingBook } = await supabase
        .from('books')
        .select('id')
        .eq('school_id', school_id)
        .eq('isbn', isbn)
        .single()

      if (existingBook) {
        return NextResponse.json({ error: 'Book with this ISBN already exists' }, { status: 409 })
      }
    }

    // Create the book
    const { data: book, error: bookError } = await supabase
      .from('books')
      .insert({
        school_id,
        isbn: isbn || null,
        title,
        subtitle: subtitle || null,
        authors,
        publisher: publisher || null,
        publication_year: publication_year || null,
        edition: edition || null,
        language: language || 'English',
        pages: pages || null,
        category_id: category_id || null,
        dewey_decimal: dewey_decimal || null,
        call_number: call_number || null,
        format: format || 'hardcover',
        dimensions: dimensions || null,
        weight_grams: weight_grams || null,
        description: description || null,
        table_of_contents: table_of_contents || null,
        subjects: subjects || [],
        target_audience: target_audience || null,
        reading_level: reading_level || null,
        cover_image_url: cover_image_url || null,
        ebook_url: ebook_url || null,
        preview_url: preview_url || null,
        total_copies: total_copies || 1,
        available_copies: total_copies || 1,
        acquisition_cost: acquisition_cost || null,
        supplier: supplier || null,
        is_reference_only: is_reference_only || false,
        is_digital: is_digital || false,
        created_by: user_id
      })
      .select()
      .single()

    if (bookError) {
      console.error('Error creating book:', bookError)
      return NextResponse.json({ error: 'Failed to create book' }, { status: 500 })
    }

    // Create book copies if not digital
    if (!is_digital && total_copies > 0) {
      const copies = []
      for (let i = 1; i <= total_copies; i++) {
        copies.push({
          book_id: book.id,
          school_id,
          barcode: `${school_id.slice(-8)}-${book.id.slice(-8)}-${i.toString().padStart(3, '0')}`,
          copy_number: i,
          acquisition_cost,
          created_by: user_id
        })
      }

      const { error: copiesError } = await supabase
        .from('book_copies')
        .insert(copies)

      if (copiesError) {
        console.error('Error creating book copies:', copiesError)
        // Don't fail the entire operation, but log the error
      }
    }

    // Revalidate cache
    revalidateTag(`library-books-${school_id}`)

    return NextResponse.json({ book }, { status: 201 })

  } catch (error) {
    console.error('Error in create book API:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
