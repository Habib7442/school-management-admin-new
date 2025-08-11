-- Role Management System Schema
-- This extends the existing role system to support custom roles and granular permissions

-- =============================================
-- ROLE MANAGEMENT TABLES
-- =============================================

-- Roles table (extends the existing enum-based system)
CREATE TABLE IF NOT EXISTS roles (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name VARCHAR(100) UNIQUE NOT NULL,
    display_name VARCHAR(255) NOT NULL,
    description TEXT,
    is_system_role BOOLEAN DEFAULT false, -- true for admin, sub-admin, teacher, student
    is_active BOOLEAN DEFAULT true,
    hierarchy_level INTEGER DEFAULT 0, -- 0=highest (admin), higher numbers = lower access
    school_id UUID REFERENCES schools(id) ON DELETE CASCADE, -- NULL for system roles
    created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Permissions table (defines all available permissions in the system)
CREATE TABLE IF NOT EXISTS permissions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name VARCHAR(100) UNIQUE NOT NULL, -- e.g., 'users.read', 'students.create'
    display_name VARCHAR(255) NOT NULL,
    description TEXT,
    module VARCHAR(50) NOT NULL, -- e.g., 'users', 'students', 'teachers', 'classes'
    action VARCHAR(50) NOT NULL, -- e.g., 'read', 'create', 'update', 'delete', 'manage'
    is_system_permission BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Role-Permission mapping table
CREATE TABLE IF NOT EXISTS role_permissions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    role_id UUID REFERENCES roles(id) ON DELETE CASCADE NOT NULL,
    permission_id UUID REFERENCES permissions(id) ON DELETE CASCADE NOT NULL,
    granted BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(role_id, permission_id)
);

-- User-Role assignments (extends the existing profiles.role system)
CREATE TABLE IF NOT EXISTS user_roles (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
    role_id UUID REFERENCES roles(id) ON DELETE CASCADE NOT NULL,
    assigned_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
    assigned_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    expires_at TIMESTAMP WITH TIME ZONE, -- NULL for permanent assignments
    is_active BOOLEAN DEFAULT true,
    UNIQUE(user_id, role_id)
);

-- =============================================
-- INDEXES FOR PERFORMANCE
-- =============================================

