-- Setup script for Role Management System
-- Run this script to initialize the role management system in your Supabase database

-- First, run the main schema
\i database/role-management-schema.sql

-- =============================================
-- ROW LEVEL SECURITY POLICIES
-- =============================================

-- Enable RLS on new tables
ALTER TABLE roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE role_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_roles ENABLE ROW LEVEL SECURITY;

-- Roles table policies
CREATE POLICY "Users can view roles in their school" ON roles
    FOR SELECT USING (
        school_id IS NULL OR 
        school_id = (SELECT school_id FROM profiles WHERE id = auth.uid())
    );

CREATE POLICY "Admins can manage roles" ON roles
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE id = auth.uid() 
            AND role = 'admin'
        )
    );

CREATE POLICY "Users can manage their own custom roles" ON roles
    FOR ALL USING (
        created_by = auth.uid() AND 
        is_system_role = false
    );

-- Permissions table policies
CREATE POLICY "Users can view permissions" ON permissions
    FOR SELECT USING (true);

CREATE POLICY "Only admins can manage permissions" ON permissions
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE id = auth.uid() 
            AND role = 'admin'
        )
    );

-- Role permissions table policies
CREATE POLICY "Users can view role permissions" ON role_permissions
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM roles r
            WHERE r.id = role_id
            AND (
                r.school_id IS NULL OR 
                r.school_id = (SELECT school_id FROM profiles WHERE id = auth.uid())
            )
        )
    );

CREATE POLICY "Admins can manage role permissions" ON role_permissions
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE id = auth.uid() 
            AND role = 'admin'
        )
    );

-- User roles table policies
CREATE POLICY "Users can view their own role assignments" ON user_roles
    FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Admins can view all role assignments in their school" ON user_roles
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM profiles p
            WHERE p.id = auth.uid() 
            AND p.role IN ('admin', 'sub-admin')
            AND p.school_id = (
                SELECT school_id FROM profiles 
                WHERE id = user_id
            )
        )
    );

CREATE POLICY "Admins can manage role assignments" ON user_roles
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM profiles p
            WHERE p.id = auth.uid() 
            AND p.role IN ('admin', 'sub-admin')
            AND p.school_id = (
                SELECT school_id FROM profiles 
                WHERE id = user_id
            )
        )
    );

-- =============================================
-- ADDITIONAL HELPER FUNCTIONS
-- =============================================

-- Function to get user's highest role level
CREATE OR REPLACE FUNCTION get_user_highest_role_level(user_uuid UUID)
RETURNS INTEGER AS $$
DECLARE
    highest_level INTEGER := 999;
    legacy_level INTEGER;
    custom_level INTEGER;
BEGIN
    -- Get legacy role level
    SELECT r.hierarchy_level INTO legacy_level
    FROM profiles p
    JOIN roles r ON p.role::text = r.name
    WHERE p.id = user_uuid
    AND r.is_system_role = true;
    
    -- Get highest custom role level
    SELECT MIN(r.hierarchy_level) INTO custom_level
    FROM user_roles ur
    JOIN roles r ON ur.role_id = r.id
    WHERE ur.user_id = user_uuid
    AND ur.is_active = true
    AND (ur.expires_at IS NULL OR ur.expires_at > NOW());
    
    -- Return the highest (lowest number) level
    highest_level := COALESCE(LEAST(legacy_level, custom_level), COALESCE(legacy_level, custom_level));
    
    RETURN COALESCE(highest_level, 999);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check role assignment validity
CREATE OR REPLACE FUNCTION validate_role_assignment()
RETURNS TRIGGER AS $$
DECLARE
    assigner_level INTEGER;
    target_role_level INTEGER;
    target_user_school UUID;
    assigner_school UUID;
BEGIN
    -- Get assigner's role level
    SELECT get_user_highest_role_level(NEW.assigned_by) INTO assigner_level;
    
    -- Get target role level
    SELECT hierarchy_level INTO target_role_level
    FROM roles WHERE id = NEW.role_id;
    
    -- Get school IDs
    SELECT school_id INTO target_user_school
    FROM profiles WHERE id = NEW.user_id;
    
    SELECT school_id INTO assigner_school
    FROM profiles WHERE id = NEW.assigned_by;
    
    -- Validate hierarchy (assigner must have equal or higher privileges)
    IF assigner_level > target_role_level THEN
        RAISE EXCEPTION 'Cannot assign role with higher privileges than your own';
    END IF;
    
    -- Validate school context (must be same school or assigner is super admin)
    IF target_user_school != assigner_school AND assigner_level > 0 THEN
        RAISE EXCEPTION 'Cannot assign roles to users in different schools';
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for role assignment validation
CREATE TRIGGER validate_role_assignment_trigger
    BEFORE INSERT OR UPDATE ON user_roles
    FOR EACH ROW
    EXECUTE FUNCTION validate_role_assignment();

