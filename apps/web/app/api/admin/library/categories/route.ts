import { NextRequest, NextResponse } from 'next/server'
import { createAdminSupabaseClient } from '@/lib/supabase'
import { revalidateTag } from 'next/cache'

// GET /api/admin/library/categories - Fetch library categories
export async function GET(request: NextRequest) {
  try {
    const supabase = createAdminSupabaseClient()
    const { searchParams } = new URL(request.url)

    const schoolId = searchParams.get('school_id')
    const userId = searchParams.get('user_id')
    const includeInactive = searchParams.get('include_inactive') === 'true'

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

    // Build query
    let query = supabase
      .from('library_categories')
      .select(`
        id,
        name,
        code,
        description,
        color_code,
        parent_category_id,
        is_active,
        created_at,
        parent_category:library_categories!parent_category_id(
          id,
          name,
          code
        )
      `)
      .eq('school_id', schoolId)
      .order('code', { ascending: true })

    // Filter by active status unless specifically requested
    if (!includeInactive) {
      query = query.eq('is_active', true)
    }

    const { data: categories, error } = await query

    if (error) {
      console.error('Error fetching categories:', error)
      return NextResponse.json({ error: 'Failed to fetch categories' }, { status: 500 })
    }

    return NextResponse.json({ categories })

  } catch (error) {
    console.error('Error in categories API:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST /api/admin/library/categories - Create a new category
export async function POST(request: NextRequest) {
  try {
    const supabase = createAdminSupabaseClient()
    const body = await request.json()

    const {
      school_id,
      user_id,
      name,
      code,
      description,
      parent_category_id,
      color_code
    } = body

    if (!school_id || !user_id || !name) {
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

    // Check for duplicate name or code
    const { data: existingCategory } = await supabase
      .from('library_categories')
      .select('id')
      .eq('school_id', school_id)
      .or(`name.eq.${name}${code ? `,code.eq.${code}` : ''}`)
      .single()

    if (existingCategory) {
      return NextResponse.json({ error: 'Category with this name or code already exists' }, { status: 409 })
    }

    // Create the category
    const { data: category, error: categoryError } = await supabase
      .from('library_categories')
      .insert({
        school_id,
        name,
        code,
        description,
        parent_category_id,
        color_code: color_code || '#3B82F6',
        created_by: user_id
      })
      .select()
      .single()

    if (categoryError) {
      console.error('Error creating category:', categoryError)
      return NextResponse.json({ error: 'Failed to create category' }, { status: 500 })
    }

    // Revalidate cache
    revalidateTag(`library-categories-${school_id}`)

    return NextResponse.json({ category }, { status: 201 })

  } catch (error) {
    console.error('Error in create category API:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// PUT /api/admin/library/categories - Update a category
export async function PUT(request: NextRequest) {
  try {
    const supabase = createAdminSupabaseClient()
    const body = await request.json()

    const {
      id,
      school_id,
      user_id,
      name,
      code,
      description,
      parent_category_id,
      color_code,
      is_active
    } = body

    if (!id || !school_id || !user_id) {
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

    // Check if category exists and belongs to school
    const { data: existingCategory } = await supabase
      .from('library_categories')
      .select('id')
      .eq('id', id)
      .eq('school_id', school_id)
      .single()

    if (!existingCategory) {
      return NextResponse.json({ error: 'Category not found' }, { status: 404 })
    }

    // Check for duplicate name or code (excluding current category)
    if (name || code) {
      const conditions = []
      if (name) conditions.push(`name.eq.${name}`)
      if (code) conditions.push(`code.eq.${code}`)

      const { data: duplicateCategory } = await supabase
        .from('library_categories')
        .select('id')
        .eq('school_id', school_id)
        .neq('id', id)
        .or(conditions.join(','))
        .single()

      if (duplicateCategory) {
        return NextResponse.json({ error: 'Category with this name or code already exists' }, { status: 409 })
      }
    }

    // Update the category
    const updateData: any = {
      updated_at: new Date().toISOString()
    }

    if (name !== undefined) updateData.name = name
    if (code !== undefined) updateData.code = code
    if (description !== undefined) updateData.description = description
    if (parent_category_id !== undefined) updateData.parent_category_id = parent_category_id
    if (color_code !== undefined) updateData.color_code = color_code
    if (is_active !== undefined) updateData.is_active = is_active

    const { data: category, error: updateError } = await supabase
      .from('library_categories')
      .update(updateData)
      .eq('id', id)
      .eq('school_id', school_id)
      .select()
      .single()

    if (updateError) {
      console.error('Error updating category:', updateError)
      return NextResponse.json({ error: 'Failed to update category' }, { status: 500 })
    }

    // Revalidate cache
    revalidateTag(`library-categories-${school_id}`)

    return NextResponse.json({ category })

  } catch (error) {
    console.error('Error updating category:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// DELETE /api/admin/library/categories - Delete a category
export async function DELETE(request: NextRequest) {
  try {
    const supabase = createAdminSupabaseClient()
    const { searchParams } = new URL(request.url)

    const id = searchParams.get('id')
    const schoolId = searchParams.get('school_id')
    const userId = searchParams.get('user_id')

    if (!id || !schoolId || !userId) {
      return NextResponse.json({ error: 'Missing required parameters' }, { status: 400 })
    }

    // Verify user has permission
    const { data: profile } = await supabase
      .from('profiles')
      .select('school_id, role')
      .eq('id', userId)
      .single()

    if (!profile || profile.school_id !== schoolId || !['admin', 'sub-admin'].includes(profile.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    // Check if category has books
    const { data: booksInCategory } = await supabase
      .from('books')
      .select('id')
      .eq('category_id', id)
      .eq('school_id', schoolId)

    if (booksInCategory && booksInCategory.length > 0) {
      return NextResponse.json({ 
        error: 'Cannot delete category that contains books' 
      }, { status: 409 })
    }

    // Check if category has subcategories
    const { data: subcategories } = await supabase
      .from('library_categories')
      .select('id')
      .eq('parent_category_id', id)
      .eq('school_id', schoolId)

    if (subcategories && subcategories.length > 0) {
      return NextResponse.json({ 
        error: 'Cannot delete category that has subcategories' 
      }, { status: 409 })
    }

    // Delete the category
    const { error: deleteError } = await supabase
      .from('library_categories')
      .delete()
      .eq('id', id)
      .eq('school_id', schoolId)

    if (deleteError) {
      console.error('Error deleting category:', deleteError)
      return NextResponse.json({ error: 'Failed to delete category' }, { status: 500 })
    }

    // Revalidate cache
    revalidateTag(`library-categories-${schoolId}`)

    return NextResponse.json({ message: 'Category deleted successfully' })

  } catch (error) {
    console.error('Error deleting category:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
