-- =============================================
-- TIMETABLE MANAGEMENT SYSTEM DATABASE SCHEMA
-- =============================================
-- Comprehensive timetable management for schools
-- Includes time periods, schedules, room management, and conflict detection

-- =============================================
-- TIME PERIODS TABLE
-- =============================================
-- Defines the time slots for the school day
CREATE TABLE IF NOT EXISTS time_periods (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    school_id UUID REFERENCES schools(id) ON DELETE CASCADE NOT NULL,
    name VARCHAR(50) NOT NULL, -- e.g., "Period 1", "Morning Assembly", "Lunch Break"
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    period_order INTEGER NOT NULL, -- Order of periods in the day (1, 2, 3, etc.)
    is_break BOOLEAN DEFAULT false, -- True for breaks, lunch, assembly
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    CONSTRAINT valid_time_range CHECK (start_time < end_time),
    UNIQUE(school_id, period_order),
    UNIQUE(school_id, name)
);

-- =============================================
-- ROOMS/VENUES TABLE
-- =============================================
-- Manages physical spaces for classes
CREATE TABLE IF NOT EXISTS rooms (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    school_id UUID REFERENCES schools(id) ON DELETE CASCADE NOT NULL,
    name VARCHAR(100) NOT NULL, -- e.g., "Room 101", "Science Lab A", "Auditorium"
    room_number VARCHAR(50),
    building VARCHAR(100),
    floor_number INTEGER,
    capacity INTEGER DEFAULT 30,
    room_type VARCHAR(50) DEFAULT 'classroom', -- classroom, laboratory, auditorium, library, etc.
    facilities JSONB DEFAULT '[]', -- Array of facilities: ["projector", "whiteboard", "computers"]
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    UNIQUE(school_id, room_number),
    UNIQUE(school_id, name)
);

-- =============================================
-- ENHANCED TIMETABLES TABLE
-- =============================================
-- Main timetable entries replacing the basic class_schedules
CREATE TABLE IF NOT EXISTS timetables (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    school_id UUID REFERENCES schools(id) ON DELETE CASCADE NOT NULL,
    academic_year_id UUID REFERENCES academic_years(id) ON DELETE CASCADE NOT NULL,
    class_id UUID REFERENCES classes(id) ON DELETE CASCADE NOT NULL,
    subject_id UUID REFERENCES subjects(id) ON DELETE CASCADE NOT NULL,
    teacher_id UUID REFERENCES teachers(id) ON DELETE SET NULL,
    room_id UUID REFERENCES rooms(id) ON DELETE SET NULL,
    time_period_id UUID REFERENCES time_periods(id) ON DELETE CASCADE NOT NULL,
    
    day_of_week VARCHAR(10) NOT NULL CHECK (day_of_week IN ('monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday')),
    
    -- Optional date range for specific schedules (e.g., exam schedules)
    effective_from DATE,
    effective_to DATE,
    
    -- Schedule metadata
    notes TEXT,
    is_active BOOLEAN DEFAULT true,
    created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Prevent double booking conflicts
    UNIQUE(class_id, day_of_week, time_period_id, academic_year_id),
    UNIQUE(teacher_id, day_of_week, time_period_id, academic_year_id),
    UNIQUE(room_id, day_of_week, time_period_id, academic_year_id)
);

-- =============================================
-- TIMETABLE TEMPLATES TABLE
-- =============================================
-- Reusable timetable templates for different class types
CREATE TABLE IF NOT EXISTS timetable_templates (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    school_id UUID REFERENCES schools(id) ON DELETE CASCADE NOT NULL,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    grade_level INTEGER, -- Can be NULL for templates that work across grades
    template_data JSONB NOT NULL, -- Stores the template structure
    is_active BOOLEAN DEFAULT true,
    created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    UNIQUE(school_id, name)
);

