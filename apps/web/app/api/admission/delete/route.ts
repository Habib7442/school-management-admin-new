import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(request: NextRequest) {
  try {
    const { applicationId, adminId, reason } = await request.json()

    if (!applicationId || !adminId) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields' },
        { status: 400 }
      )
    }

    // Get the application details first
    const { data: application, error: fetchError } = await supabase
      .from('admissions')
      .select('*')
      .eq('id', applicationId)
      .single()

    if (fetchError || !application) {
      return NextResponse.json(
        { success: false, error: 'Application not found' },
        { status: 404 }
      )
    }

    // Only allow deletion of accepted applications
    if (application.status !== 'accepted') {
      return NextResponse.json(
        { success: false, error: 'Only accepted applications can be deleted' },
        { status: 400 }
      )
    }

    let deletedFiles = 0

    // Delete files from storage if they exist
    const filesToDelete = []
    
    if (application.photograph_url) {
      // Extract file path from URL
      const photoPath = application.photograph_url.split('/').pop()
      if (photoPath) {
        filesToDelete.push(`admissions/${applicationId}/photograph/${photoPath}`)
      }
    }

    if (application.documents && Array.isArray(application.documents)) {
      application.documents.forEach((doc: any) => {
        if (doc.url) {
          const docPath = doc.url.split('/').pop()
          if (docPath) {
            filesToDelete.push(`admissions/${applicationId}/documents/${docPath}`)
          }
        }
      })
    }

    // Delete files from Supabase Storage
    if (filesToDelete.length > 0) {
      const { error: storageError } = await supabase.storage
        .from('admission-files')
        .remove(filesToDelete)

      if (storageError) {
        console.warn('Some files could not be deleted from storage:', storageError)
      } else {
        deletedFiles = filesToDelete.length
      }
    }

    // Delete the application record
    const { error: deleteError } = await supabase
      .from('admissions')
      .delete()
      .eq('id', applicationId)

    if (deleteError) {
      throw new Error(`Failed to delete application: ${deleteError.message}`)
    }

    // Log the deletion action
    console.log(`Application ${applicationId} deleted by admin ${adminId}. Reason: ${reason}`)

    return NextResponse.json({
      success: true,
      message: 'Application deleted successfully',
      deletedFiles,
      applicationId
    })

  } catch (error) {
    console.error('Error in delete API:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Internal server error' 
      },
      { status: 500 }
    )
  }
}