CREATE INDEX IF NOT EXISTS idx_roles_school_id ON roles(school_id);
CREATE INDEX IF NOT EXISTS idx_roles_is_active ON roles(is_active);
CREATE INDEX IF NOT EXISTS idx_roles_hierarchy_level ON roles(hierarchy_level);
CREATE INDEX IF NOT EXISTS idx_permissions_module ON permissions(module);
CREATE INDEX IF NOT EXISTS idx_permissions_action ON permissions(action);
CREATE INDEX IF NOT EXISTS idx_role_permissions_role_id ON role_permissions(role_id);
CREATE INDEX IF NOT EXISTS idx_role_permissions_permission_id ON role_permissions(permission_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_user_id ON user_roles(user_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_role_id ON user_roles(role_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_is_active ON user_roles(is_active);

-- =============================================
-- TRIGGERS
-- =============================================

-- Update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_roles_updated_at BEFORE UPDATE ON roles FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =============================================
-- INITIAL DATA - SYSTEM ROLES
-- =============================================

-- Insert system roles (matching existing enum values)
INSERT INTO roles (name, display_name, description, is_system_role, hierarchy_level) VALUES
('admin', 'Administrator', 'Full system access with all permissions', true, 0),
('sub-admin', 'Sub Administrator', 'Limited administrative access', true, 1),
('teacher', 'Teacher', 'Teaching staff with classroom management access', true, 2),
('student', 'Student', 'Student access with limited permissions', true, 3)
ON CONFLICT (name) DO NOTHING;

-- =============================================
-- INITIAL DATA - SYSTEM PERMISSIONS
-- =============================================

-- User Management Permissions
INSERT INTO permissions (name, display_name, description, module, action) VALUES
('users.read', 'View Users', 'View user profiles and information', 'users', 'read'),
('users.create', 'Create Users', 'Create new user accounts', 'users', 'create'),
('users.update', 'Update Users', 'Edit user profiles and information', 'users', 'update'),
('users.delete', 'Delete Users', 'Remove user accounts', 'users', 'delete'),
('users.manage', 'Manage Users', 'Full user management including role assignments', 'users', 'manage'),

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

-- Role Management Permissions
('roles.read', 'View Roles', 'View role information and permissions', 'roles', 'read'),
('roles.create', 'Create Roles', 'Create new custom roles', 'roles', 'create'),
('roles.update', 'Update Roles', 'Edit role permissions and settings', 'roles', 'update'),
('roles.delete', 'Delete Roles', 'Remove custom roles', 'roles', 'delete'),
('roles.manage', 'Manage Roles', 'Full role management including permission assignment', 'roles', 'manage'),

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
-- INITIAL DATA - ROLE PERMISSION ASSIGNMENTS
-- =============================================

-- Admin role gets all permissions
INSERT INTO role_permissions (role_id, permission_id, granted)
SELECT r.id, p.id, true
FROM roles r, permissions p
WHERE r.name = 'admin'
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- Sub-admin role gets most permissions except role management
INSERT INTO role_permissions (role_id, permission_id, granted)
SELECT r.id, p.id, true
FROM roles r, permissions p
WHERE r.name = 'sub-admin'
AND p.module NOT IN ('roles')
AND p.name NOT IN ('schools.manage', 'users.delete')
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- Teacher role gets teaching-related permissions
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

-- Student role gets basic read permissions
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
-- HELPER FUNCTIONS
-- =============================================

-- Function to check if user has specific permission
CREATE OR REPLACE FUNCTION user_has_permission(user_uuid UUID, permission_name VARCHAR)
RETURNS BOOLEAN AS $$
DECLARE
    has_perm BOOLEAN := false;
BEGIN
    -- Check through user_roles and role_permissions
    SELECT EXISTS(
        SELECT 1
        FROM user_roles ur
        JOIN role_permissions rp ON ur.role_id = rp.role_id
        JOIN permissions p ON rp.permission_id = p.id
        WHERE ur.user_id = user_uuid
        AND ur.is_active = true
        AND (ur.expires_at IS NULL OR ur.expires_at > NOW())
        AND rp.granted = true
        AND p.name = permission_name
    ) INTO has_perm;

    -- Fallback to legacy role system if no custom roles assigned
    IF NOT has_perm THEN
        SELECT EXISTS(
            SELECT 1
            FROM profiles prof
            JOIN roles r ON prof.role::text = r.name
            JOIN role_permissions rp ON r.id = rp.role_id
            JOIN permissions p ON rp.permission_id = p.id
            WHERE prof.id = user_uuid
            AND rp.granted = true
            AND p.name = permission_name
        ) INTO has_perm;
    END IF;

    RETURN has_perm;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get user's effective roles
CREATE OR REPLACE FUNCTION get_user_roles(user_uuid UUID)
RETURNS TABLE(role_name VARCHAR, role_display_name VARCHAR, hierarchy_level INTEGER) AS $$
BEGIN
    RETURN QUERY
    SELECT DISTINCT r.name, r.display_name, r.hierarchy_level
    FROM user_roles ur
    JOIN roles r ON ur.role_id = r.id
    WHERE ur.user_id = user_uuid
    AND ur.is_active = true
    AND (ur.expires_at IS NULL OR ur.expires_at > NOW())

    UNION

    -- Include legacy role from profiles table
    SELECT r.name, r.display_name, r.hierarchy_level
    FROM profiles p
    JOIN roles r ON p.role::text = r.name
    WHERE p.id = user_uuid
    AND r.is_system_role = true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
