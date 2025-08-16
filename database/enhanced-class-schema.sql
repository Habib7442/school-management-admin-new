-- Enhanced Class Management Schema
-- This file contains additional tables and modifications for comprehensive class management

-- =============================================
-- ENHANCED SUBJECTS TABLE
-- =============================================

-- Drop existing subjects table if it exists and recreate with enhanced structure
DROP TABLE IF EXISTS subjects CASCADE;

CREATE TABLE subjects (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    school_id UUID REFERENCES schools(id) ON DELETE CASCADE NOT NULL,
    name VARCHAR(100) NOT NULL,
    code VARCHAR(20) NOT NULL,
    description TEXT,
    grade_level INTEGER, -- Can be NULL for subjects that span multiple grades
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(school_id, code),
    UNIQUE(school_id, name, grade_level)
);

-- =============================================
-- ENHANCED CLASSES TABLE (Update existing)
-- =============================================

-- Add missing columns to existing classes table
ALTER TABLE classes 
ADD COLUMN IF NOT EXISTS description TEXT,
ADD COLUMN IF NOT EXISTS subject_ids JSONB DEFAULT '[]', -- Array of subject IDs for this class
ADD COLUMN IF NOT EXISTS schedule_notes TEXT,
ADD COLUMN IF NOT EXISTS max_students INTEGER DEFAULT 30; -- Rename from capacity

-- Update capacity column name if it exists
DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'classes' AND column_name = 'capacity') THEN
        ALTER TABLE classes RENAME COLUMN capacity TO max_students;
    END IF;
END $$;

-- =============================================
-- CLASS SUBJECTS JUNCTION TABLE
-- =============================================

CREATE TABLE IF NOT EXISTS class_subjects (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    class_id UUID REFERENCES classes(id) ON DELETE CASCADE NOT NULL,
    subject_id UUID REFERENCES subjects(id) ON DELETE CASCADE NOT NULL,
    teacher_id UUID REFERENCES teachers(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(class_id, subject_id)
);

-- =============================================
-- ENHANCED CLASS ENROLLMENTS TABLE
-- =============================================

-- Drop and recreate class_enrollments with enhanced structure
DROP TABLE IF EXISTS class_enrollments CASCADE;

CREATE TABLE class_enrollments (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    class_id UUID REFERENCES classes(id) ON DELETE CASCADE NOT NULL,
    student_id UUID REFERENCES students(id) ON DELETE CASCADE NOT NULL,
    roll_number INTEGER,
    enrolled_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'completed', 'dropped', 'transferred')),
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(class_id, student_id),
    UNIQUE(class_id, roll_number) -- Ensure unique roll numbers within a class
);

-- =============================================
-- CLASS SCHEDULES TABLE
-- =============================================

CREATE TABLE IF NOT EXISTS class_schedules (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    class_id UUID REFERENCES classes(id) ON DELETE CASCADE NOT NULL,
    subject_id UUID REFERENCES subjects(id) ON DELETE CASCADE NOT NULL,
    teacher_id UUID REFERENCES teachers(id) ON DELETE SET NULL,
    day_of_week VARCHAR(10) NOT NULL CHECK (day_of_week IN ('monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday')),
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    room_number VARCHAR(50),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    CONSTRAINT valid_time_range CHECK (start_time < end_time),
    UNIQUE(class_id, day_of_week, start_time) -- Prevent scheduling conflicts for the same class
);

-- =============================================
-- ACADEMIC YEARS TABLE
-- =============================================

CREATE TABLE IF NOT EXISTS academic_years (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    school_id UUID REFERENCES schools(id) ON DELETE CASCADE NOT NULL,
    name VARCHAR(20) NOT NULL, -- e.g., "2024-2025"
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    is_current BOOLEAN DEFAULT false,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(school_id, name),
    CONSTRAINT valid_academic_year CHECK (start_date < end_date)
);

-- =============================================
-- FOREIGN KEY CONSTRAINTS
-- =============================================

-- Add foreign key constraint for students.class_id
DO $$
BEGIN
    -- Check if the constraint doesn't already exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name = 'fk_students_class_id'
        AND table_name = 'students'
    ) THEN
        ALTER TABLE students
        ADD CONSTRAINT fk_students_class_id
        FOREIGN KEY (class_id) REFERENCES classes(id) ON DELETE SET NULL;
    END IF;
END $$;

-- =============================================
-- INDEXES FOR PERFORMANCE
-- =============================================

-- Subjects indexes
CREATE INDEX IF NOT EXISTS idx_subjects_school_id ON subjects(school_id);
CREATE INDEX IF NOT EXISTS idx_subjects_grade_level ON subjects(grade_level);
CREATE INDEX IF NOT EXISTS idx_subjects_active ON subjects(is_active);

