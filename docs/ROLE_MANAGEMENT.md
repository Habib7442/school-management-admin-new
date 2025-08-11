# Role Management System

A comprehensive role-based access control (RBAC) system for the School Management Application.

## 🎯 **Overview**

The Role Management System provides granular permission control, custom role creation, and secure user role assignments. It extends the existing basic role system with enterprise-level features.

## 🏗️ **Architecture**

### Database Schema

```
roles                 - Custom and system roles
├── permissions      - Granular permissions by module/action
├── role_permissions - Role-permission mappings
└── user_roles       - User role assignments with expiration
```

### Key Features

- ✅ **System & Custom Roles** - Predefined system roles + custom role creation
- ✅ **Granular Permissions** - Module-based permissions (users.read, students.create, etc.)
- ✅ **Role Hierarchy** - Hierarchical role levels preventing privilege escalation
- ✅ **User Assignment** - Bulk user role assignments with expiration dates
- ✅ **Security Controls** - Prevents self-role modification and unauthorized access
- ✅ **Audit Logging** - Complete audit trail of role management actions

## 🚀 **Setup Instructions**

### 1. Database Setup

```bash
# Run the role management schema
psql -h your-db-host -d your-db -f database/role-management-schema.sql

# Run the security setup
psql -h your-db-host -d your-db -f scripts/setup-role-management.sql
```

### 2. Supabase Setup

1. **Enable RLS** on all role management tables
2. **Run the setup script** to create policies and functions
3. **Verify permissions** are properly configured

### 3. Application Integration

The role management system is automatically integrated with:
- Admin navigation (`/admin/roles`)
- Permission checking hooks
- Security middleware

## 📋 **Usage Guide**

### Accessing Role Management

Navigate to `/admin/roles` in the admin panel. Only users with `roles.read` permission can access this page.

### Creating Custom Roles

1. Click **"Create Role"** button
2. Fill in role details:
   - **Role Name**: Lowercase identifier (e.g., `custom-teacher`)
   - **Display Name**: Human-readable name (e.g., `Custom Teacher`)
   - **Description**: Role purpose and responsibilities
   - **Hierarchy Level**: Access level (0=highest, higher numbers=lower access)
3. Select permissions by module
4. Click **"Create Role"**

### Managing Permissions

1. Click the **Shield icon** next to any role
2. Use the permission matrix to grant/revoke permissions
3. Permissions are organized by module (users, students, teachers, etc.)
4. Changes are saved automatically

### Assigning Users to Roles

1. Click **"Assign Users"** button
2. Select the target role
3. Choose users from the list (supports bulk selection)
4. Optionally set expiration date
5. Click **"Assign to X user(s)"**

### Security Features

- **Hierarchy Enforcement**: Users cannot assign roles with higher privileges than their own
- **Self-Protection**: Users cannot modify their own administrative roles
- **School Isolation**: Role assignments are scoped to the user's school
- **Audit Trail**: All actions are logged with actor, target, and timestamp

## 🔐 **Permission System**

### Permission Format

Permissions follow the format: `{module}.{action}`

Examples:
- `users.read` - View user profiles
- `students.create` - Create new student records
- `roles.manage` - Full role management access

### Available Modules

| Module | Description |
|--------|-------------|
| `users` | User account management |
| `students` | Student records and academic data |
| `teachers` | Teacher profiles and assignments |
| `classes` | Class and section management |
| `subjects` | Subject and curriculum management |
| `roles` | Role and permission management |
| `schools` | School settings and configuration |
| `reports` | Reports and analytics |

### Available Actions

| Action | Description |
|--------|-------------|
| `read` | View/list resources |
| `create` | Create new resources |
| `update` | Edit existing resources |
| `delete` | Remove resources |
| `manage` | Full access (includes all actions) |

## 🛡️ **Security Model**

### Role Hierarchy

```
Level 0: Admin (Full access)
Level 1: Sub-Admin (Limited admin access)
Level 2: Teacher (Teaching-related access)
Level 3: Student (Basic read access)
Level 4+: Custom roles (Configurable access)
```

### Security Rules

1. **Hierarchy Enforcement**: Users can only assign roles at their level or below
2. **Self-Protection**: Cannot modify own administrative role
3. **School Scoping**: Role assignments limited to same school
4. **Permission Validation**: All operations validated against user permissions
5. **Audit Logging**: Complete audit trail maintained

### Protected Operations

- Creating/editing system roles (Admin only)
- Assigning admin roles (Admin only)
- Managing role permissions (Admin only)
- Cross-school role assignments (Blocked)
- Self-role modification (Blocked for admins)

## 🔧 **API Integration**

### Permission Checking

```typescript
import { usePermissions } from '@/lib/hooks/usePermissions'

function MyComponent() {
  const { hasPermission } = usePermissions()
  
  if (hasPermission('users', 'create')) {
    // Show create user button
  }
}
```

### Permission Gates

```typescript
import { PermissionGate } from '@/lib/hooks/usePermissions'

<PermissionGate permission="users.create">
  <CreateUserButton />
</PermissionGate>
```

### Security Validation

```typescript
import { RoleManagementSecurity } from '@/lib/security/roleManagementSecurity'

const canEdit = await RoleManagementSecurity.canEditRole(user, roleId)
if (!canEdit.allowed) {
  throw new Error(canEdit.reason)
}
```

## 📊 **Monitoring & Audit**

### Audit Log

All role management actions are logged in the `role_management_audit` table:

```sql
SELECT 
  action,
  actor.name as actor_name,
  target.name as target_name,
  role.display_name as role_name,
  created_at
FROM role_management_audit rma
LEFT JOIN profiles actor ON rma.actor_id = actor.id
LEFT JOIN profiles target ON rma.target_user_id = target.id
LEFT JOIN roles role ON rma.role_id = role.id
ORDER BY created_at DESC;
```

### Key Metrics

- Total custom roles created
- Active role assignments
- Permission distribution
- Security violations (blocked actions)

## 🚨 **Troubleshooting**

### Common Issues

1. **"Access Denied" Errors**
   - Check user has required permissions
   - Verify role hierarchy constraints
   - Ensure user is in correct school

2. **Role Assignment Failures**
   - Verify target role hierarchy level
   - Check for existing conflicting assignments
   - Ensure assigner has sufficient privileges

3. **Permission Not Working**
   - Refresh user permissions cache
   - Check role-permission mappings
   - Verify RLS policies are enabled

### Debug Commands

```sql
-- Check user's effective permissions
SELECT * FROM user_has_permission('user-uuid', 'users.create');

-- View user's roles
SELECT * FROM get_user_roles('user-uuid');

-- Check role assignments
SELECT * FROM user_roles WHERE user_id = 'user-uuid' AND is_active = true;
```

## 🔄 **Migration Guide**

### From Legacy Role System

The new system maintains backward compatibility with the existing `profiles.role` field. Legacy roles are automatically mapped to the new system roles.

### Upgrading Existing Users

1. Run the setup scripts
2. Existing users retain their legacy roles
3. Gradually migrate to custom roles as needed
4. Legacy system remains functional during transition

## 📈 **Future Enhancements**

- **Temporary Permissions**: Time-bound permission grants
- **Role Templates**: Predefined role configurations
- **Advanced Audit**: Enhanced reporting and analytics
- **API Keys**: Service account role management
- **Multi-School**: Cross-school role management for super admins
