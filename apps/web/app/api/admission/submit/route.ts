import { NextRequest, NextResponse } from 'next/server'
import { createAdminSupabaseClient } from '@/lib/supabase'

// Create Supabase client with service role key for admin operations
const supabaseAdmin = createAdminSupabaseClient()

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    
    // Extract form fields
    const full_name = formData.get('full_name') as string
    const email = formData.get('email') as string
    const phone = formData.get('phone') as string
    const date_of_birth = formData.get('date_of_birth') as string
    const gender = formData.get('gender') as string
    const class_applying = formData.get('class_level') as string
    const address = formData.get('address') as string
    const parent_name = formData.get('parent_name') as string
    const parent_phone = formData.get('parent_phone') as string
    const parent_email = formData.get('parent_email') as string
    const photograph = formData.get('photograph') as File

    console.log('Admission form submission:', { full_name, email, class_applying })

    // Validate required fields
    if (!full_name || !email || !phone || !date_of_birth || !parent_name || !parent_phone || !class_applying) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields' },
        { status: 400 }
      )
    }

    if (!photograph) {
      return NextResponse.json(
        { success: false, error: 'Student photograph is required' },
        { status: 400 }
      )
    }

    // Check if email already exists in admissions
    const { data: existingAdmission } = await supabaseAdmin
      .from('admissions')
      .select('email')
      .eq('email', email.toLowerCase())
      .single()

    if (existingAdmission) {
      return NextResponse.json(
        { success: false, error: 'An application with this email already exists' },
        { status: 400 }
      )
    }

    // Check if email already exists in profiles (existing students)
    const { data: existingProfile } = await supabaseAdmin
      .from('profiles')
      .select('email')
      .eq('email', email.toLowerCase())
      .single()

    if (existingProfile) {
      return NextResponse.json(
        { success: false, error: 'A user with this email already exists in the system' },
        { status: 400 }
      )
    }

    // Get default school ID (you might want to make this configurable)
    const { data: schools } = await supabaseAdmin
      .from('schools')
      .select('id')
      .limit(1)

    if (!schools || schools.length === 0) {
      return NextResponse.json(
        { success: false, error: 'No school found in the system' },
        { status: 500 }
      )
    }

    const school_id = schools[0].id

    // Upload photograph to Supabase Storage
    const photographFileName = `${Date.now()}_${photograph.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`
    const { data: photographUpload, error: photographError } = await supabaseAdmin.storage
      .from('admission-documents')
      .upload(`photographs/${photographFileName}`, photograph, {
        cacheControl: '3600',
        upsert: false
      })

    if (photographError) {
      console.error('Photograph upload error:', photographError)
      return NextResponse.json(
        { success: false, error: 'Failed to upload photograph' },
        { status: 500 }
      )
    }

    // Get photograph URL
    const { data: photographUrl } = supabaseAdmin.storage
      .from('admission-documents')
      .getPublicUrl(photographUpload.path)

    // Handle additional documents
    const documents = []
    let docIndex = 0
    while (formData.get(`document_${docIndex}`)) {
      const doc = formData.get(`document_${docIndex}`) as File
      const docFileName = `${Date.now()}_${docIndex}_${doc.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`
      
      const { data: docUpload, error: docError } = await supabaseAdmin.storage
        .from('admission-documents')
        .upload(`documents/${docFileName}`, doc, {
          cacheControl: '3600',
          upsert: false
        })

      if (!docError && docUpload) {
        const { data: docUrl } = supabaseAdmin.storage
          .from('admission-documents')
          .getPublicUrl(docUpload.path)

        documents.push({
          id: `doc_${docIndex}`,
          name: doc.name,
          url: docUrl.publicUrl,
          type: doc.type,
          size: doc.size,
          uploaded_at: new Date().toISOString()
        })
      }
      
      docIndex++
    }

    // Create admission record
    const { data: admission, error: admissionError } = await supabaseAdmin
      .from('admissions')
      .insert({
        full_name,
        email: email.toLowerCase(),
        phone,
        date_of_birth,
        gender,
        class_level: class_applying,
        address,
        parent_name,
        parent_phone,
        parent_email: parent_email || null,
        photograph_url: photographUrl.publicUrl,
        documents: documents,
        status: 'pending',
        school_id
      })
      .select('id')
      .single()

    if (admissionError) {
      console.error('Admission creation error:', admissionError)
      // Clean up uploaded files if admission creation fails
      await supabaseAdmin.storage
        .from('admission-documents')
        .remove([photographUpload.path])
      
      return NextResponse.json(
        { success: false, error: 'Failed to create admission record' },
        { status: 500 }
      )
    }

    console.log('Admission created successfully:', admission.id)

    // TODO: Send confirmation email to applicant
    // TODO: Send notification email to admins

    return NextResponse.json({
      success: true,
      applicationId: admission.id,
      message: 'Application submitted successfully'
    })

  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}