-- =============================================
-- TEACHER WORKLOAD TABLE
-- =============================================
-- Tracks teacher workload and availability
CREATE TABLE IF NOT EXISTS teacher_workload (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    teacher_id UUID REFERENCES teachers(id) ON DELETE CASCADE NOT NULL,
    academic_year_id UUID REFERENCES academic_years(id) ON DELETE CASCADE NOT NULL,
    
    -- Workload statistics
    total_periods_per_week INTEGER DEFAULT 0,
    max_periods_per_day INTEGER DEFAULT 8,
    max_periods_per_week INTEGER DEFAULT 40,
    
    -- Availability preferences
    unavailable_days JSONB DEFAULT '[]', -- Array of days: ["saturday", "sunday"]
    unavailable_periods JSONB DEFAULT '[]', -- Array of period IDs
    preferred_subjects JSONB DEFAULT '[]', -- Array of subject IDs
    
    -- Auto-calculated fields
    current_periods_assigned INTEGER DEFAULT 0,
    workload_percentage DECIMAL(5,2) DEFAULT 0,
    
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    UNIQUE(teacher_id, academic_year_id)
);

-- =============================================
-- TIMETABLE CONFLICTS TABLE
-- =============================================
-- Logs and tracks scheduling conflicts
CREATE TABLE IF NOT EXISTS timetable_conflicts (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    school_id UUID REFERENCES schools(id) ON DELETE CASCADE NOT NULL,
    conflict_type VARCHAR(50) NOT NULL, -- teacher_double_booking, room_double_booking, class_double_booking
    description TEXT NOT NULL,
    
    -- Related entities
    timetable_id_1 UUID REFERENCES timetables(id) ON DELETE CASCADE,
    timetable_id_2 UUID REFERENCES timetables(id) ON DELETE CASCADE,
    teacher_id UUID REFERENCES teachers(id) ON DELETE CASCADE,
    room_id UUID REFERENCES rooms(id) ON DELETE CASCADE,
    class_id UUID REFERENCES classes(id) ON DELETE CASCADE,
    
    -- Conflict details
    day_of_week VARCHAR(10),
    time_period_id UUID REFERENCES time_periods(id) ON DELETE CASCADE,
    
    -- Resolution
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'resolved', 'ignored')),
    resolved_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
    resolved_at TIMESTAMP WITH TIME ZONE,
    resolution_notes TEXT,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =============================================
-- TIMETABLE CHANGE LOGS TABLE
-- =============================================
-- Audit trail for timetable changes
CREATE TABLE IF NOT EXISTS timetable_change_logs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    timetable_id UUID REFERENCES timetables(id) ON DELETE CASCADE NOT NULL,
    change_type VARCHAR(50) NOT NULL, -- created, updated, deleted, teacher_changed, room_changed
    old_data JSONB,
    new_data JSONB,
    reason TEXT,
    changed_by UUID REFERENCES profiles(id) ON DELETE SET NULL NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =============================================
-- INDEXES FOR PERFORMANCE
-- =============================================

-- Time periods indexes
CREATE INDEX idx_time_periods_school_active ON time_periods(school_id, is_active);
CREATE INDEX idx_time_periods_order ON time_periods(school_id, period_order);

-- Rooms indexes
CREATE INDEX idx_rooms_school_active ON rooms(school_id, is_active);
CREATE INDEX idx_rooms_type ON rooms(school_id, room_type);

-- Timetables indexes
CREATE INDEX idx_timetables_school_year ON timetables(school_id, academic_year_id);
CREATE INDEX idx_timetables_class_day ON timetables(class_id, day_of_week);
CREATE INDEX idx_timetables_teacher_day ON timetables(teacher_id, day_of_week);
CREATE INDEX idx_timetables_room_day ON timetables(room_id, day_of_week);
CREATE INDEX idx_timetables_active ON timetables(is_active);

-- Teacher workload indexes
CREATE INDEX idx_teacher_workload_teacher_year ON teacher_workload(teacher_id, academic_year_id);

-- Conflicts indexes
CREATE INDEX idx_conflicts_school_status ON timetable_conflicts(school_id, status);
CREATE INDEX idx_conflicts_type ON timetable_conflicts(conflict_type);

-- Change logs indexes
CREATE INDEX idx_change_logs_timetable ON timetable_change_logs(timetable_id);
CREATE INDEX idx_change_logs_changed_by ON timetable_change_logs(changed_by);

