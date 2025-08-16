-- Fix Performance Issues in RLS Policies
-- This script addresses the performance issues identified in performance-issues.json

-- =============================================
-- PART 1: FIX AUTH RLS INITIALIZATION PLAN ISSUES
-- =============================================

-- The issue: auth.uid() and current_setting() calls are being re-evaluated for each row
-- The fix: Wrap auth functions with (select auth.function()) to cache the result

-- First, let's drop all existing problematic policies and recreate them with optimized versions

-- =============================================
-- EXAM_TYPES TABLE - OPTIMIZED POLICIES
-- =============================================

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view school exam types" ON exam_types;
DROP POLICY IF EXISTS "Admins can manage school exam types" ON exam_types;

-- Create optimized policies with cached auth functions
CREATE POLICY "exam_types_select_policy" ON exam_types
    FOR SELECT USING (
        school_id = (
            SELECT school_id 
            FROM profiles 
            WHERE id = (select auth.uid())
        )
    );

CREATE POLICY "exam_types_all_policy" ON exam_types
    FOR ALL USING (
        (
            SELECT role 
            FROM profiles 
            WHERE id = (select auth.uid())
        ) IN ('admin', 'sub-admin')
        AND school_id = (
            SELECT school_id 
            FROM profiles 
            WHERE id = (select auth.uid())
        )
    );

-- =============================================
-- EXAMS TABLE - OPTIMIZED POLICIES
-- =============================================

-- Drop existing policies
DROP POLICY IF EXISTS "Teachers can view exams" ON exams;
DROP POLICY IF EXISTS "Teachers can update exam publication status" ON exams;
DROP POLICY IF EXISTS "Admins can manage all exams" ON exams;
DROP POLICY IF EXISTS "Students can view published exams for their classes" ON exams;

-- Create single consolidated policy for better performance
CREATE POLICY "exams_consolidated_policy" ON exams
    FOR ALL USING (
        -- Cache the user's role and school_id
        EXISTS (
            SELECT 1 FROM profiles p
            WHERE p.id = (select auth.uid())
            AND (
                -- Admins can manage all exams in their school
                (p.role IN ('admin', 'sub-admin') AND exams.school_id = p.school_id)
                OR
                -- Teachers can view/update exams in their school
                (p.role = 'teacher' AND exams.school_id = p.school_id)
                OR
                -- Students can view published exams for their classes
                (p.role = 'student' AND exams.grades_published = true 
                 AND EXISTS (
                     SELECT 1 FROM class_enrollments ce 
                     WHERE ce.class_id = exams.class_id 
                     AND ce.student_id = p.id 
                     AND ce.status = 'active'
                 ))
            )
        )
    );

-- =============================================
-- EXAM_GRADES TABLE - OPTIMIZED POLICIES
-- =============================================

-- Drop existing policies
DROP POLICY IF EXISTS "Students can view their own published grades" ON exam_grades;
DROP POLICY IF EXISTS "Teachers can manage grades" ON exam_grades;
DROP POLICY IF EXISTS "Admins can manage all grades" ON exam_grades;

-- Create single consolidated policy
CREATE POLICY "exam_grades_consolidated_policy" ON exam_grades
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM profiles p
            WHERE p.id = (select auth.uid())
            AND (
                -- Students can view their own published grades
                (p.role = 'student' 
                 AND exam_grades.student_id = p.id
                 AND EXISTS (
                     SELECT 1 FROM exams e 
                     WHERE e.id = exam_grades.exam_id 
                     AND e.grades_published = true
                 ))
                OR
                -- Teachers and admins can manage grades in their school
                (p.role IN ('admin', 'sub-admin', 'teacher')
                 AND EXISTS (
                     SELECT 1 FROM exams e 
                     WHERE e.id = exam_grades.exam_id 
                     AND e.school_id = p.school_id
                 ))
            )
        )
    );

-- =============================================
-- REPORT_CARDS TABLE - OPTIMIZED POLICIES
-- =============================================

-- Drop existing policies
DROP POLICY IF EXISTS "Students can view their own published report cards" ON report_cards;
DROP POLICY IF EXISTS "Teachers can view report cards" ON report_cards;
DROP POLICY IF EXISTS "Admins can manage all report cards" ON report_cards;

-- Create single consolidated policy
CREATE POLICY "report_cards_consolidated_policy" ON report_cards
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM profiles p
            WHERE p.id = (select auth.uid())
            AND (
                -- Students can view their own published report cards
                (p.role = 'student' 
                 AND report_cards.student_id = p.id
                 AND report_cards.status = 'published')
                OR
                -- Teachers and admins can manage report cards in their school
                (p.role IN ('admin', 'sub-admin', 'teacher')
                 AND EXISTS (
                     SELECT 1 FROM students s 
                     WHERE s.id = report_cards.student_id 
                     AND s.school_id = p.school_id
                 ))
            )
        )
    );

-- =============================================
-- GRADE_SCALES TABLE - OPTIMIZED POLICIES
-- =============================================

-- Drop existing policies
DROP POLICY IF EXISTS "All users can view active grade scales" ON grade_scales;
DROP POLICY IF EXISTS "Admins can view all grade scales" ON grade_scales;
DROP POLICY IF EXISTS "Admins can manage grade scales" ON grade_scales;

