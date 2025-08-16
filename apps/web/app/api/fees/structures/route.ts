import { NextRequest, NextResponse } from 'next/server'
import { createAdminSupabaseClient } from '@/lib/supabase'
import {
  getCachedFeeStructures,
  invalidateFeeStructuresCache,
  warmFeeManagementCache
} from '@/lib/cache/fee-management-cache'

// Create Supabase admin client for protected operations
const supabase = createAdminSupabaseClient()

// Types for fee structures - matches actual database schema
interface FeeStructure {
  id?: string
  school_id: string
  name: string
  description?: string
  fee_type: string
  base_amount: number
  currency?: string
  class_id?: string
  grade_level?: number
  academic_year: string
  due_date?: string
  frequency?: string
  installments_allowed?: boolean
  max_installments?: number
  late_fee_enabled?: boolean
  late_fee_amount?: number
  late_fee_percentage?: number
  grace_period_days?: number
  is_active?: boolean
  is_mandatory?: boolean
  auto_assign_new_students?: boolean
  created_by?: string
  created_at?: string
  updated_at?: string
}

// Using comprehensive caching strategy from fee-management-cache.ts

// GET endpoint - Fetch fee structures
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const schoolId = searchParams.get('school_id')
    const userId = searchParams.get('user_id')
    const feeType = searchParams.get('fee_type')
    const academicYear = searchParams.get('academic_year')
    const isActive = searchParams.get('is_active')

    if (!schoolId || !userId) {
      return NextResponse.json(
        { error: 'Missing school_id or user_id parameter' },
        { status: 400 }
      )
    }

    // Get cached data using comprehensive caching strategy
    const feeStructures = await getCachedFeeStructures(schoolId, userId)
    let data = {
      fee_structures: feeStructures,
      timestamp: Date.now()
    }

    // Apply filters if provided
    if (feeType || academicYear || isActive !== null) {
      data.fee_structures = data.fee_structures.filter(structure => {
        if (feeType && structure.fee_type !== feeType) return false
        if (academicYear && structure.academic_year !== academicYear) return false
        if (isActive !== null && structure.is_active !== (isActive === 'true')) return false
        return true
      })
    }

    return NextResponse.json({
      success: true,
      data,
      cached: true,
      timestamp: data.timestamp
    })

  } catch (error) {
    console.error('Error fetching fee structures:', error)
    return NextResponse.json(
      { 
        error: 'Failed to fetch fee structures',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

// POST endpoint - Create new fee structure
export async function POST(request: NextRequest) {
  try {
    const feeStructureData: FeeStructure = await request.json()

    // Validate required fields
    if (!feeStructureData.school_id || !feeStructureData.name || !feeStructureData.fee_type || 
        !feeStructureData.base_amount || !feeStructureData.academic_year) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    // Validate amount is positive
    if (feeStructureData.base_amount <= 0) {
      return NextResponse.json(
        { error: 'Base amount must be positive' },
        { status: 400 }
      )
    }

    // Since we're using admin client, we'll set created_by to null
    // In a real app, you'd get this from the request headers or JWT token

    // Create fee structure - only include fields that exist in the database
    // Handle empty strings for date fields
    const insertData: any = {
      school_id: feeStructureData.school_id,
      name: feeStructureData.name,
      description: feeStructureData.description || null,
      fee_type: feeStructureData.fee_type,
      base_amount: feeStructureData.base_amount,
      currency: feeStructureData.currency || 'USD',
      class_id: feeStructureData.class_id || null,
      grade_level: feeStructureData.grade_level || null,
      academic_year: feeStructureData.academic_year,
      due_date: feeStructureData.due_date && feeStructureData.due_date.trim() !== '' ? feeStructureData.due_date : null,
      frequency: feeStructureData.frequency || 'annual',
      installments_allowed: feeStructureData.installments_allowed || false,
      max_installments: feeStructureData.max_installments || 1,
      late_fee_enabled: feeStructureData.late_fee_enabled || false,
      late_fee_amount: feeStructureData.late_fee_amount || null,
      late_fee_percentage: feeStructureData.late_fee_percentage || null,
      grace_period_days: feeStructureData.grace_period_days || 0,
      is_active: feeStructureData.is_active !== false,
      is_mandatory: feeStructureData.is_mandatory !== false,
      auto_assign_new_students: feeStructureData.auto_assign_new_students || false,
      created_by: null
    }

    const { data: newFeeStructure, error: createError } = await supabase
      .from('fee_structures')
      .insert(insertData)
      .select()
      .single()

    if (createError) {
      console.error('Error creating fee structure:', createError)
      return NextResponse.json(
        { error: 'Failed to create fee structure', details: createError.message },
        { status: 500 }
      )
    }

    // Invalidate cache using comprehensive strategy
    invalidateFeeStructuresCache()

    // Warm cache for better performance
    warmFeeManagementCache(feeStructureData.school_id, 'system')

    return NextResponse.json({
      success: true,
      data: newFeeStructure,
      message: 'Fee structure created successfully'
    })

  } catch (error) {
    console.error('Error creating fee structure:', error)
    return NextResponse.json(
      { 
        error: 'Failed to create fee structure',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

// PUT endpoint - Update fee structure
export async function PUT(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const structureId = searchParams.get('id')
    const updateData: Partial<FeeStructure> = await request.json()

    if (!structureId) {
      return NextResponse.json(
        { error: 'Missing fee structure ID' },
        { status: 400 }
      )
    }

    // Validate amount if provided
    if (updateData.base_amount !== undefined && updateData.base_amount <= 0) {
      return NextResponse.json(
        { error: 'Base amount must be positive' },
        { status: 400 }
      )
    }

    // Update fee structure
    const { data: updatedStructure, error: updateError } = await supabase
      .from('fee_structures')
      .update({
        ...updateData,
        updated_at: new Date().toISOString()
      })
      .eq('id', structureId)
      .select()
      .single()

    if (updateError) {
      console.error('Error updating fee structure:', updateError)
      return NextResponse.json(
        { error: 'Failed to update fee structure', details: updateError.message },
        { status: 500 }
      )
    }

    // Revalidate cache
    revalidateTag('fee-structures')

    return NextResponse.json({
      success: true,
      data: updatedStructure,
      message: 'Fee structure updated successfully'
    })

  } catch (error) {
    console.error('Error updating fee structure:', error)
    return NextResponse.json(
      { 
        error: 'Failed to update fee structure',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

// DELETE endpoint - Delete fee structure
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const structureId = searchParams.get('id')

    if (!structureId) {
      return NextResponse.json(
        { error: 'Missing fee structure ID' },
        { status: 400 }
      )
    }

    // Check if fee structure has assignments
    const { data: assignments, error: assignmentError } = await supabase
      .from('student_fee_assignments')
      .select('id')
      .eq('fee_structure_id', structureId)
      .limit(1)

    if (assignmentError) {
      console.error('Error checking assignments:', assignmentError)
      return NextResponse.json(
        { error: 'Failed to check fee assignments' },
        { status: 500 }
      )
    }

    if (assignments && assignments.length > 0) {
      return NextResponse.json(
        { error: 'Cannot delete fee structure with existing assignments' },
        { status: 400 }
      )
    }

    // Delete fee structure
    const { error: deleteError } = await supabase
      .from('fee_structures')
      .delete()
      .eq('id', structureId)

    if (deleteError) {
      console.error('Error deleting fee structure:', deleteError)
      return NextResponse.json(
        { error: 'Failed to delete fee structure', details: deleteError.message },
        { status: 500 }
      )
    }

    // Revalidate cache
    revalidateTag('fee-structures')

    return NextResponse.json({
      success: true,
      message: 'Fee structure deleted successfully'
    })

  } catch (error) {
    console.error('Error deleting fee structure:', error)
    return NextResponse.json(
      { 
        error: 'Failed to delete fee structure',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}