-- Classes indexes (additional)
CREATE INDEX IF NOT EXISTS idx_classes_grade_level ON classes(grade_level);
CREATE INDEX IF NOT EXISTS idx_classes_section ON classes(section);
CREATE INDEX IF NOT EXISTS idx_classes_teacher ON classes(class_teacher_id);
CREATE INDEX IF NOT EXISTS idx_classes_academic_year ON classes(academic_year);
CREATE INDEX IF NOT EXISTS idx_classes_active ON classes(is_active);

-- Class subjects indexes
CREATE INDEX IF NOT EXISTS idx_class_subjects_class_id ON class_subjects(class_id);
CREATE INDEX IF NOT EXISTS idx_class_subjects_subject_id ON class_subjects(subject_id);
CREATE INDEX IF NOT EXISTS idx_class_subjects_teacher_id ON class_subjects(teacher_id);

-- Class enrollments indexes
CREATE INDEX IF NOT EXISTS idx_class_enrollments_class_id ON class_enrollments(class_id);
CREATE INDEX IF NOT EXISTS idx_class_enrollments_student_id ON class_enrollments(student_id);
CREATE INDEX IF NOT EXISTS idx_class_enrollments_status ON class_enrollments(status);

-- Class schedules indexes
CREATE INDEX IF NOT EXISTS idx_class_schedules_class_id ON class_schedules(class_id);
CREATE INDEX IF NOT EXISTS idx_class_schedules_subject_id ON class_schedules(subject_id);
CREATE INDEX IF NOT EXISTS idx_class_schedules_teacher_id ON class_schedules(teacher_id);
CREATE INDEX IF NOT EXISTS idx_class_schedules_day_time ON class_schedules(day_of_week, start_time);

-- Academic years indexes
CREATE INDEX IF NOT EXISTS idx_academic_years_school_id ON academic_years(school_id);
CREATE INDEX IF NOT EXISTS idx_academic_years_current ON academic_years(is_current);

-- Students indexes (additional)
CREATE INDEX IF NOT EXISTS idx_students_class_id ON students(class_id);

-- =============================================
-- FUNCTIONS AND TRIGGERS
-- =============================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply updated_at triggers to all tables
CREATE TRIGGER update_subjects_updated_at BEFORE UPDATE ON subjects FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_class_subjects_updated_at BEFORE UPDATE ON class_subjects FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_class_enrollments_updated_at BEFORE UPDATE ON class_enrollments FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_class_schedules_updated_at BEFORE UPDATE ON class_schedules FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_academic_years_updated_at BEFORE UPDATE ON academic_years FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to ensure only one current academic year per school
CREATE OR REPLACE FUNCTION ensure_single_current_academic_year()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.is_current = true THEN
        UPDATE academic_years 
        SET is_current = false 
        WHERE school_id = NEW.school_id 
        AND id != NEW.id 
        AND is_current = true;
    END IF;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER ensure_single_current_academic_year_trigger 
    BEFORE INSERT OR UPDATE ON academic_years 
    FOR EACH ROW EXECUTE FUNCTION ensure_single_current_academic_year();

-- =============================================
-- SAMPLE DATA (Optional - for development)
-- =============================================

-- Insert some default subjects (uncomment for development)
/*
INSERT INTO subjects (school_id, name, code, description, grade_level) VALUES
-- Core subjects for all grades
((SELECT id FROM schools LIMIT 1), 'Mathematics', 'MATH', 'Core mathematics curriculum', NULL),
((SELECT id FROM schools LIMIT 1), 'English Language', 'ENG', 'English language and literature', NULL),
((SELECT id FROM schools LIMIT 1), 'Science', 'SCI', 'General science curriculum', NULL),
((SELECT id FROM schools LIMIT 1), 'Social Studies', 'SS', 'History, geography, and civics', NULL),
((SELECT id FROM schools LIMIT 1), 'Physical Education', 'PE', 'Physical fitness and sports', NULL),
((SELECT id FROM schools LIMIT 1), 'Art', 'ART', 'Visual and creative arts', NULL),
-- Grade-specific subjects
((SELECT id FROM schools LIMIT 1), 'Advanced Mathematics', 'AMATH', 'Advanced mathematics for senior grades', 11),
((SELECT id FROM schools LIMIT 1), 'Physics', 'PHY', 'Physics for science stream', 11),
((SELECT id FROM schools LIMIT 1), 'Chemistry', 'CHEM', 'Chemistry for science stream', 11),
((SELECT id FROM schools LIMIT 1), 'Biology', 'BIO', 'Biology for science stream', 11);

-- Insert current academic year
INSERT INTO academic_years (school_id, name, start_date, end_date, is_current) VALUES
((SELECT id FROM schools LIMIT 1), '2024-2025', '2024-04-01', '2025-03-31', true);
*/
