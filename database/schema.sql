-- School Management System Database Schema
-- This file contains all the SQL commands to create the database structure

-- Create custom types
CREATE TYPE user_role AS ENUM ('admin', 'sub-admin', 'teacher', 'student');
CREATE TYPE gender_type AS ENUM ('male', 'female', 'other');
CREATE TYPE blood_group_type AS ENUM ('A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-');

-- =============================================
-- CORE TABLES
-- =============================================

-- Schools table (already exists but let's ensure it's complete)
CREATE TABLE IF NOT EXISTS schools (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    admin_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    logo_url TEXT,
    address TEXT,
    geo_lat DECIMAL(10, 8),
    geo_lng DECIMAL(11, 8),
    contact_email VARCHAR(255),
    contact_phone VARCHAR(20),
    school_code VARCHAR(50) UNIQUE NOT NULL,
    academic_start DATE,
    academic_end DATE,
    timezone VARCHAR(50) DEFAULT 'UTC',
    language VARCHAR(10) DEFAULT 'en',
    motto TEXT,
    principal_name VARCHAR(255),
    website_url TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Profiles table (base user information)
CREATE TABLE IF NOT EXISTS profiles (
    id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    role user_role NOT NULL,
    phone VARCHAR(20),
    avatar_url TEXT,
    school_id UUID REFERENCES schools(id) ON DELETE CASCADE,
    onboarding_completed BOOLEAN DEFAULT false,
    last_sign_in_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =============================================
-- ROLE-SPECIFIC TABLES
-- =============================================

-- Admins table (school administrators)
CREATE TABLE IF NOT EXISTS admins (
    id UUID REFERENCES profiles(id) ON DELETE CASCADE PRIMARY KEY,
    school_id UUID REFERENCES schools(id) ON DELETE CASCADE NOT NULL,
    permissions JSONB DEFAULT '{}',
    can_create_sub_admins BOOLEAN DEFAULT true,
    can_manage_finances BOOLEAN DEFAULT true,
    can_manage_staff BOOLEAN DEFAULT true,
    emergency_contact_name VARCHAR(255),
    emergency_contact_phone VARCHAR(20),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Sub-admins table (limited administrators)
CREATE TABLE IF NOT EXISTS sub_admins (
    id UUID REFERENCES profiles(id) ON DELETE CASCADE PRIMARY KEY,
    school_id UUID REFERENCES schools(id) ON DELETE CASCADE NOT NULL,
    created_by UUID REFERENCES admins(id) ON DELETE SET NULL,
    permissions JSONB DEFAULT '{}',
    temporary_access JSONB DEFAULT '{}', -- For time-bound permissions
    access_expires_at TIMESTAMP WITH TIME ZONE,
    department VARCHAR(100),
    can_view_reports BOOLEAN DEFAULT false,
    can_manage_students BOOLEAN DEFAULT false,
    can_manage_teachers BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Teachers table
CREATE TABLE IF NOT EXISTS teachers (
    id UUID REFERENCES profiles(id) ON DELETE CASCADE PRIMARY KEY,
    school_id UUID REFERENCES schools(id) ON DELETE CASCADE NOT NULL,
    employee_id VARCHAR(50) UNIQUE,
    department VARCHAR(100),
    designation VARCHAR(100),
    qualification TEXT,
    experience_years INTEGER DEFAULT 0,
    date_of_birth DATE,
    gender gender_type,
    blood_group blood_group_type,
    address TEXT,
    emergency_contact_name VARCHAR(255),
    emergency_contact_phone VARCHAR(20),
    emergency_contact_relation VARCHAR(50),
    salary DECIMAL(10, 2),
    joining_date DATE DEFAULT CURRENT_DATE,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Students table
CREATE TABLE IF NOT EXISTS students (
    id UUID REFERENCES profiles(id) ON DELETE CASCADE PRIMARY KEY,
    school_id UUID REFERENCES schools(id) ON DELETE CASCADE NOT NULL,
    student_id VARCHAR(50) UNIQUE,
    admission_number VARCHAR(50) UNIQUE,
    class_id UUID, -- Will reference classes table when created
    section VARCHAR(10),
    roll_number INTEGER,
    date_of_birth DATE,
    gender gender_type,
    blood_group blood_group_type,
    address TEXT,
    parent_name VARCHAR(255),
    parent_phone VARCHAR(20),
    parent_email VARCHAR(255),
    emergency_contact_name VARCHAR(255),
    emergency_contact_phone VARCHAR(20),
    emergency_contact_relation VARCHAR(50),
    admission_date DATE DEFAULT CURRENT_DATE,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =============================================
-- ACADEMIC TABLES
-- =============================================

-- Classes table
CREATE TABLE IF NOT EXISTS classes (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    school_id UUID REFERENCES schools(id) ON DELETE CASCADE NOT NULL,
    name VARCHAR(100) NOT NULL, -- e.g., "Grade 1", "Class 10-A"
    grade_level INTEGER, -- 1-12 for standard grades
    section VARCHAR(10), -- A, B, C, etc.
    class_teacher_id UUID REFERENCES teachers(id) ON DELETE SET NULL,
    room_number VARCHAR(50),
    capacity INTEGER DEFAULT 30,
    academic_year VARCHAR(20), -- e.g., "2024-2025"
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(school_id, name, academic_year)
);

-- Subjects table
CREATE TABLE IF NOT EXISTS subjects (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    school_id UUID REFERENCES schools(id) ON DELETE CASCADE NOT NULL,
    name VARCHAR(100) NOT NULL,
    code VARCHAR(20),
    description TEXT,
    grade_level INTEGER,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(school_id, code)
);

-- =============================================
-- INDEXES FOR PERFORMANCE
-- =============================================

-- Profiles indexes
CREATE INDEX IF NOT EXISTS idx_profiles_school_id ON profiles(school_id);
CREATE INDEX IF NOT EXISTS idx_profiles_role ON profiles(role);
CREATE INDEX IF NOT EXISTS idx_profiles_email ON profiles(email);

-- Role-specific table indexes
CREATE INDEX IF NOT EXISTS idx_admins_school_id ON admins(school_id);
CREATE INDEX IF NOT EXISTS idx_sub_admins_school_id ON sub_admins(school_id);
CREATE INDEX IF NOT EXISTS idx_teachers_school_id ON teachers(school_id);
CREATE INDEX IF NOT EXISTS idx_teachers_employee_id ON teachers(employee_id);
CREATE INDEX IF NOT EXISTS idx_students_school_id ON students(school_id);
CREATE INDEX IF NOT EXISTS idx_students_student_id ON students(student_id);
CREATE INDEX IF NOT EXISTS idx_students_class_id ON students(class_id);

-- Academic table indexes
CREATE INDEX IF NOT EXISTS idx_classes_school_id ON classes(school_id);
CREATE INDEX IF NOT EXISTS idx_classes_teacher_id ON classes(class_teacher_id);
CREATE INDEX IF NOT EXISTS idx_subjects_school_id ON subjects(school_id);

-- =============================================
-- TRIGGERS FOR UPDATED_AT
-- =============================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply triggers to all tables
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON profiles FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_schools_updated_at BEFORE UPDATE ON schools FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_admins_updated_at BEFORE UPDATE ON admins FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_sub_admins_updated_at BEFORE UPDATE ON sub_admins FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_teachers_updated_at BEFORE UPDATE ON teachers FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_students_updated_at BEFORE UPDATE ON students FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_classes_updated_at BEFORE UPDATE ON classes FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_subjects_updated_at BEFORE UPDATE ON subjects FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
