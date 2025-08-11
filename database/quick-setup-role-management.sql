-- Quick Setup Script for Role Management System
-- Copy and paste this entire script into Supabase SQL Editor and run it

-- =============================================
-- CREATE TABLES
-- =============================================

-- 1. Create roles table
CREATE TABLE IF NOT EXISTS roles (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name VARCHAR(100) UNIQUE NOT NULL,
    display_name VARCHAR(255) NOT NULL,
    description TEXT,
    is_system_role BOOLEAN DEFAULT false,
    is_active BOOLEAN DEFAULT true,
    hierarchy_level INTEGER DEFAULT 0,
    school_id UUID,
    created_by UUID,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Create permissions table
CREATE TABLE IF NOT EXISTS permissions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name VARCHAR(100) UNIQUE NOT NULL,
    display_name VARCHAR(255) NOT NULL,
    description TEXT,
    module VARCHAR(50) NOT NULL,
    action VARCHAR(50) NOT NULL,
    is_system_permission BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Create role_permissions table
CREATE TABLE IF NOT EXISTS role_permissions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    role_id UUID REFERENCES roles(id) ON DELETE CASCADE NOT NULL,
    permission_id UUID REFERENCES permissions(id) ON DELETE CASCADE NOT NULL,
    granted BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(role_id, permission_id)
);

-- 4. Create user_roles table (with corrected foreign key references)
CREATE TABLE IF NOT EXISTS user_roles (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL,
    role_id UUID REFERENCES roles(id) ON DELETE CASCADE NOT NULL,
    assigned_by UUID,
    assigned_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    expires_at TIMESTAMP WITH TIME ZONE,
    is_active BOOLEAN DEFAULT true,
    UNIQUE(user_id, role_id)
);

-- Add foreign key constraints after table creation to handle any issues
DO $$
BEGIN
    -- Try to add foreign key for user_id
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name = 'user_roles_user_id_fkey'
        AND table_name = 'user_roles'
    ) THEN
        BEGIN
            ALTER TABLE user_roles ADD CONSTRAINT user_roles_user_id_fkey
            FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE;
        EXCEPTION WHEN OTHERS THEN
            RAISE NOTICE 'Could not add foreign key for user_id: %', SQLERRM;
        END;
    END IF;

    -- Try to add foreign key for assigned_by
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name = 'user_roles_assigned_by_fkey'
        AND table_name = 'user_roles'
    ) THEN
        BEGIN
            ALTER TABLE user_roles ADD CONSTRAINT user_roles_assigned_by_fkey
            FOREIGN KEY (assigned_by) REFERENCES profiles(id) ON DELETE SET NULL;
        EXCEPTION WHEN OTHERS THEN
            RAISE NOTICE 'Could not add foreign key for assigned_by: %', SQLERRM;
        END;
    END IF;
END $$;

-- =============================================
-- CREATE INDEXES
-- =============================================