-- =============================================
-- FUNCTIONS AND TRIGGERS
-- =============================================

-- Function to update teacher workload automatically
CREATE OR REPLACE FUNCTION update_teacher_workload()
RETURNS TRIGGER AS $$
BEGIN
    -- Update workload when timetable entries are added/removed/modified
    IF TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN
        UPDATE teacher_workload 
        SET 
            current_periods_assigned = (
                SELECT COUNT(*) 
                FROM timetables 
                WHERE teacher_id = NEW.teacher_id 
                AND academic_year_id = NEW.academic_year_id
                AND is_active = true
            ),
            workload_percentage = (
                SELECT (COUNT(*) * 100.0 / COALESCE(max_periods_per_week, 40))
                FROM timetables 
                WHERE teacher_id = NEW.teacher_id 
                AND academic_year_id = NEW.academic_year_id
                AND is_active = true
            ),
            updated_at = NOW()
        WHERE teacher_id = NEW.teacher_id AND academic_year_id = NEW.academic_year_id;
        
        RETURN NEW;
    END IF;
    
    IF TG_OP = 'DELETE' THEN
        UPDATE teacher_workload 
        SET 
            current_periods_assigned = (
                SELECT COUNT(*) 
                FROM timetables 
                WHERE teacher_id = OLD.teacher_id 
                AND academic_year_id = OLD.academic_year_id
                AND is_active = true
            ),
            workload_percentage = (
                SELECT (COUNT(*) * 100.0 / COALESCE(max_periods_per_week, 40))
                FROM timetables 
                WHERE teacher_id = OLD.teacher_id 
                AND academic_year_id = OLD.academic_year_id
                AND is_active = true
            ),
            updated_at = NOW()
        WHERE teacher_id = OLD.teacher_id AND academic_year_id = OLD.academic_year_id;
        
        RETURN OLD;
    END IF;
    
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update teacher workload
CREATE TRIGGER trigger_update_teacher_workload
    AFTER INSERT OR UPDATE OR DELETE ON timetables
    FOR EACH ROW EXECUTE FUNCTION update_teacher_workload();

-- Function to log timetable changes
CREATE OR REPLACE FUNCTION log_timetable_changes()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        INSERT INTO timetable_change_logs (timetable_id, change_type, new_data, changed_by)
        VALUES (NEW.id, 'created', row_to_json(NEW), NEW.created_by);
        RETURN NEW;
    END IF;
    
    IF TG_OP = 'UPDATE' THEN
        INSERT INTO timetable_change_logs (timetable_id, change_type, old_data, new_data, changed_by)
        VALUES (NEW.id, 'updated', row_to_json(OLD), row_to_json(NEW), NEW.created_by);
        RETURN NEW;
    END IF;
    
    IF TG_OP = 'DELETE' THEN
        INSERT INTO timetable_change_logs (timetable_id, change_type, old_data, changed_by)
        VALUES (OLD.id, 'deleted', row_to_json(OLD), OLD.created_by);
        RETURN OLD;
    END IF;
    
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Trigger to log changes
CREATE TRIGGER trigger_log_timetable_changes
    AFTER INSERT OR UPDATE OR DELETE ON timetables
    FOR EACH ROW EXECUTE FUNCTION log_timetable_changes();

-- Apply updated_at triggers
CREATE TRIGGER update_time_periods_updated_at BEFORE UPDATE ON time_periods FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_rooms_updated_at BEFORE UPDATE ON rooms FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_timetables_updated_at BEFORE UPDATE ON timetables FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_timetable_templates_updated_at BEFORE UPDATE ON timetable_templates FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_timetable_conflicts_updated_at BEFORE UPDATE ON timetable_conflicts FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =============================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- =============================================

-- Enable RLS on all tables
ALTER TABLE time_periods ENABLE ROW LEVEL SECURITY;
ALTER TABLE rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE timetables ENABLE ROW LEVEL SECURITY;
ALTER TABLE timetable_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE teacher_workload ENABLE ROW LEVEL SECURITY;
ALTER TABLE timetable_conflicts ENABLE ROW LEVEL SECURITY;
ALTER TABLE timetable_change_logs ENABLE ROW LEVEL SECURITY;

