# Database Setup Guide

This guide will help you set up the complete database schema for the School Management System.

## 🗄️ **Database Structure Overview**

The system uses a **multi-table architecture** where user data is stored across multiple tables:

1. **`profiles`** - Base user information (shared across all roles)
2. **`admins`** - Admin-specific data and permissions
3. **`sub_admins`** - Sub-admin specific data and limited permissions
4. **`teachers`** - Teacher-specific data (employee info, qualifications)
5. **`students`** - Student-specific data (academic info, parent details)
6. **`schools`** - School information
7. **`classes`** - Class/grade information
8. **`subjects`** - Subject information

## 🚀 **Setup Steps**

### Step 1: Access Supabase Dashboard
1. Go to [Supabase Dashboard](https://supabase.com/dashboard)
2. Select your project
3. Navigate to **SQL Editor**

### Step 2: Create Database Schema
Copy and paste the contents of `schema.sql` into the SQL Editor and run it.

This will create:
- All tables with proper relationships
- Custom types (enums)
- Indexes for performance
- Triggers for automatic timestamp updates

### Step 3: Set Up Row Level Security
Copy and paste the contents of `rls-policies.sql` into the SQL Editor and run it.

This will:
- Enable RLS on all tables
- Create security policies
- Set up helper functions for permission checking

### Step 4: Verify Setup
Run this query to verify all tables are created:

```sql
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_type = 'BASE TABLE'
ORDER BY table_name;
```

You should see:
- admins
- classes
- profiles
- schools
- students
- sub_admins
- subjects
- teachers

## 📊 **How User Data is Stored**

### When a user is created:

1. **Auth User** is created in Supabase Auth
2. **Profile** record is created in `profiles` table
3. **Role-specific** record is created in the appropriate table:
   - Admin → `admins` table
   - Sub-admin → `sub_admins` table
   - Teacher → `teachers` table
   - Student → `students` table

### Example Data Flow:

```
Create Teacher "John Doe"
├── Supabase Auth: user_id = "abc123"
├── profiles: { id: "abc123", name: "John Doe", role: "teacher", ... }
└── teachers: { id: "abc123", employee_id: "T001", department: "Math", ... }
```

## 🔐 **Security Features**

- **Row Level Security (RLS)** ensures users only see their authorized data
- **Role-based permissions** control what actions users can perform
- **School isolation** prevents cross-school data access
- **Temporary permissions** for sub-admins with expiration dates

## 🔧 **Maintenance**

### Adding New Fields
To add new fields to role-specific tables:

1. Add column to the appropriate table
2. Update TypeScript types in `supabase.ts`
3. Update forms and components as needed

### Backup Strategy
- Supabase provides automatic daily backups
- For additional safety, export data regularly
- Test restore procedures on staging environment

## 🚨 **Important Notes**

1. **Never delete the `profiles` table** - it's the foundation for all user data
2. **Always use transactions** when creating users to ensure data consistency
3. **Test RLS policies** thoroughly before production deployment
4. **Monitor performance** with the created indexes

## 🔍 **Troubleshooting**

### Common Issues:

**"Permission denied" errors:**
- Check RLS policies are correctly applied
- Verify user has correct role in profiles table

**"Foreign key constraint" errors:**
- Ensure school_id exists before creating users
- Check that profile record exists before creating role-specific record

**Performance issues:**
- Verify indexes are created
- Check query patterns and add indexes as needed

### Useful Queries:

```sql
-- Check user's complete profile
SELECT p.*, 
       CASE p.role
         WHEN 'admin' THEN (SELECT row_to_json(a.*) FROM admins a WHERE a.id = p.id)
         WHEN 'teacher' THEN (SELECT row_to_json(t.*) FROM teachers t WHERE t.id = p.id)
         WHEN 'student' THEN (SELECT row_to_json(s.*) FROM students s WHERE s.id = p.id)
       END as role_data
FROM profiles p 
WHERE p.email = 'user@example.com';

-- Check RLS policies
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual 
FROM pg_policies 
WHERE schemaname = 'public';
```

This setup ensures a robust, scalable, and secure database structure for your School Management System! 🎉
