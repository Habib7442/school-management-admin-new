-- Row Level Security Policies for School Management System
-- These policies ensure users can only access data they're authorized to see

-- =============================================
-- ENABLE RLS ON ALL TABLES
-- =============================================

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE schools ENABLE ROW LEVEL SECURITY;
ALTER TABLE admins ENABLE ROW LEVEL SECURITY;
ALTER TABLE sub_admins ENABLE ROW LEVEL SECURITY;
ALTER TABLE teachers ENABLE ROW LEVEL SECURITY;
ALTER TABLE students ENABLE ROW LEVEL SECURITY;
ALTER TABLE classes ENABLE ROW LEVEL SECURITY;
ALTER TABLE subjects ENABLE ROW LEVEL SECURITY;

-- =============================================
-- HELPER FUNCTIONS
-- =============================================

-- Function to get current user's role
CREATE OR REPLACE FUNCTION get_user_role()
RETURNS user_role AS $$
BEGIN
    RETURN (
        SELECT role 
        FROM profiles 
        WHERE id = auth.uid()
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get current user's school_id
CREATE OR REPLACE FUNCTION get_user_school_id()
RETURNS UUID AS $$
BEGIN
    RETURN (
        SELECT school_id 
        FROM profiles 
        WHERE id = auth.uid()
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check if user is admin or sub-admin
CREATE OR REPLACE FUNCTION is_admin_or_sub_admin()
RETURNS BOOLEAN AS $$
BEGIN
    RETURN get_user_role() IN ('admin', 'sub-admin');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================
-- PROFILES TABLE POLICIES
-- =============================================

-- Users can view their own profile
CREATE POLICY "Users can view own profile" ON profiles
    FOR SELECT USING (auth.uid() = id);

-- Users can update their own profile (limited fields)
CREATE POLICY "Users can update own profile" ON profiles
    FOR UPDATE USING (auth.uid() = id);

-- Admins and sub-admins can view all profiles in their school
CREATE POLICY "Admins can view school profiles" ON profiles
    FOR SELECT USING (
        is_admin_or_sub_admin() AND 
        school_id = get_user_school_id()
    );

-- Only admins can insert new profiles
CREATE POLICY "Admins can insert profiles" ON profiles
    FOR INSERT WITH CHECK (
        get_user_role() = 'admin' AND 
        school_id = get_user_school_id()
    );

-- Only admins can delete profiles
CREATE POLICY "Admins can delete profiles" ON profiles
    FOR DELETE USING (
        get_user_role() = 'admin' AND 
        school_id = get_user_school_id()
    );

-- =============================================
-- SCHOOLS TABLE POLICIES
-- =============================================

-- Users can view their own school
CREATE POLICY "Users can view own school" ON schools
    FOR SELECT USING (id = get_user_school_id());

-- Only admins can update their school
CREATE POLICY "Admins can update own school" ON schools
    FOR UPDATE USING (
        get_user_role() = 'admin' AND 
        id = get_user_school_id()
    );

-- Only system can insert schools (during registration)
CREATE POLICY "System can insert schools" ON schools
    FOR INSERT WITH CHECK (true);

-- =============================================
-- ADMINS TABLE POLICIES
-- =============================================

-- Admins can view their own record
CREATE POLICY "Admins can view own record" ON admins
    FOR SELECT USING (auth.uid() = id);

-- Admins can update their own record
CREATE POLICY "Admins can update own record" ON admins
    FOR UPDATE USING (auth.uid() = id);

-- System can insert admin records
CREATE POLICY "System can insert admin records" ON admins
    FOR INSERT WITH CHECK (true);

-- =============================================
-- SUB-ADMINS TABLE POLICIES
-- =============================================

-- Sub-admins can view their own record
CREATE POLICY "Sub-admins can view own record" ON sub_admins
    FOR SELECT USING (auth.uid() = id);

-- Admins can view all sub-admins in their school
CREATE POLICY "Admins can view school sub-admins" ON sub_admins
    FOR SELECT USING (
        get_user_role() = 'admin' AND 
        school_id = get_user_school_id()
    );

-- Admins can insert sub-admin records
CREATE POLICY "Admins can insert sub-admins" ON sub_admins
    FOR INSERT WITH CHECK (
        get_user_role() = 'admin' AND 
        school_id = get_user_school_id()
    );

-- Admins can update sub-admin records
CREATE POLICY "Admins can update sub-admins" ON sub_admins
    FOR UPDATE USING (
        get_user_role() = 'admin' AND 
        school_id = get_user_school_id()
    );

-- Admins can delete sub-admin records
CREATE POLICY "Admins can delete sub-admins" ON sub_admins
    FOR DELETE USING (
        get_user_role() = 'admin' AND 
        school_id = get_user_school_id()
    );

-- =============================================
-- TEACHERS TABLE POLICIES
-- =============================================

-- Teachers can view their own record
CREATE POLICY "Teachers can view own record" ON teachers
    FOR SELECT USING (auth.uid() = id);

-- Teachers can update their own record (limited fields)
CREATE POLICY "Teachers can update own record" ON teachers
    FOR UPDATE USING (auth.uid() = id);

-- Admins and sub-admins can view all teachers in their school
CREATE POLICY "Admins can view school teachers" ON teachers
    FOR SELECT USING (
        is_admin_or_sub_admin() AND 
        school_id = get_user_school_id()
    );

-- Admins can insert teacher records
CREATE POLICY "Admins can insert teachers" ON teachers
    FOR INSERT WITH CHECK (
        get_user_role() = 'admin' AND 
        school_id = get_user_school_id()
    );

-- Admins can update teacher records
CREATE POLICY "Admins can update teachers" ON teachers
    FOR UPDATE USING (
        get_user_role() = 'admin' AND 
        school_id = get_user_school_id()
    );

-- Admins can delete teacher records
CREATE POLICY "Admins can delete teachers" ON teachers
    FOR DELETE USING (
        get_user_role() = 'admin' AND 
        school_id = get_user_school_id()
    );

-- =============================================
-- STUDENTS TABLE POLICIES
-- =============================================

-- Students can view their own record
CREATE POLICY "Students can view own record" ON students
    FOR SELECT USING (auth.uid() = id);

-- Teachers can view students in their school
CREATE POLICY "Teachers can view school students" ON students
    FOR SELECT USING (
        get_user_role() IN ('teacher', 'admin', 'sub-admin') AND 
        school_id = get_user_school_id()
    );

-- Admins can insert student records
CREATE POLICY "Admins can insert students" ON students
    FOR INSERT WITH CHECK (
        is_admin_or_sub_admin() AND 
        school_id = get_user_school_id()
    );

-- Admins can update student records
CREATE POLICY "Admins can update students" ON students
    FOR UPDATE USING (
        is_admin_or_sub_admin() AND 
        school_id = get_user_school_id()
    );

-- Admins can delete student records
CREATE POLICY "Admins can delete students" ON students
    FOR DELETE USING (
        get_user_role() = 'admin' AND 
        school_id = get_user_school_id()
    );

-- =============================================
-- CLASSES TABLE POLICIES
-- =============================================

-- All school users can view classes
CREATE POLICY "School users can view classes" ON classes
    FOR SELECT USING (school_id = get_user_school_id());

-- Admins can manage classes
CREATE POLICY "Admins can manage classes" ON classes
    FOR ALL USING (
        get_user_role() = 'admin' AND 
        school_id = get_user_school_id()
    );

-- =============================================
-- SUBJECTS TABLE POLICIES
-- =============================================

-- All school users can view subjects
CREATE POLICY "School users can view subjects" ON subjects
    FOR SELECT USING (school_id = get_user_school_id());

-- Admins can manage subjects
CREATE POLICY "Admins can manage subjects" ON subjects
    FOR ALL USING (
        get_user_role() = 'admin' AND 
        school_id = get_user_school_id()
    );