-- Time Periods Policies
CREATE POLICY "Users can view time periods from their school" ON time_periods
    FOR SELECT USING (
        school_id IN (
            SELECT school_id FROM profiles WHERE id = auth.uid()
        )
    );

CREATE POLICY "Admins can manage time periods" ON time_periods
    FOR ALL USING (
        school_id IN (
            SELECT school_id FROM profiles
            WHERE id = auth.uid()
            AND role IN ('admin', 'sub-admin')
        )
    );

-- Rooms Policies
CREATE POLICY "Users can view rooms from their school" ON rooms
    FOR SELECT USING (
        school_id IN (
            SELECT school_id FROM profiles WHERE id = auth.uid()
        )
    );

CREATE POLICY "Admins can manage rooms" ON rooms
    FOR ALL USING (
        school_id IN (
            SELECT school_id FROM profiles
            WHERE id = auth.uid()
            AND role IN ('admin', 'sub-admin')
        )
    );

-- Timetables Policies
CREATE POLICY "Users can view timetables from their school" ON timetables
    FOR SELECT USING (
        school_id IN (
            SELECT school_id FROM profiles WHERE id = auth.uid()
        )
    );

CREATE POLICY "Admins can manage timetables" ON timetables
    FOR ALL USING (
        school_id IN (
            SELECT school_id FROM profiles
            WHERE id = auth.uid()
            AND role IN ('admin', 'sub-admin')
        )
    );

CREATE POLICY "Teachers can view their own timetables" ON timetables
    FOR SELECT USING (
        teacher_id = auth.uid() OR
        school_id IN (
            SELECT school_id FROM profiles WHERE id = auth.uid()
        )
    );

-- Timetable Templates Policies
CREATE POLICY "Users can view templates from their school" ON timetable_templates
    FOR SELECT USING (
        school_id IN (
            SELECT school_id FROM profiles WHERE id = auth.uid()
        )
    );

CREATE POLICY "Admins can manage templates" ON timetable_templates
    FOR ALL USING (
        school_id IN (
            SELECT school_id FROM profiles
            WHERE id = auth.uid()
            AND role IN ('admin', 'sub-admin')
        )
    );

-- Teacher Workload Policies
CREATE POLICY "Teachers can view their own workload" ON teacher_workload
    FOR SELECT USING (
        teacher_id = auth.uid()
    );

CREATE POLICY "Admins can view all teacher workloads" ON teacher_workload
    FOR SELECT USING (
        teacher_id IN (
            SELECT id FROM profiles
            WHERE school_id IN (
                SELECT school_id FROM profiles
                WHERE id = auth.uid()
                AND role IN ('admin', 'sub-admin')
            )
        )
    );

CREATE POLICY "Admins can manage teacher workloads" ON teacher_workload
    FOR ALL USING (
        teacher_id IN (
            SELECT id FROM profiles
            WHERE school_id IN (
                SELECT school_id FROM profiles
                WHERE id = auth.uid()
                AND role IN ('admin', 'sub-admin')
            )
        )
    );

-- Conflicts Policies
CREATE POLICY "Users can view conflicts from their school" ON timetable_conflicts
    FOR SELECT USING (
        school_id IN (
            SELECT school_id FROM profiles WHERE id = auth.uid()
        )
    );

CREATE POLICY "Admins can manage conflicts" ON timetable_conflicts
    FOR ALL USING (
        school_id IN (
            SELECT school_id FROM profiles
            WHERE id = auth.uid()
            AND role IN ('admin', 'sub-admin')
        )
    );

-- Change Logs Policies
CREATE POLICY "Users can view change logs from their school" ON timetable_change_logs
    FOR SELECT USING (
        timetable_id IN (
            SELECT id FROM timetables
            WHERE school_id IN (
                SELECT school_id FROM profiles WHERE id = auth.uid()
            )
        )
    );

CREATE POLICY "System can insert change logs" ON timetable_change_logs
    FOR INSERT WITH CHECK (true);
