-- Create student_attendance table for tracking daily attendance
CREATE TABLE IF NOT EXISTS student_attendance (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    student_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    class_id UUID NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
    school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
    attendance_date DATE NOT NULL,
    status VARCHAR(10) NOT NULL CHECK (status IN ('present', 'absent')),
    marked_by UUID NOT NULL REFERENCES profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Ensure one attendance record per student per day per class
    UNIQUE(student_id, class_id, attendance_date)
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_student_attendance_student_id ON student_attendance(student_id);
CREATE INDEX IF NOT EXISTS idx_student_attendance_class_id ON student_attendance(class_id);
CREATE INDEX IF NOT EXISTS idx_student_attendance_date ON student_attendance(attendance_date);
CREATE INDEX IF NOT EXISTS idx_student_attendance_school_id ON student_attendance(school_id);
CREATE INDEX IF NOT EXISTS idx_student_attendance_status ON student_attendance(status);

-- Create composite indexes for common queries
CREATE INDEX IF NOT EXISTS idx_student_attendance_class_date ON student_attendance(class_id, attendance_date);
CREATE INDEX IF NOT EXISTS idx_student_attendance_student_date ON student_attendance(student_id, attendance_date);

-- Add RLS (Row Level Security) policies
ALTER TABLE student_attendance ENABLE ROW LEVEL SECURITY;

-- Policy for school admins to manage attendance for their school
CREATE POLICY "School admins can manage attendance for their school" ON student_attendance
    FOR ALL USING (
        school_id IN (
            SELECT school_id FROM profiles WHERE id = auth.uid()
        )
    );

-- Policy for teachers to view attendance for their classes (if needed later)
CREATE POLICY "Teachers can view attendance for their classes" ON student_attendance
    FOR SELECT USING (
        class_id IN (
            SELECT class_id FROM teacher_class_assignments 
            WHERE teacher_id = auth.uid() AND status = 'active'
        )
    );

-- Function to automatically update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_student_attendance_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically update updated_at on record changes
CREATE TRIGGER trigger_update_student_attendance_updated_at
    BEFORE UPDATE ON student_attendance
    FOR EACH ROW
    EXECUTE FUNCTION update_student_attendance_updated_at();

-- Add comments for documentation
COMMENT ON TABLE student_attendance IS 'Daily attendance records for students';
COMMENT ON COLUMN student_attendance.student_id IS 'Reference to the student profile';
COMMENT ON COLUMN student_attendance.class_id IS 'Reference to the class';
COMMENT ON COLUMN student_attendance.school_id IS 'Reference to the school for data isolation';
COMMENT ON COLUMN student_attendance.attendance_date IS 'Date for which attendance is marked';
COMMENT ON COLUMN student_attendance.status IS 'Attendance status: present or absent';
COMMENT ON COLUMN student_attendance.marked_by IS 'Admin/teacher who marked the attendance';
