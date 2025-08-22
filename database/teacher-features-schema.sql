-- =============================================
-- TEACHER FEATURES SCHEMA
-- Complete database schema for teacher functionality
-- =============================================

-- =============================================
-- ASSIGNMENTS TABLE
-- =============================================
CREATE TABLE IF NOT EXISTS assignments (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    school_id UUID REFERENCES schools(id) ON DELETE CASCADE NOT NULL,
    teacher_id UUID REFERENCES teachers(id) ON DELETE CASCADE NOT NULL,
    class_id UUID REFERENCES classes(id) ON DELETE CASCADE NOT NULL,
    subject_id UUID REFERENCES subjects(id) ON DELETE CASCADE NOT NULL,
    
    -- Assignment details
    title VARCHAR(255) NOT NULL,
    description TEXT,
    instructions TEXT,
    
    -- Assignment type and metadata
    assignment_type VARCHAR(50) DEFAULT 'homework' CHECK (assignment_type IN ('homework', 'project', 'quiz', 'test', 'lab', 'presentation', 'essay', 'research')),
    difficulty_level VARCHAR(20) DEFAULT 'medium' CHECK (difficulty_level IN ('easy', 'medium', 'hard')),
    estimated_duration_minutes INTEGER,
    
    -- Dates and deadlines
    assigned_date DATE DEFAULT CURRENT_DATE,
    due_date DATE NOT NULL,
    due_time TIME,
    late_submission_allowed BOOLEAN DEFAULT true,
    late_penalty_percentage DECIMAL(5,2) DEFAULT 0,
    
    -- Grading configuration
    max_marks DECIMAL(6,2) NOT NULL DEFAULT 100,
    pass_marks DECIMAL(6,2) DEFAULT 40,
    grading_rubric TEXT,
    auto_grade BOOLEAN DEFAULT false,
    
    -- File attachments and resources
    attachment_urls JSONB DEFAULT '[]', -- Array of file URLs
    resource_links JSONB DEFAULT '[]', -- Array of external links
    
    -- Status and visibility
    status VARCHAR(20) DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'completed', 'archived')),
    is_visible_to_students BOOLEAN DEFAULT false,
    
    -- Submission settings
    submission_type VARCHAR(20) DEFAULT 'file' CHECK (submission_type IN ('file', 'text', 'link', 'multiple')),
    max_file_size_mb INTEGER DEFAULT 10,
    allowed_file_types JSONB DEFAULT '["pdf", "doc", "docx", "txt", "jpg", "png"]',
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =============================================
-- ASSIGNMENT SUBMISSIONS TABLE
-- =============================================
CREATE TABLE IF NOT EXISTS assignment_submissions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    assignment_id UUID REFERENCES assignments(id) ON DELETE CASCADE NOT NULL,
    student_id UUID REFERENCES students(id) ON DELETE CASCADE NOT NULL,
    
    -- Submission content
    submission_text TEXT,
    submission_files JSONB DEFAULT '[]', -- Array of file URLs
    submission_links JSONB DEFAULT '[]', -- Array of external links
    
    -- Submission metadata
    submitted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    is_late BOOLEAN DEFAULT false,
    late_days INTEGER DEFAULT 0,
    
    -- Grading
    marks_obtained DECIMAL(6,2),
    grade_letter VARCHAR(5),
    grade_percentage DECIMAL(5,2),
    is_graded BOOLEAN DEFAULT false,
    graded_at TIMESTAMP WITH TIME ZONE,
    graded_by UUID REFERENCES teachers(id) ON DELETE SET NULL,
    
    -- Feedback
    teacher_feedback TEXT,
    teacher_comments TEXT,
    feedback_files JSONB DEFAULT '[]',
    
    -- Status
    status VARCHAR(20) DEFAULT 'submitted' CHECK (status IN ('draft', 'submitted', 'graded', 'returned', 'resubmitted')),
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    UNIQUE(assignment_id, student_id)
);

-- =============================================
-- LESSON PLANS TABLE
-- =============================================
CREATE TABLE IF NOT EXISTS lesson_plans (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    school_id UUID REFERENCES schools(id) ON DELETE CASCADE NOT NULL,
    teacher_id UUID REFERENCES teachers(id) ON DELETE CASCADE NOT NULL,
    class_id UUID REFERENCES classes(id) ON DELETE CASCADE NOT NULL,
    subject_id UUID REFERENCES subjects(id) ON DELETE CASCADE NOT NULL,
    
    -- Lesson details
    title VARCHAR(255) NOT NULL,
    description TEXT,
    lesson_date DATE NOT NULL,
    duration_minutes INTEGER DEFAULT 45,
    
    -- Curriculum alignment
    curriculum_topic VARCHAR(255),
    learning_objectives JSONB DEFAULT '[]', -- Array of learning objectives
    prerequisites JSONB DEFAULT '[]', -- Array of prerequisite topics
    
    -- Lesson structure
    lesson_outline TEXT,
    activities JSONB DEFAULT '[]', -- Array of activities with timing
    materials_needed JSONB DEFAULT '[]', -- Array of required materials
    homework_assigned TEXT,
    
    -- Assessment and evaluation
    assessment_methods JSONB DEFAULT '[]', -- Array of assessment methods
    success_criteria TEXT,
    differentiation_strategies TEXT,
    
    -- Resources
    resource_links JSONB DEFAULT '[]',
    attachment_urls JSONB DEFAULT '[]',
    
    -- Status and completion
    status VARCHAR(20) DEFAULT 'planned' CHECK (status IN ('planned', 'in_progress', 'completed', 'cancelled')),
    completion_notes TEXT,
    actual_duration_minutes INTEGER,
    
    -- Template and sharing
    is_template BOOLEAN DEFAULT false,
    is_shared BOOLEAN DEFAULT false,
    shared_with JSONB DEFAULT '[]', -- Array of teacher IDs
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =============================================
-- STUDENT BEHAVIORAL NOTES TABLE
-- =============================================
CREATE TABLE IF NOT EXISTS student_behavioral_notes (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    school_id UUID REFERENCES schools(id) ON DELETE CASCADE NOT NULL,
    student_id UUID REFERENCES students(id) ON DELETE CASCADE NOT NULL,
    teacher_id UUID REFERENCES teachers(id) ON DELETE CASCADE NOT NULL,
    class_id UUID REFERENCES classes(id) ON DELETE CASCADE,
    
    -- Note details
    note_date DATE DEFAULT CURRENT_DATE,
    note_time TIME DEFAULT CURRENT_TIME,
    incident_type VARCHAR(50) CHECK (incident_type IN ('positive', 'negative', 'neutral', 'achievement', 'concern', 'improvement')),
    
    -- Behavioral categories
    category VARCHAR(100), -- e.g., 'Academic Performance', 'Social Behavior', 'Attendance', 'Participation'
    severity_level VARCHAR(20) DEFAULT 'low' CHECK (severity_level IN ('low', 'medium', 'high', 'critical')),
    
    -- Note content
    title VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    context TEXT, -- Circumstances surrounding the incident
    
    -- Actions and follow-up
    action_taken TEXT,
    follow_up_required BOOLEAN DEFAULT false,
    follow_up_date DATE,
    follow_up_notes TEXT,
    
    -- Visibility and notifications
    visible_to_parents BOOLEAN DEFAULT false,
    parent_notified BOOLEAN DEFAULT false,
    parent_notification_date DATE,
    
    -- Administrative review
    requires_admin_review BOOLEAN DEFAULT false,
    admin_reviewed BOOLEAN DEFAULT false,
    admin_reviewed_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
    admin_review_date DATE,
    admin_comments TEXT,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
