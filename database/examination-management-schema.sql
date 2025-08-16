-- =============================================
-- EXAMINATION MANAGEMENT SYSTEM SCHEMA
-- =============================================
-- This schema supports comprehensive examination management including
-- exam creation, scheduling, grade entry, and report card generation

-- =============================================
-- SUBJECTS TABLE
-- =============================================
CREATE TABLE IF NOT EXISTS subjects (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    school_id UUID REFERENCES schools(id) ON DELETE CASCADE NOT NULL,
    name VARCHAR(100) NOT NULL,
    code VARCHAR(20) NOT NULL, -- e.g., 'MATH101', 'ENG201'
    description TEXT,
    grade_level INTEGER NOT NULL CHECK (grade_level >= 1 AND grade_level <= 12),
    is_core_subject BOOLEAN DEFAULT false, -- Core vs Elective
    max_marks INTEGER DEFAULT 100,
    pass_marks INTEGER DEFAULT 40,
    is_active BOOLEAN DEFAULT true,
    created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    UNIQUE(school_id, code),
    UNIQUE(school_id, name, grade_level)
);

-- =============================================
-- EXAM TYPES TABLE
-- =============================================
CREATE TABLE IF NOT EXISTS exam_types (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    school_id UUID REFERENCES schools(id) ON DELETE CASCADE NOT NULL,
    name VARCHAR(100) NOT NULL, -- e.g., 'Mid-term', 'Final', 'Unit Test'
    description TEXT,
    weightage DECIMAL(5,2) DEFAULT 100.00, -- Percentage weightage in final grade
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    UNIQUE(school_id, name)
);

-- =============================================
-- EXAMS TABLE
-- =============================================
CREATE TABLE IF NOT EXISTS exams (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    school_id UUID REFERENCES schools(id) ON DELETE CASCADE NOT NULL,
    exam_type_id UUID REFERENCES exam_types(id) ON DELETE CASCADE NOT NULL,
    subject_id UUID REFERENCES subjects(id) ON DELETE CASCADE NOT NULL,
    class_id UUID REFERENCES classes(id) ON DELETE CASCADE NOT NULL,
    
    name VARCHAR(200) NOT NULL,
    description TEXT,
    exam_date DATE NOT NULL,
    start_time TIME,
    end_time TIME,
    duration_minutes INTEGER, -- Exam duration in minutes
    
    max_marks INTEGER NOT NULL DEFAULT 100,
    pass_marks INTEGER NOT NULL DEFAULT 40,
    
    instructions TEXT, -- Exam instructions for students
    status VARCHAR(20) DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'ongoing', 'completed', 'cancelled')),
    
    -- Grade entry settings
    allow_decimal_marks BOOLEAN DEFAULT false,
    grade_entry_deadline DATE,
    grades_published BOOLEAN DEFAULT false,
    grades_published_at TIMESTAMP WITH TIME ZONE,
    
    created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    CONSTRAINT valid_time_range CHECK (start_time < end_time OR (start_time IS NULL AND end_time IS NULL)),
    CONSTRAINT valid_marks CHECK (pass_marks <= max_marks)
);

-- =============================================
-- EXAM GRADES TABLE
-- =============================================
CREATE TABLE IF NOT EXISTS exam_grades (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    exam_id UUID REFERENCES exams(id) ON DELETE CASCADE NOT NULL,
    student_id UUID REFERENCES students(id) ON DELETE CASCADE NOT NULL,
    
    marks_obtained DECIMAL(6,2), -- Actual marks scored
    is_absent BOOLEAN DEFAULT false,
    is_exempted BOOLEAN DEFAULT false, -- For medical/other exemptions
    
    -- Calculated fields
    percentage DECIMAL(5,2), -- Calculated percentage
    grade_letter VARCHAR(5), -- A+, A, B+, B, C, D, F
    grade_points DECIMAL(3,2), -- GPA points (4.0 scale)
    is_pass BOOLEAN, -- Pass/Fail status
    
    -- Additional information
    remarks TEXT, -- Teacher remarks
    entered_by UUID REFERENCES profiles(id) ON DELETE SET NULL, -- Teacher who entered grades
    entered_at TIMESTAMP WITH TIME ZONE,
    verified_by UUID REFERENCES profiles(id) ON DELETE SET NULL, -- Admin verification
    verified_at TIMESTAMP WITH TIME ZONE,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    UNIQUE(exam_id, student_id),
    CONSTRAINT valid_marks_range CHECK (
        marks_obtained IS NULL OR 
        (marks_obtained >= 0 AND marks_obtained <= (SELECT max_marks FROM exams WHERE id = exam_id))
    )
);

