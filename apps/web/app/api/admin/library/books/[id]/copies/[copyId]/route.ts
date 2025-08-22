import { NextRequest, NextResponse } from 'next/server'
import { createAdminSupabaseClient } from '@/lib/supabase'

// DELETE /api/admin/library/books/[id]/copies/[copyId] - Delete a specific copy
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string; copyId: string } }
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

    if (!profile || profile.school_id !== schoolId || !['admin', 'sub-admin'].includes(profile.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    // Check if copy exists and is not borrowed
    const { data: copy } = await supabase
      .from('book_copies')
      .select('id, status, book_id')
      .eq('id', params.copyId)
      .eq('book_id', params.id)
      .eq('school_id', schoolId)
      .single()

    if (!copy) {
      return NextResponse.json({ error: 'Copy not found' }, { status: 404 })
    }

    if (copy.status === 'borrowed') {
      return NextResponse.json({ 
        error: 'Cannot delete a copy that is currently borrowed' 
      }, { status: 409 })
    }

    // Check if there are active transactions for this copy
    const { data: activeTransactions } = await supabase
      .from('borrowing_transactions')
      .select('id')
      .eq('book_copy_id', params.copyId)
      .eq('status', 'active')

    if (activeTransactions && activeTransactions.length > 0) {
      return NextResponse.json({ 
        error: 'Cannot delete copy with active borrowing transactions' 
      }, { status: 409 })
    }

    // Delete the copy
    const { error: deleteError } = await supabase
      .from('book_copies')
      .delete()
      .eq('id', params.copyId)
      .eq('school_id', schoolId)

    if (deleteError) {
      console.error('Error deleting book copy:', deleteError)
      return NextResponse.json({ error: 'Failed to delete book copy' }, { status: 500 })
    }

    return NextResponse.json({ message: 'Copy deleted successfully' })

  } catch (error) {
    console.error('Error deleting book copy:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
