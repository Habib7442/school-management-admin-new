-- =============================================
-- FIX MISSING TEACHERS RECORDS
-- This script fixes the issue where profiles with role='teacher' 
-- exist but don't have corresponding records in the teachers table
-- =============================================

-- First, let's see what we're dealing with
-- (This is just for information - comment out in production)
/*
SELECT 
    p.id,
    p.name,
    p.email,
    p.school_id,
    p.role,
    t.id as teacher_record_exists
FROM profiles p
LEFT JOIN teachers t ON p.id = t.id
WHERE p.role = 'teacher'
ORDER BY p.name;
*/

-- Insert missing teacher records for existing teacher profiles
INSERT INTO teachers (
    id,
    school_id,
    employee_id,
    designation,
    joining_date,
    is_active,
    created_at,
    updated_at
)
SELECT 
    p.id,
    p.school_id,
    'EMP' || EXTRACT(EPOCH FROM NOW())::bigint || ROW_NUMBER() OVER (ORDER BY p.created_at), -- Generate unique employee ID
    'Teacher', -- Default designation
    COALESCE(p.created_at::date, CURRENT_DATE), -- Use profile creation date or today
    true, -- Active by default
    COALESCE(p.created_at, NOW()), -- Use profile creation time or now
    NOW() -- Updated now
FROM profiles p
LEFT JOIN teachers t ON p.id = t.id
WHERE p.role = 'teacher' 
  AND t.id IS NULL -- Only insert where teacher record doesn't exist
  AND p.school_id IS NOT NULL; -- Only for profiles with valid school_id

-- Verify the fix
-- (This is just for verification - comment out in production)
/*
SELECT 
    COUNT(*) as total_teacher_profiles,
    COUNT(t.id) as teacher_records_created,
    COUNT(*) - COUNT(t.id) as still_missing
FROM profiles p
LEFT JOIN teachers t ON p.id = t.id
WHERE p.role = 'teacher';
*/

-- Update any classes that might have invalid teacher assignments
-- Set class_teacher_id to NULL where the referenced teacher doesn't exist
UPDATE classes 
SET class_teacher_id = NULL,
    updated_at = NOW()
WHERE class_teacher_id IS NOT NULL 
  AND class_teacher_id NOT IN (SELECT id FROM teachers);

-- Optional: Add some default values for existing teacher records that might be missing data
UPDATE teachers 
SET 
    employee_id = COALESCE(employee_id, 'EMP' || EXTRACT(EPOCH FROM NOW())::bigint || id::text),
    designation = COALESCE(designation, 'Teacher'),
    joining_date = COALESCE(joining_date, created_at::date, CURRENT_DATE),
    is_active = COALESCE(is_active, true),
    updated_at = NOW()
WHERE employee_id IS NULL 
   OR designation IS NULL 
   OR joining_date IS NULL 
   OR is_active IS NULL;

-- Create indexes for better performance if they don't exist
CREATE INDEX IF NOT EXISTS idx_teachers_school_id ON teachers(school_id);
CREATE INDEX IF NOT EXISTS idx_teachers_employee_id ON teachers(employee_id);
CREATE INDEX IF NOT EXISTS idx_teachers_is_active ON teachers(is_active);
CREATE INDEX IF NOT EXISTS idx_classes_teacher_id ON classes(class_teacher_id);

-- Add a comment to track when this fix was applied
COMMENT ON TABLE teachers IS 'Teacher records - Fixed missing records on ' || NOW()::date;
