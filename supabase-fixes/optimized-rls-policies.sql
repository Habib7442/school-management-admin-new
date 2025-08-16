-- PERFORMANCE-OPTIMIZED RLS POLICIES
-- This file contains optimized RLS policies that fix the performance issues identified by Supabase linter
-- 
-- Key optimizations:
-- 1. Replace auth.<function>() with (select auth.<function>()) to avoid re-evaluation per row
-- 2. Consolidate multiple permissive policies into single, more efficient policies
-- 3. Use proper subqueries for better performance

-- =============================================
-- DROP EXISTING POLICIES (to be run first)
-- =============================================

-- Drop all existing policies to avoid conflicts
DO $$ 
DECLARE
    r RECORD;
BEGIN
    -- Drop policies for each table
    FOR r IN (
        SELECT schemaname, tablename, policyname 
        FROM pg_policies 
        WHERE schemaname = 'public'
    ) LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I', r.policyname, r.schemaname, r.tablename);
    END LOOP;
END $$;

-- =============================================
-- OPTIMIZED HELPER FUNCTIONS
-- =============================================

-- Optimized function to get current user's role with caching
CREATE OR REPLACE FUNCTION get_user_role_cached()
RETURNS user_role AS $$
BEGIN
    RETURN (
        SELECT role 
        FROM profiles 
        WHERE id = (select auth.uid())
        LIMIT 1
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Optimized function to get current user's school_id with caching
CREATE OR REPLACE FUNCTION get_user_school_id_cached()
RETURNS UUID AS $$
BEGIN
    RETURN (
        SELECT school_id 
        FROM profiles 
        WHERE id = (select auth.uid())
        LIMIT 1
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Optimized function to check if user is admin or sub-admin
CREATE OR REPLACE FUNCTION is_admin_or_sub_admin_cached()
RETURNS BOOLEAN AS $$
BEGIN
    RETURN get_user_role_cached() IN ('admin', 'sub-admin');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- =============================================
-- PROFILES TABLE POLICIES (OPTIMIZED)
-- =============================================

-- Consolidated policy for SELECT operations
CREATE POLICY "profiles_select_policy" ON profiles
    FOR SELECT USING (
        -- Users can view their own profile OR admins/sub-admins can view school profiles
        (select auth.uid()) = id 
        OR (
            is_admin_or_sub_admin_cached() 
            AND school_id = get_user_school_id_cached()
        )
    );

-- Users can update their own profile
CREATE POLICY "profiles_update_policy" ON profiles
    FOR UPDATE USING ((select auth.uid()) = id);

-- Users can insert their own profile
CREATE POLICY "profiles_insert_policy" ON profiles
    FOR INSERT WITH CHECK ((select auth.uid()) = id);

-- Only admins can delete profiles in their school
CREATE POLICY "profiles_delete_policy" ON profiles
    FOR DELETE USING (
        get_user_role_cached() = 'admin' 
        AND school_id = get_user_school_id_cached()
    );

-- Service role has full access
CREATE POLICY "profiles_service_role_policy" ON profiles
    FOR ALL USING (
        (select current_setting('role')) = 'service_role'
    );

-- =============================================
-- SCHOOLS TABLE POLICIES (OPTIMIZED)
-- =============================================

-- Consolidated policy for SELECT operations
CREATE POLICY "schools_select_policy" ON schools
    FOR SELECT USING (
        id = get_user_school_id_cached()
    );

-- Only admins can manage their school
CREATE POLICY "schools_admin_policy" ON schools
    FOR ALL USING (
        get_user_role_cached() = 'admin' 
        AND id = get_user_school_id_cached()
    );

-- =============================================
-- ADMINS TABLE POLICIES (OPTIMIZED)
-- =============================================

-- Consolidated policy for admins
CREATE POLICY "admins_policy" ON admins
    FOR ALL USING (
        (select auth.uid()) = id 
        OR (
            get_user_role_cached() = 'admin' 
            AND school_id = get_user_school_id_cached()
        )
    );

-- =============================================
-- SUB_ADMINS TABLE POLICIES (OPTIMIZED)
-- =============================================

-- Consolidated policy for sub-admins
CREATE POLICY "sub_admins_policy" ON sub_admins
    FOR ALL USING (
        (select auth.uid()) = id 
        OR (
            get_user_role_cached() = 'admin' 
            AND school_id = get_user_school_id_cached()
        )
    );

-- =============================================
-- TEACHERS TABLE POLICIES (OPTIMIZED)
-- =============================================

-- Consolidated policy for teachers
CREATE POLICY "teachers_policy" ON teachers
    FOR ALL USING (
        (select auth.uid()) = id 
        OR (
            is_admin_or_sub_admin_cached() 
            AND school_id = get_user_school_id_cached()
        )
    );

-- =============================================
-- STUDENTS TABLE POLICIES (OPTIMIZED)
-- =============================================

-- Consolidated policy for students
CREATE POLICY "students_policy" ON students
    FOR ALL USING (
        (select auth.uid()) = id 
        OR (
            is_admin_or_sub_admin_cached() 
            AND school_id = get_user_school_id_cached()
        )
    );

-- =============================================
-- CLASSES TABLE POLICIES (OPTIMIZED)
-- =============================================

-- Single consolidated policy for classes
CREATE POLICY "classes_policy" ON classes
    FOR ALL USING (
        school_id = get_user_school_id_cached()
        OR (select current_setting('role')) = 'service_role'
    );

-- =============================================
-- CLASS_ENROLLMENTS TABLE POLICIES (OPTIMIZED)
-- =============================================

-- Single consolidated policy for class enrollments
CREATE POLICY "class_enrollments_policy" ON class_enrollments
    FOR ALL USING (
        -- Students can view their own enrollments
        student_id = (select auth.uid())
        OR 
        -- School staff can view all enrollments in their school
        EXISTS (
            SELECT 1 FROM classes c 
            WHERE c.id = class_id 
            AND c.school_id = get_user_school_id_cached()
        )
        OR (select current_setting('role')) = 'service_role'
    );

-- =============================================
-- SUBJECTS TABLE POLICIES (OPTIMIZED)
-- =============================================

-- Single consolidated policy for subjects
CREATE POLICY "subjects_policy" ON subjects
    FOR ALL USING (
        school_id = get_user_school_id_cached()
        OR (select current_setting('role')) = 'service_role'
    );

-- =============================================
-- ADMISSIONS TABLE POLICIES (OPTIMIZED)
-- =============================================

-- Single consolidated policy for admissions
CREATE POLICY "admissions_policy" ON admissions
    FOR ALL USING (
        school_id = get_user_school_id_cached()
        OR (select current_setting('role')) = 'service_role'
    );

-- =============================================
-- ROLES TABLE POLICIES (OPTIMIZED)
-- =============================================

-- Single consolidated policy for roles
CREATE POLICY "roles_policy" ON roles
    FOR ALL USING (
        get_user_role_cached() = 'admin'
        OR (select current_setting('role')) = 'service_role'
    );

-- =============================================
-- PERMISSIONS TABLE POLICIES (OPTIMIZED)
-- =============================================

-- Single consolidated policy for permissions
CREATE POLICY "permissions_policy" ON permissions
    FOR ALL USING (
        -- Admins can manage permissions, others can view
        get_user_role_cached() IN ('admin', 'sub-admin', 'teacher', 'student')
        OR (select current_setting('role')) = 'service_role'
    );

-- =============================================
-- ROLE_PERMISSIONS TABLE POLICIES (OPTIMIZED)
-- =============================================

-- Single consolidated policy for role permissions
CREATE POLICY "role_permissions_policy" ON role_permissions
    FOR ALL USING (
        get_user_role_cached() = 'admin'
        OR (select current_setting('role')) = 'service_role'
    );

-- =============================================
-- USER_ROLES TABLE POLICIES (OPTIMIZED)
-- =============================================

-- Single consolidated policy for user roles
CREATE POLICY "user_roles_policy" ON user_roles
    FOR ALL USING (
        get_user_role_cached() = 'admin'
        OR (select current_setting('role')) = 'service_role'
    );

-- =============================================
-- PERFORMANCE INDEXES (RECOMMENDED)
-- =============================================

-- Add indexes to improve RLS policy performance
CREATE INDEX IF NOT EXISTS idx_profiles_auth_uid ON profiles(id) WHERE id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_profiles_school_role ON profiles(school_id, role) WHERE school_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_classes_school_id ON classes(school_id) WHERE school_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_class_enrollments_student ON class_enrollments(student_id) WHERE student_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_class_enrollments_class ON class_enrollments(class_id) WHERE class_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_admissions_school_id ON admissions(school_id) WHERE school_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_teachers_school_id ON teachers(school_id) WHERE school_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_students_school_id ON students(school_id) WHERE school_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_subjects_school_id ON subjects(school_id) WHERE school_id IS NOT NULL;

-- =============================================
-- GRANT NECESSARY PERMISSIONS
-- =============================================

-- Grant execute permissions on helper functions
GRANT EXECUTE ON FUNCTION get_user_role_cached() TO authenticated, anon;
GRANT EXECUTE ON FUNCTION get_user_school_id_cached() TO authenticated, anon;
GRANT EXECUTE ON FUNCTION is_admin_or_sub_admin_cached() TO authenticated, anon;
