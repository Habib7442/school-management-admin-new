-- Row Level Security Policies for Examination Management Tables
-- These policies ensure users can only access examination data for their school

-- =============================================
-- ENABLE RLS ON EXAMINATION TABLES
-- =============================================

ALTER TABLE exam_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE exams ENABLE ROW LEVEL SECURITY;
ALTER TABLE exam_grades ENABLE ROW LEVEL SECURITY;
ALTER TABLE report_cards ENABLE ROW LEVEL SECURITY;
ALTER TABLE grade_scales ENABLE ROW LEVEL SECURITY;

-- =============================================
-- EXAM TYPES TABLE POLICIES
-- =============================================

-- All school users can view exam types in their school
CREATE POLICY "School users can view exam types" ON exam_types
    FOR SELECT USING (
        school_id = (
            SELECT school_id 
            FROM profiles 
            WHERE id = auth.uid()
        )
    );

-- Admins and sub-admins can manage exam types in their school
CREATE POLICY "Admins can manage exam types" ON exam_types
    FOR ALL USING (
        (
            SELECT role 
            FROM profiles 
            WHERE id = auth.uid()
        ) IN ('admin', 'sub-admin')
        AND school_id = (
            SELECT school_id 
            FROM profiles 
            WHERE id = auth.uid()
        )
    );

-- =============================================
-- EXAMS TABLE POLICIES
-- =============================================

-- School users can view exams in their school
CREATE POLICY "School users can view exams" ON exams
    FOR SELECT USING (
        school_id = (
            SELECT school_id 
            FROM profiles 
            WHERE id = auth.uid()
        )
    );

-- Admins and teachers can manage exams in their school
CREATE POLICY "Admins and teachers can manage exams" ON exams
    FOR ALL USING (
        (
            SELECT role 
            FROM profiles 
            WHERE id = auth.uid()
        ) IN ('admin', 'sub-admin', 'teacher')
        AND school_id = (
            SELECT school_id 
            FROM profiles 
            WHERE id = auth.uid()
        )
    );

-- =============================================
-- EXAM GRADES TABLE POLICIES
-- =============================================

-- Students can view their own grades
CREATE POLICY "Students can view own grades" ON exam_grades
    FOR SELECT USING (
        student_id = auth.uid()
        OR (
            SELECT role 
            FROM profiles 
            WHERE id = auth.uid()
        ) IN ('admin', 'sub-admin', 'teacher')
        AND EXISTS (
            SELECT 1 FROM exams e 
            WHERE e.id = exam_id 
            AND e.school_id = (
                SELECT school_id 
                FROM profiles 
                WHERE id = auth.uid()
            )
        )
    );

-- Teachers and admins can manage grades in their school
CREATE POLICY "Teachers can manage grades" ON exam_grades
    FOR ALL USING (
        (
            SELECT role 
            FROM profiles 
            WHERE id = auth.uid()
        ) IN ('admin', 'sub-admin', 'teacher')
        AND EXISTS (
            SELECT 1 FROM exams e 
            WHERE e.id = exam_id 
            AND e.school_id = (
                SELECT school_id 
                FROM profiles 
                WHERE id = auth.uid()
            )
        )
    );

-- =============================================
-- REPORT CARDS TABLE POLICIES
-- =============================================

-- Students can view their own report cards
CREATE POLICY "Students can view own report cards" ON report_cards
    FOR SELECT USING (
        student_id = auth.uid()
        OR (
            SELECT role 
            FROM profiles 
            WHERE id = auth.uid()
        ) IN ('admin', 'sub-admin', 'teacher')
        AND EXISTS (
            SELECT 1 FROM students s 
            WHERE s.id = student_id 
            AND s.school_id = (
                SELECT school_id 
                FROM profiles 
                WHERE id = auth.uid()
            )
        )
    );

-- Teachers and admins can manage report cards in their school
CREATE POLICY "Teachers can manage report cards" ON report_cards
    FOR ALL USING (
        (
            SELECT role 
            FROM profiles 
            WHERE id = auth.uid()
        ) IN ('admin', 'sub-admin', 'teacher')
        AND EXISTS (
            SELECT 1 FROM students s 
            WHERE s.id = student_id 
            AND s.school_id = (
                SELECT school_id 
                FROM profiles 
                WHERE id = auth.uid()
            )
        )
    );

-- =============================================
-- GRADE SCALES TABLE POLICIES
-- =============================================

-- School users can view grade scales in their school
CREATE POLICY "School users can view grade scales" ON grade_scales
    FOR SELECT USING (
        school_id = (
            SELECT school_id 
            FROM profiles 
            WHERE id = auth.uid()
        )
    );

-- Admins can manage grade scales in their school
CREATE POLICY "Admins can manage grade scales" ON grade_scales
    FOR ALL USING (
        (
            SELECT role 
            FROM profiles 
            WHERE id = auth.uid()
        ) IN ('admin', 'sub-admin')
        AND school_id = (
            SELECT school_id 
            FROM profiles 
            WHERE id = auth.uid()
        )
    );
