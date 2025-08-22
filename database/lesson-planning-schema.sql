-- =============================================
-- LESSON PLANNING ADDITIONAL SCHEMA
-- Additional tables needed for lesson planning functionality
-- =============================================

-- =============================================
-- CURRICULUM TOPICS TABLE
-- =============================================
CREATE TABLE IF NOT EXISTS curriculum_topics (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    school_id UUID REFERENCES schools(id) ON DELETE CASCADE NOT NULL,
    subject_id UUID REFERENCES subjects(id) ON DELETE CASCADE NOT NULL,
    
    -- Topic details
    title VARCHAR(255) NOT NULL,
    description TEXT,
    grade_level INTEGER NOT NULL,
    unit_number INTEGER,
    
    -- Learning objectives and standards
    learning_objectives JSONB DEFAULT '[]', -- Array of learning objectives
    curriculum_standards JSONB DEFAULT '[]', -- Array of curriculum standards
    
    -- Prerequisites and sequencing
    prerequisites JSONB DEFAULT '[]', -- Array of prerequisite topic IDs
    estimated_duration_hours DECIMAL(4,2),
    difficulty_level VARCHAR(20) DEFAULT 'medium' CHECK (difficulty_level IN ('easy', 'medium', 'hard')),
    
    -- Resources and materials
    recommended_resources JSONB DEFAULT '[]',
    required_materials JSONB DEFAULT '[]',
    
    -- Status and metadata
    is_active BOOLEAN DEFAULT true,
    is_core_topic BOOLEAN DEFAULT true,
    sequence_order INTEGER,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    UNIQUE(school_id, subject_id, title, grade_level)
);