-- =============================================
-- REPORT CARDS TABLE
-- =============================================
CREATE TABLE IF NOT EXISTS report_cards (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    school_id UUID REFERENCES schools(id) ON DELETE CASCADE NOT NULL,
    student_id UUID REFERENCES students(id) ON DELETE CASCADE NOT NULL,
    class_id UUID REFERENCES classes(id) ON DELETE CASCADE NOT NULL,
    academic_year_id UUID REFERENCES academic_years(id) ON DELETE CASCADE NOT NULL,
    
    term VARCHAR(50) NOT NULL, -- 'Term 1', 'Term 2', 'Annual', etc.
    report_type VARCHAR(50) DEFAULT 'standard', -- 'standard', 'progress', 'final'
    
    -- Overall performance
    total_marks DECIMAL(8,2),
    marks_obtained DECIMAL(8,2),
    overall_percentage DECIMAL(5,2),
    overall_grade VARCHAR(5),
    overall_gpa DECIMAL(3,2),
    
    class_rank INTEGER,
    total_students INTEGER,
    
    -- Attendance summary
    total_working_days INTEGER,
    days_present INTEGER,
    attendance_percentage DECIMAL(5,2),
    
    -- Status and metadata
    status VARCHAR(20) DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'archived')),
    published_at TIMESTAMP WITH TIME ZONE,
    pdf_url TEXT, -- URL to generated PDF report
    
    -- Teacher and admin remarks
    class_teacher_remarks TEXT,
    principal_remarks TEXT,
    
    generated_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    UNIQUE(student_id, academic_year_id, term, report_type)
);

-- =============================================
-- GRADE SCALES TABLE (for different grading systems)
-- =============================================
CREATE TABLE IF NOT EXISTS grade_scales (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    school_id UUID REFERENCES schools(id) ON DELETE CASCADE NOT NULL,
    name VARCHAR(100) NOT NULL, -- e.g., 'Standard Scale', 'IB Scale'
    description TEXT,
    is_default BOOLEAN DEFAULT false,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    UNIQUE(school_id, name)
);

-- =============================================
-- GRADE SCALE RANGES TABLE
-- =============================================
CREATE TABLE IF NOT EXISTS grade_scale_ranges (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    grade_scale_id UUID REFERENCES grade_scales(id) ON DELETE CASCADE NOT NULL,
    
    min_percentage DECIMAL(5,2) NOT NULL,
    max_percentage DECIMAL(5,2) NOT NULL,
    grade_letter VARCHAR(5) NOT NULL, -- A+, A, B+, etc.
    grade_points DECIMAL(3,2) NOT NULL, -- GPA points
    description VARCHAR(100), -- 'Excellent', 'Good', 'Average', etc.
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    CONSTRAINT valid_percentage_range CHECK (min_percentage <= max_percentage),
    CONSTRAINT valid_percentage_bounds CHECK (
        min_percentage >= 0 AND max_percentage <= 100
    )
);

-- =============================================
-- INDEXES FOR PERFORMANCE
-- =============================================
CREATE INDEX IF NOT EXISTS idx_subjects_school_grade ON subjects(school_id, grade_level);
CREATE INDEX IF NOT EXISTS idx_subjects_active ON subjects(is_active) WHERE is_active = true;

CREATE INDEX IF NOT EXISTS idx_exams_school_class ON exams(school_id, class_id);
CREATE INDEX IF NOT EXISTS idx_exams_date ON exams(exam_date);
CREATE INDEX IF NOT EXISTS idx_exams_status ON exams(status);
CREATE INDEX IF NOT EXISTS idx_exams_subject ON exams(subject_id);