-- Function to prevent self-admin-role-revocation
CREATE OR REPLACE FUNCTION prevent_self_admin_revocation()
RETURNS TRIGGER AS $$
BEGIN
    -- Prevent users from deactivating their own admin role
    IF OLD.is_active = true AND NEW.is_active = false THEN
        IF OLD.user_id = auth.uid() THEN
            -- Check if this is an admin role
            IF EXISTS (
                SELECT 1 FROM roles 
                WHERE id = OLD.role_id 
                AND (name = 'admin' OR hierarchy_level = 0)
            ) THEN
                RAISE EXCEPTION 'Cannot revoke your own administrative role';
            END IF;
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to prevent self-admin-role-revocation
CREATE TRIGGER prevent_self_admin_revocation_trigger
    BEFORE UPDATE ON user_roles
    FOR EACH ROW
    EXECUTE FUNCTION prevent_self_admin_revocation();

-- =============================================
-- AUDIT LOGGING
-- =============================================

-- Create audit log table for role management actions
CREATE TABLE IF NOT EXISTS role_management_audit (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    action VARCHAR(50) NOT NULL, -- 'create_role', 'edit_role', 'delete_role', 'assign_role', 'revoke_role'
    actor_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
    target_user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
    role_id UUID REFERENCES roles(id) ON DELETE SET NULL,
    old_values JSONB,
    new_values JSONB,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for audit log
CREATE INDEX IF NOT EXISTS idx_role_audit_actor ON role_management_audit(actor_id);
CREATE INDEX IF NOT EXISTS idx_role_audit_target ON role_management_audit(target_user_id);
CREATE INDEX IF NOT EXISTS idx_role_audit_action ON role_management_audit(action);
CREATE INDEX IF NOT EXISTS idx_role_audit_created_at ON role_management_audit(created_at);

-- Function to log role management actions
CREATE OR REPLACE FUNCTION log_role_management_action(
    p_action VARCHAR(50),
    p_target_user_id UUID DEFAULT NULL,
    p_role_id UUID DEFAULT NULL,
    p_old_values JSONB DEFAULT NULL,
    p_new_values JSONB DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
    audit_id UUID;
BEGIN
    INSERT INTO role_management_audit (
        action,
        actor_id,
        target_user_id,
        role_id,
        old_values,
        new_values
    ) VALUES (
        p_action,
        auth.uid(),
        p_target_user_id,
        p_role_id,
        p_old_values,
        p_new_values
    ) RETURNING id INTO audit_id;
    
    RETURN audit_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================
-- INITIAL DATA VERIFICATION
-- =============================================

-- Verify that system roles exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM roles WHERE name = 'admin' AND is_system_role = true) THEN
        RAISE EXCEPTION 'System role "admin" not found. Please run the schema setup first.';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM permissions WHERE module = 'roles') THEN
        RAISE EXCEPTION 'Role management permissions not found. Please run the schema setup first.';
    END IF;
    
    RAISE NOTICE 'Role management system setup completed successfully!';
END $$;

-- =============================================
-- GRANT PERMISSIONS
-- =============================================

-- Grant necessary permissions to authenticated users
GRANT SELECT ON roles TO authenticated;
GRANT SELECT ON permissions TO authenticated;
GRANT SELECT ON role_permissions TO authenticated;
GRANT SELECT, INSERT, UPDATE ON user_roles TO authenticated;
GRANT INSERT ON role_management_audit TO authenticated;

-- Grant additional permissions to service role for admin operations
GRANT ALL ON roles TO service_role;
GRANT ALL ON permissions TO service_role;
GRANT ALL ON role_permissions TO service_role;
GRANT ALL ON user_roles TO service_role;
GRANT ALL ON role_management_audit TO service_role;
