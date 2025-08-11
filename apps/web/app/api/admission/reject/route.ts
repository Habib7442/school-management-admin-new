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

export async function POST(request: NextRequest) {
  try {
    const { applicationId, adminId, reason } = await request.json()

    console.log('Rejecting admission application:', { applicationId, adminId, reason })

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

    if (admission.status === 'rejected') {
      return NextResponse.json(
        { success: false, error: 'Application has already been rejected' },
        { status: 400 }
      )
    }

    if (admission.status === 'accepted') {
      return NextResponse.json(
        { success: false, error: 'Cannot reject an already accepted application' },
        { status: 400 }
      )
    }

    console.log('Found admission to reject:', admission.id)

    // Collect all file paths to delete
    const filesToDelete: string[] = []

    // Add photograph to deletion list
    if (admission.photograph_url) {
      try {
        const url = new URL(admission.photograph_url)
        const pathParts = url.pathname.split('/')
        const bucketIndex = pathParts.findIndex(part => part === 'admission-documents')
        if (bucketIndex !== -1 && bucketIndex < pathParts.length - 1) {
          const filePath = pathParts.slice(bucketIndex + 1).join('/')
          filesToDelete.push(filePath)
          console.log('Added photograph to deletion list:', filePath)
        }
      } catch (error) {
        console.error('Error parsing photograph URL:', error)
      }
    }

    // Add documents to deletion list
    if (admission.documents && Array.isArray(admission.documents)) {
      for (const doc of admission.documents) {
        if (doc.url) {
          try {
            const url = new URL(doc.url)
            const pathParts = url.pathname.split('/')
            const bucketIndex = pathParts.findIndex(part => part === 'admission-documents')
            if (bucketIndex !== -1 && bucketIndex < pathParts.length - 1) {
              const filePath = pathParts.slice(bucketIndex + 1).join('/')
              filesToDelete.push(filePath)
              console.log('Added document to deletion list:', filePath)
            }
          } catch (error) {
            console.error('Error parsing document URL:', error)
          }
        }
      }
    }

    // Delete files from Supabase Storage
    if (filesToDelete.length > 0) {
      console.log('Deleting files:', filesToDelete)
      const { error: deleteError } = await supabaseAdmin.storage
        .from('admission-documents')
        .remove(filesToDelete)

      if (deleteError) {
        console.error('Error deleting files:', deleteError)
        // Continue with rejection even if file deletion fails
      } else {
        console.log('Successfully deleted files')
      }
    }

    // Delete the admission record completely
    const { error: deleteAdmissionError } = await supabaseAdmin
      .from('admissions')
      .delete()
      .eq('id', applicationId)

    if (deleteAdmissionError) {
      console.error('Error deleting admission record:', deleteAdmissionError)
      return NextResponse.json(
        { success: false, error: 'Failed to delete admission record' },
        { status: 500 }
      )
    }

    console.log('Admission rejected and deleted successfully:', applicationId)

    // TODO: Send rejection email to applicant
    // TODO: Log the rejection for audit purposes in a separate audit table

    return NextResponse.json({
      success: true,
      message: 'Application rejected and data cleaned up successfully',
      deletedFiles: filesToDelete.length,
      reason: reason || 'No reason provided'
    })

  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}