-- Create consolidated policies
CREATE POLICY "grade_scales_select_policy" ON grade_scales
    FOR SELECT USING (
        is_active = true 
        AND school_id = (
            SELECT school_id 
            FROM profiles 
            WHERE id = (select auth.uid())
        )
    );

CREATE POLICY "grade_scales_manage_policy" ON grade_scales
    FOR ALL USING (
        (
            SELECT role 
            FROM profiles 
            WHERE id = (select auth.uid())
        ) IN ('admin', 'sub-admin')
        AND school_id = (
            SELECT school_id 
            FROM profiles 
            WHERE id = (select auth.uid())
        )
    );

-- =============================================
-- GRADE_SCALE_RANGES TABLE - OPTIMIZED POLICIES
-- =============================================

-- Drop existing policies
DROP POLICY IF EXISTS "All users can view grade scale ranges" ON grade_scale_ranges;
DROP POLICY IF EXISTS "Admins can manage grade scale ranges" ON grade_scale_ranges;

-- Create consolidated policies
CREATE POLICY "grade_scale_ranges_select_policy" ON grade_scale_ranges
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM grade_scales gs
            WHERE gs.id = grade_scale_ranges.grade_scale_id
            AND gs.is_active = true
            AND gs.school_id = (
                SELECT school_id 
                FROM profiles 
                WHERE id = (select auth.uid())
            )
        )
    );

CREATE POLICY "grade_scale_ranges_manage_policy" ON grade_scale_ranges
    FOR ALL USING (
        (
            SELECT role 
            FROM profiles 
            WHERE id = (select auth.uid())
        ) IN ('admin', 'sub-admin')
        AND EXISTS (
            SELECT 1 FROM grade_scales gs
            WHERE gs.id = grade_scale_ranges.grade_scale_id
            AND gs.school_id = (
                SELECT school_id 
                FROM profiles 
                WHERE id = (select auth.uid())
            )
        )
    );

-- =============================================
-- STUDENT_ATTENDANCE TABLE - OPTIMIZED POLICIES
-- =============================================

-- Drop existing policies
DROP POLICY IF EXISTS "School admins can manage attendance for their school" ON student_attendance;

-- Create optimized policy
CREATE POLICY "student_attendance_policy" ON student_attendance
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM profiles p
            WHERE p.id = (select auth.uid())
            AND p.role IN ('admin', 'sub-admin', 'teacher')
            AND EXISTS (
                SELECT 1 FROM students s
                WHERE s.id = student_attendance.student_id
                AND s.school_id = p.school_id
            )
        )
    );

-- =============================================
-- SUBJECTS TABLE - OPTIMIZED POLICIES
-- =============================================

-- Drop existing policies that might cause issues
DROP POLICY IF EXISTS "Teachers can manage subjects" ON subjects;

-- The subjects table should already have optimized policies from previous fixes
-- But let's ensure they're properly optimized
CREATE POLICY "subjects_optimized_policy" ON subjects
    FOR ALL USING (
        school_id = (
            SELECT school_id
            FROM profiles
            WHERE id = (select auth.uid())
        )
    );

-- =============================================
-- PART 2: CREATE OPTIMIZED HELPER FUNCTIONS
-- =============================================

-- Create cached functions to improve performance further
CREATE OR REPLACE FUNCTION get_current_user_id()
RETURNS UUID AS $$
BEGIN
    RETURN (select auth.uid());
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

CREATE OR REPLACE FUNCTION get_current_user_role()
RETURNS user_role AS $$
BEGIN
    RETURN (
        SELECT role
        FROM profiles
        WHERE id = get_current_user_id()
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

CREATE OR REPLACE FUNCTION get_current_user_school_id()
RETURNS UUID AS $$
BEGIN
    RETURN (
        SELECT school_id
        FROM profiles
        WHERE id = get_current_user_id()
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- =============================================
-- PART 3: CREATE INDEXES FOR BETTER PERFORMANCE
-- =============================================

-- Add indexes to support the RLS policies efficiently
CREATE INDEX IF NOT EXISTS idx_profiles_id_role_school ON profiles(id, role, school_id);
CREATE INDEX IF NOT EXISTS idx_exam_types_school_active ON exam_types(school_id, is_active);
CREATE INDEX IF NOT EXISTS idx_exams_school_published ON exams(school_id, grades_published);
CREATE INDEX IF NOT EXISTS idx_exam_grades_student_exam ON exam_grades(student_id, exam_id);
CREATE INDEX IF NOT EXISTS idx_students_school_id ON students(school_id, id);
CREATE INDEX IF NOT EXISTS idx_class_enrollments_student_class_status ON class_enrollments(student_id, class_id, status);
CREATE INDEX IF NOT EXISTS idx_grade_scales_school_active ON grade_scales(school_id, is_active);
CREATE INDEX IF NOT EXISTS idx_grade_scale_ranges_scale_id ON grade_scale_ranges(grade_scale_id);
CREATE INDEX IF NOT EXISTS idx_student_attendance_student_date ON student_attendance(student_id, attendance_date);

-- =============================================
-- PART 4: ANALYZE TABLES FOR QUERY OPTIMIZATION
-- =============================================

-- Update table statistics for better query planning
ANALYZE profiles;
ANALYZE exam_types;
ANALYZE exams;
ANALYZE exam_grades;
ANALYZE report_cards;
ANALYZE grade_scales;
ANALYZE grade_scale_ranges;
ANALYZE student_attendance;
ANALYZE subjects;
ANALYZE students;
ANALYZE class_enrollments;