CREATE INDEX IF NOT EXISTS idx_exam_grades_exam ON exam_grades(exam_id);
CREATE INDEX IF NOT EXISTS idx_exam_grades_student ON exam_grades(student_id);
CREATE INDEX IF NOT EXISTS idx_exam_grades_entered ON exam_grades(entered_at);

CREATE INDEX IF NOT EXISTS idx_report_cards_student ON report_cards(student_id);
CREATE INDEX IF NOT EXISTS idx_report_cards_academic_year ON report_cards(academic_year_id);
CREATE INDEX IF NOT EXISTS idx_report_cards_status ON report_cards(status);

-- =============================================
-- TRIGGERS FOR AUTOMATIC UPDATES
-- =============================================

-- Update exam_grades calculated fields when marks are entered
CREATE OR REPLACE FUNCTION calculate_exam_grade()
RETURNS TRIGGER AS $$
DECLARE
    exam_max_marks INTEGER;
    exam_pass_marks INTEGER;
    calculated_percentage DECIMAL(5,2);
    calculated_grade VARCHAR(5);
    calculated_points DECIMAL(3,2);
    calculated_pass BOOLEAN;
BEGIN
    -- Get exam details
    SELECT max_marks, pass_marks INTO exam_max_marks, exam_pass_marks
    FROM exams WHERE id = NEW.exam_id;
    
    -- Skip calculation if absent or exempted
    IF NEW.is_absent OR NEW.is_exempted OR NEW.marks_obtained IS NULL THEN
        NEW.percentage := NULL;
        NEW.grade_letter := NULL;
        NEW.grade_points := NULL;
        NEW.is_pass := CASE WHEN NEW.is_exempted THEN true ELSE false END;
        RETURN NEW;
    END IF;
    
    -- Calculate percentage
    calculated_percentage := (NEW.marks_obtained / exam_max_marks) * 100;
    NEW.percentage := calculated_percentage;
    
    -- Determine pass/fail
    calculated_pass := NEW.marks_obtained >= exam_pass_marks;
    NEW.is_pass := calculated_pass;
    
    -- Calculate grade letter and points (using standard scale)
    IF calculated_percentage >= 90 THEN
        calculated_grade := 'A+';
        calculated_points := 4.0;
    ELSIF calculated_percentage >= 80 THEN
        calculated_grade := 'A';
        calculated_points := 3.7;
    ELSIF calculated_percentage >= 70 THEN
        calculated_grade := 'B+';
        calculated_points := 3.3;
    ELSIF calculated_percentage >= 60 THEN
        calculated_grade := 'B';
        calculated_points := 3.0;
    ELSIF calculated_percentage >= 50 THEN
        calculated_grade := 'C+';
        calculated_points := 2.3;
    ELSIF calculated_percentage >= 40 THEN
        calculated_grade := 'C';
        calculated_points := 2.0;
    ELSIF calculated_percentage >= 30 THEN
        calculated_grade := 'D';
        calculated_points := 1.0;
    ELSE
        calculated_grade := 'F';
        calculated_points := 0.0;
    END IF;
    
    NEW.grade_letter := calculated_grade;
    NEW.grade_points := calculated_points;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Apply the trigger
DROP TRIGGER IF EXISTS trigger_calculate_exam_grade ON exam_grades;
CREATE TRIGGER trigger_calculate_exam_grade
    BEFORE INSERT OR UPDATE ON exam_grades
    FOR EACH ROW
    EXECUTE FUNCTION calculate_exam_grade();

-- Update timestamps
CREATE TRIGGER update_subjects_updated_at
    BEFORE UPDATE ON subjects
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_exam_types_updated_at
    BEFORE UPDATE ON exam_types
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_exams_updated_at
    BEFORE UPDATE ON exams
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_exam_grades_updated_at
    BEFORE UPDATE ON exam_grades
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_report_cards_updated_at
    BEFORE UPDATE ON report_cards
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- =============================================
-- INITIAL DATA SETUP
-- =============================================

