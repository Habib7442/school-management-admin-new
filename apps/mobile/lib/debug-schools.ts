import { supabase } from './supabase'

// Debug function to check what schools exist
export const debugSchools = async () => {
  try {
    console.log('🔍 Checking schools in database...')
    
    // Get all schools
    const { data: schools, error } = await supabase
      .from('schools')
      .select('id, name, school_code, is_active, created_at')
      .order('created_at', { ascending: false })

    if (error) {
      console.error('❌ Error fetching schools:', error)
      return { error: error.message }
    }

    console.log('📚 Schools found:', schools?.length || 0)
    
    if (schools && schools.length > 0) {
      schools.forEach((school, index) => {
        console.log(`${index + 1}. ${school.name}`)
        console.log(`   Code: ${school.school_code}`)
        console.log(`   Active: ${school.is_active}`)
        console.log(`   Created: ${school.created_at}`)
        console.log('   ---')
      })
    } else {
      console.log('❌ No schools found in database')
    }

    return { schools }
  } catch (error) {
    console.error('💥 Exception while checking schools:', error)
    return { error: 'Failed to check schools' }
  }
}

// Test school code validation
export const testSchoolCodeValidation = async (schoolCode: string) => {
  try {
    console.log(`🧪 Testing school code validation for: "${schoolCode}"`)
    
    const { data, error } = await supabase
      .from('schools')
      .select('id, name, school_code, is_active')
      .eq('school_code', schoolCode.toUpperCase())
      .single()

    console.log('📊 Query result:', { data, error })

    if (error) {
      if (error.code === 'PGRST116') {
        console.log('❌ No school found with this code')
        return { found: false, reason: 'School code not found' }
      } else {
        console.log('❌ Database error:', error.message)
        return { found: false, reason: error.message }
      }
    }

    if (!data.is_active) {
      console.log('⚠️ School found but not active')
      return { found: false, reason: 'School is not active' }
    }

    console.log('✅ School code validation successful')
    return { found: true, school: data }
  } catch (error) {
    console.error('💥 Exception during validation:', error)
    return { found: false, reason: 'Validation failed' }
  }
}