-- =============================================
-- LESSON RESOURCES TABLE
-- =============================================
CREATE TABLE IF NOT EXISTS lesson_resources (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    lesson_plan_id UUID REFERENCES lesson_plans(id) ON DELETE CASCADE NOT NULL,
    
    -- Resource details
    title VARCHAR(255) NOT NULL,
    description TEXT,
    resource_type VARCHAR(50) DEFAULT 'document' CHECK (resource_type IN ('document', 'video', 'link', 'image', 'audio', 'presentation', 'interactive')),
    
    -- File or URL
    file_url TEXT,
    external_url TEXT,
    file_size_bytes BIGINT,
    duration_seconds INTEGER, -- For video/audio resources
    
    -- Metadata
    is_required BOOLEAN DEFAULT false,
    access_level VARCHAR(20) DEFAULT 'teacher' CHECK (access_level IN ('teacher', 'student', 'both')),
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =============================================
-- LESSON ACTIVITIES TABLE
-- =============================================
CREATE TABLE IF NOT EXISTS lesson_activities (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    lesson_plan_id UUID REFERENCES lesson_plans(id) ON DELETE CASCADE NOT NULL,
    
    -- Activity details
    title VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    duration_minutes INTEGER NOT NULL,
    activity_type VARCHAR(50) DEFAULT 'individual' CHECK (activity_type IN ('individual', 'group', 'whole_class', 'pair_work', 'presentation', 'discussion', 'practical')),
    
    -- Activity structure
    instructions TEXT,
    materials_needed JSONB DEFAULT '[]',
    learning_objectives JSONB DEFAULT '[]',
    
    -- Sequencing
    sequence_order INTEGER NOT NULL,
    
    -- Assessment
    is_assessed BOOLEAN DEFAULT false,
    assessment_criteria TEXT,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =============================================
-- INDEXES FOR PERFORMANCE
-- =============================================

-- Curriculum Topics indexes
CREATE INDEX IF NOT EXISTS idx_curriculum_topics_school_subject ON curriculum_topics(school_id, subject_id);
CREATE INDEX IF NOT EXISTS idx_curriculum_topics_grade_level ON curriculum_topics(grade_level);
CREATE INDEX IF NOT EXISTS idx_curriculum_topics_is_active ON curriculum_topics(is_active);
CREATE INDEX IF NOT EXISTS idx_curriculum_topics_sequence ON curriculum_topics(subject_id, sequence_order);

-- Lesson Resources indexes
CREATE INDEX IF NOT EXISTS idx_lesson_resources_lesson_plan ON lesson_resources(lesson_plan_id);
CREATE INDEX IF NOT EXISTS idx_lesson_resources_type ON lesson_resources(resource_type);

-- Lesson Activities indexes
CREATE INDEX IF NOT EXISTS idx_lesson_activities_lesson_plan ON lesson_activities(lesson_plan_id);
CREATE INDEX IF NOT EXISTS idx_lesson_activities_sequence ON lesson_activities(lesson_plan_id, sequence_order);

-- =============================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- =============================================

-- Enable RLS on all tables
ALTER TABLE curriculum_topics ENABLE ROW LEVEL SECURITY;
ALTER TABLE lesson_resources ENABLE ROW LEVEL SECURITY;
ALTER TABLE lesson_activities ENABLE ROW LEVEL SECURITY;

-- Curriculum Topics Policies
CREATE POLICY "Users can view curriculum topics from their school" ON curriculum_topics
    FOR SELECT USING (
        school_id IN (
            SELECT school_id FROM profiles WHERE id = auth.uid()
        )
    );

CREATE POLICY "Teachers can manage curriculum topics in their school" ON curriculum_topics
    FOR ALL USING (
        school_id IN (
            SELECT school_id FROM profiles WHERE id = auth.uid() AND role IN ('teacher', 'admin', 'sub-admin')
        )
    );

-- Lesson Resources Policies
CREATE POLICY "Teachers can view lesson resources for their lessons" ON lesson_resources
    FOR SELECT USING (
        lesson_plan_id IN (
            SELECT id FROM lesson_plans WHERE teacher_id = auth.uid()
        )
    );

CREATE POLICY "Teachers can manage lesson resources for their lessons" ON lesson_resources
    FOR ALL USING (
        lesson_plan_id IN (
            SELECT id FROM lesson_plans WHERE teacher_id = auth.uid()
        )
    );

-- Lesson Activities Policies
CREATE POLICY "Teachers can view lesson activities for their lessons" ON lesson_activities
    FOR SELECT USING (
        lesson_plan_id IN (
            SELECT id FROM lesson_plans WHERE teacher_id = auth.uid()
        )
    );

CREATE POLICY "Teachers can manage lesson activities for their lessons" ON lesson_activities
    FOR ALL USING (
        lesson_plan_id IN (
            SELECT id FROM lesson_plans WHERE teacher_id = auth.uid()
        )
    );

-- =============================================
-- SAMPLE DATA (OPTIONAL)
-- =============================================

-- Insert sample curriculum topics for common subjects
-- This can be customized based on school curriculum

-- Mathematics curriculum topics
INSERT INTO curriculum_topics (school_id, subject_id, title, description, grade_level, unit_number, learning_objectives, sequence_order)
SELECT 
    s.id as school_id,
    sub.id as subject_id,
    'Number Systems and Operations',
    'Understanding different number systems and basic operations',
    9,
    1,
    '["Understand rational and irrational numbers", "Perform operations with real numbers", "Apply number properties in problem solving"]'::jsonb,
    1
FROM schools s
CROSS JOIN subjects sub
WHERE sub.name = 'Mathematics'
ON CONFLICT (school_id, subject_id, title, grade_level) DO NOTHING;

-- Science curriculum topics
INSERT INTO curriculum_topics (school_id, subject_id, title, description, grade_level, unit_number, learning_objectives, sequence_order)
SELECT 
    s.id as school_id,
    sub.id as subject_id,
    'Introduction to Chemistry',
    'Basic concepts of matter, atoms, and chemical reactions',
    9,
    1,
    '["Understand atomic structure", "Identify different types of matter", "Explain basic chemical reactions"]'::jsonb,
    1
FROM schools s
CROSS JOIN subjects sub
WHERE sub.name = 'Science' OR sub.name = 'Chemistry'
ON CONFLICT (school_id, subject_id, title, grade_level) DO NOTHING;

-- English curriculum topics
INSERT INTO curriculum_topics (school_id, subject_id, title, description, grade_level, unit_number, learning_objectives, sequence_order)
SELECT 
    s.id as school_id,
    sub.id as subject_id,
    'Reading Comprehension and Analysis',
    'Developing critical reading skills and text analysis',
    9,
    1,
    '["Analyze literary texts", "Identify main ideas and themes", "Develop critical thinking skills"]'::jsonb,
    1
FROM schools s
CROSS JOIN subjects sub
WHERE sub.name = 'English' OR sub.name = 'Language Arts'
ON CONFLICT (school_id, subject_id, title, grade_level) DO NOTHING;