-- Insert default exam types
INSERT INTO exam_types (school_id, name, description, weightage)
SELECT
    s.id,
    exam_type.name,
    exam_type.description,
    exam_type.weightage
FROM schools s
CROSS JOIN (
    VALUES
        ('Unit Test', 'Regular unit tests and quizzes', 20.00),
        ('Mid-term Exam', 'Mid-semester examination', 30.00),
        ('Final Exam', 'End of semester final examination', 50.00),
        ('Practical Exam', 'Laboratory and practical examinations', 25.00),
        ('Project Assessment', 'Project-based evaluation', 15.00)
) AS exam_type(name, description, weightage)
ON CONFLICT (school_id, name) DO NOTHING;

-- Insert default grade scale
INSERT INTO grade_scales (school_id, name, description, is_default)
SELECT
    id,
    'Standard Grading Scale',
    'Standard A-F grading scale with GPA points',
    true
FROM schools
ON CONFLICT (school_id, name) DO NOTHING;

-- Insert grade scale ranges for the default scale
INSERT INTO grade_scale_ranges (grade_scale_id, min_percentage, max_percentage, grade_letter, grade_points, description)
SELECT
    gs.id,
    range_data.min_pct,
    range_data.max_pct,
    range_data.letter,
    range_data.points,
    range_data.desc
FROM grade_scales gs
CROSS JOIN (
    VALUES
        (90.00, 100.00, 'A+', 4.00, 'Outstanding'),
        (80.00, 89.99, 'A', 3.70, 'Excellent'),
        (70.00, 79.99, 'B+', 3.30, 'Very Good'),
        (60.00, 69.99, 'B', 3.00, 'Good'),
        (50.00, 59.99, 'C+', 2.30, 'Above Average'),
        (40.00, 49.99, 'C', 2.00, 'Average'),
        (30.00, 39.99, 'D', 1.00, 'Below Average'),
        (0.00, 29.99, 'F', 0.00, 'Fail')
) AS range_data(min_pct, max_pct, letter, points, desc)
WHERE gs.is_default = true
ON CONFLICT DO NOTHING;

-- Insert common subjects for different grade levels
INSERT INTO subjects (school_id, name, code, grade_level, is_core_subject, max_marks, pass_marks)
SELECT
    s.id,
    subj.name,
    subj.code,
    subj.grade,
    subj.is_core,
    subj.max_marks,
    subj.pass_marks
FROM schools s
CROSS JOIN (
    VALUES
        -- Elementary subjects (Grades 1-5)
        ('Mathematics', 'MATH', 1, true, 100, 40),
        ('English', 'ENG', 1, true, 100, 40),
        ('Science', 'SCI', 1, true, 100, 40),
        ('Social Studies', 'SS', 1, true, 100, 40),
        ('Art', 'ART', 1, false, 50, 20),
        ('Physical Education', 'PE', 1, false, 50, 20),

        -- Middle school subjects (Grades 6-8)
        ('Mathematics', 'MATH', 6, true, 100, 40),
        ('English Language', 'ENG', 6, true, 100, 40),
        ('Science', 'SCI', 6, true, 100, 40),
        ('Social Studies', 'SS', 6, true, 100, 40),
        ('Computer Science', 'CS', 6, false, 100, 40),
        ('Art & Craft', 'ART', 6, false, 50, 20),

        -- High school subjects (Grades 9-12)
        ('Mathematics', 'MATH', 9, true, 100, 40),
        ('English Literature', 'ENG', 9, true, 100, 40),
        ('Physics', 'PHY', 9, true, 100, 40),
        ('Chemistry', 'CHEM', 9, true, 100, 40),
        ('Biology', 'BIO', 9, true, 100, 40),
        ('History', 'HIST', 9, false, 100, 40),
        ('Geography', 'GEO', 9, false, 100, 40),
        ('Computer Science', 'CS', 9, false, 100, 40),
        ('Economics', 'ECON', 9, false, 100, 40)
) AS subj(name, code, grade, is_core, max_marks, pass_marks)
ON CONFLICT (school_id, code) DO NOTHING;