CREATE INDEX IF NOT EXISTS idx_roles_school_id ON roles(school_id);
CREATE INDEX IF NOT EXISTS idx_roles_is_active ON roles(is_active);
CREATE INDEX IF NOT EXISTS idx_permissions_module ON permissions(module);
CREATE INDEX IF NOT EXISTS idx_role_permissions_role_id ON role_permissions(role_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_user_id ON user_roles(user_id);

-- =============================================
-- INSERT SYSTEM ROLES
-- =============================================

INSERT INTO roles (name, display_name, description, is_system_role, hierarchy_level) VALUES
('admin', 'Administrator', 'Full system access with all permissions', true, 0),
('sub-admin', 'Sub Administrator', 'Limited administrative access', true, 1),
('teacher', 'Teacher', 'Teaching staff with classroom management access', true, 2),
('student', 'Student', 'Student access with limited permissions', true, 3)
ON CONFLICT (name) DO NOTHING;

-- =============================================
-- INSERT SYSTEM PERMISSIONS
-- =============================================

INSERT INTO permissions (name, display_name, description, module, action) VALUES
-- User Management Permissions
('users.read', 'View Users', 'View user profiles and information', 'users', 'read'),
('users.create', 'Create Users', 'Create new user accounts', 'users', 'create'),
('users.update', 'Update Users', 'Edit user profiles and information', 'users', 'update'),
('users.delete', 'Delete Users', 'Remove user accounts', 'users', 'delete'),
('users.manage', 'Manage Users', 'Full user management including role assignments', 'users', 'manage'),

-- Role Management Permissions
('roles.read', 'View Roles', 'View role information and permissions', 'roles', 'read'),
('roles.create', 'Create Roles', 'Create new custom roles', 'roles', 'create'),
('roles.update', 'Update Roles', 'Edit role permissions and settings', 'roles', 'update'),
('roles.delete', 'Delete Roles', 'Remove custom roles', 'roles', 'delete'),
('roles.manage', 'Manage Roles', 'Full role management including permission assignment', 'roles', 'manage'),

-- Student Management Permissions
('students.read', 'View Students', 'View student profiles and academic information', 'students', 'read'),
('students.create', 'Create Students', 'Add new student records', 'students', 'create'),
('students.update', 'Update Students', 'Edit student information and academic records', 'students', 'update'),
('students.delete', 'Delete Students', 'Remove student records', 'students', 'delete'),
('students.manage', 'Manage Students', 'Full student management including enrollment', 'students', 'manage'),

-- Teacher Management Permissions
('teachers.read', 'View Teachers', 'View teacher profiles and information', 'teachers', 'read'),
('teachers.create', 'Create Teachers', 'Add new teacher records', 'teachers', 'create'),
('teachers.update', 'Update Teachers', 'Edit teacher information and assignments', 'teachers', 'update'),
('teachers.delete', 'Delete Teachers', 'Remove teacher records', 'teachers', 'delete'),
('teachers.manage', 'Manage Teachers', 'Full teacher management including assignments', 'teachers', 'manage'),

-- Class Management Permissions
('classes.read', 'View Classes', 'View class information and schedules', 'classes', 'read'),
('classes.create', 'Create Classes', 'Create new classes and sections', 'classes', 'create'),
('classes.update', 'Update Classes', 'Edit class information and assignments', 'classes', 'update'),
('classes.delete', 'Delete Classes', 'Remove classes and sections', 'classes', 'delete'),
('classes.manage', 'Manage Classes', 'Full class management including scheduling', 'classes', 'manage'),

-- Subject Management Permissions
('subjects.read', 'View Subjects', 'View subject information and curriculum', 'subjects', 'read'),
('subjects.create', 'Create Subjects', 'Add new subjects to curriculum', 'subjects', 'create'),
('subjects.update', 'Update Subjects', 'Edit subject information and curriculum', 'subjects', 'update'),
('subjects.delete', 'Delete Subjects', 'Remove subjects from curriculum', 'subjects', 'delete'),
('subjects.manage', 'Manage Subjects', 'Full subject management including curriculum design', 'subjects', 'manage'),

-- School Management Permissions
('schools.read', 'View School', 'View school information and settings', 'schools', 'read'),
('schools.update', 'Update School', 'Edit school information and settings', 'schools', 'update'),
('schools.manage', 'Manage School', 'Full school management including configuration', 'schools', 'manage'),

-- Reports and Analytics Permissions
('reports.read', 'View Reports', 'Access reports and analytics', 'reports', 'read'),
('reports.create', 'Create Reports', 'Generate custom reports', 'reports', 'create'),
('reports.manage', 'Manage Reports', 'Full report management and analytics access', 'reports', 'manage')

ON CONFLICT (name) DO NOTHING;

-- =============================================
-- ASSIGN PERMISSIONS TO SYSTEM ROLES
-- =============================================

-- Admin gets all permissions
INSERT INTO role_permissions (role_id, permission_id, granted)
SELECT r.id, p.id, true
FROM roles r, permissions p
WHERE r.name = 'admin'
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- Sub-admin gets most permissions except role management
INSERT INTO role_permissions (role_id, permission_id, granted)
SELECT r.id, p.id, true
FROM roles r, permissions p
WHERE r.name = 'sub-admin' 
AND p.module NOT IN ('roles')
AND p.name NOT IN ('schools.manage', 'users.delete')
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- Teacher gets teaching-related permissions
INSERT INTO role_permissions (role_id, permission_id, granted)
SELECT r.id, p.id, true
FROM roles r, permissions p
WHERE r.name = 'teacher'
AND p.name IN (
    'students.read', 'students.update',
    'classes.read', 'classes.update',
    'subjects.read',
    'reports.read',
    'users.read'
)
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- Student gets basic read permissions
INSERT INTO role_permissions (role_id, permission_id, granted)
SELECT r.id, p.id, true
FROM roles r, permissions p
WHERE r.name = 'student'
AND p.name IN (
    'classes.read',
    'subjects.read',
    'reports.read'
)
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- =============================================
-- ENABLE ROW LEVEL SECURITY
-- =============================================

ALTER TABLE roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE role_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_roles ENABLE ROW LEVEL SECURITY;

-- =============================================
-- CREATE RLS POLICIES
-- =============================================

-- Allow users to view roles
CREATE POLICY "Users can view roles" ON roles FOR SELECT USING (true);

-- Allow users to view permissions
CREATE POLICY "Users can view permissions" ON permissions FOR SELECT USING (true);

-- Allow users to view role permissions
CREATE POLICY "Users can view role permissions" ON role_permissions FOR SELECT USING (true);

-- Allow admins to manage everything
CREATE POLICY "Admins can manage roles" ON roles FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);

CREATE POLICY "Admins can manage permissions" ON permissions FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);

CREATE POLICY "Admins can manage role permissions" ON role_permissions FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);

CREATE POLICY "Admins can manage user roles" ON user_roles FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);

-- =============================================
-- GRANT PERMISSIONS
-- =============================================

GRANT SELECT ON roles TO authenticated;
GRANT SELECT ON permissions TO authenticated;
GRANT SELECT ON role_permissions TO authenticated;
GRANT SELECT, INSERT, UPDATE ON user_roles TO authenticated;

-- =============================================
-- VERIFICATION
-- =============================================

-- Check if setup was successful
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM roles WHERE name = 'admin') THEN
        RAISE NOTICE 'SUCCESS: Role management system setup completed!';
        RAISE NOTICE 'You can now refresh the Role Management page to see the full interface.';
    ELSE
        RAISE EXCEPTION 'FAILED: Role management setup incomplete.';
    END IF;
END $$;
